import type { AnalysisResult, RuleDefinition, Severity } from "../core/types"
import { groupFindingsByContract } from "../core/utils"

const severityColor: Record<Severity, number> = {
	low: 36,
	medium: 33,
	high: 31,
	critical: 35,
}

export function renderTextReport(result: AnalysisResult, useColor: boolean): string {
	const lines: string[] = []

	lines.push(`${bold("Smart Contract Risk Analyzer", useColor)} v${result.version}`)
	lines.push(`Target: ${result.target}`)
	lines.push(`Project type: ${result.projectType}`)
	lines.push(
		`Analyzed files: ${result.analyzedFiles.length} (${result.entryFiles.length} entry files)`,
	)
	lines.push(`Risk score: ${colorizeScore(result.score, useColor)}/100`)
	lines.push(
		`Severity summary: critical ${result.summary.critical} | high ${result.summary.high} | medium ${result.summary.medium} | low ${result.summary.low}`,
	)

	if (result.findings.length === 0) {
		lines.push("")
		lines.push("No findings at or above the selected severity filter.")
		return `${lines.join("\n")}\n`
	}

	for (const [groupName, findings] of groupFindingsByContract(result.findings)) {
		lines.push("")
		lines.push(bold(groupName, useColor))

		for (const finding of findings) {
			const severityLabel = paint(
				finding.severity.toUpperCase(),
				severityColor[finding.severity],
				useColor,
			)
			lines.push(
				`  [${severityLabel}] ${finding.title} - ${finding.location.relativePath}:${finding.location.line}:${finding.location.column}`,
			)
			lines.push(`    Rule: ${finding.ruleId}`)
			lines.push(`    Function: ${finding.functionName ?? "n/a"}`)
			lines.push(`    Message: ${finding.message}`)
			lines.push(`    Remediation: ${finding.remediation}`)
		}
	}

	lines.push("")
	lines.push("Triggered rules:")
	for (const rule of result.rulesTriggered) {
		lines.push(`- ${rule.ruleId} (${rule.severity}, ${rule.count} findings)`)
	}

	return `${lines.join("\n")}\n`
}

export function renderRulesList(rules: RuleDefinition[], useColor: boolean): string {
	const lines = [`${bold("Built-in Rules", useColor)} (${rules.length})`, ""]

	for (const rule of rules) {
		lines.push(
			`- ${paint(rule.severity.toUpperCase(), severityColor[rule.severity], useColor)} ${rule.id}: ${rule.summary}`,
		)
		lines.push(`  Category: ${rule.category}`)
		lines.push(`  Remediation: ${rule.remediation}`)
	}

	return `${lines.join("\n")}\n`
}

function colorizeScore(score: number, useColor: boolean): string {
	if (score >= 70) {
		return paint(String(score), 31, useColor)
	}

	if (score >= 35) {
		return paint(String(score), 33, useColor)
	}

	return paint(String(score), 32, useColor)
}

function bold(value: string, useColor: boolean): string {
	return useColor ? `\u001B[1m${value}\u001B[22m` : value
}

function paint(value: string, color: number, useColor: boolean): string {
	return useColor ? `\u001B[${color}m${value}\u001B[39m` : value
}
