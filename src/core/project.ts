import { promises as fs } from "node:fs"
import path from "node:path"

import { parse as parseToml } from "smol-toml"

import { AnalysisFailure } from "./errors"
import type { PreparedProject, ProjectType, Remapping, ResolvedProjectType } from "./types"

const HARDHAT_CONFIG_FILES = [
	"hardhat.config.ts",
	"hardhat.config.js",
	"hardhat.config.cjs",
	"hardhat.config.mjs",
]

const ENTRY_IGNORE_DIRS: Record<ResolvedProjectType, Set<string>> = {
	foundry: new Set([
		".git",
		"artifacts",
		"broadcast",
		"cache",
		"lib",
		"node_modules",
		"out",
		"script",
		"test",
	]),
	hardhat: new Set([".git", "artifacts", "cache", "coverage", "dist", "node_modules", "test"]),
	plain: new Set([".git", "artifacts", "cache", "coverage", "dist", "node_modules", "out"]),
}

export async function prepareProject(
	targetPath: string,
	explicitProjectType: ProjectType,
): Promise<PreparedProject> {
	const resolvedTarget = path.resolve(targetPath)
	const targetStats = await safeStat(resolvedTarget)

	if (!targetStats) {
		throw new AnalysisFailure("usage", `Target does not exist: ${resolvedTarget}`)
	}

	if (targetStats.isFile() && path.extname(resolvedTarget) !== ".sol") {
		throw new AnalysisFailure("usage", `Target file must be a Solidity file: ${resolvedTarget}`)
	}

	const detectionBase = targetStats.isDirectory() ? resolvedTarget : path.dirname(resolvedTarget)
	const autoDetected =
		explicitProjectType === "auto" ? await detectProject(detectionBase) : undefined
	const projectType =
		explicitProjectType === "auto" ? (autoDetected?.projectType ?? "plain") : explicitProjectType
	const projectRoot = autoDetected?.projectRoot ?? detectionBase
	const remappings = projectType === "foundry" ? await loadFoundryRemappings(projectRoot) : []
	const entryFiles = await discoverEntryFiles(
		resolvedTarget,
		targetStats.isDirectory(),
		projectType,
	)

	if (entryFiles.length === 0) {
		throw new AnalysisFailure("usage", `No Solidity files found under target: ${resolvedTarget}`)
	}

	return {
		projectRoot,
		targetPath: resolvedTarget,
		projectType,
		entryFiles,
		remappings,
	}
}

async function detectProject(
	startDirectory: string,
): Promise<{ projectRoot: string; projectType: ResolvedProjectType } | undefined> {
	let current = startDirectory

	while (true) {
		if (await hasFoundryMarkers(current)) {
			return {
				projectRoot: current,
				projectType: "foundry",
			}
		}

		if (await hasHardhatMarkers(current)) {
			return {
				projectRoot: current,
				projectType: "hardhat",
			}
		}

		const parent = path.dirname(current)

		if (parent === current) {
			return undefined
		}

		current = parent
	}
}

async function hasFoundryMarkers(directory: string): Promise<boolean> {
	return Boolean(
		(await safeStat(path.join(directory, "foundry.toml"))) ||
			(await safeStat(path.join(directory, "remappings.txt"))),
	)
}

async function hasHardhatMarkers(directory: string): Promise<boolean> {
	for (const configName of HARDHAT_CONFIG_FILES) {
		if (await safeStat(path.join(directory, configName))) {
			return true
		}
	}

	return false
}

async function discoverEntryFiles(
	targetPath: string,
	targetIsDirectory: boolean,
	projectType: ResolvedProjectType,
): Promise<string[]> {
	if (!targetIsDirectory) {
		return [targetPath]
	}

	const discovered: string[] = []
	await walkDirectory(targetPath, ENTRY_IGNORE_DIRS[projectType], discovered)
	return discovered.sort((left, right) => left.localeCompare(right))
}

async function walkDirectory(
	directory: string,
	ignoreDirs: Set<string>,
	discovered: string[],
): Promise<void> {
	const entries = await fs.readdir(directory, { withFileTypes: true })

	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name)

		if (entry.isDirectory()) {
			if (!ignoreDirs.has(entry.name)) {
				await walkDirectory(absolutePath, ignoreDirs, discovered)
			}
			continue
		}

		if (entry.isFile() && path.extname(entry.name) === ".sol") {
			discovered.push(absolutePath)
		}
	}
}

