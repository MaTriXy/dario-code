# Phase 2: Hook Config Migration - Research

**Researched:** 2026-03-08
**Domain:** Hook configuration schema normalization, deduplication, session snapshotting
**Confidence:** HIGH

## Summary

Phase 2 migrates the hook configuration format from Dario's current flat structure (`{ matcher, command, timeout }`) to Claude Code's nested structure (`{ matcher, hooks: [{ type, command }] }`) while maintaining full backward compatibility. The existing `src/core/hooks.mjs` is a ~455-line file that handles only shell command hooks. The changes are surgical: a normalization layer at load time, new fields (`statusMessage`, `once`, `type`), deduplication before execution, and a startup snapshot with change detection.

The settings hierarchy from Phase 1 is complete and working. `loadSettings()` returns merged config from 5 levels, so hooks defined at different scopes (user, project, local, CLI, managed) will naturally merge. The key challenge is normalizing mixed formats (old flat + new nested) into a single internal representation before downstream code processes them.

**Primary recommendation:** Normalize all hook configs to the nested format at load time in `loadHooks()`. All downstream code (matching, execution, deduplication) operates on the normalized shape only. The flat format is never stored internally -- it's converted on read.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOOK-01 | Support nested hook format `{ matcher, hooks: [{ type, command }] }` alongside current flat format | Config normalization pattern in `loadHooks()` -- convert flat to nested at read time |
| HOOK-02 | Absent `type` field defaults to `"command"` for backward compatibility | Default in normalization: `type: hook.type \|\| 'command'` |
| HOOK-03 | `statusMessage` field for custom spinner text during hook execution | New field on handler objects, passed through to execution context |
| HOOK-04 | `once` field to run hook only once per session | Session-scoped Set tracking executed hook identifiers |
| HOOK-05 | Hook deduplication (identical handlers run only once) | Content-based dedup by `type + command` or `type + url` before execution |
| HOOK-06 | Hook snapshot at startup with warning on mid-session modification | Snapshot in session init, `fs.watch` or hash-based change detection |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs` | builtin | File watching for config change detection | No external dependency needed |
| Node.js `crypto` | builtin | Hashing hook configs for snapshot comparison | Lightweight change detection |
| lodash/merge | already installed | Deep merging hook configs from multiple scopes | Already used in Phase 1 settings |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 1.6.1 (installed) | Unit testing | All test files for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fs.watch` for config changes | Hash comparison on periodic check | `fs.watch` is simpler but has platform quirks; hash comparison is more reliable but needs a trigger point |
| Content hash for dedup | Stringify + compare | Hash is O(1) lookup; stringify comparison works but is slower for many hooks |

**Installation:**
```bash
# No new dependencies needed -- all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/core/
  hooks.mjs          # Modified: add normalization, dedup, snapshot, new fields
                     # No new files needed -- all changes fit in existing module
```

### Pattern 1: Config Normalization (Adapter at Load Time)
**What:** Convert old flat format to new nested format during `loadHooks()`. All downstream code only sees the nested shape.
**When to use:** Always -- called once per hook load.
**Example:**
```javascript
// Source: Architecture research + Claude Code docs
function normalizeHookConfig(hookList) {
  if (!Array.isArray(hookList)) return []
  return hookList.map(entry => {
    // Already in nested format
    if (entry.hooks && Array.isArray(entry.hooks)) {
      // Ensure each handler has a type
      return {
        matcher: entry.matcher,
        hooks: entry.hooks.map(h => ({ type: 'command', ...h }))
      }
    }
    // Flat format -> nested format
    return {
      matcher: entry.matcher,
      hooks: [{
        type: 'command',
        command: entry.command,
        timeout: entry.timeout,
        environment: entry.environment
      }]
    }
  })
}
```

