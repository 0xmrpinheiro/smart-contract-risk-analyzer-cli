import { runCli } from "./cli/program"

const exitCode = await runCli(process.argv.slice(2))
process.exitCode = exitCode
