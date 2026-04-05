import { createFinding } from "../core/analyzer"
import type { Finding, RuleDefinition } from "../core/types"
import { getFunctionTargets, isDelegatecall, walkFunction } from "./helpers"

export const delegatecallUsageRule: RuleDefinition = {
	id: "delegatecall-usage",
	title: "delegatecall usage",
	summary: "Flags delegatecall usage because it executes foreign code in the current context.",
	severity: "critical",
	confidence: "high",
	category: "execution-context",
	remediation:
		"Avoid delegatecall unless the storage layout and trust boundary are explicitly controlled.",
	run(context) {
		const findings: Finding[] = []

		for (const target of getFunctionTargets(context)) {
			walkFunction(target, ({ node }) => {
				if (node.type === "FunctionCall" && isDelegatecall(node)) {
					findings.push(
						createFinding(target.file, delegatecallUsageRule, node, {
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} uses delegatecall, which can expose storage and execution-context risk.`,
						}),
					)
				}
			})
		}

		return findings
	},
}
