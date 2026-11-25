import { describe, expect, test } from "vitest"

import { renderHtmlReport } from "../src/reporters/html"
import { renderJsonReport } from "../src/reporters/json"
import { renderTextReport } from "../src/reporters/text"
import { analyzeFixture, normalizeSnapshot } from "./helpers"

describe("reporters", () => {
	test("render text, json, and html reports for the vulnerable fixture", async () => {
		const { result } = await analyzeFixture("plain-project")
		const stableResult = {
			...result,
			target: normalizeSnapshot(result.target).replaceAll("\\", "/"),
			findings: result.findings.map((finding) => ({
				...finding,
				location: {
					...finding.location,
					filePath: normalizeSnapshot(finding.location.filePath).replaceAll("\\", "/"),
				},
			})),
		}

		const payload = {
			text: renderTextReport(stableResult, false),
			json: renderJsonReport(stableResult),
			html: renderHtmlReport(stableResult),
		}

		expect(payload).toMatchSnapshot()
	})
})
