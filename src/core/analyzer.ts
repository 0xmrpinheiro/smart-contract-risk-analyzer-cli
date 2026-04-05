import { promises as fs } from "node:fs"
import path from "node:path"

import { parse } from "@solidity-parser/parser/dist/index.cjs.js"

import { TOOL_NAME, TOOL_VERSION } from "./constants"
import { AnalysisFailure } from "./errors"
import { prepareProject, resolveImportSpecifier } from "./project"
import {
	calculateScoreFromSummary,
	severityMeetsThreshold,
	sortFindings,
	summarizeFindings,
	summarizeTriggeredRules,
} from "./severity"
import type {
	AnalysisContext,
	AnalyzeExecution,
	AnalyzeOptions,
	ContractMetadata,
	Finding,
	FunctionMetadata,
	ParsedSource,
	PreparedProject,
	RuleDefinition,
} from "./types"
import { dedupeFindings, relativePath, walkAst } from "./utils"

export async function analyzeTarget(
	options: AnalyzeOptions,
	rules: RuleDefinition[],
): Promise<AnalyzeExecution> {
	const project = await prepareProject(options.targetPath, options.projectType)
	const parsedFiles = await parseProjectGraph(project)
	const context: AnalysisContext = {
		project,
		parsedFiles,
	}

	const rawFindings = dedupeFindings(sortFindings(rules.flatMap((rule) => rule.run(context))))
	const filteredFindings = rawFindings.filter((finding) =>
		severityMeetsThreshold(finding.severity, options.minSeverity),
	)
	const summary = summarizeFindings(filteredFindings)
	const result = {
		tool: TOOL_NAME,
		version: TOOL_VERSION,
		target: project.targetPath,
		projectType: project.projectType,
		projectRoot: project.projectRoot,
		analyzedFiles: parsedFiles.map((file) => file.relativePath),
		entryFiles: project.entryFiles.map((filePath) => relativePath(project.projectRoot, filePath)),
		score: calculateScoreFromSummary(summary),
		summary,
		findings: filteredFindings,
		rulesTriggered: summarizeTriggeredRules(filteredFindings),
	}

	const hasFailingFindings = rawFindings.some((finding) =>
		severityMeetsThreshold(finding.severity, options.failOn),
	)

	return {
		result,
		rawFindings,
		hasFailingFindings,
	}
}

async function parseProjectGraph(project: PreparedProject): Promise<ParsedSource[]> {
	const parsedFiles = new Map<string, ParsedSource>()
	const activeStack = new Set<string>()

	for (const entryFile of project.entryFiles) {
		await parseFileRecursively(entryFile, project, parsedFiles, activeStack)
	}

	return [...parsedFiles.values()].sort((left, right) =>
		left.relativePath.localeCompare(right.relativePath),
	)
}

async function parseFileRecursively(
	filePath: string,
	project: PreparedProject,
	parsedFiles: Map<string, ParsedSource>,
	activeStack: Set<string>,
): Promise<void> {
	const normalizedPath = path.normalize(filePath)

	if (parsedFiles.has(normalizedPath) || activeStack.has(normalizedPath)) {
		return
	}

	activeStack.add(normalizedPath)
	const content = await fs.readFile(normalizedPath, "utf8")
	let ast: any

	try {
		ast = parse(content, {
			loc: true,
			range: true,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown Solidity parse error"
		throw new AnalysisFailure("parse", `Unable to parse ${normalizedPath}: ${message}`)
	}

	const imports = await extractImports(ast, normalizedPath, project)
	const parsedSource: ParsedSource = {
		filePath: normalizedPath,
		relativePath: relativePath(project.projectRoot, normalizedPath),
		content,
		ast,
		imports,
		contracts: extractContracts(ast),
	}

	parsedFiles.set(normalizedPath, parsedSource)

	for (const importedFile of imports) {
		await parseFileRecursively(importedFile.resolvedPath, project, parsedFiles, activeStack)
	}

	activeStack.delete(normalizedPath)
}

async function extractImports(
	ast: any,
	importerPath: string,
	project: PreparedProject,
): Promise<Array<{ specifier: string; resolvedPath: string }>> {
	const resolvedImports: Array<{ specifier: string; resolvedPath: string }> = []

	for (const specifier of listImportSpecifiers(ast)) {
		resolvedImports.push({
			specifier,
			resolvedPath: await resolveImportSpecifier(specifier, importerPath, project),
		})
	}

	return resolvedImports
}

function listImportSpecifiers(ast: any): string[] {
	const imports = new Set<string>()

	walkAst(ast, ({ node }) => {
		if (node.type === "ImportDirective" && typeof node.path === "string") {
			imports.add(node.path)
		}
	})

	return [...imports.values()]
}

function extractContracts(ast: any): ContractMetadata[] {
	const contracts: ContractMetadata[] = []

	walkAst(ast, ({ node }) => {
		if (node.type !== "ContractDefinition") {
			return
		}

		const contractNode = node as any
		const functions: FunctionMetadata[] = []
		const stateVariables: string[] = []

		for (const subNode of contractNode.subNodes ?? []) {
			if (subNode.type === "StateVariableDeclaration") {
				for (const variable of subNode.variables ?? []) {
					if (variable?.name) {
						stateVariables.push(variable.name)
					}
				}
			}

			if (subNode.type === "FunctionDefinition") {
				functions.push({
					name:
						subNode.isConstructor || subNode.kind === "constructor"
							? "constructor"
							: subNode.name || subNode.kind || "anonymous",
					visibility: subNode.visibility ?? "default",
					stateMutability: subNode.stateMutability,
					modifiers: (subNode.modifiers ?? []).map(extractModifierName).filter(Boolean),
					parameters: (subNode.parameters?.parameters ?? [])
						.map((parameter: any) => parameter.name)
						.filter(Boolean),
					node: subNode,
				})
			}
		}

		contracts.push({
			name: contractNode.name ?? "AnonymousContract",
			kind: contractNode.kind ?? "contract",
			stateVariables,
			functions,
			node: contractNode,
		})
	})

	return contracts
}

function extractModifierName(modifier: any): string {
	if (typeof modifier?.name === "string") {
		return modifier.name
	}

	if (typeof modifier?.name?.name === "string") {
		return modifier.name.name
	}

	if (typeof modifier?.namePath === "string") {
		return modifier.namePath
	}

	return "modifier"
}

export function createFinding(
	file: ParsedSource,
	rule: RuleDefinition,
	node: any,
	overrides: {
		message: string
		contractName?: string
		functionName?: string
	},
): Finding {
	const line = node?.loc?.start?.line ?? 1
	const column = node?.loc?.start?.column ?? 1

	return {
		ruleId: rule.id,
		title: rule.title,
		severity: rule.severity,
		confidence: rule.confidence,
		category: rule.category,
		message: overrides.message,
		remediation: rule.remediation,
		location: {
			filePath: file.filePath,
			relativePath: file.relativePath,
			line,
			column,
		},
		contractName: overrides.contractName,
		functionName: overrides.functionName,
	}
}
