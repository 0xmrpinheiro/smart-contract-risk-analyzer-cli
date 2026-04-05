import { promises as fs } from "node:fs"
import path from "node:path"

import { describe, expect, test } from "vitest"

import { runCli } from "../src/cli/program"
import { fixturePath, normalizeSnapshot, withTempProject } from "./helpers"

function createIo(cwd = process.cwd()) {
	let stdout = ""
	let stderr = ""

	return {
		io: {
			cwd: () => cwd,
			stdout: (message: string) => {
				stdout += message
			},
			stderr: (message: string) => {
				stderr += message
			},
		},
		stdout: () => stdout,
		stderr: () => stderr,
	}
}

describe("cli", () => {
	test("returns exit code 1 when findings meet the fail-on threshold", async () => {
		const streams = createIo()
		const exitCode = await runCli(
			["analyze", fixturePath("plain-project"), "--no-color", "--fail-on", "high"],
			streams.io,
		)

		expect(exitCode).toBe(1)
		expect(normalizeSnapshot(streams.stdout())).toContain("Risk score:")
	})

	test("supports json stdout output with severity filtering", async () => {
		const streams = createIo()
		const exitCode = await runCli(
			[
				"analyze",
				fixturePath("plain-project"),
				"--format",
				"json",
				"--min-severity",
				"critical",
				"--fail-on",
				"critical",
			],
			streams.io,
		)

		expect(exitCode).toBe(1)
		const parsed = JSON.parse(streams.stdout())
		expect(
			parsed.findings.every((finding: { severity: string }) => finding.severity === "critical"),
		).toBe(true)
	})

	test("writes json and html report files", async () => {
		await withTempProject({}, async (tempRoot) => {
			const outputRoot = path.join(tempRoot, "reports")
			const streams = createIo()
			const exitCode = await runCli(
				[
					"analyze",
					fixturePath("plain-project", "contracts", "SafeVault.sol"),
					"--no-color",
					"--json",
					path.join(outputRoot, "report.json"),
					"--html",
					path.join(outputRoot, "report.html"),
				],
				streams.io,
			)

			expect(exitCode).toBe(0)
			await expect(fs.readFile(path.join(outputRoot, "report.json"), "utf8")).resolves.toContain(
				'"tool": "smart-contract-risk-analyzer"',
			)
			await expect(fs.readFile(path.join(outputRoot, "report.html"), "utf8")).resolves.toContain(
				"Smart Contract Risk Analyzer",
			)
		})
	})

	test("returns exit code 2 for import resolution failures", async () => {
		await withTempProject(
			{
				"contracts/Broken.sol": `pragma solidity ^0.8.20;\nimport "./Missing.sol";\ncontract Broken {}`,
			},
			async (tempRoot) => {
				const streams = createIo()
				const exitCode = await runCli(
					["analyze", path.join(tempRoot, "contracts"), "--no-color"],
					streams.io,
				)

				expect(exitCode).toBe(2)
				expect(streams.stderr()).toContain('Unable to resolve import "./Missing.sol"')
			},
		)
	})

	test("accepts a leading separator in forwarded script args", async () => {
		const streams = createIo()
		const exitCode = await runCli(["--", "rules", "--no-color"], streams.io)

		expect(exitCode).toBe(0)
		expect(streams.stdout()).toContain("Built-in Rules")
	})
})
