import { createFinding } from "../core/analyzer"
import type { Finding, RuleDefinition } from "../core/types"
import { getFunctionTargets, isTxOrigin, walkFunction } from "./helpers"

export const txOriginAuthRule: RuleDefinition = {
	id: "tx-origin-auth",
	title: "tx.origin used for authorization",
	summary: "Flags trust decisions that reference tx.origin.",
	severity: "high",
	confidence: "medium",
	category: "authorization",
	remediation: "Use msg.sender or explicit role checks instead of tx.origin for access control.",
	run(context) {
		const findings: Finding[] = []

		for (const target of getFunctionTargets(context)) {
			walkFunction(target, ({ node }) => {
				if (isTxOrigin(node)) {
					findings.push(
						createFinding(target.file, txOriginAuthRule, node, {
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} references tx.origin, which is unsafe for authorization decisions.`,
						}),
					)
				}
			})
		}

		return findings
	},
}
