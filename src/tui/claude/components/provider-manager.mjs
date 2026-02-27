/**
 * Provider Manager Component
 *
 * Interactive TUI overlay for managing AI providers.
 * Two views:
 *   'list'   — all providers with enabled/disabled status
 *   'detail' — selected provider: API key input + model checklist
 *
 * Pattern follows plugin-manager.mjs / mcp-manager.mjs.
 */

import React, { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { getAllProviders } from '../../../providers/registry.mjs'
import {
  loadProviderConfig,
  saveProviderConfig,
  setProviderKey,
  toggleModel,
  enableProvider,
  disableProvider,
} from '../../../providers/config.mjs'

const THEME = {
  claude: '#D97706',
  text: '#E5E5E5',
  secondaryText: '#B0B8C4',
  secondaryBorder: '#374151',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  suggestion: '#3B82F6',
}

const MAX_VISIBLE = 10

/**
 * @param {Object} props
 * @param {Function} props.onCancel - Close the overlay
 * @param {Function} props.onMessage - Show a status message in chat
 */
export function ProviderManager({ onCancel, onMessage }) {
  const [view, setView] = useState('list') // 'list' | 'detail'
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [detailProvider, setDetailProvider] = useState(null)
  const [keyInput, setKeyInput] = useState('')
  const [keyFocused, setKeyFocused] = useState(false)
  const [detailFocusArea, setDetailFocusArea] = useState('models') // 'models' | 'key'
  const [modelCursor, setModelCursor] = useState(0)
  const [config, setConfig] = useState(() => loadProviderConfig())

  const providers = getAllProviders()
  const configMap = new Map((config.providers || []).map(p => [p.id, p]))

  const reload = useCallback(() => {
    setConfig(loadProviderConfig())
  }, [])

  const isProviderEnabled = (p) => {
    if (p.isBuiltin) return true
    return configMap.get(p.id)?.enabled === true
  }

  const getProviderKey = (p) => {
    return configMap.get(p.id)?.apiKey || process.env[p.apiKeyEnv] || ''
  }

  const getEnabledModels = (p) => {
    return new Set(configMap.get(p.id)?.enabledModels || [])
  }

  // ── List view input ──────────────────────────────────────────────────────
  const handleListInput = useCallback((char, key) => {
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
      setSelectedIndex(i => Math.min(providers.length - 1, i + 1))
      return
    }
    if (key.return) {
      const p = providers[selectedIndex]
      setDetailProvider(p)
      setKeyInput(getProviderKey(p))
      setModelCursor(0)
      setDetailFocusArea('models')
      setKeyFocused(false)
      setView('detail')
      return
    }
    // Space toggles enable/disable from list
    if (char === ' ') {
      const p = providers[selectedIndex]
      if (p.isBuiltin) return
      if (isProviderEnabled(p)) {
        disableProvider(p.id)
      } else {
        enableProvider(p.id)
      }
      reload()
      return
    }
  }, [view, selectedIndex, providers, configMap])

  // ── Detail view input ────────────────────────────────────────────────────
  const handleDetailInput = useCallback((char, key) => {
    if (view !== 'detail' || keyFocused) return

    if (key.escape) {
      setView('list')
      return
    }

    if (detailFocusArea === 'models') {
      const models = detailProvider?.models || []
      if (key.upArrow) {
        if (modelCursor === 0) {
          // Move up into key area
          setDetailFocusArea('key')
        } else {
          setModelCursor(i => Math.max(0, i - 1))
        }
        return
      }
      if (key.downArrow) {
        setModelCursor(i => Math.min(models.length - 1, i + 1))
        return
      }
      if (char === ' ' || key.return) {
        const m = models[modelCursor]
        if (m) {
          toggleModel(detailProvider.id, m.id)
          reload()
        }
        return
      }
    }

    if (detailFocusArea === 'key') {
      if (key.return) {
        // Focus the text input
        setKeyFocused(true)
        return
      }
      if (key.downArrow) {
        setDetailFocusArea('models')
        setModelCursor(0)
        return
      }
    }
  }, [view, keyFocused, detailFocusArea, modelCursor, detailProvider, configMap])

  useInput((char, key) => {
    if (view === 'list') handleListInput(char, key)
    else handleDetailInput(char, key)
  })

  // ── API key submit ───────────────────────────────────────────────────────
  const handleKeySubmit = useCallback((value) => {
    if (value.trim()) {
      setProviderKey(detailProvider.id, value.trim())
      enableProvider(detailProvider.id)
      reload()
      onMessage?.(`✓ API key saved for ${detailProvider.name}`)
    }
    setKeyFocused(false)
    setDetailFocusArea('models')
  }, [detailProvider])

  // ── Render list view ─────────────────────────────────────────────────────
  if (view === 'list') {
    const visible = providers.slice(0, MAX_VISIBLE)
    return React.createElement(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: THEME.claude,
      padding: 1,
      marginTop: 1,
    },
      React.createElement(Text, { key: 'title', bold: true, color: THEME.claude }, '⏺ AI Providers'),
      React.createElement(Text, { key: 'hint', color: THEME.secondaryText },
        'Space = toggle · Enter = configure · Esc = close'
      ),
      React.createElement(Box, { key: 'spacer', marginTop: 1 }),
      React.createElement(Box, { key: 'list', flexDirection: 'column' },
        visible.map((p, idx) => {
          const isSelected = idx === selectedIndex
          const enabled = isProviderEnabled(p)
          const hasKey = p.noKeyRequired || !!getProviderKey(p)
          const enabledModels = getEnabledModels(p)
          const modelCount = p.isBuiltin ? p.models.length : enabledModels.size

          const statusIcon = enabled
            ? (hasKey || p.noKeyRequired ? '✓' : '⚠')
            : '○'
          const statusColor = enabled
            ? (hasKey || p.noKeyRequired ? THEME.success : THEME.warning)
            : THEME.secondaryText

          return React.createElement(Box, { key: p.id, flexDirection: 'row' },
            React.createElement(Text, {
              color: isSelected ? THEME.suggestion : statusColor,
              inverse: isSelected,
            }, ` ${statusIcon} ${p.name.padEnd(22)}`),
            React.createElement(Text, {
              color: isSelected ? THEME.suggestion : THEME.secondaryText,
              inverse: isSelected,
            },
              enabled ? `${modelCount} model${modelCount !== 1 ? 's' : ''}` : 'disabled',
              p.isLocal ? '  (local)' : '',
              enabled && !hasKey && !p.noKeyRequired ? '  [no key]' : '',
            )
          )
        })
      ),
      providers.length > MAX_VISIBLE
        ? React.createElement(Text, { key: 'more', color: THEME.secondaryText, marginTop: 1 },
            `  ... and ${providers.length - MAX_VISIBLE} more`
          )
        : null
    )
  }

  // ── Render detail view ───────────────────────────────────────────────────
  const p = detailProvider
  if (!p) return null

  const enabled = isProviderEnabled(p)
  const enabledModels = getEnabledModels(p)
  const models = p.models || []

  return React.createElement(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: THEME.claude,
    padding: 1,
    marginTop: 1,
  },
    React.createElement(Text, { key: 'title', bold: true, color: THEME.claude },
      `⏺ ${p.name}`
    ),
    React.createElement(Text, { key: 'hint', color: THEME.secondaryText },
      'Space = toggle model · Enter on key field to edit · Esc = back'
    ),

    // API Key section
    p.noKeyRequired
      ? React.createElement(Text, { key: 'nokey', color: THEME.secondaryText, marginTop: 1 },
          '  No API key required (local provider)'
        )
      : React.createElement(Box, { key: 'keyrow', flexDirection: 'row', marginTop: 1 },
          React.createElement(Text, {
            color: detailFocusArea === 'key' ? THEME.suggestion : THEME.secondaryText,
            inverse: detailFocusArea === 'key' && !keyFocused,
          }, '  API Key: '),
          keyFocused
            ? React.createElement(TextInput, {
                value: keyInput,
                onChange: setKeyInput,
                onSubmit: handleKeySubmit,
                placeholder: 'Enter API key...',
                mask: '*',
              })
            : React.createElement(Text, {
                color: detailFocusArea === 'key' ? THEME.suggestion : THEME.text,
              }, getProviderKey(p) ? '●'.repeat(8) + ' (set)' : '(not set — press Enter to edit)')
        ),

    // Models section
    React.createElement(Box, { key: 'mlabel', marginTop: 1 },
      React.createElement(Text, { bold: true }, '  Models:')
    ),
    React.createElement(Box, { key: 'models', flexDirection: 'column' },
      models.map((m, idx) => {
        const isOn = p.isBuiltin || enabledModels.has(m.id)
        const isCursor = detailFocusArea === 'models' && idx === modelCursor
        return React.createElement(Box, { key: m.id, flexDirection: 'row' },
          React.createElement(Text, {
            color: isCursor ? THEME.suggestion : (isOn ? THEME.success : THEME.secondaryText),
            inverse: isCursor,
          },
            `  ${isOn ? '✓' : '○'} ${m.name.padEnd(36)}`,
            React.createElement(Text, {
              color: isCursor ? THEME.suggestion : THEME.secondaryText,
            }, m.category ? `[${m.category}]` : '')
          )
        )
      })
    ),

    // Provider URL
    p.apiKeyURL
      ? React.createElement(Text, { key: 'url', color: THEME.secondaryText, marginTop: 1 },
          `  Get key: ${p.apiKeyURL}`
        )
      : null
  )
}