export async function resolveImportSpecifier(
	specifier: string,
	importerPath: string,
	project: PreparedProject,
): Promise<string> {
	const normalizedSpecifier = specifier.replaceAll("\\", "/")
	const candidates = new Set<string>()

	if (normalizedSpecifier.startsWith(".")) {
		addSolidityCandidates(candidates, path.resolve(path.dirname(importerPath), normalizedSpecifier))
	} else {
		if (project.projectType === "foundry") {
			const matchedRemappings = [...project.remappings].sort(
				(left, right) => right.prefix.length - left.prefix.length,
			)

			for (const remapping of matchedRemappings) {
				if (normalizedSpecifier.startsWith(remapping.prefix)) {
					const suffix = normalizedSpecifier.slice(remapping.prefix.length)
					addSolidityCandidates(
						candidates,
						path.join(project.projectRoot, remapping.target, suffix),
					)
				}
			}

			addSolidityCandidates(candidates, path.join(project.projectRoot, "lib", normalizedSpecifier))
			addFoundryLibraryCandidates(candidates, project.projectRoot, normalizedSpecifier)
		}

		if (project.projectType === "hardhat" || project.projectType === "plain") {
			addSolidityCandidates(
				candidates,
				path.join(project.projectRoot, "node_modules", normalizedSpecifier),
			)
		}

		addSolidityCandidates(candidates, path.join(project.projectRoot, normalizedSpecifier))
		addSolidityCandidates(
			candidates,
			path.join(project.projectRoot, "contracts", normalizedSpecifier),
		)
		addSolidityCandidates(candidates, path.join(project.projectRoot, "src", normalizedSpecifier))
	}

	for (const candidate of candidates) {
		if (await safeStat(candidate)) {
			return candidate
		}
	}

	throw new AnalysisFailure(
		"import",
		`Unable to resolve import "${specifier}" from ${importerPath}`,
	)
}

function addFoundryLibraryCandidates(
	candidates: Set<string>,
	projectRoot: string,
	specifier: string,
): void {
	const segments = specifier.split("/")

	if (segments.length === 0) {
		return
	}

	const [libraryName, ...rest] = segments
	const suffix = rest.join("/")

	addSolidityCandidates(candidates, path.join(projectRoot, "lib", libraryName, suffix))
	addSolidityCandidates(candidates, path.join(projectRoot, "lib", libraryName, "src", suffix))
	addSolidityCandidates(candidates, path.join(projectRoot, "lib", libraryName, "contracts", suffix))
}

function addSolidityCandidates(candidates: Set<string>, candidatePath: string): void {
	candidates.add(path.normalize(candidatePath))

	if (path.extname(candidatePath) !== ".sol") {
		candidates.add(path.normalize(`${candidatePath}.sol`))
	}
}

async function loadFoundryRemappings(projectRoot: string): Promise<Remapping[]> {
	const remappings = new Map<string, string>()
	const remappingsFilePath = path.join(projectRoot, "remappings.txt")
	const remappingsFile = await safeReadFile(remappingsFilePath)

	if (remappingsFile) {
		for (const line of remappingsFile.split(/\r?\n/u)) {
			const trimmed = line.trim()
			if (trimmed.length === 0 || trimmed.startsWith("#")) {
				continue
			}

			const [prefix, target] = trimmed.split("=")

			if (prefix && target) {
				remappings.set(prefix.trim(), target.trim())
			}
		}
	}

	const foundryTomlPath = path.join(projectRoot, "foundry.toml")
	const foundryToml = await safeReadFile(foundryTomlPath)

	if (foundryToml) {
		const parsedToml = parseToml(foundryToml) as {
			profile?: { default?: { remappings?: string[] } }
			remappings?: string[]
		}

		for (const entry of parsedToml.profile?.default?.remappings ?? parsedToml.remappings ?? []) {
			const [prefix, target] = entry.split("=")

			if (prefix && target) {
				remappings.set(prefix.trim(), target.trim())
			}
		}
	}

	return [...remappings.entries()].map(([prefix, target]) => ({ prefix, target }))
}

async function safeReadFile(filePath: string): Promise<string | undefined> {
	try {
		return await fs.readFile(filePath, "utf8")
	} catch {
		return undefined
	}
}

async function safeStat(filePath: string): Promise<import("node:fs").Stats | undefined> {
	try {
		return await fs.stat(filePath)
	} catch {
		return undefined
	}
}
