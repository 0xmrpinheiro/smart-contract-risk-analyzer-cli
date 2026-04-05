import { createFinding } from "../core/analyzer"
import type { Finding, RuleDefinition } from "../core/types"
import { getFunctionTargets, isSelfdestructCall, walkFunction } from "./helpers"

export const selfdestructUsageRule: RuleDefinition = {
	id: "selfdestruct-usage",
	title: "selfdestruct usage",
	summary: "Flags any selfdestruct or suicide call.",
	severity: "critical",
	confidence: "high",
	category: "destructive-operation",
	remediation:
		"Remove selfdestruct patterns unless the shutdown flow is intentionally designed and reviewed.",
	run(context) {
		const findings: Finding[] = []

		for (const target of getFunctionTargets(context)) {
			walkFunction(target, ({ node }) => {
				if (isSelfdestructCall(node)) {
					findings.push(
						createFinding(target.file, selfdestructUsageRule, node, {
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} can destroy the contract with selfdestruct.`,
						}),
					)
				}
			})
		}

		return findings
	},
}
