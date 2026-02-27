/**
 * Agent Manager Component
 *
 * Interactive TUI overlay for browsing, creating, and managing agents.
 * Shows custom agents, built-in agents, and a create flow.
 * Pattern follows PluginManager / McpManager overlays.
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import {
  listCustomAgents,
  getAgentTypes,
  saveCustomAgent,
  loadCustomAgent,
} from '../../../agents/subagent.mjs'
import { TOOL_CATEGORIES } from '../../../tools/index.mjs'
import { SourceBadge } from './source-badge.mjs'

const THEME = {
  claude: '#D97706',
  text: '#E5E5E5',
  secondaryText: '#6B7280',
  secondaryBorder: '#374151',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  suggestion: '#3B82F6',
}

const MAX_VISIBLE = 12

// ─── Tool mode config (per-agent) ────────────────────
const TOOL_MODES = ['always', 'ask', 'auto', 'off']
const TOOL_MODE_LABELS = { always: 'always', ask: 'ask', auto: 'auto', off: 'off' }
const TOOL_MODE_HELP = {
  always: 'Tool is always available. No confirmation required.',
  ask: 'Prompt for confirmation before each use.',
  auto: 'Available when needed. Agent decides when to use it.',
  off: 'Tool is disabled and will not be offered to the model.',
}
const TOOL_MODE_COLORS = {
  always: '#22C55E',
  ask: '#F59E0B',
  auto: '#3B82F6',
  off: '#EF4444',
}

// Short static descriptions for tools (description is async on tool objects)
const TOOL_DESCRIPTIONS = {
  Bash: 'Execute shell commands',
  Read: 'Read file contents',
  Edit: 'Edit files with string replacement',
  Write: 'Write new file contents',
  Glob: 'Find files by pattern',
  Grep: 'Search file contents with regex',
  MultiEdit: 'Multiple edits in one operation',
  Task: 'Spawn subagent for complex tasks',
  TaskCreate: 'Create a task in the task list',
  TaskGet: 'Get task details by ID',
  TaskUpdate: 'Update task status or details',
  TaskList: 'List all tasks',
  TodoWrite: 'Write todo items',
  TodoRead: 'Read todo items',
  WebFetch: 'Fetch and process web content',
  WebSearch: 'Search the web',
  NotebookEdit: 'Edit Jupyter notebook cells',
  AskUserQuestion: 'Ask the user a question',
  LSP: 'Language Server Protocol operations',
  EnterPlanMode: 'Enter planning mode',
  ExitPlanMode: 'Exit planning mode',
  Skill: 'Execute a skill/slash command',
}

const CATEGORY_LABELS = {
  FILE_OPERATIONS: 'File Operations',
  AGENTS: 'Agents',
  TASK_MANAGEMENT: 'Task Management',
  WEB: 'Web',
  UI: 'User Interaction',
  NOTEBOOKS: 'Notebooks',
  COMMANDS: 'Commands',
  PLANNING: 'Planning',
  CODE_INTELLIGENCE: 'Code Intelligence',
}

/**
 * Build a grouped tool list for per-agent configuration
 */
function buildToolListForAgent(allTools, agentToolModes) {
  const items = []
  const toolNames = new Set(allTools.map(t => t.name))
  const listed = new Set()

  for (const [category, categoryTools] of Object.entries(TOOL_CATEGORIES)) {
    const categoryLabel = CATEGORY_LABELS[category] || category
    const validTools = categoryTools.filter(name => toolNames.has(name))
    if (validTools.length === 0) continue

    items.push({ type: 'header', id: `hdr_${category}`, label: categoryLabel })

    for (const name of validTools) {
      const mode = agentToolModes[name] || 'always'
      items.push({
        type: 'tool',
        id: name,
        name,
        description: TOOL_DESCRIPTIONS[name] || '',
        mode,
      })
      listed.add(name)
    }
  }

  // Uncategorized tools (MCP, plugin, etc.)
  const uncategorized = allTools.filter(t => !listed.has(t.name))
  if (uncategorized.length > 0) {
    items.push({ type: 'header', id: 'hdr_other', label: 'Other' })
    for (const tool of uncategorized) {
      const mode = agentToolModes[tool.name] || 'always'
      items.push({
        type: 'tool',
        id: tool.name,
        name: tool.name,
        description: TOOL_DESCRIPTIONS[tool.name] || '',
        mode,
      })
    }
  }

  return items
}

/**
 * Build a flat list of agents grouped by section
 */
