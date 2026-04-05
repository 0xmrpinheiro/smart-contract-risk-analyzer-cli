export class AnalysisFailure extends Error {
	readonly exitCode: number
	readonly reason: "usage" | "parse" | "import"

	constructor(reason: "usage" | "parse" | "import", message: string) {
		super(message)
		this.name = "AnalysisFailure"
		this.reason = reason
		this.exitCode = 2
	}
}
