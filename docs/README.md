# Dario Code — Documentation

## Quick Reference

- [Main README](../README.md) — installation, usage, full feature list, what's unique about OCC
- [PARITY.md](../PARITY.md) — side-by-side feature comparison with Claude Code 2.1.44
- [GAP_ANALYSIS.md](../GAP_ANALYSIS.md) — current gaps (~5%) and OCC-unique features
- [Plugin System](./plugins.md) — plugin architecture, authoring, and installation

---

## Architecture

- [Architecture Overview](./architecture/) — system overview, module structure

---

## Developer Notes (`dev/`)

Internal implementation notes from development iterations. These document the _how_ and _why_ of key subsystems.

### Core Subsystems

| Document | Description |
|----------|-------------|
| [Background Tasks](./dev/BACKGROUND_TASKS.md) | Task graph design, async lifecycle |
| [Background Tasks — Implementation](./dev/BACKGROUND_TASKS_IMPLEMENTATION.md) | Code-level implementation notes |
| [Background Tasks — Quick Start](./dev/BACKGROUND_TASKS_QUICKSTART.md) | Getting started with the task system |
| [Sessions](./dev/SESSIONS.md) | JSONL session storage design |
| [Sessions — Integration Guide](./dev/SESSIONS_INTEGRATION_GUIDE.md) | How to work with the session API |
| [Sessions — Quick Reference](./dev/SESSIONS_QUICK_REFERENCE.md) | Session operation cheat sheet |
| [Sandbox — Overview](./dev/SANDBOX_IMPLEMENTATION.md) | Command sandboxing design |
| [Sandbox — Integration](./dev/SANDBOX_INTEGRATION.md) | Integrating with the sandbox system |
| [Sandbox — Usage](./dev/SANDBOX_USAGE.md) | Sandbox usage patterns |
| [Sandbox — Quick Reference](./dev/SANDBOX_QUICK_REFERENCE.md) | Sandbox option cheat sheet |
| [Plugin System Changelog](./dev/PLUGIN_SYSTEM_CHANGELOG.md) | Plugin system version history |
| [Keyboard Shortcuts](./dev/KEYBOARD_SHORTCUTS.md) | Key binding reference |
| [TUI — Running](./dev/RUN_TUI.md) | How to run and develop TUI variants |
| [Feature Comparison](./dev/FEATURE_COMPARISON.md) | Early feature comparison table (pre-v1.0.0) |
| [Eval System](./dev/EVALS.md) | Evaluation framework design |
| [Lessons Learned — React Keys](./dev/LESSONS_LEARNED_REACT_KEYS.md) | React key stability patterns in Ink |

### Implementation History

Iteration-by-iteration build logs from the Ralph Loop eval process are archived at [`dev/archive/`](./dev/archive/). They document the journey from ~75% to 95% parity and are preserved for historical context but not part of active documentation.

- [Implementation Summary](./dev/IMPLEMENTATION_SUMMARY.md) — v1.0.0 overall summary
