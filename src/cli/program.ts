import { promises as fs } from "node:fs"
import path from "node:path"

import { Command, CommanderError, Option } from "commander"

import { analyzeTarget } from "../core/analyzer"
import { DEFAULT_FAIL_ON, DEFAULT_MIN_SEVERITY, SEVERITY_LEVELS } from "../core/constants"
import { AnalysisFailure } from "../core/errors"
import type { ProjectType, Severity } from "../core/types"
import { renderHtmlReport } from "../reporters/html"
import { renderJsonReport } from "../reporters/json"
import { renderRulesList, renderTextReport } from "../reporters/text"
import { builtInRules } from "../rules"

export interface CliIo {
	cwd: () => string
	stdout: (message: string) => void
	stderr: (message: string) => void
}

const DEFAULT_IO: CliIo = {
	cwd: () => process.cwd(),
	stdout: (message) => process.stdout.write(message),
	stderr: (message) => process.stderr.write(message),
}

export async function runCli(argv: string[], io: CliIo = DEFAULT_IO): Promise<number> {
	const program = new Command()
	let exitCode = 0

	program
		.name("scra")
		.description("Smart Contract Risk Analyzer")
		.showHelpAfterError()
		.configureOutput({
			writeOut: (value: string) => io.stdout(value),
			writeErr: (value: string) => io.stderr(value),
		})
		.exitOverride()

	program
		.command("analyze")
		.description("Analyze a Solidity file or project directory.")
		.argument("<target>", "File or directory to analyze")
		.addOption(
			new Option("--project <type>", "Project layout to use")
				.choices(["auto", "foundry", "hardhat", "plain"])
				.default("auto"),
		)
		.addOption(
			new Option("--format <format>", "Stdout format").choices(["text", "json"]).default("text"),
		)
		.addOption(
			new Option("--min-severity <severity>", "Minimum severity to include in reports")
				.choices([...SEVERITY_LEVELS])
				.default(DEFAULT_MIN_SEVERITY),
		)
		.addOption(
			new Option("--fail-on <severity>", "Return exit code 1 when findings meet this threshold")
				.choices([...SEVERITY_LEVELS])
				.default(DEFAULT_FAIL_ON),
		)
		.option("--json <path>", "Write the JSON report to a file")
		.option("--html <path>", "Write the HTML report to a file")
		.option("--no-color", "Disable ANSI colors in text output")
		.action(async (target: string, options: Record<string, string | boolean | undefined>) => {
			exitCode = await handleAnalyze(target, options, io)
		})

	program
		.command("rules")
		.description("List all built-in rules.")
		.option("--no-color", "Disable ANSI colors in text output")
		.action((options: Record<string, boolean | undefined>) => {
			io.stdout(renderRulesList(builtInRules, options.color !== false))
		})

	try {
		await program.parseAsync(normalizeUserArgv(argv), { from: "user" })
		return exitCode
	} catch (error) {
		if (error instanceof AnalysisFailure) {
			io.stderr(`${error.message}\n`)
			return error.exitCode
		}

		if (error instanceof CommanderError) {
			const commanderError = error as CommanderError
			return commanderError.exitCode === 1 ? 2 : commanderError.exitCode
		}

		throw error
	}
}

function normalizeUserArgv(argv: string[]): string[] {
	let startIndex = 0

	while (argv[startIndex] === "--") {
		startIndex += 1
	}

	return argv.slice(startIndex)
}

async function handleAnalyze(
	target: string,
	options: Record<string, string | boolean | undefined>,
	io: CliIo,
): Promise<number> {
	const resolvedTarget = path.resolve(io.cwd(), target)
	const execution = await analyzeTarget(
		{
			targetPath: resolvedTarget,
			projectType: (options.project as ProjectType | undefined) ?? "auto",
			minSeverity: (options.minSeverity as Severity | undefined) ?? DEFAULT_MIN_SEVERITY,
			failOn: (options.failOn as Severity | undefined) ?? DEFAULT_FAIL_ON,
		},
		builtInRules,
	)

	const useColor = options.color !== false
	const stdoutFormat = options.format === "json" ? "json" : "text"
	const jsonReport = renderJsonReport(execution.result)

	if (stdoutFormat === "json") {
		io.stdout(jsonReport)
	} else {
		io.stdout(renderTextReport(execution.result, useColor))
	}

	if (typeof options.json === "string") {
		await writeReport(options.json, jsonReport, io.cwd())
	}

	if (typeof options.html === "string") {
		await writeReport(options.html, renderHtmlReport(execution.result), io.cwd())
	}

	return execution.hasFailingFindings ? 1 : 0
}

async function writeReport(filePath: string, content: string, cwd: string): Promise<void> {
	const absolutePath = path.resolve(cwd, filePath)
	await fs.mkdir(path.dirname(absolutePath), { recursive: true })
	await fs.writeFile(absolutePath, content, "utf8")
}
