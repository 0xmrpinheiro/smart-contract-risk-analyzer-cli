import { createFinding } from "../core/analyzer"
import type { Finding, RuleDefinition } from "../core/types"
import { getFunctionTargets, isUncheckedLowLevelCall, walkFunction } from "./helpers"

export const uncheckedLowLevelCallRule: RuleDefinition = {
	id: "unchecked-low-level-call",
	title: "Unchecked low-level call result",
	summary: "Flags low-level calls whose success value is ignored.",
	severity: "high",
	confidence: "high",
	category: "error-handling",
	remediation:
		"Capture and validate the return value of low-level calls before continuing execution.",
	run(context) {
		const findings: Finding[] = []

		for (const target of getFunctionTargets(context)) {
			walkFunction(target, ({ node, parent }) => {
				if (node.type === "FunctionCall" && isUncheckedLowLevelCall(node, parent)) {
					findings.push(
						createFinding(target.file, uncheckedLowLevelCallRule, node, {
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} ignores the result of a low-level call.`,
						}),
					)
				}
			})
		}

		return findings
	},
}
