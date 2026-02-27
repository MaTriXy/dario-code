# Dario Code

An open-source CLI for Claude AI — built to match official Claude Code feature-for-feature, with extras the official version doesn't have.

**v1.0.0 — ~97% parity with Claude Code 2.1.50+**

> **Disclaimer:** This project is not affiliated with, endorsed by, sponsored by, or in any way officially connected to Anthropic PBC or any of its subsidiaries or affiliates. The name "Claude" and any related trademarks are the property of their respective owners. This is an independent, community-driven open source project.

---

## Installation

```bash
git clone https://github.com/jkneen/dario-code.git
cd dario-code/dario_code
npm install
chmod +x cli.mjs
npm link   # optional — makes `dario` available globally
```

---

## Usage

```bash
dario                         # interactive session
dario "fix the bug in foo.ts" # one-shot prompt
dario -p "summarize this" -f context.txt
dario --continue              # resume last session
dario --resume <id>           # resume specific session
dario --model claude-opus-4-6
dario --thinking              # enable extended thinking
dario --max-turns 10
dario --permission-mode readonly
```

---

## Authentication

```bash
# Option 1: OAuth (browser-based)
dario          # then run /login inside the app

# Option 2: API key
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## What's Implemented

### CLI Flags (27 total)

| Flag | Description |
|------|-------------|
| `--print` / `-p` | Non-interactive print mode |
| `--output-format` | `text` / `json` / `stream-json` |
| `--model` | Model selection |
| `--continue` | Resume most recent session |
| `--resume [id]` / `-r` | Resume session by ID |
| `--fork-session` | Fork current session |
| `--system-prompt` | Custom system prompt |
| `--dangerously-skip-permissions` | Skip all permission checks |
| `--allowed-tools` / `--disallowed-tools` | Tool filter lists |
| `--tools` | Explicit tool list |
| `--add-dir` | Add directories to context |
| `--agent <name>` | Use a named agent from `.claude/agents/` |
| `--thinking` / `--no-thinking` | Extended thinking mode |
| `--init` / `--init-only` | Create CLAUDE.md template |
| `--maintenance` | Maintenance mode |
| `--from-pr` | Start session linked to a PR |
| `--file` / `-f` | Read prompt from file |
| `--verbose` / `--debug` | Logging levels |
| `--max-turns` | Enforce turn limit in agentic loop |
| `--permission-mode` | `default` / `trusted` / `readonly` |
| `--input-format` | Input format for `--print` mode |
| `--session-id` | Set explicit session ID |

### Slash Commands (31 total)

| Command | Description |
|---------|-------------|
| `/help` | Command reference |
| `/compact` | AI-powered context compaction |
| `/clear` | Clear conversation |
| `/model` | Interactive model selector |
| `/config` | Config manager overlay |
| `/context` | Context window visualizer + toggles |
| `/cost` | Session cost breakdown |
| `/status` | System status |
| `/memory` | Memory viewer |
| `/permissions` | Tool permission manager |
| `/mcp` | MCP server manager |
| `/doctor` | Diagnostics |
| `/login` / `/logout` | OAuth flow |
| `/vim` | Toggle vim keybindings |
| `/bug` | File a bug report |
| `/init` | Create CLAUDE.md |
| `/resume` | Session picker overlay |
| `/export` | Export session (markdown / json) |
| `/stats` | Usage statistics |
| `/rename` | Rename current session |
| `/debug` | Debug introspection |
| `/fast` | Toggle fast mode (Opus 4.6) |
| `/add-dir` | Add directory to context |
| `/approved-tools` | Manage approved tools |
| `/terminal-setup` | Terminal configuration |
| `/tasks` | Background task manager |
| `/todos` | Todo list |
| `/plugin` | Plugin manager |
| `/settings` | Alias for `/config` |
| `/review` | Coloured git diff viewer |
| `/pr-comments` | View PR comments via GitHub CLI |

### Tools (22 total)

`Bash` · `Read` · `Write` · `Edit` · `MultiEdit` · `Glob` · `Grep` · `WebSearch` · `WebFetch` · `Task` · `AskUserQuestion` · `EnterPlanMode` · `ExitPlanMode` · `LSP` · `NotebookRead` · `NotebookEdit` · `Skill` · `TodoRead` · `TodoWrite` · `MCP tools (lazy-loaded)`

### Hooks (9 types)

`PreToolUse` · `PostToolUse` · `Notification` · `SessionStart` · `Stop` · `SubagentStop` · `Setup` · `TaskCompleted` · `TeammateIdle`

### Context & Memory

- `CLAUDE.md` loading — project + user + `.claude/` directories
- `.claude/rules/` — extra instruction files
- `.claude/skills/` — skill files with frontmatter parsing + 2% token budget
- `.claude/agents/` — named agent definitions
- `.claude/commands/` — custom slash commands
- Context window visualizer with per-category breakdown and toggle controls
- AI-powered auto-compaction when approaching limits
- Prompt caching — `cache_control` breakpoints on system prompts and tools

### Session Management

- JSONL storage with index caching
- Resume by ID or name
- Fork sessions
- Rename sessions
- Export to markdown or JSON
- PR-linked sessions
- Cross-project session support

### Streaming & API

- Full message + tool-use streaming
- Extended thinking support
- Auto-continue on output token limit (up to 3 continuations)
- OAuth token refresh (auto-retry on 401)
- Retry on 429 / 529 / 500 / 503 with exponential backoff
- Per-turn and session-total cost tracking
- Cache token tracking (creation + read)

### TUI

- Ink/React terminal UI
- Tool use cards with collapsible results
- Animated thinking indicator
- Model / session / MCP / config / context / plugin overlays
- Steering questions multi-tab overlay
- Prompt footer: git branch + session name + context %
- Vim keybindings
- Status line: tokens · model · cost
- Tab completion for commands and file paths
- `@` mentions for tools and agents
- Image paste / attach
- Multi-line input (Shift+Enter)
- Unified diff visualization for file edits

---

## What Makes OCC Different from Official CC

These features exist in Dario Code but **not** in the official Claude Code:

| Feature | Details |
|---------|---------|
| **Plugin system** | Full NPM-installable plugin ecosystem with manifest validation, enable/disable, and dependency management. Run `/plugin` to manage. |
| **Steering questions overlay** | Multi-tab UI that surfaces clarifying questions before the model starts work. Reduces wasted turns. |
| **Background task management** | Full async task graph with dependency tracking, status monitoring, and interactive UI (`/tasks`). |
| **Multiple TUI variants** | `claude` (full), `minimal`, and `custom` — switchable at startup. |
| **WebSearch + WebFetch built-in** | Available as first-class tools without MCP configuration. |
| **Dual config reading** | Reads both `~/.dario/` and `~/.claude/` with source badges (`[OC]`, `[CC]`, `[OC+CC]`, `[PRJ]`). |
| **`DARIO_USE_READABLE_TOOLS`** | Development mode with human-readable tool output for debugging. |

---

## Configuration

Config is stored in `~/.dario/`. Dario also reads (but never writes) `~/.claude/` for compatibility with Claude Code.

Source badges in the UI:
- `[OC]` — from `~/.dario` (your data)
- `[CC]` — from `~/.claude` (read-only)
- `[OC+CC]` — exists in both
- `[PRJ]` — project-local

---

## Project Structure

```
cli.mjs              # main entry point
dario.mjs       # readable-tools dev entry
src/
  agents/            # subagent spawning and lifecycle
  api/               # Anthropic API client + streaming
  auth/              # OAuth and API key handling
  cli/               # argument parsing + slash commands
  config/            # configuration loading
  core/              # utilities
  integration/       # tool bootstrap and MCP
  plugins/           # plugin system
  sessions/          # JSONL session storage
  tasks/             # background task management
  tools/             # all 22 tool implementations
  tui/               # Ink/React TUI components
  ui/                # themes and status line
tests/               # vitest unit tests
docs/                # architecture and dev notes
```

---

## Development

```bash
npm run dev            # dev mode
npm run dev:readable   # readable tool output
npm run dev:debug      # readable + debug logging

npm test               # integration tests
npm run test:unit      # unit tests (vitest)
npm run test:all       # all tests
npx vitest run tests/file-name.test.mjs  # single test
```

### Adding a slash command

1. Add handler to `src/cli/commands.mjs`
2. Register in the `COMMANDS` object
3. Implement the handler function

---

## Parity Reference

See [PARITY.md](PARITY.md) for a complete side-by-side comparison with Claude Code 2.1.44.

What's still missing (~5%):
- Automatic memory extraction across sessions
- Advanced vim motions (f/t/w/b, text objects, registers)
- Permission prompt with live diff preview
- Multi-provider support (Bedrock, Vertex)

---

## License

MIT — See [LICENSE.md](LICENSE.md) for details.
