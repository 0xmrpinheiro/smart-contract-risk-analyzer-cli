import { describe, expect, test } from "vitest"

import { renderHtmlReport } from "../src/reporters/html"
import { renderJsonReport } from "../src/reporters/json"
import { renderTextReport } from "../src/reporters/text"
import { analyzeFixture, normalizeSnapshot } from "./helpers"

describe("reporters", () => {
	test("render text, json, and html reports for the vulnerable fixture", async () => {
		const execution = await analyzeFixture("plain-project")

		const payload = {
			text: normalizeSnapshot(renderTextReport(execution.result, false)),
			json: normalizeSnapshot(renderJsonReport(execution.result)),
			html: normalizeSnapshot(renderHtmlReport(execution.result)),
		}

		expect(payload).toMatchSnapshot()
	})
})
