/**
 * Task Tool - Launch sub-agents for complex tasks
 *
 * This tool allows Claude to spawn autonomous sub-agents that can
 * perform multi-step tasks using available tools.
 */

import { z } from 'zod'
import { createMessage, normalizeMessages, getLastMessage } from '../utils/messages.mjs'
import { streamConversation } from '../api/streaming.mjs'
import { getModel } from '../core/config.mjs'

// Input schema for the Task tool
export const taskInputSchema = z.object({
  prompt: z.string().describe('The task for the agent to perform'),
  description: z.string().optional().describe('A short (3-5 word) description of the task'),
  subagent_type: z.string().optional().describe('Agent type: "Explore" (read-only, fast), "Plan" (architecture), "general-purpose" (full tools), "Bash" (command execution)'),
  model: z.enum(['sonnet', 'opus', 'haiku']).optional().describe('Model to use for this agent'),
  run_in_background: z.boolean().optional().describe('Run agent in background'),
  name: z.string().optional().describe('Name for the spawned agent'),
  mode: z.enum(['acceptEdits', 'bypassPermissions', 'default', 'delegate', 'dontAsk', 'plan']).optional().describe('Permission mode for spawned agent'),
  max_turns: z.number().optional().describe('Maximum number of agentic turns'),
})

/**
 * Generate the Task tool prompt based on available tools
 */
export async function generateTaskPrompt(availableTools, canModifyFiles = false) {
  const toolNames = availableTools.map(t => t.name).join(', ')

  let prompt = `Launch a new agent that has access to the following tools: ${toolNames}. When you are searching for a keyword or file and are not confident that you will find the right match on the first try, use the Agent tool to perform the search for you. For example:

- If you are searching for a keyword like "config" or "logger", the Agent tool is appropriate
- If you want to read a specific file path, use the Read or Glob tool instead of the Agent tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the Glob tool instead, to find the match more quickly

Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
3. Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
4. The agent's outputs should generally be trusted`

  if (!canModifyFiles) {
    prompt += `
5. IMPORTANT: The agent can not use Bash, Write, Edit, NotebookEdit, so can not modify files. If you want to use these tools, use them directly instead of going through the agent.`
  }

  return prompt
}

// Default prompt for the Task tool
export const TASK_PROMPT = `Launch a new agent that has access to the following tools. When you are searching for a keyword or file and are not confident that you will find the right match on the first try, use the Agent tool to perform the search for you.

Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance
2. The agent will return a single message back to you - summarize it for the user
3. Each agent invocation is stateless - provide complete context in the prompt
4. The agent's outputs should generally be trusted
5. Agents cannot modify files - use file tools directly for modifications`

/**
 * Format duration in human-readable form
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

/**
 * Format token count in human-readable form
 */
function formatTokens(count) {
  if (count < 1000) return `${count}`
  return `${(count / 1000).toFixed(1)}k`
}

/**
 * Create the Task tool definition
 */
export function createTaskTool(dependencies) {
  const {
    getAvailableTools,
    logError,
    React
  } = dependencies

  return {
    name: 'dispatch_agent',

    async prompt({ dangerouslySkipPermissions }) {
      const tools = await getAvailableTools(dangerouslySkipPermissions)
      return generateTaskPrompt(tools, dangerouslySkipPermissions)
    },

    async description() {
      return 'Launch a new task'
    },

    inputSchema: taskInputSchema,

    userFacingName() {
      return 'Task'
    },

    isReadOnly() {
      return true
    },

    async isEnabled() {
      return true
    },

    needsPermissions() {
      return false
    },

    renderToolUseMessage({ prompt } = {}) {
      if (prompt.length > 100) {
        return prompt.slice(0, 100) + '...'
      }
      return prompt
    },

    renderToolUseRejectedMessage() {
      if (!React) return null
      return React.createElement('span', { style: { color: 'red' } }, 'Task rejected')
    },

    renderToolResultMessage(result, { verbose }) {
      if (!React) return null

      const textContent = Array.isArray(result)
        ? result.filter(r => r.type === 'text').map(r => r.text).join('\n')
        : String(result)

      return React.createElement('div', null,
        React.createElement('span', null, '  ⎿  '),
        React.createElement('pre', null,
          verbose ? textContent : textContent.slice(0, 200) + (textContent.length > 200 ? '...' : '')
        )
      )
    },

    renderResultForAssistant(result) {
      if (Array.isArray(result)) {
        return result
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n')
      }
      return String(result)
    },

    async *call({ prompt }, { abortController, options, readFileTimestamps }) {
      const startTime = Date.now()
      const { dangerouslySkipPermissions = false, verbose } = options

      const messages = [createMessage('user', prompt)]
      const tools = await getAvailableTools(dangerouslySkipPermissions)

      yield {
        type: 'progress',
        content: 'Initializing...',
        normalizedMessages: normalizeMessages(messages),
        tools
      }

      const [systemPrompt, model] = await Promise.all([
        this.prompt({ dangerouslySkipPermissions }),
        getModel()
      ])

      let toolUseCount = 0

      for await (const event of streamConversation(
        messages,
        [systemPrompt],
        tools,
        { model, dangerouslySkipPermissions, verbose, readFileTimestamps },
        abortController
      )) {
        if (event.type === 'progress') continue

        messages.push(event)

        if (event.type !== 'assistant') continue

        const normalized = normalizeMessages(messages)
        for (const content of event.message.content) {
          if (content.type !== 'tool_use') continue
          toolUseCount++
          yield {
            type: 'progress',
            content: normalized.find(m =>
              m.type === 'assistant' &&
              m.message.content[0]?.type === 'tool_use' &&
              m.message.content[0].id === content.id
            ),
            normalizedMessages: normalized,
            tools
          }
        }
      }

      const normalizedMessages = normalizeMessages(messages)
      const lastMessage = getLastMessage(messages)

      if (lastMessage?.type !== 'assistant') {
        throw new Error('Last message was not an assistant message')
      }

      const usage = lastMessage.message.usage || {}
      const totalTokens = (usage.cache_creation_input_tokens || 0) +
        (usage.cache_read_input_tokens || 0) +
        (usage.input_tokens || 0) +
        (usage.output_tokens || 0)

      const stats = [
        toolUseCount === 1 ? '1 tool use' : `${toolUseCount} tool uses`,
        `${formatTokens(totalTokens)} tokens`,
        formatDuration(Date.now() - startTime)
      ]

      yield {
        type: 'progress',
        content: `Done (${stats.join(' · ')})`,
        normalizedMessages,
        tools
      }

      const textContent = lastMessage.message.content.filter(c => c.type === 'text')

      yield {
        type: 'result',
        data: textContent,
        normalizedMessages,
        resultForAssistant: this.renderResultForAssistant(textContent),
        tools
      }
    }
  }
}

export default createTaskTool
