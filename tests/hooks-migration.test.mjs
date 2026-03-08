/**
 * Tests for hook config migration (HOOK-01 through HOOK-05)
 *
 * HOOK-01: Format normalization (flat + nested)
 * HOOK-02: Type defaulting
 * HOOK-03: statusMessage field
 * HOOK-04: once per session
 * HOOK-05: Handler deduplication
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock config.mjs so loadSettings returns controlled data
vi.mock('../src/core/config.mjs', () => ({
  loadSettings: vi.fn(() => ({})),
}))

import { loadSettings } from '../src/core/config.mjs'
import {
  normalizeHookConfig,
  deduplicateHandlers,
  clearOnceState,
  loadHooks,
  runHooks,
  HookType,
} from '../src/core/hooks.mjs'

beforeEach(() => {
  vi.clearAllMocks()
  clearOnceState()
})

// ============================================================================
// HOOK-01: Format normalization
// ============================================================================
describe('HOOK-01: normalizeHookConfig', () => {
  it('converts flat format to nested format', () => {
    const input = [{ matcher: 'Bash', command: ['./test.sh'], timeout: 5000 }]
    const result = normalizeHookConfig(input)

    expect(result).toEqual([{
      matcher: 'Bash',
      hooks: [{
        type: 'command',
        command: ['./test.sh'],
        timeout: 5000,
        statusMessage: null,
        once: false,
      }],
    }])
  })

  it('passes through nested format with defaults', () => {
    const input = [{ matcher: 'Bash', hooks: [{ command: './test.sh' }] }]
    const result = normalizeHookConfig(input)

    expect(result).toEqual([{
      matcher: 'Bash',
      hooks: [{
        type: 'command',
        command: ['./test.sh'],
        statusMessage: null,
        once: false,
      }],
    }])
  })

  it('handles mixed flat and nested entries', () => {
    const input = [
      { matcher: 'Bash', command: ['./flat.sh'] },
      { matcher: 'Read', hooks: [{ command: './nested.sh' }] },
    ]
    const result = normalizeHookConfig(input)

    expect(result).toHaveLength(2)
    expect(result[0].hooks[0].command).toEqual(['./flat.sh'])
    expect(result[1].hooks[0].command).toEqual(['./nested.sh'])
  })

  it('wraps string command in array', () => {
    const input = [{ matcher: 'Bash', command: './test.sh' }]
    const result = normalizeHookConfig(input)

    expect(result[0].hooks[0].command).toEqual(['./test.sh'])
  })

  it('returns [] for null/undefined/empty input', () => {
    expect(normalizeHookConfig(null)).toEqual([])
    expect(normalizeHookConfig(undefined)).toEqual([])
    expect(normalizeHookConfig([])).toEqual([])
  })
})

// ============================================================================
// HOOK-02: Type defaulting
// ============================================================================
describe('HOOK-02: type defaulting', () => {
  it('defaults missing type to "command"', () => {
    const input = [{ matcher: 'Bash', hooks: [{ command: ['./x.sh'] }] }]
    const result = normalizeHookConfig(input)

    expect(result[0].hooks[0].type).toBe('command')
  })

  it('preserves explicit type: "command"', () => {
    const input = [{ matcher: 'Bash', hooks: [{ type: 'command', command: ['./x.sh'] }] }]
    const result = normalizeHookConfig(input)

    expect(result[0].hooks[0].type).toBe('command')
  })

  it('preserves explicit type: "http" (forward compat)', () => {
    const input = [{ matcher: 'Bash', hooks: [{ type: 'http', command: ['./x.sh'] }] }]
    const result = normalizeHookConfig(input)

    expect(result[0].hooks[0].type).toBe('http')
  })
})

// ============================================================================
// HOOK-03: statusMessage
// ============================================================================
describe('HOOK-03: statusMessage', () => {
  it('preserves statusMessage through normalization', () => {
    const input = [{
      matcher: 'Bash',
      hooks: [{ command: ['./x.sh'], statusMessage: 'Checking...' }],
    }]
    const result = normalizeHookConfig(input)

    expect(result[0].hooks[0].statusMessage).toBe('Checking...')
  })

  it('defaults statusMessage to null', () => {
    const input = [{ matcher: 'Bash', hooks: [{ command: ['./x.sh'] }] }]
    const result = normalizeHookConfig(input)

    expect(result[0].hooks[0].statusMessage).toBeNull()
  })
})

// ============================================================================
// HOOK-04: once per session
// ============================================================================
describe('HOOK-04: once per session', () => {
  it('once:true hook executes on first call, skips on second', async () => {
    loadSettings.mockReturnValue({
      hooks: {
        PreToolUse: [{
          matcher: 'Bash',
          hooks: [{
            type: 'command',
            command: ['echo', 'hello'],
            once: true,
          }],
        }],
      },
    })

    const result1 = await runHooks(HookType.PRE_TOOL_USE, { toolName: 'Bash' })
    // First call: handler should have been dispatched
    expect(result1.results.length).toBe(1)

    const result2 = await runHooks(HookType.PRE_TOOL_USE, { toolName: 'Bash' })
    // Second call: once:true handler should be skipped
    expect(result2.results.length).toBe(0)
  })

  it('once:false (default) hook executes every time', async () => {
    loadSettings.mockReturnValue({
      hooks: {
        PreToolUse: [{
          matcher: 'Bash',
          hooks: [{
            type: 'command',
            command: ['echo', 'hello'],
            once: false,
          }],
        }],
      },
    })

    const result1 = await runHooks(HookType.PRE_TOOL_USE, { toolName: 'Bash' })
    expect(result1.results.length).toBe(1)

    const result2 = await runHooks(HookType.PRE_TOOL_USE, { toolName: 'Bash' })
    expect(result2.results.length).toBe(1)
  })

  it('clearOnceState resets tracking', async () => {
    loadSettings.mockReturnValue({
      hooks: {
        PreToolUse: [{
          matcher: 'Bash',
          hooks: [{
            type: 'command',
            command: ['echo', 'hello'],
            once: true,
          }],
        }],
      },
    })

    await runHooks(HookType.PRE_TOOL_USE, { toolName: 'Bash' })
    clearOnceState()

    const result = await runHooks(HookType.PRE_TOOL_USE, { toolName: 'Bash' })
    expect(result.results.length).toBe(1)
  })
})

// ============================================================================
// HOOK-05: Handler deduplication
// ============================================================================
describe('HOOK-05: deduplicateHandlers', () => {
  it('deduplicates identical handlers by type + command', () => {
    const handlers = [
      { type: 'command', command: ['./x.sh'] },
      { type: 'command', command: ['./x.sh'] },
    ]
    const result = deduplicateHandlers(handlers)

    expect(result).toHaveLength(1)
    expect(result[0].command).toEqual(['./x.sh'])
  })

  it('keeps handlers with different commands', () => {
    const handlers = [
      { type: 'command', command: ['./x.sh'] },
      { type: 'command', command: ['./y.sh'] },
    ]
    const result = deduplicateHandlers(handlers)

    expect(result).toHaveLength(2)
  })

  it('keeps handlers with different types', () => {
    const handlers = [
      { type: 'command', command: ['./x.sh'] },
      { type: 'http', command: ['./x.sh'] },
    ]
    const result = deduplicateHandlers(handlers)

    expect(result).toHaveLength(2)
  })
})

// ============================================================================
// Integration: loadHooks returns normalized hooks
// ============================================================================
describe('loadHooks normalization', () => {
  it('loadHooks returns normalized structure from flat config', () => {
    loadSettings.mockReturnValue({
      hooks: {
        PreToolUse: [{ matcher: 'Bash', command: ['./test.sh'], timeout: 5000 }],
      },
    })

    const hooks = loadHooks()
    expect(hooks.PreToolUse[0].hooks).toBeDefined()
    expect(hooks.PreToolUse[0].hooks[0].type).toBe('command')
  })
})
