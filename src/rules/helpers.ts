import type {
	AnalysisContext,
	ContractMetadata,
	FunctionMetadata,
	ParsedSource,
} from "../core/types"
import { walkAst } from "../core/utils"

export interface FunctionTarget {
	file: ParsedSource
	contract: ContractMetadata
	fn: FunctionMetadata
}

const ACCESS_CONTROL_MODIFIER_RE =
	/(only|owner|admin|role|auth|govern|guardian|paus|operator|manager)/i
const AUTHORITY_IDENTIFIER_RE =
	/(owner|admin|governor|governance|guardian|pauser|operator|manager|authority|role)/i
const SENSITIVE_FUNCTION_RE =
	/^(withdraw|pause|unpause|mint|burn|set|update|upgrade|sweep|rescue|emergency|destroy|initialize|configure)/i
const SENSITIVE_STATE_RE =
	/(owner|admin|guardian|paus|fee|whitelist|blacklist|implementation|treasury|operator)/i

export function getFunctionTargets(context: AnalysisContext): FunctionTarget[] {
	const targets: FunctionTarget[] = []

	for (const file of context.parsedFiles) {
		for (const contract of file.contracts) {
			if (contract.kind === "interface") {
				continue
			}

			for (const fn of contract.functions) {
				if (fn.node?.body) {
					targets.push({
						file,
						contract,
						fn,
					})
				}
			}
		}
	}

	return targets
}

export function walkFunction(target: FunctionTarget, visitor: Parameters<typeof walkAst>[1]): void {
	walkAst(target.fn.node.body, visitor)
}

export function getMemberAccessName(node: any): string | undefined {
	if (node?.type === "MemberAccess" && typeof node.memberName === "string") {
		return node.memberName
	}

	return undefined
}

export function getCallName(callNode: any): string | undefined {
	if (callNode?.type !== "FunctionCall") {
		return undefined
	}

	const callee = unwrapCallExpression(callNode.expression)

	if (callee?.type === "Identifier" && typeof callee.name === "string") {
		return callee.name
	}

	return getMemberAccessName(callee)
}

export function isLowLevelCall(callNode: any): boolean {
	const memberName = getCallName(callNode)
	return Boolean(
		memberName && ["call", "delegatecall", "staticcall", "send", "transfer"].includes(memberName),
	)
}

export function isUncheckedLowLevelCall(callNode: any, parent: any): boolean {
	return isLowLevelCall(callNode) && parent?.type === "ExpressionStatement"
}

export function isDelegatecall(callNode: any): boolean {
	return getCallName(callNode) === "delegatecall"
}

export function isSelfdestructCall(callNode: any): boolean {
	if (callNode?.type !== "FunctionCall") {
		return false
	}

	if (callNode.expression?.type === "Identifier") {
		return ["selfdestruct", "suicide"].includes(callNode.expression.name)
	}

	return getCallName(callNode) === "selfdestruct"
}

export function isTokenTransferCall(callNode: any): boolean {
	const memberName = getCallName(callNode)
	return Boolean(memberName && ["transfer", "transferFrom", "safeTransfer"].includes(memberName))
}

export function isTxOrigin(node: any): boolean {
	return (
		node?.type === "MemberAccess" &&
		node.expression?.type === "Identifier" &&
		node.expression.name === "tx" &&
		node.memberName === "origin"
	)
}

export function isBlockEntropySource(node: any): boolean {
	if (node?.type === "Identifier" && node.name === "now") {
		return true
	}

	if (
		node?.type === "MemberAccess" &&
		node.expression?.type === "Identifier" &&
		node.expression.name === "block"
	) {
		return ["timestamp", "prevrandao", "difficulty"].includes(node.memberName)
	}

	return (
		node?.type === "FunctionCall" &&
		node.expression?.type === "Identifier" &&
		node.expression.name === "blockhash"
	)
}

export function getBaseIdentifier(node: any): string | undefined {
	if (!node) {
		return undefined
	}

	if (node.type === "Identifier" && typeof node.name === "string") {
		return node.name
	}

	if (node.type === "MemberAccess") {
		return getBaseIdentifier(node.expression)
	}

	if (node.type === "IndexAccess") {
		return getBaseIdentifier(node.base ?? node.baseExpression ?? node.expression)
	}

	return undefined
}

export function isStateWrite(node: any, stateVariables: Set<string>): boolean {
	if (node?.type === "Assignment") {
		const identifier = getBaseIdentifier(node.left)
		return Boolean(identifier && stateVariables.has(identifier))
	}

	if (node?.type === "UnaryOperation" && ["++", "--", "delete"].includes(node.operator)) {
		const identifier = getBaseIdentifier(node.subExpression)
		return Boolean(identifier && stateVariables.has(identifier))
	}

	if (node?.type === "FunctionCall" && node.expression?.type === "MemberAccess") {
		const identifier = getBaseIdentifier(node.expression.expression)
		return Boolean(
			identifier &&
				stateVariables.has(identifier) &&
				["push", "pop"].includes(node.expression.memberName),
		)
	}

	return false
}

function unwrapCallExpression(expression: any): any {
	if (expression?.type === "FunctionCallOptions" || expression?.type === "NameValueExpression") {
		return expression.expression
	}

	return expression
}

export function collectStateWrites(bodyNode: any, stateVariables: string[]): any[] {
	const stateSet = new Set(stateVariables)
	const writes: any[] = []

	walkAst(bodyNode, ({ node }) => {
		if (isStateWrite(node, stateSet)) {
			writes.push(node)
		}
	})

	return writes
}

