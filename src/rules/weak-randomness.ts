import { createFinding } from "../core/analyzer"
import type { Finding, RuleDefinition } from "../core/types"
import {
	getFunctionTargets,
	isBlockEntropySource,
	isRandomnessUsage,
	walkFunction,
} from "./helpers"

export const weakRandomnessRule: RuleDefinition = {
	id: "weak-randomness",
	title: "Timestamp or block value used as randomness",
	summary: "Flags block-derived entropy used in randomness-like flows.",
	severity: "medium",
	confidence: "medium",
	category: "entropy",
	remediation:
		"Use a verifiable randomness source or a commit-reveal design instead of block-derived entropy.",
	run(context) {
		const findings: Finding[] = []

		for (const target of getFunctionTargets(context)) {
			walkFunction(target, ({ node, ancestors }) => {
				if (isBlockEntropySource(node) && isRandomnessUsage(node, ancestors, target.fn.name)) {
					findings.push(
						createFinding(target.file, weakRandomnessRule, node, {
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} uses block-controlled values in a randomness-like expression.`,
						}),
					)
				}
			})
		}

		return findings
	},
}
