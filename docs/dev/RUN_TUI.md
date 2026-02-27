# Running the Clean TUI

## The New TUI is Working!

The modular Dario Code TUI is rendering correctly. Run it directly in your terminal:

```bash
./cli.mjs
```

**DO NOT** pipe through `head` or other commands - that breaks stdin raw mode.

## What Works

- ✅ Visual interface (box, prompt, instructions)
- ✅ Uses clean npm packages (React, Ink)
- ✅ NO minified code
- ✅ Modular architecture in src/tui/

## What's Being Wired

Currently wiring the functionality:
- ⏳ Tool execution
- ⏳ Command system (/help, /auth, etc.)
- ⏳ Streaming responses
- ⏳ @-mentions

## Testing

```bash
# Run directly in terminal (NOT piped)
./cli.mjs

# Or via npm
npm run dev

# Minimal version
npm run dev:minimal
```

## Expected Behavior

When you run `./cli.mjs` directly in your terminal, you should see:

```
Dario Code
Working directory: /your/path

┌──────────────────────────────────────────────────────┐
│                                                      │
│ >                                                    │
│ Enter to send · Shift+Enter for newline · Esc to exit│
│                                                      │
└──────────────────────────────────────────────────────┘
```

Then you can type and interact with it.
