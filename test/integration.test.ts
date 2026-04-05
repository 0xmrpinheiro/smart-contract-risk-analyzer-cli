import { describe, expect, test } from "vitest"

import { analyzeFixture } from "./helpers"

describe("fixture integrations", () => {
	test("analyzes the plain fixture", async () => {
		const execution = await analyzeFixture("plain-project")

		expect(execution.result.projectType).toBe("plain")
		expect(execution.result.entryFiles).toHaveLength(2)
		expect(execution.result.findings.length).toBeGreaterThan(0)
	})

	test("analyzes the Foundry fixture including imported library files", async () => {
		const execution = await analyzeFixture("foundry-project")

		expect(execution.result.projectType).toBe("foundry")
		expect(execution.result.analyzedFiles).toContain(
			"lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol",
		)
	})

	test("analyzes the Hardhat fixture including node_modules imports", async () => {
		const execution = await analyzeFixture("hardhat-project")

		expect(execution.result.projectType).toBe("hardhat")
		expect(execution.result.analyzedFiles).toContain(
			"node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol",
		)
		expect(execution.result.findings.map((finding) => finding.ruleId)).toEqual(
			expect.arrayContaining(["unchecked-low-level-call", "missing-access-control"]),
		)
	})
})
