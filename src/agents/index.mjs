/**
 * Agents Module for Dario
 *
 * Exports subagent functionality, agent management, and communication utilities.
 */

export * from './subagent.mjs'
export * from './communication.mjs'

// Re-export subagent as default for backward compatibility
export { default } from './subagent.mjs'

// Convenience alias for tests
export { spawnAgent as spawn } from './subagent.mjs'

// Named exports for communication utilities
export {
  default as communication,
  extractTagContent,
  isValidMessage,
  formatMessages,
  isToolUseMessage,
  extractToolUseId,
  buildToolResultMap,
  buildToolResultMapMemoized,
  getPendingToolUseIds,
  getRunningToolUseIds,
  getErroredToolUseMessages,
  processToolResults,
  mergeToolResultMessages,
  filterEmptyContent,
  isEmptyContent,
  stripHiddenTags,
  createToolErrorResult,
  createToolSuccessResult,
  getLastAssistantMessageId,
  EMPTY_CONTENT_SENTINEL,
  WHITESPACE_ONLY_SENTINEL,
  HIDDEN_CONTENT_TAGS
} from './communication.mjs'
