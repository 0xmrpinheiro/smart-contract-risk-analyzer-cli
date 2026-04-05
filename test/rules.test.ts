import { describe, expect, test } from "vitest"

import { builtInRules } from "../src/rules"
import { analyzeFixture, fixturePath } from "./helpers"

describe("built-in rules", () => {
	test("the vulnerable fixture triggers every built-in rule", async () => {
		const execution = await analyzeFixture("plain-project")
		const actualRuleIds = new Set(execution.result.findings.map((finding) => finding.ruleId))

		expect(actualRuleIds).toEqual(new Set(builtInRules.map((rule) => rule.id)))
	})

	test("the safe contract stays quiet", async () => {
		const execution = await analyzeFixture("plain-project", {
			targetPath: fixturePath("plain-project", "contracts", "SafeVault.sol"),
		})

		expect(execution.result.findings).toEqual([])
		expect(execution.result.score).toBe(0)
	})
})
