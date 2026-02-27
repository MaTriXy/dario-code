# Dario Code — Feature Parity Report

**Local Version**: 1.0.0  
**Official Claude Code**: 2.1.44  
**Date**: February 17, 2026  
**Overall Parity**: ~95%

---

## CLI Flags

| Flag | CC 2.1.x | OCC 0.4.0 | Notes |
|------|----------|-----------|-------|
| `--print` / `-p` | ✅ | ✅ | Non-interactive mode |
| `--output-format` | ✅ | ✅ | text/json/stream-json |
| `--model` | ✅ | ✅ | |
| `--continue` | ✅ | ✅ | Resume most recent |
| `--resume [id]` / `-r` | ✅ | ✅ | **NEW in 0.4.0** |
| `--session-id` | ✅ | ✅ | |
| `--fork-session` | ✅ | ✅ | **NEW in 0.4.0** |
| `--system-prompt` | ✅ | ✅ | |
| `--dangerously-skip-permissions` | ✅ | ✅ | |
| `--allowed-tools` | ✅ | ✅ | |
| `--disallowed-tools` | ✅ | ✅ | |
| `--tools` | ✅ | ✅ | **NEW in 0.4.0** |
| `--add-dir` | ✅ | ✅ | **NEW in 0.4.0** |
| `--agent <name>` | ✅ | ✅ | **NEW in 0.4.0** |
| `--thinking` / `--no-thinking` | ✅ | ✅ | **NEW in 0.4.0** |
| `--init` / `--init-only` | ✅ | ✅ | **NEW in 0.4.0** |
| `--maintenance` | ✅ | ✅ | **NEW in 0.4.0** |
| `--from-pr` | ✅ | ✅ | **NEW in 0.4.0** |
| `--file` / `-f` | ✅ | ✅ | |
| `--verbose` | ✅ | ✅ | |
| `--debug` | ✅ | ✅ | |
| `--max-turns` | ✅ | ✅ | **NEW in 1.0.0** — enforced in streaming loop |
| `--permission-mode` | ✅ | ✅ | **NEW in 1.0.0** — sets config at startup |
| `--input-format` | ✅ | ✅ | **NEW in 1.0.0** |

## Slash Commands

| Command | CC 2.1.x | OCC 0.4.0 | Notes |
|---------|----------|-----------|-------|
| `/help` | ✅ | ✅ | |
| `/compact` | ✅ | ✅ | **Upgraded: AI-powered summarization** |
| `/clear` | ✅ | ✅ | |
| `/model` | ✅ | ✅ | Interactive selector |
| `/config` | ✅ | ✅ | Interactive manager |
| `/context` | ✅ | ✅ | **Enhanced: Skills category added** |
| `/cost` | ✅ | ✅ | |
| `/status` | ✅ | ✅ | |
| `/memory` | ✅ | ✅ | |
| `/permissions` | ✅ | ✅ | |
| `/mcp` | ✅ | ✅ | Interactive manager |
| `/doctor` | ✅ | ✅ | |
| `/login` / `/logout` | ✅ | ✅ | OAuth flow |
| `/vim` | ✅ | ✅ | |
| `/bug` | ✅ | ✅ | |
| `/init` | ✅ | ✅ | |
| `/resume` | ✅ | ✅ | Session picker overlay |
| `/export` | ✅ | ✅ | markdown/json |
| `/stats` | ✅ | ✅ | **NEW in 0.4.0** |
| `/rename` | ✅ | ✅ | **NEW in 0.4.0** |
| `/debug` | ✅ | ✅ | **NEW in 0.4.0** |
| `/fast` | ✅ | ✅ | Opus 4.6 toggle |
| `/add-dir` | ✅ | ✅ | |
| `/approved-tools` | ✅ | ✅ | |
| `/terminal-setup` | ✅ | ✅ | |
| `/tasks` | ✅ | ✅ | Background task manager |
| `/todos` | ✅ | ✅ | |
| `/plugin` | ✅ | ✅ | |
| `/settings` | ✅ | ✅ | **NEW in 0.4.0** (alias for /config) |
| `/review` | ✅ | ✅ | **NEW in 1.0.0** — coloured git diff |
| `/pr-comments` | ✅ | ✅ | **NEW in 1.0.0** — via gh CLI |

