import { SEVERITY_LEVELS } from "./constants"
import type { Finding, Severity, SummaryCounts, TriggeredRuleSummary } from "./types"

const severityRank: Record<Severity, number> = {
	low: 0,
	medium: 1,
	high: 2,
	critical: 3,
}

export function compareSeverity(left: Severity, right: Severity): number {
	return severityRank[left] - severityRank[right]
}

export function severityMeetsThreshold(value: Severity, threshold: Severity): boolean {
	return compareSeverity(value, threshold) >= 0
}

export function summarizeFindings(findings: Finding[]): SummaryCounts {
	const summary: SummaryCounts = {
		total: findings.length,
		critical: 0,
		high: 0,
		medium: 0,
		low: 0,
	}

	for (const finding of findings) {
		summary[finding.severity] += 1
	}

	return summary
}

export function calculateScoreFromSummary(summary: SummaryCounts): number {
	return Math.min(
		100,
		summary.critical * 40 + summary.high * 20 + summary.medium * 8 + summary.low * 3,
	)
}

export function sortFindings(findings: Finding[]): Finding[] {
	return [...findings].sort((left, right) => {
		const severityDelta = compareSeverity(right.severity, left.severity)

		if (severityDelta !== 0) {
			return severityDelta
		}

		if (left.location.relativePath !== right.location.relativePath) {
			return left.location.relativePath.localeCompare(right.location.relativePath)
		}

		if (left.location.line !== right.location.line) {
			return left.location.line - right.location.line
		}

		return left.ruleId.localeCompare(right.ruleId)
	})
}

export function summarizeTriggeredRules(findings: Finding[]): TriggeredRuleSummary[] {
	const groups = new Map<string, TriggeredRuleSummary>()

	for (const finding of findings) {
		const existing = groups.get(finding.ruleId)

		if (existing) {
			existing.count += 1
			continue
		}

		groups.set(finding.ruleId, {
			ruleId: finding.ruleId,
			title: finding.title,
			severity: finding.severity,
			category: finding.category,
			count: 1,
		})
	}

	return [...groups.values()].sort((left, right) => {
		const severityDelta = compareSeverity(right.severity, left.severity)
		return severityDelta !== 0 ? severityDelta : left.ruleId.localeCompare(right.ruleId)
	})
}

export function assertSeverity(value: string): Severity {
	if (SEVERITY_LEVELS.includes(value as Severity)) {
		return value as Severity
	}

	throw new Error(`Unsupported severity "${value}"`)
}
