# Dario Session Management

## Overview

The session management system provides persistent conversation state and resume capability for Dario. Sessions are saved to `~/.dario/sessions/` and can be resumed using the `--continue` or `--resume` flags.

## Architecture

### Directory Structure

```
~/.dario/sessions/
├── session_1732104825123_abc123def456.json
├── session_1732104722019_xyz789uvw012.json
└── session_1732104619847_ghi345jkl678.json
```

### Session Data Structure

```json
{
  "id": "session_1732104825123_abc123def456",
  "createdAt": "2025-11-25T10:00:25.123Z",
  "updatedAt": "2025-11-25T10:15:45.789Z",
  "messages": [
    {
      "role": "user",
      "content": "Hello, help me with..."
    },
    {
      "role": "assistant",
      "content": "I'll help you with..."
    }
  ],
  "metadata": {
    "cwd": "/Users/jkneen/my-project",
    "model": "claude-sonnet-4-5-20250929",
    "forkNumber": 0
  }
}
```

## API Reference

### Core Functions

#### `createSession(options)`
Creates a new session with initial metadata.

```javascript
import { createSession } from './src/session/index.mjs'

const sessionId = createSession({
  cwd: '/path/to/project',
  model: 'claude-sonnet-4-5-20250929',
  forkNumber: 0
})
```

#### `saveSession(sessionId, messages, metadata)`
Saves or updates a session with messages and metadata.

```javascript
import { saveSession } from './src/session/index.mjs'

saveSession(sessionId, messages, {
  cwd: process.cwd(),
  model: 'claude-sonnet-4-5-20250929',
  forkNumber: 0
})
```

#### `loadSession(sessionId)`
Loads a session from disk. Returns the full session object or null if not found.

```javascript
import { loadSession } from './src/session/index.mjs'

const session = loadSession(sessionId)
if (session) {
  console.log(`Session has ${session.messages.length} messages`)
}
```

#### `listSessions()`
Lists all saved sessions sorted by recency (newest first).

```javascript
import { listSessions } from './src/session/index.mjs'

const sessions = listSessions()
sessions.forEach(session => {
  console.log(`${session.id}: ${session.messages.length} messages`)
})
```

#### `getLastSession()`
Gets the most recently updated session.

```javascript
import { getLastSession } from './src/session/index.mjs'

const lastSession = getLastSession()
if (lastSession) {
  console.log(`Last session: ${lastSession.id}`)
}
```

#### `getSession(sessionId)`
Alias for `loadSession()`. Gets a session by ID.

```javascript
import { getSession } from './src/session/index.mjs'

const session = getSession(sessionId)
```

#### `deleteSession(sessionId)`
Deletes a session. Returns true if successful.

```javascript
import { deleteSession } from './src/session/index.mjs'

const deleted = deleteSession(sessionId)
```

#### `updateSessionMessages(sessionId, messages)`
Updates only the messages array for a session.

```javascript
import { updateSessionMessages } from './src/session/index.mjs'

const newMessages = [...session.messages, { role: 'assistant', content: '...' }]
updateSessionMessages(sessionId, newMessages)
```

#### `getSessionSummary(sessionId)`
Gets a brief summary of a session (good for display).

```javascript
import { getSessionSummary } from './src/session/index.mjs'

const summary = getSessionSummary(sessionId)
// Returns: { id, createdAt, updatedAt, messageCount, model, cwd }
```

#### `formatSession(session)`
Formats a session object for human-readable display.

```javascript
import { formatSession } from './src/session/index.mjs'

const session = loadSession(sessionId)
console.log(formatSession(session))
// Output:
// ID: session_1732104825123_abc123def456
// Created: 25/11/2025, 10:00:25
// Updated: 25/11/2025, 10:15:45
// Messages: 42
// Model: claude-sonnet-4-5-20250929
// Directory: /Users/jkneen/my-project
```

#### `cleanupOldSessions(daysOld)`
Removes sessions older than N days. Useful for maintenance.

```javascript
import { cleanupOldSessions } from './src/session/index.mjs'

// Delete sessions not updated in 30+ days
const deleted = cleanupOldSessions(30)
console.log(`Deleted ${deleted.length} old sessions`)
```

## CLI Integration

### Flag Implementation in `parse-args.mjs`

Add support for session flags:

```javascript
export function parseArgs(argv) {
  const args = argv.slice(2)
  const options = {
    help: false,
    version: false,
    debug: false,
    file: null,
    continue: false,           // Resume last session
    resume: null,              // Resume specific session by ID
    newSession: false,         // Start new session
    listSessions: false        // List available sessions
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      options.help = true
    } else if (arg === '-v' || arg === '--version') {
      options.version = true
    } else if (arg === '--debug') {
      options.debug = true
    } else if (arg === '-f' || arg === '--file') {
      if (i + 1 < args.length) {
        options.file = args[++i]
      }
    } else if (arg === '--continue') {
      options.continue = true
    } else if (arg === '--resume') {
      if (i + 1 < args.length) {
        options.resume = args[++i]
      }
    } else if (arg === '--new') {
      options.newSession = true
    } else if (arg === '--list') {
      options.listSessions = true
    }
  }

  return options
}

export function printHelp() {
  console.log(`
Usage: dario [options]

Options:
  -h, --help       Show this help message
  -v, --version    Show version information
  --debug          Enable debug mode
  -f, --file       Read input from file
  --continue       Continue the last session
  --resume <id>    Resume a specific session by ID
  --new            Start a new session
  --list           List all saved sessions
  `)
}
```

### Usage in `app.mjs`

Import and integrate session handling:

