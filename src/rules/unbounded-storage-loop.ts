import { createFinding } from "../core/analyzer"
import type { Finding, RuleDefinition } from "../core/types"
import { getFunctionTargets, hasUserControlledLoopBound, walkFunction } from "./helpers"

export const unboundedStorageLoopRule: RuleDefinition = {
	id: "unbounded-storage-loop",
	title: "Unbounded loop over storage or user-controlled collections",
	summary: "Flags loops whose upper bounds depend on storage arrays or user-controlled inputs.",
	severity: "medium",
	confidence: "medium",
	category: "gas",
	remediation:
		"Bound loop sizes, batch work, or move untrusted iteration out of state-changing paths.",
	run(context) {
		const findings: Finding[] = []

		for (const target of getFunctionTargets(context)) {
			walkFunction(target, ({ node }) => {
				if (!["ForStatement", "WhileStatement", "DoWhileStatement"].includes(node.type)) {
					return
				}

				if (
					hasUserControlledLoopBound(node, target.contract.stateVariables, target.fn.parameters)
				) {
					findings.push(
						createFinding(target.file, unboundedStorageLoopRule, node, {
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} contains a loop with a storage- or input-dependent bound.`,
						}),
					)
				}
			})
		}

		return findings
	},
}
