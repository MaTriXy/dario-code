# Phase 1: Settings Hierarchy - Research

**Researched:** 2026-03-08
**Domain:** Configuration management, multi-level settings precedence, deep merge
**Confidence:** HIGH

## Summary

Phase 1 refactors `src/core/config.mjs` to support a 5-level settings hierarchy (managed > CLI > local > project > user) with deep merge for objects and concatenation for arrays. The current implementation uses `Object.assign` (shallow merge) and only reads from two sources (~/.claude and ~/.dario). This needs to expand to five sources with correct precedence.

The codebase already has `lodash` as a dependency (v4.17.21) but does not import it anywhere. `lodash/merge` provides the deep merge needed. The main complexity lies in (1) adding the three missing sources (managed, CLI overrides, local project), (2) replacing `Object.assign` with deep merge + array concatenation, and (3) adding the two new CLI flags (`--setting-sources`, `--settings`). All downstream consumers (hooks, permissions, sandbox, TUI) call `loadSettings()` and expect the same return shape, so the refactor is internal to `config.mjs` plus CLI flag wiring.

**Primary recommendation:** Replace `loadSettings()` internals with a 5-layer loader using `lodash/merge` plus custom array concatenation for permission arrays. Expose a `loadSettingsWithOptions({ sources, extraSettings })` variant for the CLI flags.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SET-01 | Settings load from 5 levels: managed > CLI > local > project > user | Architecture pattern in "Settings Resolution Flow"; managed path conventions documented below |
| SET-02 | Object-valued settings deep-merge across levels | `lodash/merge` already available as dependency; replaces `Object.assign` |
| SET-03 | Array-valued settings concatenate across scopes | Custom merge function wrapping `lodash/merge` with array key list |
| SET-04 | Local project settings from `.claude/settings.local.json` | New file path, needs gitignore handling |
| SET-05 | Managed settings from platform-specific read-only path | macOS: `~/Library/Application Support/claude-code/managed-settings.json`; Linux: `/etc/claude-code/managed-settings.json` |
| SET-06 | `--setting-sources` flag selects which scopes to load | Commander option added to cli.mjs, passed through to loadSettings |
| SET-07 | `--settings` flag loads settings from JSON file or inline string | Commander option, parsed as JSON, injected as CLI-level settings |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lodash | 4.17.21 | Deep merge via `merge()` | Already in package.json; battle-tested deep merge with correct prototype handling |
| commander | 14.0.2 | CLI flag parsing | Already used in cli.mjs for all flags |
| zod | 3.22.4 | Settings schema validation (optional but recommended) | Already in package.json |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | built-in | File reading for settings files | All file I/O |
| node:path | built-in | Path resolution for settings locations | Cross-platform paths |
| node:os | built-in | `homedir()` and `platform` detection | Managed settings path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lodash/merge | deepmerge (npm) | Would add a new dependency; lodash already installed |
| lodash/merge | structuredClone + manual merge | More code, more bugs, no benefit |
| Zod validation | Manual checks | Zod already available and provides better error messages |

**Installation:**
```bash
# No new dependencies needed - lodash 4.17.21 already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/core/
  config.mjs           # Refactored: 5-level loader, deep merge, CLI flag support
                        # All changes contained here + cli.mjs flag additions
```

### Pattern 1: Layered Settings Merge
**What:** Load settings from 5 locations in precedence order, deep-merge with array concatenation for specific keys.
**When to use:** Every call to `loadSettings()`.
**Example:**
```javascript
import merge from 'lodash/merge.js'

// Array keys that concatenate rather than replace
const CONCAT_ARRAY_KEYS = [
  'permissions.allow',
  'permissions.deny',
  'permissions.ask'
]

function deepMergeSettings(base, overlay) {
  if (!overlay) return base
  const result = merge({}, base, overlay)
  // Restore array concatenation for specific keys
  for (const keyPath of CONCAT_ARRAY_KEYS) {
    const parts = keyPath.split('.')
    const baseArr = getNestedValue(base, parts)
    const overlayArr = getNestedValue(overlay, parts)
    if (Array.isArray(baseArr) && Array.isArray(overlayArr)) {
      setNestedValue(result, parts, [...new Set([...baseArr, ...overlayArr])])
    }
  }
  return result
}
```

