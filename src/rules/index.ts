import type { RuleDefinition } from "../core/types"

import { delegatecallUsageRule } from "./delegatecall-usage"
import { externalCallBeforeStateUpdateRule } from "./external-call-before-state-update"
import { missingAccessControlRule } from "./missing-access-control"
import { selfdestructUsageRule } from "./selfdestruct-usage"
import { txOriginAuthRule } from "./tx-origin-auth"
import { unboundedStorageLoopRule } from "./unbounded-storage-loop"
import { uncheckedLowLevelCallRule } from "./unchecked-low-level-call"
import { weakRandomnessRule } from "./weak-randomness"

export const builtInRules: RuleDefinition[] = [
	delegatecallUsageRule,
	selfdestructUsageRule,
	externalCallBeforeStateUpdateRule,
	uncheckedLowLevelCallRule,
	txOriginAuthRule,
	missingAccessControlRule,
	weakRandomnessRule,
	unboundedStorageLoopRule,
]