**Total: 31 commands implemented**

## Context & Memory System

| Feature | CC 2.1.x | OCC 0.4.0 | Notes |
|---------|----------|-----------|-------|
| CLAUDE.md loading | ✅ | ✅ | Project + user + .claude dirs |
| `.claude/rules/` directory | ✅ | ✅ | **NEW in 0.4.0** |
| `.claude/skills/` directory | ✅ | ✅ | **NEW in 0.4.0** — frontmatter parsing |
| `.claude/agents/` directory | ✅ | ✅ | **NEW in 0.4.0** — named agents |
| `.claude/commands/` directory | ✅ | ✅ | Custom user commands |
| Context window visualization | ✅ | ✅ | Bar chart + category breakdown |
| Context item toggling (on/off) | ✅ | ✅ | Interactive manager |
| Custom context (file/URL/text) | ✅ | ✅ | |
| Auto-compact on high usage | ✅ | ✅ | **NEW in 0.4.0** — AI summarization |
| Manual /compact | ✅ | ✅ | **Upgraded to AI summarization** |
| Skills in context budget | ✅ | ✅ | **NEW in 0.4.0** — 2% token budget |
| Memory extraction/persistence | ✅ | ❌ | Automatic memory not yet |

## Tools

| Tool | CC 2.1.x | OCC 0.4.0 | Notes |
|------|----------|-----------|-------|
| Bash | ✅ | ✅ | Background mode, timeout |
| Read | ✅ | ✅ | Offset/limit, encoding detection |
| Write | ✅ | ✅ | |
| Edit | ✅ | ✅ | |
| MultiEdit | ✅ | ✅ | |
| Glob | ✅ | ✅ | |
| Grep | ✅ | ✅ | ripgrep-based |
| WebSearch | ✅ | ✅ | With caching |
| WebFetch | ✅ | ✅ | |
| Task | ✅ | ✅ | Subagent spawning |
| AskUser | ✅ | ✅ | Multi-select |
| Plan | ✅ | ✅ | Plan mode enter/exit |
| LSP | ✅ | ✅ | |
| Notebook | ✅ | ✅ | |
| Skill | ✅ | ✅ | **Enhanced: .claude/skills/ integration** |
| TodoRead / TodoWrite | ✅ | ✅ | |
| MCP tools (proxy) | ✅ | ✅ | Lazy loading |

**22 tools registered**

## Hooks System

| Hook | CC 2.1.x | OCC 0.4.0 | Notes |
|------|----------|-----------|-------|
| PreToolUse | ✅ | ✅ | |
| PostToolUse | ✅ | ✅ | |
| Notification | ✅ | ✅ | |
| SessionStart | ✅ | ✅ | |
| Stop | ✅ | ✅ | |
| SubagentStop | ✅ | ✅ | |
| Setup | ✅ | ✅ | **NEW in 0.4.0** |
| TaskCompleted | ✅ | ✅ | **NEW in 0.4.0** |
| TeammateIdle | ✅ | ✅ | **NEW in 0.4.0** |

## TUI & Interface

| Feature | CC 2.1.x | OCC 0.4.0 | Notes |
|---------|----------|-----------|-------|
| Ink-based React TUI | ✅ | ✅ | |
| Streaming response display | ✅ | ✅ | |
| Tool use cards with results | ✅ | ✅ | |
| Thinking indicator (animated) | ✅ | ✅ | |
| Model selector overlay | ✅ | ✅ | |
| Session picker overlay | ✅ | ✅ | |
| MCP manager overlay | ✅ | ✅ | |
| Config manager overlay | ✅ | ✅ | |
| Context manager overlay | ✅ | ✅ | |
| Approved tools manager | ✅ | ✅ | |
| Plugin manager overlay | ✅ | ✅ | |
| Agent manager overlay | ✅ | ✅ | |
| Tools manager overlay | ✅ | ✅ | |
| Steering questions overlay | ✅ | ✅ | |
| Fast mode toggle | ✅ | ✅ | |
| Status line (tokens/model) | ✅ | ✅ | |
| Prompt footer (git/session) | ✅ | ✅ | **NEW in 0.4.0** |
| Vim keybindings | ✅ | ✅ | Basic — missing advanced motions |
| Welcome banner | ✅ | ✅ | |
| Workspace tips | ✅ | ✅ | |
| Tab completion (commands) | ✅ | ✅ | |
| Tab completion (files) | ✅ | ✅ | |
| @ mentions (tools/agents) | ✅ | ✅ | |
| Image paste/attach | ✅ | ✅ | |
| Multi-line input (Shift+Enter) | ✅ | ✅ | |
| Diff view for edits | ✅ | ✅ | **NEW in 1.0.0** — unified diff utility |
| Permission prompt UI | ✅ | 🟡 | Basic — no diff preview |

