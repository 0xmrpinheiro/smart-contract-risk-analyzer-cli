import type { AnalysisResult } from "../core/types"

export function renderJsonReport(result: AnalysisResult): string {
	return `${JSON.stringify(result, null, 2)}\n`
}