### Pattern 2: Source-Filtered Loading
**What:** The `--setting-sources` flag filters which of the 5 layers are loaded.
**When to use:** When user passes `--setting-sources user,project` to exclude managed/local/CLI layers.
**Example:**
```javascript
const ALL_SOURCES = ['user', 'project', 'local', 'cli', 'managed']

function loadSettings({ sources = ALL_SOURCES, extraSettings = null } = {}) {
  let result = {}
  // Load in lowest-to-highest precedence order
  if (sources.includes('user'))    result = deepMergeSettings(result, loadUserSettings())
  if (sources.includes('project')) result = deepMergeSettings(result, loadProjectSettings())
  if (sources.includes('local'))   result = deepMergeSettings(result, loadLocalSettings())
  if (sources.includes('cli') && extraSettings) result = deepMergeSettings(result, extraSettings)
  if (sources.includes('managed')) result = deepMergeSettings(result, loadManagedSettings())
  return result
}
```

### Pattern 3: Platform-Specific Managed Settings
**What:** Read managed (enterprise/admin) settings from a platform-specific read-only path.
**When to use:** At the managed layer of settings loading.
**Example:**
```javascript
function getManagedSettingsPath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support',
                     'claude-code', 'managed-settings.json')
  }
  if (process.platform === 'linux') {
    return '/etc/claude-code/managed-settings.json'
  }
  // Windows: %APPDATA%/claude-code/managed-settings.json
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'claude-code', 'managed-settings.json')
  }
  return null
}

function loadManagedSettings() {
  const settingsPath = getManagedSettingsPath()
  if (!settingsPath) return {}
  try {
    return safeJsonParse(readFile(settingsPath), {})
  } catch {
    return {} // Never throw on missing managed settings
  }
}
```

### Anti-Patterns to Avoid
- **Object.assign for nested settings:** Destroys nested objects. The current `loadSettings()` and `loadConfig()` both use `Object.assign` which must be replaced with deep merge.
- **Re-reading all 5 files on every call:** `loadSettings()` is called frequently (hooks, permissions, TUI). Consider caching with invalidation, or at minimum document that callers should cache the result within a single operation.
- **Mutating the merged result:** `executor.mjs` currently does `settings.permissions = {...}` and calls `saveSettings(settings)` which would write the merged result back to disk, potentially persisting managed/project settings into user settings. The `saveSettings()` function must continue to write only to `~/.dario/settings.json`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep merge of nested objects | Manual recursive merge | `lodash/merge` | Handles prototypes, getters, edge cases correctly |
| Array deduplication | Manual loop | `[...new Set([...a, ...b])]` | Built-in, no dependency |
| JSON parsing with fallback | try/catch wrapper | Existing `safeJsonParse()` utility | Already in codebase at `src/core/utils.mjs` |
| Platform detection | Manual `process.platform` checks everywhere | Single `getManagedSettingsPath()` function | Centralize platform logic |

**Key insight:** `lodash/merge` handles the 90% case. The only custom logic needed is array concatenation for specific keys, which is ~15 lines of code wrapping the merge call.

## Common Pitfalls

### Pitfall 1: Object.assign Destroying Nested Config
**What goes wrong:** Current `loadSettings()` uses `Object.assign(settings, claudeSettings)` then `Object.assign(settings, darioSettings)`. With nested `permissions`, `sandbox`, `hooks` objects, a project-level `permissions.deny` would delete user-level `permissions.allow`.
**Why it happens:** `Object.assign` is shallow -- it replaces top-level keys entirely.
**How to avoid:** Replace all `Object.assign` calls in settings loading with `lodash/merge`.
**Warning signs:** Test case: user has `permissions.allow: ["X"]`, project has `permissions.deny: ["Y"]`. If merged result is missing `allow`, the merge is wrong.

