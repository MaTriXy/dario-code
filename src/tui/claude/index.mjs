/**
 * Dario Code TUI
 *
 * Main TUI orchestrator that implements the TUI interface
 * and provides the Dario Code experience
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, render, useApp, useInput } from 'ink'
import { TUI, TUIMetadata } from '../interface.mjs'
import { UserMessage, AssistantMessage, SystemMessage } from './components/message.mjs'
import { ToolUseCard } from './components/tool-use.mjs'
import { ThinkingBlock, ThinkingIndicator } from './components/thinking.mjs'
import { StatusLine } from './components/status-line.mjs'
import { InputPrompt } from './components/input.mjs'
import { CLAUDE_COLORS } from './theme.mjs'

/**
 * Main Claude TUI Component
 */
function ClaudeUI({ onMessage, onCommand, onExit, initialMessages = [] }) {
  const { exit } = useApp()
  const [messages, setMessages] = useState(initialMessages)
  const [isThinking, setIsThinking] = useState(false)
  const [currentToolUse, setCurrentToolUse] = useState(null)
  const [status, setStatus] = useState({
    model: 'claude-sonnet-4-6',
    tokenUsage: 0,
    contextLimit: 200000,
    mode: 'normal'
  })

  // Handle global keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+C - exit
    if (key.ctrl && input === 'c') {
      if (onExit) onExit()
      exit()
      return
    }

    // Ctrl+D - exit
    if (key.ctrl && input === 'd') {
      if (onExit) onExit()
      exit()
      return
    }
  })

  // Handle user input
  const handleInput = (input) => {
    // Check if it's a command
    if (input.startsWith('/')) {
      if (onCommand) {
        onCommand(input)
      }
      return
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: input
    }
    setMessages(prev => [...prev, userMessage])

    // Trigger message callback
    if (onMessage) {
      onMessage(input)
    }
  }

  return React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
    React.createElement(StatusLine, {
      model: status.model,
      tokenUsage: status.tokenUsage,
      contextLimit: status.contextLimit,
      mode: status.mode
    }),
    React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
      messages.map((msg, i) => {
        if (msg.role === 'user') {
          return React.createElement(UserMessage, { key: i, content: msg.content })
        } else if (msg.role === 'assistant') {
          return React.createElement(AssistantMessage, { key: i, content: msg.content })
        } else if (msg.type === 'system') {
          return React.createElement(SystemMessage, {
            key: i,
            content: msg.content,
            type: msg.level || 'info'
          })
        } else if (msg.type === 'tool_use') {
          return React.createElement(ToolUseCard, {
            key: i,
            toolName: msg.name,
            input: msg.input,
            status: msg.status || 'running'
          })
        } else if (msg.type === 'thinking') {
          return React.createElement(ThinkingBlock, {
            key: i,
            content: msg.content,
            defaultCollapsed: msg.collapsed
          })
        }
        return null
      })
    ),
    isThinking && React.createElement(Box, { marginTop: 1 },
      React.createElement(ThinkingIndicator, { active: true })
    ),
    currentToolUse && React.createElement(ToolUseCard, {
      toolName: currentToolUse.name,
      input: currentToolUse.input,
      status: 'running'
    }),
    React.createElement(Box, { marginTop: 1 },
      React.createElement(InputPrompt, {
        onSubmit: handleInput,
        disabled: isThinking || currentToolUse !== null
      })
    )
  )
}

/**
 * Claude TUI Implementation
 */
export class ClaudeTUI extends TUI {
  constructor() {
    super()
    this.app = null
    this.messages = []
    this.callbacks = {}
  }

  async initialize(options) {
    this.callbacks = {
      onMessage: options.onMessage,
      onCommand: options.onCommand,
      onExit: options.onExit
    }

    // Render the TUI
    this.app = render(
      React.createElement(ClaudeUI, {
        onMessage: this.callbacks.onMessage,
        onCommand: this.callbacks.onCommand,
        onExit: this.callbacks.onExit,
        initialMessages: this.messages
      })
    )

    return this
  }

  async renderMessage(message) {
    this.messages.push(message)
    // Re-render with new message
    if (this.app) {
      this.app.rerender(
        React.createElement(ClaudeUI, {
          ...this.callbacks,
          initialMessages: this.messages
        })
      )
    }
  }

  async showToolUse(toolUse) {
    this.messages.push({
      type: 'tool_use',
      ...toolUse
    })
    // Re-render
    if (this.app) {
      this.app.rerender(
        React.createElement(ClaudeUI, {
          ...this.callbacks,
          initialMessages: this.messages
        })
      )
    }
  }

  async showToolResult(result) {
    // Update the tool use message with result
    const toolUseIndex = this.messages.findIndex(
      m => m.type === 'tool_use' && m.id === result.toolUseId
    )

    if (toolUseIndex !== -1) {
      this.messages[toolUseIndex] = {
        ...this.messages[toolUseIndex],
        result: result.content,
        status: result.isError ? 'error' : 'success'
      }
    }

    // Re-render
    if (this.app) {
      this.app.rerender(
        React.createElement(ClaudeUI, {
          ...this.callbacks,
          initialMessages: this.messages
        })
      )
    }
  }

  async showThinking(content, collapsed = false) {
    this.messages.push({
      type: 'thinking',
      content,
      collapsed
    })
    // Re-render
    if (this.app) {
      this.app.rerender(
        React.createElement(ClaudeUI, {
          ...this.callbacks,
          initialMessages: this.messages
        })
      )
    }
  }

  async showProgress(message) {
    // TODO: Show spinner/progress
  }

  async hideProgress() {
    // TODO: Hide spinner/progress
  }

  async updateStatus(status) {
    // TODO: Update status line
  }

  async promptInput() {
    // Input is handled by the InputPrompt component
    // This returns a promise that resolves when user submits
    return new Promise((resolve) => {
      this.callbacks.onMessage = (input) => {
        resolve(input)
      }
    })
  }

  async showError(error) {
    const errorMessage = typeof error === 'string' ? error : error.message
    this.messages.push({
      type: 'system',
      content: errorMessage,
      level: 'error'
    })
    // Re-render
    if (this.app) {
      this.app.rerender(
        React.createElement(ClaudeUI, {
          ...this.callbacks,
          initialMessages: this.messages
        })
      )
    }
  }

  async clear() {
    this.messages = []
    // Re-render
    if (this.app) {
      this.app.rerender(
        React.createElement(ClaudeUI, {
          ...this.callbacks,
          initialMessages: this.messages
        })
      )
    }
  }

  async destroy() {
    if (this.app) {
      this.app.unmount()
      this.app = null
    }
  }
}

// Set metadata
ClaudeTUI.metadata = new TUIMetadata(
  'claude',
  'Dario Code',
  'Dario Code TUI',
  '1.0.0'
)

export default ClaudeTUI