export function hasAccessControl(target: FunctionTarget): boolean {
	if (target.fn.modifiers.some((modifier) => ACCESS_CONTROL_MODIFIER_RE.test(modifier))) {
		return true
	}

	let guarded = false

	walkFunction(target, ({ node }) => {
		if (guarded) {
			return
		}

		if (node.type === "FunctionCall" && isRequireLike(node)) {
			guarded = expressionHasAuthorityCheck(node.arguments?.[0])
			return
		}

		if (node.type === "IfStatement") {
			guarded = expressionHasAuthorityCheck(node.condition)
		}
	})

	return guarded
}

export function isSensitiveFunction(target: FunctionTarget): boolean {
	const writes = collectStateWrites(target.fn.node.body, target.contract.stateVariables)
	const writesSensitiveState = writes.some((writeNode) => {
		const identifier =
			writeNode.type === "Assignment"
				? getBaseIdentifier(writeNode.left)
				: getBaseIdentifier(writeNode.subExpression ?? writeNode.expression)
		return Boolean(identifier && SENSITIVE_STATE_RE.test(identifier))
	})

	const riskyName = SENSITIVE_FUNCTION_RE.test(target.fn.name)
	let fundMovement = false
	let selfdestruct = false

	walkFunction(target, ({ node }) => {
		if (node.type === "FunctionCall" && isSensitiveFundMovementCall(node)) {
			fundMovement = true
		}

		if (isSelfdestructCall(node)) {
			selfdestruct = true
		}
	})

	return fundMovement || selfdestruct || (writes.length > 0 && (riskyName || writesSensitiveState))
}

function isSensitiveFundMovementCall(callNode: any): boolean {
	if (isTokenTransferCall(callNode)) {
		return true
	}

	if (!isLowLevelCall(callNode)) {
		return false
	}

	const callee = unwrapCallExpression(callNode.expression)
	if (callee?.type !== "MemberAccess") {
		return true
	}

	return !isMsgSenderValue(callee.expression)
}

function isMsgSenderValue(node: any): boolean {
	if (
		node?.type === "MemberAccess" &&
		node.expression?.type === "Identifier" &&
		node.expression.name === "msg" &&
		node.memberName === "sender"
	) {
		return true
	}

	if (
		node?.type === "FunctionCall" &&
		node.expression?.type === "Identifier" &&
		["address", "payable"].includes(node.expression.name) &&
		node.arguments?.length === 1
	) {
		return isMsgSenderValue(node.arguments[0])
	}

	return false
}

export function isExternallyReachable(target: FunctionTarget): boolean {
	return ["public", "external"].includes(target.fn.visibility)
}

export function isMutableFunction(target: FunctionTarget): boolean {
	return !["view", "pure"].includes(target.fn.stateMutability ?? "")
}

export function isConstructorLike(target: FunctionTarget): boolean {
	return target.fn.name === "constructor" || target.fn.node?.kind === "constructor"
}

export function hasUserControlledLoopBound(
	loopNode: any,
	stateVariables: string[],
	parameterNames: string[],
): boolean {
	if (!loopNode?.condition) {
		return true
	}

	const stateSet = new Set(stateVariables)
	const parameterSet = new Set(parameterNames)
	let risky = false

	walkAst(loopNode.condition, ({ node }) => {
		if (risky) {
			return
		}

		if (node.type === "MemberAccess" && node.memberName === "length") {
			const identifier = getBaseIdentifier(node.expression)
			if (identifier && (stateSet.has(identifier) || parameterSet.has(identifier))) {
				risky = true
			}
		}

		if (node.type === "Identifier" && parameterSet.has(node.name)) {
			risky = true
		}
	})

	return risky
}

export function isRandomnessUsage(node: any, ancestors: any[], functionName: string): boolean {
	if (/(rand|random|seed|entropy|lottery|winner)/i.test(functionName)) {
		return true
	}

	for (const ancestor of ancestors) {
		if (ancestor?.type === "BinaryOperation" && ancestor.operator === "%") {
			return true
		}

		if (ancestor?.type === "FunctionCall" && getCallName(ancestor) === "keccak256") {
			return true
		}

		if (ancestor?.type === "VariableDeclaration" && typeof ancestor.name === "string") {
			return /(rand|random|seed|entropy|lottery|winner)/i.test(ancestor.name)
		}

		if (ancestor?.type === "Assignment") {
			const identifier = getBaseIdentifier(ancestor.left)
			if (identifier && /(rand|random|seed|entropy|lottery|winner)/i.test(identifier)) {
				return true
			}
		}
	}

	return false
}

function isRequireLike(node: any): boolean {
	return (
		node.expression?.type === "Identifier" && ["require", "assert"].includes(node.expression.name)
	)
}

function expressionHasAuthorityCheck(expressionNode: any): boolean {
	let hasSenderReference = false
	let hasAuthorityReference = false

	walkAst(expressionNode, ({ node }) => {
		if (
			node.type === "MemberAccess" &&
			node.expression?.type === "Identifier" &&
			node.expression.name === "msg" &&
			node.memberName === "sender"
		) {
			hasSenderReference = true
		}

		if (node.type === "Identifier" && AUTHORITY_IDENTIFIER_RE.test(node.name)) {
			hasAuthorityReference = true
		}

		if (node.type === "FunctionCall" && typeof getCallName(node) === "string") {
			const callName = getCallName(node) ?? ""
			if (/(hasRole|checkRole|isAuthorized|isOwner|auth)/i.test(callName)) {
				hasAuthorityReference = true
			}
		}
	})

	return hasSenderReference && hasAuthorityReference
}
