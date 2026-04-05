declare module "node:fs" {
	export interface DirentLike {
		name: string
		isDirectory(): boolean
		isFile(): boolean
	}

	export interface Stats {
		isDirectory(): boolean
		isFile(): boolean
	}

	export const promises: {
		mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
		mkdtemp(prefix: string): Promise<string>
		readFile(path: string, encoding: string): Promise<string>
		readdir(path: string, options?: { withFileTypes?: boolean }): Promise<DirentLike[]>
		rm(path: string, options: { recursive?: boolean; force?: boolean }): Promise<void>
		stat(path: string): Promise<Stats>
		writeFile(path: string, data: string, encoding?: string): Promise<void>
	}
}

declare module "node:os" {
	const os: {
		tmpdir(): string
	}

	export default os
}

declare module "node:path" {
	const path: {
		dirname(path: string): string
		extname(path: string): string
		join(...paths: string[]): string
		normalize(path: string): string
		relative(from: string, to: string): string
		resolve(...paths: string[]): string
		sep: string
	}

	export default path
}

declare module "@solidity-parser/parser/dist/index.cjs.js" {
	export function parse(source: string, options?: Record<string, unknown>): any
}

declare module "smol-toml" {
	export function parse(source: string): unknown
}

declare module "commander" {
	export class CommanderError extends Error {
		exitCode: number
	}

	export class Option {
		constructor(flags: string, description?: string)
		choices(values: string[]): this
		default(value: string): this
	}

	export class Command {
		action(handler: (...args: any[]) => any): this
		addOption(option: Option): this
		argument(definition: string, description?: string): this
		command(name: string): Command
		configureOutput(output: {
			writeErr?: (value: string) => void
			writeOut?: (value: string) => void
		}): this
		description(text: string): this
		exitOverride(): this
		name(name: string): this
		option(flags: string, description?: string): this
		parseAsync(argv: string[], options?: { from?: string }): Promise<void>
		showHelpAfterError(): this
	}
}

declare module "tsup" {
	export function defineConfig(config: Record<string, unknown>): Record<string, unknown>
}

declare module "vitest" {
	export const describe: any
	export const expect: any
	export const test: any
}

declare module "vitest/config" {
	export function defineConfig(config: Record<string, unknown>): Record<string, unknown>
}

declare const process: {
	argv: string[]
	cwd(): string
	exitCode?: number
	stderr: { write(chunk: string): void }
	stdout: { write(chunk: string): void }
}
