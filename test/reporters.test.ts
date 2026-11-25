import { describe, expect, test } from "vitest"

import { renderHtmlReport } from "../src/reporters/html"
import { renderJsonReport } from "../src/reporters/json"
import { renderTextReport } from "../src/reporters/text"
import { analyzeFixture, normalizeSnapshot } from "./helpers"

describe("reporters", () => {
	test("render text, json, and html reports for the vulnerable fixture", async () => {
		const execution = await analyzeFixture("plain-project")
		const json = JSON.parse(normalizeSnapshot(renderJsonReport(execution.result)))
		// Normalize separators within path fields without altering escaped JSON.
		for (const finding of json.findings) {
			finding.location.filePath = finding.location.filePath.replaceAll("\\", "/")
		}
		json.target = json.target.replaceAll("\\", "/")

		const payload = {
			text: normalizeSnapshot(renderTextReport(execution.result, false)),
			json: `${JSON.stringify(json, null, 2)}\n`,
			html: normalizeSnapshot(renderHtmlReport(execution.result)),
		}

		expect(payload).toMatchSnapshot()
	})
})
