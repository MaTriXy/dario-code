/**
 * Message utilities for Dario Code
 */

import { randomUUID } from 'crypto'

/**
 * Create a user or assistant message
 */
export function createMessage(role, content) {
  return {
    type: role,
    uuid: randomUUID(),
    message: {
      role,
      content: typeof content === 'string' ? content : content,
    },
  }
}

/**
 * Normalize messages - expand tool_use/tool_result into separate messages
 */
export function normalizeMessages(messages) {
  const normalized = []

  for (const msg of messages) {
    if (msg.type === 'progress') {
      normalized.push(msg)
      continue
    }

    if (msg.type === 'user') {
      // User messages with tool_results get expanded
      if (Array.isArray(msg.message.content)) {
        const toolResults = msg.message.content.filter(
          (c) => c.type === 'tool_result'
        )
        if (toolResults.length > 0) {
          // Create assistant message for each tool_use that these results respond to
          // Use deterministic IDs derived from the original message UUID + tool_use_id
          // so that repeated normalizeMessages calls produce stable keys for Ink's Static.
          for (const result of toolResults) {
            normalized.push({
              ...msg,
              uuid: `${msg.uuid}-tooluse-${result.tool_use_id}`,
              type: 'assistant',
              message: {
                ...msg.message,
                role: 'assistant',
                content: [
                  {
                    type: 'tool_use',
                    id: result.tool_use_id,
                    name: 'unknown', // We don't have the tool name here
                    input: {},
                  },
                ],
              },
            })
            normalized.push({
              ...msg,
              uuid: `${msg.uuid}-result-${result.tool_use_id}`,
              message: {
                ...msg.message,
                content: [result],
              },
            })
          }
          continue
        }
      }
    }

    normalized.push(msg)
  }

  return normalized
}

/**
 * Get the last message in the conversation
 */
export function getLastMessage(messages) {
  return messages[messages.length - 1]
}

/**
 * Filter messages by type
 */
export function filterMessagesByType(messages, type) {
  return messages.filter((m) => m.type === type)
}

/**
 * Get user-visible messages (exclude tool results that are part of assistant turns)
 */
export function getUserVisibleMessages(messages) {
  return messages.filter((msg) => {
    if (msg.type === 'progress') return false
    if (
      msg.type === 'user' &&
      Array.isArray(msg.message.content) &&
      msg.message.content[0]?.type === 'tool_result'
    ) {
      return false
    }
    return true
  })
}

/**
 * Check if message is empty
 */
export function isEmptyMessage(message) {
  if (typeof message.message.content === 'string') {
    return message.message.content.trim().length === 0
  }
  if (Array.isArray(message.message.content)) {
    return (
      message.message.content.length === 0 ||
      message.message.content.every(
        (c) => c.type === 'text' && c.text.trim().length === 0
      )
    )
  }
  return false
}

/**
 * Extract tool use IDs from messages
 */
export function getToolUseIDs(messages) {
  const ids = []
  for (const msg of messages) {
    if (msg.type === 'assistant') {
      for (const content of msg.message.content) {
        if (content.type === 'tool_use') {
          ids.push(content.id)
        }
      }
    }
  }
  return ids
}

/**
 * Get unresolved tool use IDs (tool_use without matching tool_result)
 */
export function getUnresolvedToolUseIDs(messages) {
  const toolUseIds = new Set()
  const toolResultIds = new Set()

  for (const msg of messages) {
    if (msg.type === 'assistant') {
      for (const content of msg.message.content) {
        if (content.type === 'tool_use') {
          toolUseIds.add(content.id)
        }
      }
    }
    if (msg.type === 'user' && Array.isArray(msg.message.content)) {
      for (const content of msg.message.content) {
        if (content.type === 'tool_result') {
          toolResultIds.add(content.tool_use_id)
        }
      }
    }
  }

  return new Set([...toolUseIds].filter((id) => !toolResultIds.has(id)))
}

/**
 * Get errored tool use IDs (tool_result with is_error=true)
 */
export function getErroredToolUseIDs(messages) {
  const erroredIds = new Set()

  for (const msg of messages) {
    if (msg.type === 'user' && Array.isArray(msg.message.content)) {
      for (const content of msg.message.content) {
        if (content.type === 'tool_result' && content.is_error) {
          erroredIds.add(content.tool_use_id)
        }
      }
    }
  }

  return erroredIds
}

/**
 * Get message ID (for logging)
 */
export function getMessageID(messages) {
  if (messages.length === 0) return undefined
  const last = messages[messages.length - 1]
  return last.message.id || last.uuid
}