### Pitfall 2: saveSettings Writing Merged Data Back
**What goes wrong:** After loading and merging 5 levels, code that modifies settings and calls `saveSettings()` would write managed/project-level settings into `~/.dario/settings.json`.
**Why it happens:** Current `saveSettings()` writes whatever object it receives to disk.
**How to avoid:** `saveSettings()` must remain scoped to the user-level `.dario/settings.json` file only. Code that modifies settings (e.g., approving tools) should only write the user-level changes.
**Warning signs:** After approving a tool, check that `~/.dario/settings.json` doesn't contain keys from project or managed settings.

### Pitfall 3: lodash/merge Replaces Arrays
**What goes wrong:** `lodash/merge` merges arrays by index (`merge([1,2], [3]) => [3,2]`), not concatenation. Permission arrays would lose entries.
**Why it happens:** lodash merge treats arrays as indexed objects.
**How to avoid:** After the merge call, explicitly concatenate the known array keys using the `CONCAT_ARRAY_KEYS` pattern above.
**Warning signs:** User has `permissions.allow: ["A", "B"]`, project has `permissions.allow: ["C"]`. Result should be `["A", "B", "C"]`, not `["C", "B"]`.

### Pitfall 4: Missing Gitignore for settings.local.json
**What goes wrong:** `.claude/settings.local.json` contains user-specific overrides (API keys, personal preferences) that get committed to git.
**Why it happens:** No `.gitignore` entry exists for this file.
**How to avoid:** When creating the local settings file or documenting it, ensure `.claude/settings.local.json` is added to `.gitignore`. Consider auto-adding it if a `.gitignore` exists.
**Warning signs:** `git status` shows `.claude/settings.local.json` as trackable.

### Pitfall 5: Managed Settings Path Not Existing
**What goes wrong:** Code throws an error or crashes when the managed settings path doesn't exist (which is the normal case for individual developers).
**Why it happens:** Not handling the "file doesn't exist" case gracefully.
**How to avoid:** `loadManagedSettings()` must return `{}` when the file doesn't exist. Never throw on missing managed settings.

## Code Examples

### Current loadSettings (to be replaced)
```javascript
// Source: src/core/config.mjs lines 148-166
export function loadSettings() {
  const settings = {}
  // Load from .claude first
  const claudeSettingsPath = path.join(CLAUDE_DIR, SETTINGS_FILE)
  if (fileExists(claudeSettingsPath)) {
    const claudeSettings = safeJsonParse(readFile(claudeSettingsPath), {})
    Object.assign(settings, claudeSettings)  // BUG: shallow merge
  }
  // Overlay .dario settings
  const darioSettingsPath = path.join(DARIO_DIR, SETTINGS_FILE)
  if (fileExists(darioSettingsPath)) {
    const darioSettings = safeJsonParse(readFile(darioSettingsPath), {})
    Object.assign(settings, darioSettings)  // BUG: shallow merge
  }
  return settings
}
```

