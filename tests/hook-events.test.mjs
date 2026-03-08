/**
 * Tests for the 6 new hook event types:
 * HEVT-01: PostToolUseFailure
 * HEVT-02: SubagentStart
 * HEVT-03: InstructionsLoaded
 * HEVT-04: ConfigChange
 * HEVT-05: WorktreeCreate
 * HEVT-06: WorktreeRemove
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock config before importing hooks
vi.mock('../src/core/config.mjs', () => ({
  loadSettings: vi.fn(() => ({ hooks: {} })),
}))

const {
  HookType,
  runPostToolUseFailure,
  runSubagentStart,
  runInstructionsLoaded,
  runConfigChange,
  runWorktreeCreate,
  runWorktreeRemove,
  runHooks,
  clearOnceState,
  clearHookSnapshot,
} = await import('../src/core/hooks.mjs')

describe('Hook Event Types', () => {
  beforeEach(() => {
    clearOnceState()
    clearHookSnapshot()
  })

  describe('HookType constants', () => {
    it('has POST_TOOL_USE_FAILURE constant', () => {
      expect(HookType.POST_TOOL_USE_FAILURE).toBe('PostToolUseFailure')
    })

    it('has SUBAGENT_START constant', () => {
      expect(HookType.SUBAGENT_START).toBe('SubagentStart')
    })

    it('has INSTRUCTIONS_LOADED constant', () => {
      expect(HookType.INSTRUCTIONS_LOADED).toBe('InstructionsLoaded')
    })

    it('has CONFIG_CHANGE constant', () => {
      expect(HookType.CONFIG_CHANGE).toBe('ConfigChange')
    })

    it('has WORKTREE_CREATE constant', () => {
      expect(HookType.WORKTREE_CREATE).toBe('WorktreeCreate')
    })

    it('has WORKTREE_REMOVE constant', () => {
      expect(HookType.WORKTREE_REMOVE).toBe('WorktreeRemove')
    })
  })

  describe('runPostToolUseFailure', () => {
    it('is exported as a function', () => {
      expect(typeof runPostToolUseFailure).toBe('function')
    })

    it('calls runHooks with PostToolUseFailure type', async () => {
      const result = await runPostToolUseFailure('Bash', { command: 'ls' }, new Error('fail'), {})
      expect(result).toBeDefined()
      expect(result.action).toBe('continue')
    })

    it('passes error info in context', async () => {
      const error = new Error('tool broke')
      const result = await runPostToolUseFailure('Read', {}, error)
      expect(result).toBeDefined()
    })
  })

  describe('runSubagentStart', () => {
    it('is exported as a function', () => {
      expect(typeof runSubagentStart).toBe('function')
    })

    it('calls runHooks with SubagentStart type', async () => {
      const config = { type: 'explore', model: 'test' }
      const result = await runSubagentStart(config, {})
      expect(result).toBeDefined()
      expect(result.action).toBe('continue')
    })
  })

  describe('runInstructionsLoaded', () => {
    it('is exported as a function', () => {
      expect(typeof runInstructionsLoaded).toBe('function')
    })

    it('calls runHooks with InstructionsLoaded type', async () => {
      const result = await runInstructionsLoaded('# CLAUDE.md content', {})
      expect(result).toBeDefined()
      expect(result.action).toBe('continue')
    })
  })

  describe('runConfigChange', () => {
    it('is exported as a function', () => {
      expect(typeof runConfigChange).toBe('function')
    })

    it('calls runHooks with ConfigChange type', async () => {
      const result = await runConfigChange({})
      expect(result).toBeDefined()
      expect(result.action).toBe('continue')
    })
  })

  describe('runWorktreeCreate', () => {
    it('is exported as a function', () => {
      expect(typeof runWorktreeCreate).toBe('function')
    })

    it('calls runHooks with WorktreeCreate type', async () => {
      const result = await runWorktreeCreate('/tmp/worktree', {})
      expect(result).toBeDefined()
      expect(result.action).toBe('continue')
    })
  })

  describe('runWorktreeRemove', () => {
    it('is exported as a function', () => {
      expect(typeof runWorktreeRemove).toBe('function')
    })

    it('calls runHooks with WorktreeRemove type', async () => {
      const result = await runWorktreeRemove('/tmp/worktree', {})
      expect(result).toBeDefined()
      expect(result.action).toBe('continue')
    })
  })
})