function buildAgentList(customAgents, builtinAgents) {
  const items = []

  // "Create new agent" always first
  items.push({ type: 'action', id: '__create__', name: 'Create new agent', section: 'actions' })

  // Custom agents section — split by source
  const projectAgents = customAgents.filter(a => a.source === 'project')
  const personalAgents = customAgents.filter(a => a.source !== 'project')

  if (projectAgents.length > 0) {
    items.push({ type: 'header', id: '__hdr_project__', label: `Project agents (.claude/agents/) [PRJ]` })
    for (const agent of projectAgents) {
      items.push({
        type: 'agent',
        id: `custom:${agent.name}`,
        name: agent.name,
        description: agent.description || '',
        model: agent.model || 'inherit',
        section: 'custom',
        agentType: agent.type || 'custom',
        source: 'project',
      })
    }
  }

  if (personalAgents.length > 0) {
    items.push({ type: 'header', id: '__hdr_personal__', label: `Personal agents (~/.dario + ~/.claude)` })
    for (const agent of personalAgents) {
      items.push({
        type: 'agent',
        id: `custom:${agent.name}`,
        name: agent.name,
        description: agent.description || '',
        model: agent.model || 'inherit',
        section: 'custom',
        agentType: agent.type || 'custom',
        source: 'personal',
      })
    }
  }

  // Built-in agents section
  items.push({ type: 'header', id: '__hdr_builtin__', label: `Built-in agents (${builtinAgents.length})` })
  for (const agent of builtinAgents) {
    items.push({
      type: 'agent',
      id: `builtin:${agent.type}`,
      name: agent.name,
      description: agent.description || '',
      model: agent.model || 'inherit',
      section: 'builtin',
      agentType: agent.type,
      tools: agent.tools,
    })
  }

  return items
}

/**
 * @param {Object} props
 * @param {Function} props.onCancel - Close the overlay
 * @param {Function} props.onMessage - Show a status message
 * @param {Function} props.onDeleteAgent - (agentName) => void
 */