### New loadSettings (target implementation)
```javascript
import merge from 'lodash/merge.js'

const CONCAT_ARRAY_KEYS = [
  'permissions.allow', 'permissions.deny', 'permissions.ask'
]

// Runtime state for CLI overrides
let _cliSettings = null
let _settingSources = null

export function setCliSettings(settings) { _cliSettings = settings }
export function setSettingSources(sources) { _settingSources = sources }

function getNestedValue(obj, parts) {
  return parts.reduce((o, k) => o?.[k], obj)
}

function setNestedValue(obj, parts, value) {
  const last = parts.pop()
  const parent = parts.reduce((o, k) => (o[k] = o[k] || {}, o[k]), obj)
  parent[last] = value
}

function deepMergeSettings(base, overlay) {
  if (!overlay || Object.keys(overlay).length === 0) return base
  const result = merge({}, base, overlay)
  for (const keyPath of CONCAT_ARRAY_KEYS) {
    const parts = keyPath.split('.')
    const baseArr = getNestedValue(base, [...parts])
    const overlayArr = getNestedValue(overlay, [...parts])
    if (Array.isArray(baseArr) && Array.isArray(overlayArr)) {
      setNestedValue(result, keyPath.split('.'), [...new Set([...baseArr, ...overlayArr])])
    }
  }
  return result
}

function loadUserSettings() {
  let result = {}
  const claudePath = path.join(CLAUDE_DIR, SETTINGS_FILE)
  if (fileExists(claudePath)) result = safeJsonParse(readFile(claudePath), {})
  const darioPath = path.join(DARIO_DIR, SETTINGS_FILE)
  if (fileExists(darioPath)) result = deepMergeSettings(result, safeJsonParse(readFile(darioPath), {}))
  return result
}

function loadProjectSettings() {
  const projectPath = path.join(process.cwd(), '.claude', SETTINGS_FILE)
  if (fileExists(projectPath)) return safeJsonParse(readFile(projectPath), {})
  const darioProjectPath = path.join(process.cwd(), '.dario', SETTINGS_FILE)
  if (fileExists(darioProjectPath)) return safeJsonParse(readFile(darioProjectPath), {})
  return {}
}

function loadLocalSettings() {
  const localPath = path.join(process.cwd(), '.claude', 'settings.local.json')
  if (fileExists(localPath)) return safeJsonParse(readFile(localPath), {})
  const darioLocalPath = path.join(process.cwd(), '.dario', 'settings.local.json')
  if (fileExists(darioLocalPath)) return safeJsonParse(readFile(darioLocalPath), {})
  return {}
}

function getManagedSettingsPath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support',
                     'claude-code', 'managed-settings.json')
  }
  if (process.platform === 'linux') return '/etc/claude-code/managed-settings.json'
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'claude-code', 'managed-settings.json')
  }
  return null
}

function loadManagedSettings() {
  const p = getManagedSettingsPath()
  if (!p) return {}
  try { return safeJsonParse(readFile(p), {}) } catch { return {} }
}

export function loadSettings() {
  const sources = _settingSources || ['user', 'project', 'local', 'cli', 'managed']
  let result = {}
  if (sources.includes('user'))    result = deepMergeSettings(result, loadUserSettings())
  if (sources.includes('project')) result = deepMergeSettings(result, loadProjectSettings())
  if (sources.includes('local'))   result = deepMergeSettings(result, loadLocalSettings())
  if (sources.includes('cli') && _cliSettings) result = deepMergeSettings(result, _cliSettings)
  if (sources.includes('managed')) result = deepMergeSettings(result, loadManagedSettings())
  return result
}
```

