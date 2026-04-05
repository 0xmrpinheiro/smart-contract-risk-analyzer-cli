import { createFinding } from "../core/analyzer"
import type { RuleDefinition } from "../core/types"
import {
	getFunctionTargets,
	hasAccessControl,
	isConstructorLike,
	isExternallyReachable,
	isMutableFunction,
	isSensitiveFunction,
} from "./helpers"

export const missingAccessControlRule: RuleDefinition = {
	id: "missing-access-control",
	title: "Missing access control on sensitive function",
	summary: "Flags public or external sensitive functions that lack obvious authorization checks.",
	severity: "high",
	confidence: "medium",
	category: "authorization",
	remediation:
		"Protect sensitive state-changing and fund-moving functions with explicit role or ownership checks.",
	run(context) {
		const findings = []

		for (const target of getFunctionTargets(context)) {
			if (
				isConstructorLike(target) ||
				!isExternallyReachable(target) ||
				!isMutableFunction(target) ||
				hasAccessControl(target) ||
				!isSensitiveFunction(target)
			) {
				continue
			}

			findings.push(
				createFinding(target.file, missingAccessControlRule, target.fn.node, {
					contractName: target.contract.name,
					functionName: target.fn.name,
					message: `Function ${target.contract.name}.${target.fn.name} appears sensitive but lacks obvious access control.`,
				}),
			)
		}

		return findings
	},
}
