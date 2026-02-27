/**
 * Dario Agent Communication Module
 *
 * This module handles message formatting and tool result processing between
 * the main agent and the API. It provides utilities for:
 *
 * - Extracting content from XML-like tags in responses
 * - Validating message content for display
 * - Formatting messages for the conversation flow
 * - Processing tool use results and associating them with tool calls
 * - Handling tool rejections and errors
 * - Extracting and filtering message content
 *
 * Message Flow:
 * 1. User sends message -> converted to API format
 * 2. API responds with assistant message (may contain tool_use blocks)
 * 3. Tool results are collected and formatted
 * 4. Progress events are interleaved with tool calls
 * 5. Messages are merged/filtered for display
 *
 * Tool Use Flow:
 * 1. Assistant requests tool_use with unique ID
 * 2. Tool runs and returns result
 * 3. Result is wrapped in tool_result with matching tool_use_id
 * 4. Progress events track state
 */

/**
 * Sentinel values for empty content handling
 */
export const EMPTY_CONTENT_SENTINEL = '[Empty response]'
export const WHITESPACE_ONLY_SENTINEL = '[Whitespace only]'

/**
 * Tags to strip from visible content (internal metadata)
 */
export const HIDDEN_CONTENT_TAGS = [
  'commit_analysis',
  'context',
  'function_analysis',
  'pr_analysis'
]

// ============================================================================
// XML/Tag Content Extraction
// ============================================================================

/**
 * Extract content from XML-like tags in a string
 *
 * Handles nested tags by tracking depth and only returning content
 * from properly balanced top-level matches.
 *
 * @param {string} text - The text to search in
 * @param {string} tagName - The tag name to extract content from
 * @returns {string|null} The extracted content, or null if not found
 *
 * @example
 * extractTagContent('<result>Hello World</result>', 'result')
 * // Returns: 'Hello World'
 *
 * @example
 * // Handles nested tags
 * extractTagContent('<outer><inner>text</inner></outer>', 'outer')
 * // Returns: '<inner>text</inner>'
 */
export function extractTagContent(text, tagName) {
  // Early validation - both text and tag must be non-empty strings
  if (!text.trim() || !tagName.trim()) {
    return null
  }

  // Escape special regex characters in tag name
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Match opening tag (with optional attributes) through closing tag
  const fullMatchRegex = new RegExp(
    `<${escapedTag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`,
    'gi'
  )

  // For tracking nesting depth
  const openTagRegex = new RegExp(`<${escapedTag}(?:\\s+[^>]*?)?>`, 'gi')
  const closeTagRegex = new RegExp(`<\\/${escapedTag}>`, 'gi')

  let match
  let searchStart = 0
  let nestingDepth = 0

  while ((match = fullMatchRegex.exec(text)) !== null) {
    const matchedContent = match[1]
    const precedingText = text.slice(searchStart, match.index)

    // Count open tags in preceding text
    nestingDepth = 0
    openTagRegex.lastIndex = 0
    while (openTagRegex.exec(precedingText) !== null) {
      nestingDepth++
    }

    // Count close tags in preceding text
    closeTagRegex.lastIndex = 0
    while (closeTagRegex.exec(precedingText) !== null) {
      nestingDepth--
    }

    // Only return content if we're at the top level (depth 0)
    if (nestingDepth === 0 && matchedContent) {
      return matchedContent
    }

    searchStart = match.index + match[0].length
  }

  return null
}

// ============================================================================
// Message Validation
// ============================================================================

/**
 * Validate that a message has displayable content
 *
 * Filters out messages that are empty, whitespace-only, or contain
 * only sentinel placeholder values.
 *
 * @param {Object} message - The message to validate
 * @param {string} message.type - 'user', 'assistant', or 'progress'
 * @param {Object} message.message - The message content wrapper
 * @param {string|Array} message.message.content - The message content
 * @returns {boolean} True if message has valid displayable content
 *
 * @example
 * isValidMessage({ type: 'assistant', message: { content: 'Hello' } })
 * // Returns: true
 *
 * @example
 * isValidMessage({ type: 'assistant', message: { content: '   ' } })
 * // Returns: false (whitespace only)
 */
