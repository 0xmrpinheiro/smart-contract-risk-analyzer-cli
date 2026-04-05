import { createFinding } from "../core/analyzer"
import type { Finding, RuleDefinition } from "../core/types"
import { getFunctionTargets, isLowLevelCall, isStateWrite, walkFunction } from "./helpers"

export const externalCallBeforeStateUpdateRule: RuleDefinition = {
	id: "external-call-before-state-update",
	title: "External call before state update",
	summary: "Flags functions that make an external low-level call before mutating state.",
	severity: "high",
	confidence: "medium",
	category: "reentrancy",
	remediation: "Apply checks-effects-interactions and update critical state before external calls.",
	run(context) {
		const findings: Finding[] = []

		for (const target of getFunctionTargets(context)) {
			const stateVariables = new Set(target.contract.stateVariables)
			const events: Array<{ type: "call" | "write"; node: any }> = []

			walkFunction(target, ({ node }) => {
				if (node.type === "FunctionCall" && isLowLevelCall(node)) {
					events.push({ type: "call", node })
				}

				if (isStateWrite(node, stateVariables)) {
					events.push({ type: "write", node })
				}
			})

			const firstRiskyCall = events.findIndex((event) => event.type === "call")
			const laterStateWrite = events.findIndex(
				(event, index) => index > firstRiskyCall && event.type === "write",
			)

			if (firstRiskyCall >= 0 && laterStateWrite >= 0) {
				findings.push(
					createFinding(
						target.file,
						externalCallBeforeStateUpdateRule,
						events[firstRiskyCall].node,
						{
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} performs an external call before updating contract state.`,
						},
					),
				)
				continue
			}

			const fallbackLocation = findSourcePattern(
				target.file.content,
				target.fn.node.body?.loc?.start?.line ?? target.fn.node.loc?.start?.line ?? 1,
				target.fn.node.body?.loc?.end?.line ?? target.fn.node.loc?.end?.line ?? 1,
				target.contract.stateVariables,
			)

			if (fallbackLocation) {
				findings.push(
					createFinding(
						target.file,
						externalCallBeforeStateUpdateRule,
						{
							loc: {
								start: {
									line: fallbackLocation.line,
									column: fallbackLocation.column,
								},
							},
						},
						{
							contractName: target.contract.name,
							functionName: target.fn.name,
							message: `Function ${target.contract.name}.${target.fn.name} performs an external call before updating contract state.`,
						},
					),
				)
			}
		}

		return findings
	},
}

function findSourcePattern(
	fileContent: string,
	startLine: number,
	endLine: number,
	stateVariables: string[],
): { line: number; column: number } | undefined {
	const lines = fileContent.split(/\r?\n/u)
	const snippet = lines.slice(startLine - 1, endLine).join("\n")
	const externalCallPattern = /\.(call|delegatecall|staticcall|send|transfer)\s*(\{|[(])/u
	const callMatch = snippet.match(externalCallPattern)

	if (!callMatch || callMatch.index === undefined) {
		return undefined
	}

	for (const stateVariable of stateVariables) {
		const statePattern = new RegExp(
			`\\b${escapeRegExp(stateVariable)}\\b(?:\\[[^\\]]+\\])?(?:\\.[A-Za-z_][A-Za-z0-9_]*)?\\s*(?:=|\\+=|-=|\\+\\+|--|\\.push\\(|\\.pop\\()`,
			"u",
		)
		const afterCall = snippet.slice(callMatch.index + callMatch[0].length)
		const stateMatch = afterCall.match(statePattern)

		if (stateMatch && stateMatch.index !== undefined) {
			const snippetUntilCall = snippet.slice(0, callMatch.index)
			const lineOffset = snippetUntilCall.split("\n").length - 1
			const line = startLine + lineOffset
			const lastLine = snippetUntilCall.split("\n").at(-1) ?? ""

			return {
				line,
				column: lastLine.length + 1,
			}
		}
	}

	return undefined
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
