import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
	target: "node20",
	outDir: "dist",
	shims: false,
	splitting: false,
	minify: false,
	banner: {
		js: "#!/usr/bin/env node",
	},
})