```javascript
import * as session from '../session/index.mjs'
import { parseArgs } from './parse-args.mjs'

export async function initialize() {
  try {
    const options = parseArgs(process.argv)

    // Handle list sessions
    if (options.listSessions) {
      await handleListSessions()
      process.exit(0)
    }

    // Determine which session to use
    let sessionId = null
    let messages = []

    if (options.continue) {
      const lastSession = session.getLastSession()
      if (lastSession) {
        sessionId = lastSession.id
        messages = lastSession.messages
        console.log(`Resuming session: ${sessionId}`)
      } else {
        console.log('No previous session found, starting new session')
        sessionId = session.createSession()
      }
    } else if (options.resume) {
      const loadedSession = session.getSession(options.resume)
      if (loadedSession) {
        sessionId = loadedSession.id
        messages = loadedSession.messages
        console.log(`Resuming session: ${sessionId}`)
      } else {
        console.error(`Session not found: ${options.resume}`)
        process.exit(1)
      }
    } else if (!options.newSession) {
      // Default: create new session
      sessionId = session.createSession()
    } else {
      sessionId = session.createSession()
    }

    // Start conversation with loaded messages
    await startConversation(sessionId, messages)
  } catch (error) {
    console.error(`Initialization error: ${error.message}`)
    process.exit(1)
  }
}

async function startConversation(sessionId, initialMessages = []) {
  const messages = [...initialMessages]

  while (true) {
    const input = await ui.prompt('> ')

    // ... handle input ...

    messages.push({ role: 'user', content: input })
    const response = await api.sendRequest(messages)
    messages.push({ role: 'assistant', content: response.response })

    // Save session after each exchange
    session.saveSession(sessionId, messages, {
      cwd: process.cwd(),
      model: 'claude-sonnet-4-5-20250929'
    })
  }
}

async function handleListSessions() {
  const sessions = session.listSessions()

  if (sessions.length === 0) {
    console.log('No saved sessions')
    return
  }

  console.log('\nSaved Sessions:\n')
  sessions.forEach((s, index) => {
    console.log(`${index + 1}. ${session.formatSession(s)}`)
    console.log()
  })
}
```

## Commands Integration

### `/resume` Command Handler in `commands.mjs`

```javascript
import * as session from '../session/index.mjs'

export async function handleResumeCommand() {
  const sessions = session.listSessions()

  if (sessions.length === 0) {
    console.log('No saved sessions available')
    return
  }

  console.log('Available sessions:\n')
  sessions.forEach((s, index) => {
    const summary = session.getSessionSummary(s.id)
    const updated = new Date(summary.updatedAt).toLocaleString()
    console.log(`${index + 1}. ${s.id}`)
    console.log(`   Messages: ${summary.messageCount}, Updated: ${updated}`)
  })

  const selection = await ui.prompt('\nSelect session number (or "q" to cancel): ')

  if (selection.toLowerCase() === 'q') {
    return null
  }

  const index = parseInt(selection) - 1
  if (index < 0 || index >= sessions.length) {
    console.log('Invalid selection')
    return null
  }

  return sessions[index].id
}
```

## Export to GlobalThis

### In `src/index.mjs` or main bundle

```javascript
import * as sessionModule from './session/index.mjs'

// Export to globalThis for accessibility
globalThis.__dario = {
  ...globalThis.__dario,
  session: sessionModule
}

// Now users can access: globalThis.__dario.session.listSessions()
```

## Best Practices

1. **Always save after changes**: Call `saveSession()` after every message exchange
2. **Handle missing sessions gracefully**: Check if session exists before loading
3. **Clean up periodically**: Run `cleanupOldSessions()` to manage storage
4. **Provide user feedback**: Show session ID when creating or resuming
5. **Preserve context**: Keep all messages when saving, including system messages

## Examples

### Basic Session Flow

```javascript
import * as session from './src/session/index.mjs'

// 1. Create new session
const sessionId = session.createSession({
  model: 'claude-sonnet-4-5-20250929'
})
console.log(`Created session: ${sessionId}`)

// 2. Add messages
let messages = [
  { role: 'user', content: 'Hello' }
]

// 3. Save session
session.saveSession(sessionId, messages)

// 4. Later: load and continue
const loaded = session.loadSession(sessionId)
console.log(`Loaded ${loaded.messages.length} messages`)

// 5. Add more messages
loaded.messages.push({ role: 'assistant', content: 'Hi!' })
session.updateSessionMessages(sessionId, loaded.messages)
```

### List and Resume

```javascript
import * as session from './src/session/index.mjs'

// List all sessions
const all = session.listSessions()
console.log(`Found ${all.length} sessions`)

// Get the most recent
const last = session.getLastSession()
if (last) {
  console.log(session.formatSession(last))
}

// Resume it
const resumed = session.loadSession(last.id)
console.log(`Resuming with ${resumed.messages.length} messages`)
```

## Testing

Run the included test suite:

```bash
node --input-type=module -e "
import * as session from './src/session/index.mjs'

// Create test session
const id = session.createSession()
console.log('Created:', id)

// Load it back
const loaded = session.loadSession(id)
console.log('Loaded:', loaded.id === id ? 'OK' : 'FAIL')

// Cleanup
session.deleteSession(id)
console.log('Deleted: OK')
"
```

## File Locations

- **Module**: `/src/session/session.mjs`
- **Exports**: `/src/session/index.mjs`
- **Data**: `~/.dario/sessions/*.json`

## Performance Considerations

- Sessions are stored as individual JSON files
- File I/O is synchronous (intentional for simplicity)
- Listing sessions reads all files (consider lazy-loading for large collections)
- Consider archiving very old sessions to avoid clutter