export function isValidMessage(message) {
  // Progress messages are always valid
  if (message.type === 'progress') {
    return true
  }

  const content = message.message.content

  // String content - check for non-empty after trim
  if (typeof content === 'string') {
    return content.trim().length > 0
  }

  // Array content - must have at least one item
  if (content.length === 0) {
    return false
  }

  // Single item that's not text - valid (could be tool_use, image, etc.)
  if (content.length > 1) {
    return true
  }

  // Single text item - validate content
  if (content[0].type !== 'text') {
    return true
  }

  const text = content[0].text.trim()
  return (
    text.length > 0 &&
    text !== EMPTY_CONTENT_SENTINEL &&
    text !== WHITESPACE_ONLY_SENTINEL
  )
}

// ============================================================================
// Message Formatting
// ============================================================================

/**
 * Split compound messages into individual content block messages
 *
 * Takes messages that may have multiple content blocks (e.g., text + tool_use)
 * and splits them into separate messages, one per content block.
 * This is useful for displaying messages in a conversation UI.
 *
 * @param {Array<Object>} messages - Array of messages to format
 * @returns {Array<Object>} Formatted messages with single content blocks
 *
 * @example
 * // Assistant message with text and tool_use gets split
 * formatMessages([{
 *   type: 'assistant',
 *   message: {
 *     content: [
 *       { type: 'text', text: 'I will run a task' },
 *       { type: 'tool_use', id: 'xyz', name: 'Bash', input: {} }
 *     ]
 *   },
 *   costUSD: 0.01,
 *   durationMs: 500
 * }])
 * // Returns two messages, each with one content block
 */
export function formatMessages(messages) {
  return messages.flatMap((message) => {
    // Progress messages pass through unchanged
    if (message.type === 'progress') {
      return [message]
    }

    // String content passes through unchanged
    if (typeof message.message.content === 'string') {
      return [message]
    }

    // Split multi-content messages into separate messages
    return message.message.content.map((contentBlock) => {
      switch (message.type) {
        case 'assistant':
          return {
            type: 'assistant',
            uuid: generateUUID(),
            message: {
              ...message.message,
              content: [contentBlock]
            },
            // Distribute cost/duration across content blocks
            costUSD: message.costUSD / message.message.content.length,
            durationMs: message.durationMs
          }
        case 'user':
          return message
        default:
          return message
      }
    })
  })
}

/**
 * Generate a UUID for message tracking
 * @returns {string} A UUID string
 */