### Pattern 2: Handler Dispatch (Strategy Pattern)
**What:** Each hook type dispatches to a specific handler function. Phase 2 only has `command`, but the dispatch table is set up for Phase 3's HTTP/prompt/agent types.
**When to use:** In `executeHook()` -- replaces direct command execution with type-based dispatch.
**Example:**
```javascript
const handlers = {
  command: executeCommandHook
  // Phase 3 will add: http, prompt, agent
}

async function dispatchHook(handler, context, verbose) {
  const type = handler.type || 'command'
  const fn = handlers[type]
  if (!fn) {
    return { success: false, action: 'continue', error: `Unknown hook type: ${type}` }
  }
  return fn(handler, context, verbose)
}
```

### Pattern 3: Deduplication by Content Identity
**What:** Before executing hooks for an event, deduplicate handlers with identical `type + command` (or `type + url` for future HTTP hooks).
**When to use:** In `runHooks()` before the execution loop.
**Example:**
```javascript
function deduplicateHandlers(handlers) {
  const seen = new Set()
  return handlers.filter(h => {
    const key = `${h.type || 'command'}:${h.command || h.url || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

### Pattern 4: Startup Snapshot with Change Warning
**What:** Capture a hash of the hook configuration at session start. On subsequent loads (or via file watcher), compare hash and warn if changed.
**When to use:** Session initialization.
**Example:**
```javascript
import { createHash } from 'crypto'

let _hookSnapshot = null

function snapshotHooks(hookConfig) {
  _hookSnapshot = createHash('sha256')
    .update(JSON.stringify(hookConfig))
    .digest('hex')
  return hookConfig
}

function checkHookIntegrity(currentConfig) {
  if (!_hookSnapshot) return true
  const currentHash = createHash('sha256')
    .update(JSON.stringify(currentConfig))
    .digest('hex')
  return currentHash === _hookSnapshot
}
```

### Anti-Patterns to Avoid
- **Re-reading config on every hook execution:** Current code calls `loadHooks()` -> `loadSettings()` on every `runHooks()` call. This reads 5+ files from disk each time. Phase 2 should cache the normalized config and only re-read when explicitly refreshed.
- **Mixing flat and nested formats in execution code:** Normalize once at load, never check format downstream.
- **Using `JSON.stringify` for dedup without sorting keys:** Object property order can vary. Use explicit key extraction (`type + command`) instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep merge of hook configs from scopes | Custom recursive merge | `deepMergeSettings()` from config.mjs | Already handles array concat, tested in Phase 1 |
| File change detection | Custom polling loop | `createHash('sha256')` comparison | Simple, deterministic, no platform quirks |
| Config validation | Custom if/else chains | Type-check in normalization function | Single validation point, not spread across code |

**Key insight:** The normalization function IS the validation layer. If a hook entry lacks required fields after normalization, it's invalid. No separate validation pass needed.

## Common Pitfalls

### Pitfall 1: Breaking Existing Flat Format Configs
**What goes wrong:** Switching to nested format without backward compatibility silently breaks all existing user configs.
**Why it happens:** Normalization function doesn't handle edge cases (missing `command` field, string commands vs arrays).
**How to avoid:** Test normalization with every variation of the flat format: `command` as string, as array, with/without timeout, with/without matcher, with/without environment.
**Warning signs:** Existing hook tests fail after changes.

### Pitfall 2: Hooks From Multiple Scopes Not Merging Correctly
**What goes wrong:** User defines hooks at user level and project level. The project hooks replace (not merge with) the user hooks because `hooks` is an object keyed by event type, and lodash `merge` replaces array values by index.
**Why it happens:** `lodash/merge` merges arrays by index, not concatenation. `hooks.PreToolUse[0]` from user gets replaced by `hooks.PreToolUse[0]` from project.
**How to avoid:** Add `'hooks.PreToolUse', 'hooks.PostToolUse'`, etc. to `CONCAT_ARRAY_KEYS` in config.mjs, OR handle hook array concatenation in `loadHooks()` after settings merge.
**Warning signs:** Hooks defined at user scope disappear when project scope also defines hooks for the same event.

### Pitfall 3: Deduplication Removing Intentionally Different Hooks
**What goes wrong:** Two hooks with the same command but different matchers get deduplicated into one.
**Why it happens:** Dedup key only considers `type + command`, not `matcher`.
**How to avoid:** Dedup should happen AFTER matcher filtering. Only deduplicate handlers that matched the same event. The matcher is part of the group, not the handler -- so two groups can have the same handler command and both should fire if they match different tools.
**Warning signs:** A hook that should fire for both "Bash" and "Edit" matchers only fires once.

### Pitfall 4: `once` Flag State Not Persisting Across Hook Reloads
**What goes wrong:** If hooks are reloaded mid-session (cache miss), the `once` tracking Set is lost.
**Why it happens:** `once` state stored in local variable, not tied to session state.
**How to avoid:** Store the `once` execution Set at module level, keyed by session ID. Clear on session end.
**Warning signs:** A `once: true` hook fires multiple times after a config reload.

### Pitfall 5: loadHooks() Called on Every Single Hook Invocation
**What goes wrong:** Every call to `runHooks()` calls `loadHooks()` which calls `loadSettings()` which reads 5+ files from disk. In a busy session with many tool calls, this creates unnecessary I/O.
**Why it happens:** Current code has no caching -- it's the simplest approach but doesn't scale.
**How to avoid:** Cache the normalized hook config at session start (the snapshot). Use the cached version for all hook executions. Only reload when explicitly triggered.
**Warning signs:** Slow hook execution, especially on network-mounted filesystems.

## Code Examples

Verified patterns from existing codebase:

### Current Hook Config Format (Flat -- must continue to work)
```javascript
// From settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": ["./validate-bash.sh"],
        "timeout": 5000
      }
    ]
  }
}
```

### New Hook Config Format (Nested -- must also work)
```javascript
// From settings.json (Claude Code format)
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./validate-bash.sh",
            "statusMessage": "Validating bash command...",
            "once": false
          }
        ]
      }
    ]
  }
}
```

### Normalized Internal Format (what all code sees after loadHooks)
```javascript
// Internal representation after normalization
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": ["./validate-bash.sh"],
          "timeout": 5000,
          "statusMessage": null,
          "once": false
        }
      ]
    }
  ]
}
```

### Modified runHooks Flow
```javascript
// Pseudocode for updated runHooks
export async function runHooks(hookType, context, verbose = false) {
  const allHooks = getCachedHooks()  // Use cached, not loadHooks()
  const hookGroups = allHooks[hookType] || []

  // Collect all matching handlers across groups
  const matchingHandlers = []
  for (const group of hookGroups) {
    if (!matchesHook(group, { ...context, hookType })) continue
    for (const handler of group.hooks) {
      matchingHandlers.push(handler)
    }
  }

  // Deduplicate
  const uniqueHandlers = deduplicateHandlers(matchingHandlers)

  // Filter out `once` handlers that already ran
  const runnableHandlers = uniqueHandlers.filter(h => {
    if (!h.once) return true
    return !hasRunOnce(hookType, h)
  })

  // Execute
  const results = []
  let finalAction = HookAction.CONTINUE
  for (const handler of runnableHandlers) {
    if (handler.once) markAsRun(hookType, handler)
    const result = await dispatchHook(handler, { ...context, hookType }, verbose)
    results.push(result)
    if (result.action === HookAction.BLOCK) {
      finalAction = HookAction.BLOCK
      break
    }
  }

  return { action: finalAction, results, modifiedInput: null }
}
```

## State of the Art

| Old Approach (Dario Current) | New Approach (Claude Code Parity) | Impact |
|------------------------------|-----------------------------------|--------|
| Flat `{ matcher, command, timeout }` | Nested `{ matcher, hooks: [{ type, command }] }` | Enables multi-handler groups, multiple handler types |
| No handler type field | `type: "command"` (default) | Prepares for Phase 3 HTTP/prompt/agent handlers |
| No deduplication | Deduplicate identical handlers | Prevents double-execution from multi-scope merge |
| Re-read config every invocation | Snapshot at startup, cached | Better performance, change detection |
| No spinner customization | `statusMessage` field | Better UX during hook execution |
| No execution limiting | `once` field | One-shot hooks for setup tasks |

## Open Questions

1. **Hook array merge strategy across settings scopes**
   - What we know: `lodash/merge` merges arrays by index, which is wrong for hook lists. Need concatenation.
   - What's unclear: Should we add all `hooks.*` event keys to `CONCAT_ARRAY_KEYS` in config.mjs, or handle it in `loadHooks()` post-merge?
   - Recommendation: Handle in `loadHooks()` -- manually concatenate hook arrays from each settings scope before normalization. This avoids polluting `CONCAT_ARRAY_KEYS` with 13+ event type paths. Load raw settings from each scope, extract `hooks` property, concatenate arrays per event type, then normalize.

2. **Change detection mechanism for HOOK-06**
   - What we know: Claude Code snapshots hooks at startup and warns on change. It does NOT live-reload.
   - What's unclear: Should we use `fs.watch` (proactive) or hash comparison at certain checkpoints (reactive)?
   - Recommendation: Hash comparison at startup + periodic check (e.g., before each hook execution or on a timer). `fs.watch` has well-known cross-platform reliability issues. A hash check is deterministic.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 1.6.1 |
| Config file | vitest.config implicit (package.json) |
| Quick run command | `npx vitest run tests/hooks-config.test.mjs` |
| Full suite command | `npm run test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOOK-01 | Nested format parsed correctly alongside flat format | unit | `npx vitest run tests/hooks-config.test.mjs -t "normaliz"` | No -- Wave 0 |
| HOOK-02 | Missing type defaults to "command" | unit | `npx vitest run tests/hooks-config.test.mjs -t "default type"` | No -- Wave 0 |
| HOOK-03 | statusMessage passed through during execution | unit | `npx vitest run tests/hooks-config.test.mjs -t "statusMessage"` | No -- Wave 0 |
| HOOK-04 | once: true hook runs only first time | unit | `npx vitest run tests/hooks-config.test.mjs -t "once"` | No -- Wave 0 |
| HOOK-05 | Identical handlers deduplicated | unit | `npx vitest run tests/hooks-config.test.mjs -t "dedup"` | No -- Wave 0 |
| HOOK-06 | Snapshot taken at startup, change detected | unit | `npx vitest run tests/hooks-config.test.mjs -t "snapshot"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/hooks-config.test.mjs`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `tests/hooks-config.test.mjs` -- covers HOOK-01 through HOOK-06
- [ ] Mock pattern: follow `settings-hierarchy.test.mjs` approach (mock `utils.mjs`, `os`)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/core/hooks.mjs` (455 lines, current flat format, 13 event types)
- Existing codebase: `src/core/config.mjs` (885 lines, Phase 1 complete, `deepMergeSettings()` available)
- Existing codebase: `tests/settings-hierarchy.test.mjs` (test pattern reference)
- Architecture research: `.planning/research/ARCHITECTURE.md` (normalization and dispatch patterns)
- Features research: `.planning/research/FEATURES.md` (hook schema details from Claude Code docs)

### Secondary (MEDIUM confidence)
- Pitfalls research: `.planning/research/PITFALLS.md` (breaking format, merge issues)
- Claude Code hooks documentation (referenced in research, not re-fetched)

### Tertiary (LOW confidence)
- None -- all findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all tools already in project
- Architecture: HIGH - normalization pattern well-understood, existing code clear
- Pitfalls: HIGH - pitfalls identified from codebase analysis (lodash merge arrays, re-reading config)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable domain, no external dependencies changing)
