# Deferred Items - Phase 01

## permissions.test.mjs failures (discovered during 01-01)

The `tests/permissions.test.mjs` test file does not mock `loadSettings()` or the underlying `fileExists`/`readFile` calls. On developer machines that have a real `~/.claude/settings.json` with permissions data, the tests fail because `loadSettings()` now correctly loads all 5 levels (including real user settings from disk).

**Fix needed:** The permissions test should mock `loadSettings` or the utils functions to isolate from the developer's actual settings files. This is a pre-existing test isolation issue, not a regression from the settings hierarchy implementation.

**Affected tests:** 15 of 29 tests in `tests/permissions.test.mjs`