### CLI Flag Wiring in cli.mjs
```javascript
// Add to Commander options
.option('--setting-sources <sources>', 'Comma-separated setting scopes to load (user,project,local,cli,managed)')
.option('--settings <json>', 'Load settings from JSON file path or inline JSON string')

// In action handler, before importing main:
if (options.settingSources) {
  const { setSettingSources } = await import('./src/core/config.mjs')
  setSettingSources(options.settingSources.split(',').map(s => s.trim()))
}
if (options.settings) {
  const { setCliSettings } = await import('./src/core/config.mjs')
  let parsed
  if (options.settings.startsWith('{')) {
    parsed = JSON.parse(options.settings)
  } else {
    parsed = JSON.parse(readFileSync(options.settings, 'utf8'))
  }
  setCliSettings(parsed)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 2-level flat merge (claude + dario) | 5-level deep merge with array concat | This phase | All downstream config consumers get correct merged values |
| No managed settings | Platform-specific managed settings | This phase | Enterprise/admin policy support |
| No local project overrides | `.claude/settings.local.json` (gitignored) | This phase | Per-developer overrides without polluting repo |

## Open Questions

1. **Dario equivalents of managed settings path**
   - What we know: Claude Code uses `~/Library/.../claude-code/managed-settings.json` on macOS
   - What's unclear: Should Dario also check a `dario-code` managed path, or only the `claude-code` path?
   - Recommendation: Only check `claude-code` path for now (parity), add `dario-code` path as fallback if requested

2. **Cache invalidation for loadSettings**
   - What we know: `loadSettings()` is called many times per session (hooks, permissions, TUI components)
   - What's unclear: Whether reading 5 files on each call causes perceptible latency
   - Recommendation: Start without caching (correct first, fast second). Add caching if profiling shows issues. Most callers already store the result locally.

3. **Backward compatibility of loadConfig vs loadSettings**
   - What we know: `loadConfig()` and `loadGlobalConfig()` exist separately from `loadSettings()`. They read `config.json` (API keys, model, etc.) not `settings.json` (permissions, hooks, etc.).
   - What's unclear: Whether `loadConfig()` also needs the 5-level treatment
   - Recommendation: Phase 1 scope is `loadSettings()` only. `loadConfig()` can be updated later if needed -- its current flat shape (API keys, model names) doesn't have nested merge issues.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 1.6.0 |
| Config file | `vitest.config.mjs` |
| Quick run command | `npx vitest run tests/config.test.mjs` |
| Full suite command | `npm run test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SET-01 | 5-level precedence order | unit | `npx vitest run tests/config.test.mjs -t "precedence"` | No -- Wave 0 |
| SET-02 | Deep merge of nested objects | unit | `npx vitest run tests/config.test.mjs -t "deep merge"` | No -- Wave 0 |
| SET-03 | Array concatenation for permissions | unit | `npx vitest run tests/config.test.mjs -t "array concat"` | No -- Wave 0 |
| SET-04 | Local settings from settings.local.json | unit | `npx vitest run tests/config.test.mjs -t "local settings"` | No -- Wave 0 |
| SET-05 | Managed settings platform paths | unit | `npx vitest run tests/config.test.mjs -t "managed"` | No -- Wave 0 |
| SET-06 | --setting-sources flag | unit | `npx vitest run tests/config.test.mjs -t "setting-sources"` | No -- Wave 0 |
| SET-07 | --settings flag (file + inline) | unit | `npx vitest run tests/config.test.mjs -t "settings flag"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/config.test.mjs`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `tests/config.test.mjs` -- new file covering all SET-* requirements
- [ ] Test fixtures: mock settings files for each of the 5 levels
- [ ] vi.mock for `fs` operations to avoid touching real filesystem

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/core/config.mjs` (current implementation, 700 lines)
- Codebase analysis: `src/tools/executor.mjs` (permissions.allow consumer)
- Codebase analysis: `src/core/hooks.mjs` (hooks consumer)
- Codebase analysis: `cli.mjs` (Commander flag setup)
- Codebase analysis: `package.json` (lodash 4.17.21 already present)

### Secondary (MEDIUM confidence)
- Architecture research: `.planning/research/ARCHITECTURE.md` (settings resolution flow)
- Pitfalls research: `.planning/research/PITFALLS.md` (shallow merge, managed settings)
- Project decisions in `.planning/STATE.md` (deep merge, lodash for merge)

### Tertiary (LOW confidence)
- Managed settings path conventions (inferred from Claude Code docs references in architecture research, not directly verified against current Claude Code source)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - lodash already in package.json, all deps present
- Architecture: HIGH - current code thoroughly analyzed, clear refactoring path
- Pitfalls: HIGH - identified from existing code patterns and architecture research
- Managed settings paths: MEDIUM - based on architecture research references, not verified against live Claude Code

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable domain, no fast-moving dependencies)
