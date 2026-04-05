import path from "node:path"

import type { Finding } from "./types"

export function toPosixPath(value: string): string {
	return value.split(path.sep).join("/")
}

export function relativePath(from: string, to: string): string {
	const result = path.relative(from, to)
	return result.length > 0 ? toPosixPath(result) : "."
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

export interface AstVisitorContext {
	node: any
	parent: any
	ancestors: any[]
}

export function walkAst(
	node: unknown,
	visitor: (context: AstVisitorContext) => void,
	parent: any = null,
	ancestors: any[] = [],
): void {
	if (node === null || node === undefined) {
		return
	}

	if (Array.isArray(node)) {
		for (const item of node) {
			walkAst(item, visitor, parent, ancestors)
		}
		return
	}

	if (typeof node !== "object") {
		return
	}

	const astNode = node as Record<string, unknown>
	const nextAncestors = parent ? [...ancestors, parent] : ancestors

	if (typeof astNode.type === "string") {
		visitor({
			node: astNode,
			parent,
			ancestors,
		})
	}

	for (const value of Object.values(astNode)) {
		if (value && typeof value === "object") {
			walkAst(value, visitor, astNode, nextAncestors)
		}
	}
}

export function dedupeFindings(findings: Finding[]): Finding[] {
	const seen = new Set<string>()
	const result: Finding[] = []

	for (const finding of findings) {
		const key = [
			finding.ruleId,
			finding.location.relativePath,
			finding.location.line,
			finding.location.column,
			finding.contractName ?? "",
			finding.functionName ?? "",
			finding.message,
		].join("|")

		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		result.push(finding)
	}

	return result
}

export function groupFindingsByContract(findings: Finding[]): Array<[string, Finding[]]> {
	const groups = new Map<string, Finding[]>()

	for (const finding of findings) {
		const key = finding.contractName ?? finding.location.relativePath
		const existing = groups.get(key)

		if (existing) {
			existing.push(finding)
			continue
		}

		groups.set(key, [finding])
	}

	return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]))
}
