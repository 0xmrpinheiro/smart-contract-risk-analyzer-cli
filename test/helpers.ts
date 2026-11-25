import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { analyzeTarget } from "../src/core/analyzer"
import { builtInRules } from "../src/rules"

export const fixturesRoot = path.resolve(process.cwd(), "test", "fixtures")

export function fixturePath(...segments: string[]): string {
	return path.join(fixturesRoot, ...segments)
}

export async function analyzeFixture(
	fixtureName: string,
	overrides: Partial<{
		targetPath: string
		projectType: "auto" | "foundry" | "hardhat" | "plain"
		minSeverity: "low" | "medium" | "high" | "critical"
		failOn: "low" | "medium" | "high" | "critical"
	}> = {},
) {
	return analyzeTarget(
		{
			targetPath: overrides.targetPath ?? fixturePath(fixtureName),
			projectType: overrides.projectType ?? "auto",
			minSeverity: overrides.minSeverity ?? "low",
			failOn: overrides.failOn ?? "critical",
		},
		builtInRules,
	)
}

export async function withTempProject(
	files: Record<string, string>,
	callback: (root: string) => Promise<void>,
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "scra-"))

	try {
		for (const [relativeFilePath, content] of Object.entries(files)) {
			const absolutePath = path.join(root, relativeFilePath)
			await fs.mkdir(path.dirname(absolutePath), { recursive: true })
			await fs.writeFile(absolutePath, content, "utf8")
		}

		await callback(root)
	} finally {
		await fs.rm(root, { recursive: true, force: true })
	}
}

export function normalizeSnapshot(value: string): string {
	const jsonRoot = JSON.stringify(fixturesRoot).slice(1, -1)
	return value
		.replaceAll(jsonRoot, "<FIXTURES>")
		.replaceAll(fixturesRoot, "<FIXTURES>")
		.replaceAll(fixturesRoot.split(path.sep).join("/"), "<FIXTURES>")
		.replaceAll("\r\n", "\n")
}

export async function withHardhatFixture(callback: (root: string) => Promise<void>): Promise<void> {
	const [config, contract, dependency] = await Promise.all([
		fs.readFile(fixturePath("hardhat-project", "hardhat.config.js"), "utf8"),
		fs.readFile(fixturePath("hardhat-project", "contracts", "HardhatVault.sol"), "utf8"),
		fs.readFile(
			fixturePath(
				"foundry-project",
				"lib",
				"openzeppelin-contracts",
				"contracts",
				"token",
				"ERC20",
				"ERC20.sol",
			),
			"utf8",
		),
	])
	await withTempProject(
		{
			"hardhat.config.js": config,
			"contracts/HardhatVault.sol": contract,
			"node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol": dependency,
		},
		callback,
	)
}