function generateUUID() {
  // Simple UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================================================
// Tool Use Detection and Extraction
// ============================================================================

/**
 * Check if a message is an assistant tool_use request
 *
 * Identifies messages where the assistant is requesting to use a tool.
 * These messages contain costUSD metadata and have tool_use content blocks.
 *
 * @param {Object} message - The message to check
 * @returns {boolean} True if message is a tool_use request
 *
 * @example
 * isToolUseMessage({
 *   type: 'assistant',
 *   costUSD: 0.01,
 *   message: {
 *     content: [{ type: 'tool_use', id: 'abc', name: 'Bash' }]
 *   }
 * })
 * // Returns: true
 */
export function isToolUseMessage(message) {
  return (
    message.type === 'assistant' &&
    'costUSD' in message &&
    message.message.content.some((block) => block.type === 'tool_use')
  )
}

/**
 * Extract tool use ID from a message
 *
 * Gets the tool_use_id from either:
 * - An assistant message with tool_use block
 * - A user message with tool_result block
 * - A progress event
 *
 * @param {Object} message - The message to extract ID from
 * @returns {string|null} The tool use ID, or null if not found
 */
export function extractToolUseId(message) {
  switch (message.type) {
    case 'assistant':
      if (message.message.content[0]?.type !== 'tool_use') {
        return null
      }
      return message.message.content[0].id

    case 'user':
      if (message.message.content[0]?.type !== 'tool_result') {
        return null
      }
      return message.message.content[0].tool_use_id

    case 'progress':
      return message.toolUseID

    default:
      return null
  }
}

// ============================================================================
// Tool Result Processing
// ============================================================================

/**
 * Build a map of tool results by tool_use_id
 *
 * Creates a lookup table mapping tool_use_id to whether the result
 * was an error. Used for tracking which tool calls have been resolved.
 *
 * @param {Array<Object>} messages - Array of messages to scan
 * @returns {Object} Map of tool_use_id -> is_error boolean
 *
 * @example
 * const results = buildToolResultMap(messages)
 * // { 'tool_123': false, 'tool_456': true }
 */
export function buildToolResultMap(messages) {
  const resultMap = {}

  for (const message of messages) {
    if (
      message.type === 'user' &&
      Array.isArray(message.message.content) &&
      message.message.content[0]?.type === 'tool_result'
    ) {
      const toolResult = message.message.content[0]
      resultMap[toolResult.tool_use_id] = toolResult.is_error ?? false
    }
  }

  return resultMap
}

// Memoized version for performance
let memoizedResultMap = null
let memoizedResultMapInput = null

/**
 * Memoized version of buildToolResultMap
 * Caches the result to avoid recomputing for the same message array
 */
export function buildToolResultMapMemoized(messages) {
  if (memoizedResultMapInput === messages) {
    return memoizedResultMap
  }
  memoizedResultMap = buildToolResultMap(messages)
  memoizedResultMapInput = messages
  return memoizedResultMap
}

/**
 * Get the set of pending tool use IDs (no result yet)
 *
 * @param {Array<Object>} messages - Array of messages to scan
 * @returns {Set<string>} Set of tool_use_ids without corresponding results
 */
export function getPendingToolUseIds(messages) {
  const resultMap = buildToolResultMapMemoized(messages)

  return new Set(
    messages
      .filter((msg) => {
        if (msg.type !== 'assistant') return false
        if (!Array.isArray(msg.message.content)) return false
        if (msg.message.content[0]?.type !== 'tool_use') return false

        const toolId = msg.message.content[0].id
        return !(toolId in resultMap)
      })
      .map((msg) => msg.message.content[0].id)
  )
}

/**
 * Get tool use IDs that are currently running (have progress but pending)
 *
 * @param {Array<Object>} messages - Array of messages to scan
 * @returns {Set<string>} Set of currently running tool_use_ids
 */
export function getRunningToolUseIds(messages) {
  const pendingIds = getPendingToolUseIds(messages)

  // Get IDs that have progress events
  const progressIds = new Set(
    messages
      .filter((msg) => msg.type === 'progress')
      .map((msg) => msg.toolUseID)
  )

  // Return intersection - tools that are pending AND have progress
  return new Set(
    messages
      .filter((msg) => {
        if (msg.type !== 'assistant') return false
        if (msg.message.content[0]?.type !== 'tool_use') return false

        const toolId = msg.message.content[0].id

        // Either the first pending tool, or has progress and is pending
        if (toolId === pendingIds.values().next().value) return true
        if (progressIds.has(toolId) && pendingIds.has(toolId)) return true

        return false
      })
      .map((msg) => msg.message.content[0].id)
  )
}

/**
 * Get messages where tool use resulted in an error
 *
 * @param {Array<Object>} messages - Array of messages to scan
 * @returns {Array<Object>} Assistant messages whose tool calls errored
 */
export function getErroredToolUseMessages(messages) {
  const resultMap = buildToolResultMapMemoized(messages)

  return messages.filter((msg) => {
    if (msg.type !== 'assistant') return false
    if (!Array.isArray(msg.message.content)) return false
    if (msg.message.content[0]?.type !== 'tool_use') return false

    const toolId = msg.message.content[0].id
    return toolId in resultMap && resultMap[toolId] === true
  })
}

/**
 * Process and order messages with tool results
 *
 * Takes a stream of messages and ensures tool_result messages are
 * placed immediately after their corresponding tool_use messages,
 * with progress events properly interleaved.
 *
 * @param {Array<Object>} messages - Array of messages to process
 * @returns {Array<Object>} Reordered messages with proper tool association
 *
 * Message ordering:
 * 1. Assistant tool_use message
 * 2. Progress event (if any)
 * 3. User tool_result message
 * 4. Next message...
 */
export function processToolResults(messages) {
  const result = []
  const toolUseMessages = []

  for (const message of messages) {
    // Track tool_use messages for later association
    if (isToolUseMessage(message)) {
      toolUseMessages.push(message)
    }

    // Handle progress events - insert after their tool_use message
    if (message.type === 'progress') {
      const toolUseId = message.toolUseID

      // Find existing progress for this tool and replace it
      const existingProgressIndex = result.findIndex(
        (msg) => msg.type === 'progress' && msg.toolUseID === toolUseId
      )

      if (existingProgressIndex !== -1) {
        result[existingProgressIndex] = message
        continue
      }

      // Find the tool_use message this progress belongs to
      const toolUseMsg = toolUseMessages.find(
        (msg) => msg.message.content[0]?.id === toolUseId
      )

      if (toolUseMsg) {
        // Insert after the tool_use message
        const insertIndex = result.indexOf(toolUseMsg) + 1
        result.splice(insertIndex, 0, message)
        continue
      }
    }

    // Handle tool_result messages - insert after progress or tool_use
    if (
      message.type === 'user' &&
      Array.isArray(message.message.content) &&
      message.message.content[0]?.type === 'tool_result'
    ) {
      const toolUseId = message.message.content[0].tool_use_id

      // Find progress event for this tool
      const progressIndex = result.findIndex(
        (msg) => msg.type === 'progress' && msg.toolUseID === toolUseId
      )

      if (progressIndex !== -1) {
        result.splice(progressIndex + 1, 0, message)
        continue
      }

      // Find the tool_use message
      const toolUseMsg = toolUseMessages.find(
        (msg) => msg.message.content[0]?.id === toolUseId
      )

      if (toolUseMsg) {
        const insertIndex = result.indexOf(toolUseMsg) + 1
        result.splice(insertIndex, 0, message)
        continue
      }
    }

    // Regular message - just append
    result.push(message)
  }

  return result
}

// ============================================================================
// Message Consolidation
// ============================================================================

/**
 * Merge consecutive tool_result messages from the same role
 *
 * When multiple tool results come in sequence (e.g., from parallel tool use),
 * consolidate them into a single user message with multiple tool_result blocks.
 *
 * @param {Array<Object>} messages - Array of messages to merge
 * @returns {Array<Object>} Messages with consecutive tool_results merged
 */
export function mergeToolResultMessages(messages) {
  const result = []

  // Filter out progress events for the merge logic
  const nonProgressMessages = messages.filter((msg) => msg.type !== 'progress')

  for (const message of nonProgressMessages) {
    switch (message.type) {
      case 'user': {
        // Check if this is a tool_result message
        if (
          !Array.isArray(message.message.content) ||
          message.message.content[0]?.type !== 'tool_result'
        ) {
          result.push(message)
          break
        }

        // Get the last message in result
        const lastMessage = result[result.length - 1]

        // If last message is also a user tool_result, merge
        if (
          lastMessage &&
          lastMessage.type === 'user' &&
          Array.isArray(lastMessage.message.content) &&
          lastMessage.message.content[0]?.type === 'tool_result'
        ) {
          // Create merged message
          result[result.length - 1] = {
            ...lastMessage,
            message: {
              ...lastMessage.message,
              content: [...lastMessage.message.content, ...message.message.content]
            }
          }
        } else {
          result.push(message)
        }
        break
      }

      case 'assistant':
        result.push(message)
        break

      default:
        result.push(message)
    }
  }

  return result
}

// ============================================================================
// Content Filtering
// ============================================================================

/**
 * Filter out empty text blocks from content array
 *
 * Removes text blocks that are empty or whitespace-only,
 * returning at least a placeholder if all content is empty.
 *
 * @param {Array<Object>} content - Array of content blocks
 * @returns {Array<Object>} Filtered content with empty text removed
 */
export function filterEmptyContent(content) {
  const filtered = content.filter(
    (block) => block.type !== 'text' || block.text.trim().length > 0
  )

  // If everything was filtered out, return placeholder
  if (filtered.length === 0) {
    return [
      {
        type: 'text',
        text: EMPTY_CONTENT_SENTINEL,
        citations: []
      }
    ]
  }

  return filtered
}

/**
 * Check if content is effectively empty (after filtering hidden tags)
 *
 * @param {string} content - The content string to check
 * @returns {boolean} True if content is empty or contains only hidden tags
 */
export function isEmptyContent(content) {
  const stripped = stripHiddenTags(content).trim()
  return stripped === '' || stripped === EMPTY_CONTENT_SENTINEL
}

/**
 * Strip hidden/internal tags from content
 *
 * Removes XML-like tags used for internal metadata that shouldn't
 * be displayed to the user.
 *
 * @param {string} content - The content to strip tags from
 * @returns {string} Content with hidden tags removed
 */
export function stripHiddenTags(content) {
  const tagPattern = new RegExp(
    `<(${HIDDEN_CONTENT_TAGS.join('|')})>.*?</\\1>\n?`,
    'gs'
  )
  return content.replace(tagPattern, '').trim()
}

// ============================================================================
// Error Response Formatting
// ============================================================================

/**
 * Create a tool_result error response
 *
 * @param {string} toolUseId - The tool_use_id this error is for
 * @param {string} errorMessage - The error message content
 * @returns {Object} A tool_result content block marked as error
 */
export function createToolErrorResult(toolUseId, errorMessage = 'Tool failed') {
  return {
    type: 'tool_result',
    content: errorMessage,
    is_error: true,
    tool_use_id: toolUseId
  }
}

/**
 * Create a successful tool_result response
 *
 * @param {string} toolUseId - The tool_use_id this result is for
 * @param {string|Array} content - The result content
 * @returns {Object} A tool_result content block
 */
export function createToolSuccessResult(toolUseId, content) {
  return {
    type: 'tool_result',
    content: typeof content === 'string' ? content : JSON.stringify(content),
    is_error: false,
    tool_use_id: toolUseId
  }
}

// ============================================================================
// Message ID Extraction
// ============================================================================

/**
 * Get the last assistant message ID from a conversation
 *
 * Scans backwards through messages to find the most recent
 * assistant message and returns its API message ID.
 *
 * @param {Array<Object>} messages - Array of messages to scan
 * @returns {string|undefined} The message ID, or undefined if not found
 */
export function getLastAssistantMessageId(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message && message.type === 'assistant') {
      return message.message.id
    }
  }
  return undefined
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Constants
  EMPTY_CONTENT_SENTINEL,
  WHITESPACE_ONLY_SENTINEL,
  HIDDEN_CONTENT_TAGS,

  // Tag extraction
  extractTagContent,

  // Message validation
  isValidMessage,

  // Message formatting
  formatMessages,

  // Tool use detection
  isToolUseMessage,
  extractToolUseId,

  // Tool result processing
  buildToolResultMap,
  buildToolResultMapMemoized,
  getPendingToolUseIds,
  getRunningToolUseIds,
  getErroredToolUseMessages,
  processToolResults,

  // Message consolidation
  mergeToolResultMessages,

  // Content filtering
  filterEmptyContent,
  isEmptyContent,
  stripHiddenTags,

  // Error formatting
  createToolErrorResult,
  createToolSuccessResult,

  // Message ID extraction
  getLastAssistantMessageId
}
