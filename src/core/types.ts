export type Severity = "low" | "medium" | "high" | "critical"
export type Confidence = "low" | "medium" | "high"
export type ProjectType = "auto" | "foundry" | "hardhat" | "plain"
export type ResolvedProjectType = Exclude<ProjectType, "auto">

export interface SourceLocation {
	filePath: string
	relativePath: string
	line: number
	column: number
}

export interface Finding {
	ruleId: string
	title: string
	severity: Severity
	confidence: Confidence
	category: string
	message: string
	remediation: string
	location: SourceLocation
	contractName?: string
	functionName?: string
}

export interface SummaryCounts {
	total: number
	critical: number
	high: number
	medium: number
	low: number
}

export interface TriggeredRuleSummary {
	ruleId: string
	title: string
	severity: Severity
	category: string
	count: number
}

export interface AnalysisResult {
	tool: string
	version: string
	target: string
	projectType: ResolvedProjectType
	projectRoot: string
	analyzedFiles: string[]
	entryFiles: string[]
	score: number
	summary: SummaryCounts
	findings: Finding[]
	rulesTriggered: TriggeredRuleSummary[]
}

export interface AnalyzeOptions {
	targetPath: string
	projectType: ProjectType
	minSeverity: Severity
	failOn: Severity
}

export interface RuleDefinition {
	id: string
	title: string
	summary: string
	severity: Severity
	confidence: Confidence
	category: string
	remediation: string
	run: (context: AnalysisContext) => Finding[]
}

export interface ResolvedImport {
	specifier: string
	resolvedPath: string
}

export interface FunctionMetadata {
	name: string
	visibility: string
	stateMutability?: string
	modifiers: string[]
	parameters: string[]
	node: any
}

export interface ContractMetadata {
	name: string
	kind: string
	stateVariables: string[]
	functions: FunctionMetadata[]
	node: any
}

export interface ParsedSource {
	filePath: string
	relativePath: string
	content: string
	ast: any
	imports: ResolvedImport[]
	contracts: ContractMetadata[]
}

export interface Remapping {
	prefix: string
	target: string
}

export interface PreparedProject {
	projectRoot: string
	targetPath: string
	projectType: ResolvedProjectType
	entryFiles: string[]
	remappings: Remapping[]
}

export interface AnalysisContext {
	project: PreparedProject
	parsedFiles: ParsedSource[]
}

export interface AnalyzeExecution {
	result: AnalysisResult
	rawFindings: Finding[]
	hasFailingFindings: boolean
}