export function AgentManager({ tools: allTools = [], onCancel, onMessage, onDeleteAgent }) {
  // Main list state
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [view, setView] = useState('list') // 'list' | 'detail' | 'tools' | 'create-location' | 'create-method' | 'create-describe' | 'create-manual-type' | 'create-manual-desc' | 'create-manual-model' | 'confirm-delete'

  // Create flow state
  const [createLocation, setCreateLocation] = useState('project') // 'project' | 'personal'
  const [createMethod, setCreateMethod] = useState('generate') // 'generate' | 'manual'
  const [createDescription, setCreateDescription] = useState('')
  const [manualType, setManualType] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualModel, setManualModel] = useState('')

  // Detail state
  const [detailAgent, setDetailAgent] = useState(null)

  // Tools view state (per-agent tool configuration)
  const [toolSelectedIndex, setToolSelectedIndex] = useState(0)
  const [agentToolModes, setAgentToolModes] = useState({})

  // Selection index for sub-views with fixed options
  const [subIndex, setSubIndex] = useState(0)

  // Load agents
  const customAgents = listCustomAgents()
  const builtinAgents = getAgentTypes()
  const items = buildAgentList(customAgents, builtinAgents)

  // Selectable items (skip headers)
  const selectableItems = items.filter(i => i.type !== 'header')
  const scrollOffset = Math.max(0, selectedIndex - MAX_VISIBLE + 1)

  // ─── Keyboard: list view ──────────────────────────────

  useInput((char, key) => {
    if (view !== 'list') return

    if (key.escape) {
      onCancel()
      return
    }
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1))
      return
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(selectableItems.length - 1, i + 1))
      return
    }
    if (key.return) {
      const item = selectableItems[selectedIndex]
      if (!item) return
      if (item.id === '__create__') {
        setView('create-location')
        setSubIndex(0)
        return
      }
      // Show detail
      setDetailAgent(item)
      setView('detail')
      return
    }
  }, { isActive: view === 'list' })

  // ─── Keyboard: detail view ────────────────────────────

  useInput((char, key) => {
    if (view !== 'detail') return

    if (key.escape) {
      setView('list')
      setDetailAgent(null)
      return
    }
    if ((char === 'd' || char === 'D') && detailAgent?.section === 'custom') {
      setView('confirm-delete')
      return
    }
    if ((char === 't' || char === 'T') && detailAgent?.section === 'custom') {
      // Load current agent config to get its toolModes
      const config = loadCustomAgent(detailAgent.name)
      setAgentToolModes(config?.toolModes || {})
      setToolSelectedIndex(0)
      setView('tools')
      return
    }
  }, { isActive: view === 'detail' })

  // ─── Keyboard: confirm delete ─────────────────────────

  useInput((char, key) => {
    if (view !== 'confirm-delete') return

    if (key.escape || char === 'n' || char === 'N') {
      setView('detail')
      return
    }
    if (char === 'y' || char === 'Y' || key.return) {
      if (detailAgent) {
        onDeleteAgent?.(detailAgent.name)
        onMessage?.(`Deleted agent: ${detailAgent.name}`)
      }
      setView('list')
      setDetailAgent(null)
      return
    }
  }, { isActive: view === 'confirm-delete' })

  // ─── Keyboard: tools view ────────────────────────────

  const toolItems = view === 'tools' ? buildToolListForAgent(allTools, agentToolModes) : []
  const selectableToolItems = toolItems.filter(i => i.type === 'tool')

  useInput((char, key) => {
    if (view !== 'tools') return

    if (key.escape) {
      setView('detail')
      return
    }
    if (key.upArrow) {
      setToolSelectedIndex(i => Math.max(0, i - 1))
      return
    }
    if (key.downArrow) {
      setToolSelectedIndex(i => Math.min(selectableToolItems.length - 1, i + 1))
      return
    }

    // Space or Enter — cycle tool mode
    if ((char === ' ' || key.return) && selectableToolItems[toolSelectedIndex]) {
      const tool = selectableToolItems[toolSelectedIndex]
      const currentMode = agentToolModes[tool.name] || 'always'
      const idx = TOOL_MODES.indexOf(currentMode)
      const nextMode = TOOL_MODES[(idx + 1) % TOOL_MODES.length]

      const newModes = { ...agentToolModes }
      if (nextMode === 'always') {
        delete newModes[tool.name]
      } else {
        newModes[tool.name] = nextMode
      }

      // Save to agent config
      if (detailAgent) {
        const config = loadCustomAgent(detailAgent.name) || {}
        config.toolModes = newModes
        saveCustomAgent(detailAgent.name, config, detailAgent.source || 'personal')
      }

      setAgentToolModes(newModes)
      onMessage?.(`${detailAgent?.name}/${tool.name}: ${TOOL_MODE_LABELS[nextMode]}`)
      return
    }
  }, { isActive: view === 'tools' })

  // ─── Keyboard: create-location ────────────────────────

  useInput((char, key) => {
    if (view !== 'create-location') return

    if (key.escape) {
      setView('list')
      return
    }
    if (key.upArrow) {
      setSubIndex(i => Math.max(0, i - 1))
      return
    }
    if (key.downArrow) {
      setSubIndex(i => Math.min(1, i + 1))
      return
    }
    if (key.return) {
      setCreateLocation(subIndex === 0 ? 'project' : 'personal')
      setView('create-method')
      setSubIndex(0)
      return
    }
  }, { isActive: view === 'create-location' })

  // ─── Keyboard: create-method ──────────────────────────

  useInput((char, key) => {
    if (view !== 'create-method') return

    if (key.escape) {
      setView('create-location')
      setSubIndex(0)
      return
    }
    if (key.upArrow) {
      setSubIndex(i => Math.max(0, i - 1))
      return
    }
    if (key.downArrow) {
      setSubIndex(i => Math.min(1, i + 1))
      return
    }
    if (key.return) {
      if (subIndex === 0) {
        setCreateMethod('generate')
        setView('create-describe')
      } else {
        setCreateMethod('manual')
        setView('create-manual-type')
      }
      return
    }
  }, { isActive: view === 'create-method' })

  // ─── Keyboard: create-describe (escape only, TextInput handles rest) ──

  useInput((char, key) => {
    if (key.escape) {
      setView('create-method')
      setSubIndex(0)
      setCreateDescription('')
    }
  }, { isActive: view === 'create-describe' })

  // ─── Keyboard: manual type (escape only) ──────────────

  useInput((char, key) => {
    if (key.escape) {
      setView('create-method')
      setSubIndex(1)
      setManualType('')
    }
  }, { isActive: view === 'create-manual-type' })

  // ─── Keyboard: manual desc (escape only) ──────────────

  useInput((char, key) => {
    if (key.escape) {
      setView('create-manual-type')
      setManualDesc('')
    }
  }, { isActive: view === 'create-manual-desc' })

  // ─── Keyboard: manual model (escape only) ─────────────

  useInput((char, key) => {
    if (key.escape) {
      setView('create-manual-desc')
      setManualModel('')
    }
  }, { isActive: view === 'create-manual-model' })

  // ─── Helpers ──────────────────────────────────────────

  function finishCreate(name, description, model) {
    const config = {
      type: 'custom',
      description: description || '',
      model: model || null,
      tools: '*',
      systemPrompt: null,
      maxTokens: 4096,
      temperature: 0.7,
    }
    saveCustomAgent(name, config, createLocation)
    const locLabel = createLocation === 'project' ? '.claude/agents/' : '~/.dario/agents/'
    onMessage?.(`Created agent: ${name} (${locLabel})`)
    resetCreateState()
    setView('list')
  }

  function resetCreateState() {
    setCreateLocation('project')
    setCreateMethod('generate')
    setCreateDescription('')
    setManualType('')
    setManualDesc('')
    setManualModel('')
    setSubIndex(0)
  }

  // ─── Render: list view ────────────────────────────────

  function renderList() {
    // Build display items with proper indexing
    let selectableIdx = 0

    return React.createElement(Box, { flexDirection: 'column' },
      // Header
      React.createElement(Box, { marginBottom: 1 },
        React.createElement(Text, { bold: true, color: THEME.claude }, ' Agents'),
        React.createElement(Text, { dimColor: true }, `  ${selectableItems.length - 1} agents`),
      ),
      // Items
      React.createElement(Box, { flexDirection: 'column' },
        ...items.map((item) => {
          if (item.type === 'header') {
            return React.createElement(Box, { key: item.id, marginTop: 1 },
              React.createElement(Text, { dimColor: true, bold: true }, `  ${item.label}`)
            )
          }

          const myIdx = selectableIdx++
          const isSelected = myIdx === selectedIndex

          if (item.id === '__create__') {
            return React.createElement(Box, { key: item.id },
              React.createElement(Text, {
                color: isSelected ? THEME.suggestion : undefined,
                inverse: isSelected,
              },
                isSelected ? ' \u276F ' : '   ',
                item.name,
              )
            )
          }

          // Agent item
          const modelLabel = item.model || 'inherit'
          return React.createElement(Box, { key: item.id, flexDirection: 'row' },
            React.createElement(Text, {
              color: isSelected ? THEME.suggestion : undefined,
              inverse: isSelected,
            },
              isSelected ? ' \u276F ' : '   ',
              item.name,
            ),
            item.source ? React.createElement(SourceBadge, { source: item.source, dim: !isSelected }) : null,
            React.createElement(Text, { dimColor: true }, ` \u00B7 ${modelLabel}`),
          )
        })
      ),
      // Footer
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true },
          '\u2191\u2193 navigate \u00B7 Enter select \u00B7 Esc close'
        )
      )
    )
  }

  // ─── Render: detail view ──────────────────────────────

  function renderDetail() {
    if (!detailAgent) return null
    const isCustom = detailAgent.section === 'custom'

    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.claude }, ` \u23FA ${detailAgent.name}`),
      React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
        React.createElement(Box, { flexDirection: 'row' },
          React.createElement(Text, { dimColor: true }, '  Type:    '),
          React.createElement(Text, null, detailAgent.agentType || 'custom'),
        ),
        React.createElement(Box, { flexDirection: 'row' },
          React.createElement(Text, { dimColor: true }, '  Model:   '),
          React.createElement(Text, null, detailAgent.model || 'inherit'),
        ),
        React.createElement(Box, { flexDirection: 'row' },
        React.createElement(Text, { dimColor: true }, '  Tools:   '),
        React.createElement(Text, null, (() => {
          if (isCustom) {
            const config = loadCustomAgent(detailAgent.name)
            const modes = config?.toolModes || {}
            const offCount = Object.values(modes).filter(m => m === 'off').length
            const customCount = Object.keys(modes).length - offCount
            if (offCount > 0 || customCount > 0) {
              const parts = []
              if (customCount > 0) parts.push(`${customCount} configured`)
              if (offCount > 0) parts.push(`${offCount} disabled`)
              return parts.join(', ')
            }
            return 'all enabled (default)'
          }
          return Array.isArray(detailAgent.tools) ? detailAgent.tools.join(', ') : String(detailAgent.tools || '*')
        })()),
      ),
      ),
      detailAgent.description
        ? React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true }, '  '),
            React.createElement(Text, null, detailAgent.description),
          )
        : null,
      isCustom
        ? React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
            React.createElement(Text, { color: THEME.suggestion }, '  [t] Configure Tools'),
            React.createElement(Text, { color: THEME.error }, '  [d] Delete'),
          )
        : null,
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true },
          isCustom ? 't tools \u00B7 d delete \u00B7 Esc back' : 'Esc back'
        )
      )
    )
  }

  // ─── Render: confirm delete ───────────────────────────

  function renderConfirmDelete() {
    if (!detailAgent) return null
    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.error },
        ` \u2717 Delete agent: ${detailAgent.name}?`
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, '  This will remove the agent definition. '),
        React.createElement(Text, { dimColor: true }, 'y/Enter confirm \u00B7 n/Esc cancel'),
      )
    )
  }

  // ─── Render: create-location ──────────────────────────

  function renderCreateLocation() {
    const options = [
      { label: '1. Project (.claude/agents/)', value: 'project' },
      { label: '2. Personal (~/.dario/agents/)', value: 'personal' },
    ]

    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.claude }, ' Create new agent'),
      React.createElement(Text, { dimColor: true, marginBottom: 1 }, ' Choose location'),
      React.createElement(Box, { flexDirection: 'column' },
        ...options.map((opt, idx) => {
          const isSelected = idx === subIndex
          return React.createElement(Box, { key: opt.value },
            React.createElement(Text, {
              color: isSelected ? THEME.suggestion : undefined,
              inverse: isSelected,
            },
              isSelected ? ' \u276F ' : '   ',
              opt.label,
            )
          )
        })
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, '\u2191\u2193 navigate \u00B7 Enter select \u00B7 Esc cancel')
      )
    )
  }

  // ─── Render: create-method ────────────────────────────

  function renderCreateMethod() {
    const options = [
      { label: '1. Generate with Claude (recommended)', value: 'generate' },
      { label: '2. Manual configuration', value: 'manual' },
    ]

    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.claude }, ' Create new agent'),
      React.createElement(Text, { dimColor: true, marginBottom: 1 }, ' Creation method'),
      React.createElement(Box, { flexDirection: 'column' },
        ...options.map((opt, idx) => {
          const isSelected = idx === subIndex
          return React.createElement(Box, { key: opt.value },
            React.createElement(Text, {
              color: isSelected ? THEME.suggestion : undefined,
              inverse: isSelected,
            },
              isSelected ? ' \u276F ' : '   ',
              opt.label,
            )
          )
        })
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, '\u2191\u2193 navigate \u00B7 Enter select \u00B7 Esc back')
      )
    )
  }

  // ─── Render: create-describe ──────────────────────────

  function renderCreateDescribe() {
    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.claude }, ' Create new agent'),
      React.createElement(Text, { dimColor: true, marginBottom: 1 },
        ' Describe what this agent should do and when it should be used'
      ),
      React.createElement(Box, {
        borderStyle: 'round',
        borderColor: THEME.suggestion,
        paddingLeft: 1,
        paddingRight: 1,
      },
        React.createElement(TextInput, {
          value: createDescription,
          onChange: setCreateDescription,
          onSubmit: (val) => {
            if (val.trim()) {
              // Generate a slug from the description
              const slug = val.trim().toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .slice(0, 30)
                .replace(/-$/, '')
              finishCreate(slug, val.trim(), null)
            }
          },
          placeholder: 'e.g., Help me write unit tests for my code...',
          focus: true,
        })
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to submit \u00B7 Esc back')
      )
    )
  }

  // ─── Render: manual type ──────────────────────────────

  function renderManualType() {
    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.claude }, ' Create new agent'),
      React.createElement(Text, { dimColor: true, marginBottom: 1 }, ' Agent type (identifier)'),
      React.createElement(Text, { dimColor: true, marginBottom: 1 },
        ' Enter a unique identifier for your agent:'
      ),
      React.createElement(Box, {
        borderStyle: 'round',
        borderColor: THEME.suggestion,
        paddingLeft: 1,
        paddingRight: 1,
      },
        React.createElement(TextInput, {
          value: manualType,
          onChange: setManualType,
          onSubmit: (val) => {
            if (val.trim()) {
              setView('create-manual-desc')
            }
          },
          placeholder: 'e.g., test-runner, tech-lead, etc',
          focus: true,
        })
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to continue \u00B7 Esc back')
      )
    )
  }

  // ─── Render: manual description ───────────────────────

  function renderManualDesc() {
    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.claude }, ' Create new agent'),
      React.createElement(Text, { dimColor: true, marginBottom: 1 }, ` Agent: ${manualType}`),
      React.createElement(Text, { dimColor: true, marginBottom: 1 }, ' Description:'),
      React.createElement(Box, {
        borderStyle: 'round',
        borderColor: THEME.suggestion,
        paddingLeft: 1,
        paddingRight: 1,
      },
        React.createElement(TextInput, {
          value: manualDesc,
          onChange: setManualDesc,
          onSubmit: (val) => {
            setView('create-manual-model')
          },
          placeholder: 'What does this agent do?',
          focus: true,
        })
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to continue \u00B7 Esc back')
      )
    )
  }

  // ─── Render: manual model ─────────────────────────────

  function renderManualModel() {
    return React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { bold: true, color: THEME.claude }, ' Create new agent'),
      React.createElement(Text, { dimColor: true, marginBottom: 1 }, ` Agent: ${manualType}`),
      React.createElement(Text, { dimColor: true, marginBottom: 1 }, ' Model (leave blank for inherit):'),
      React.createElement(Box, {
        borderStyle: 'round',
        borderColor: THEME.suggestion,
        paddingLeft: 1,
        paddingRight: 1,
      },
        React.createElement(TextInput, {
          value: manualModel,
          onChange: setManualModel,
          onSubmit: (val) => {
            finishCreate(manualType.trim(), manualDesc.trim(), val.trim() || null)
          },
          placeholder: 'e.g., haiku, sonnet, opus (or blank)',
          focus: true,
        })
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to create \u00B7 Esc back')
      )
    )
  }

  // ─── Render: tools view ──────────────────────────────

  function renderToolsView() {
    if (!detailAgent) return null

    const selectedTool = selectableToolItems[toolSelectedIndex] || null
    const selectedMode = selectedTool ? (agentToolModes[selectedTool.name] || 'always') : null

    let selectableIdx = 0

    return React.createElement(Box, { flexDirection: 'column' },
      // Header
      React.createElement(Box, { marginBottom: 1 },
        React.createElement(Text, { bold: true, color: THEME.claude }, ` \u2699 ${detailAgent.name} \u2014 Tools`),
        React.createElement(Text, { dimColor: true }, `  ${selectableToolItems.length} tools`),
      ),

      // Tool list
      React.createElement(Box, { flexDirection: 'column' },
        ...toolItems.map((item) => {
          if (item.type === 'header') {
            return React.createElement(Box, { key: item.id, marginTop: 1 },
              React.createElement(Text, { dimColor: true, bold: true }, `  ${item.label}`)
            )
          }

          const myIdx = selectableIdx++
          const isSelected = myIdx === toolSelectedIndex
          const mode = agentToolModes[item.name] || 'always'
          const modeColor = TOOL_MODE_COLORS[mode] || THEME.secondaryText
          const modeIcon = mode === 'off' ? '\u25CB' : '\u25CF'

          return React.createElement(Box, { key: item.id, flexDirection: 'row' },
            React.createElement(Text, {
              color: isSelected ? THEME.suggestion : undefined,
              inverse: isSelected,
            },
              isSelected ? ' \u276F ' : '   ',
              React.createElement(Text, { color: modeColor }, modeIcon),
              ' ',
              item.name,
            ),
            isSelected
              ? React.createElement(Text, { color: THEME.secondaryText }, `  [${TOOL_MODE_LABELS[mode]}]`)
              : null,
          )
        })
      ),

      // Mode help for selected tool
      selectedMode
        ? React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
            React.createElement(Text, { dimColor: true, color: TOOL_MODE_COLORS[selectedMode] },
              `  ${TOOL_MODE_LABELS[selectedMode]}: ${TOOL_MODE_HELP[selectedMode]}`
            ),
            selectedTool?.description
              ? React.createElement(Text, { dimColor: true }, `  ${selectedTool.description}`)
              : null,
          )
        : null,

      // Footer
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true },
          '\u2191\u2193 navigate \u00B7 Space/Enter cycle mode \u00B7 Esc back'
        )
      )
    )
  }

  // ─── Main render switch ───────────────────────────────

  switch (view) {
    case 'list': return renderList()
    case 'detail': return renderDetail()
    case 'tools': return renderToolsView()
    case 'confirm-delete': return renderConfirmDelete()
    case 'create-location': return renderCreateLocation()
    case 'create-method': return renderCreateMethod()
    case 'create-describe': return renderCreateDescribe()
    case 'create-manual-type': return renderManualType()
    case 'create-manual-desc': return renderManualDesc()
    case 'create-manual-model': return renderManualModel()
    default: return renderList()
  }
}
