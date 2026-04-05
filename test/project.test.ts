import path from "node:path"

import { describe, expect, test } from "vitest"

import { prepareProject, resolveImportSpecifier } from "../src/core/project"
import { fixturePath } from "./helpers"

describe("project preparation", () => {
	test("detects a plain Solidity folder", async () => {
		const project = await prepareProject(fixturePath("plain-project"), "auto")

		expect(project.projectType).toBe("plain")
		expect(project.entryFiles).toHaveLength(2)
	})

	test("detects a Foundry project and loads remappings", async () => {
		const project = await prepareProject(fixturePath("foundry-project"), "auto")

		expect(project.projectType).toBe("foundry")
		expect(project.remappings).toContainEqual({
			prefix: "openzeppelin-contracts/",
			target: "lib/openzeppelin-contracts/contracts/",
		})
	})

	test("detects a Hardhat project", async () => {
		const project = await prepareProject(fixturePath("hardhat-project"), "auto")

		expect(project.projectType).toBe("hardhat")
		expect(project.entryFiles).toEqual([
			path.join(fixturePath("hardhat-project"), "contracts", "HardhatVault.sol"),
		])
	})

	test("resolves Foundry remapped imports", async () => {
		const project = await prepareProject(fixturePath("foundry-project"), "auto")
		const importer = path.join(fixturePath("foundry-project"), "src", "FoundryToken.sol")
		const resolved = await resolveImportSpecifier(
			"openzeppelin-contracts/token/ERC20/ERC20.sol",
			importer,
			project,
		)

		expect(resolved).toBe(
			path.join(
				fixturePath("foundry-project"),
				"lib",
				"openzeppelin-contracts",
				"contracts",
				"token",
				"ERC20",
				"ERC20.sol",
			),
		)
	})

	test("resolves Hardhat node_modules imports", async () => {
		const project = await prepareProject(fixturePath("hardhat-project"), "auto")
		const importer = path.join(fixturePath("hardhat-project"), "contracts", "HardhatVault.sol")
		const resolved = await resolveImportSpecifier(
			"@openzeppelin/contracts/token/ERC20/ERC20.sol",
			importer,
			project,
		)

		expect(resolved).toBe(
			path.join(
				fixturePath("hardhat-project"),
				"node_modules",
				"@openzeppelin",
				"contracts",
				"token",
				"ERC20",
				"ERC20.sol",
			),
		)
	})
})