## Streaming & API

| Feature | CC 2.1.x | OCC 0.4.0 | Notes |
|---------|----------|-----------|-------|
| Message streaming | ✅ | ✅ | |
| Tool use streaming | ✅ | ✅ | |
| Extended thinking | ✅ | ✅ | |
| Auto-continue on max_tokens | ✅ | ✅ | **NEW in 0.4.0** — up to 3 continuations |
| OAuth token refresh | ✅ | ✅ | Auto-retry on 401 |
| Retry on 429/529/500/503 | ✅ | ✅ | Exponential backoff |
| Cost tracking | ✅ | ✅ | Per-turn and session total |
| Cache token tracking | ✅ | ✅ | Creation + read tokens |
| Prompt caching | ✅ | ✅ | **NEW in 1.0.0** — cache breakpoints on system + tools |

## Session Management

| Feature | CC 2.1.x | OCC 0.4.0 | Notes |
|---------|----------|-----------|-------|
| Session create/save | ✅ | ✅ | JSONL format |
| Session resume by ID | ✅ | ✅ | |
| Session resume by name | ✅ | ✅ | **NEW in 0.4.0** |
| Session fork | ✅ | ✅ | |
| Session rename | ✅ | ✅ | **NEW in 0.4.0** |
| Session list/search | ✅ | ✅ | |
| Session export (md/json) | ✅ | ✅ | |
| Cross-project sessions | ✅ | ✅ | |
| PR-linked sessions | ✅ | ✅ | **NEW in 0.4.0** |

## Auth & Security

| Feature | CC 2.1.x | OCC 0.4.0 | Notes |
|---------|----------|-----------|-------|
| API key auth | ✅ | ✅ | |
| OAuth flow | ✅ | ✅ | Browser-based |
| Token refresh | ✅ | ✅ | |
| Command sandboxing | ✅ | ✅ | |
| Permission modes | ✅ | ✅ | default/trusted/readonly |
| Tool allow/deny lists | ✅ | ✅ | |

---

## What's Still Missing (Low Priority)

| Feature | Impact | Effort | Notes |
|---------|--------|--------|-------|
| Automatic memory extraction | Medium | High | Extract & persist learnings across sessions |
| Advanced vim motions | Low | Medium | f/t/w/b text objects, registers |
| Permission prompt with diff preview | Medium | Medium | Diff utility exists, needs UI integration |
| Streaming diff in permission prompt | Low | High | Real-time diff as model proposes changes |

---

## Summary

**v1.0.0 is the feature-complete release**, achieving ~95% parity with Claude Code 2.1.44.

### v1.0.0 additions (on top of v0.4.0):
- `--max-turns`, `--permission-mode`, `--input-format` flags
- `/review` command with coloured git diff output
- `/pr-comments` command via GitHub CLI
- Unified diff utility for file edit visualization
- Prompt caching with cache_control breakpoints on system prompts and tools
- Max turns enforcement in the streaming agentic loop

### v0.4.0 additions:
- 10+ new CLI flags for modern CC workflows
- `.claude/rules/`, `.claude/skills/`, `.claude/agents/` support
- AI-powered auto-compaction (replaces basic truncation)
- TUI prompt footer with git/session/context info
- Auto-continue on output token limit (up to 3x)
- `/stats`, `/rename`, `/debug` commands
- Skills discovery with frontmatter + token budgeting
- 3 new hook types (Setup, TaskCompleted, TeammateIdle)

### What makes OCC unique (not in official CC):
- Full plugin system with NPM installation
- Steering questions overlay (multi-tab decision UI)
- WebSearch/WebFetch tools built-in
- Background task management with dependencies
- Multiple TUI variants (claude/minimal/custom)
- Cross-compatible .dario + .claude config reading
