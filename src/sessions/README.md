# Session Management Module

This module provides persistent session management for Dario, allowing users to save, resume, and export conversations.

## Overview

The session management system stores conversation history and metadata in `~/.dario/sessions/` directory. Each session is a self-contained JSON file with all messages, context, and metadata.

## Features

- **Session Persistence**: Automatically saves all messages to persistent storage
- **Session Resume**: Continue a previous session with `--continue` or `--resume <id>` flags
- **Session History**: View and browse previous sessions with `/resume` command
- **Session Export**: Export conversations to markdown or JSON format with `/export` command
- **Session Metadata**: Tracks creation time, last update, message count, and working directory

## API Reference

### Core Functions

#### `initSessions()`
Initialize the sessions directory. Called automatically on app startup.

```javascript
import * as sessions from './sessions/index.mjs'
await sessions.initSessions()
```

#### `createSession(name?)`
Create a new session with optional name.

```javascript
const session = await sessions.createSession('My Session')
// Returns:
{
  id: 'uuid',
  name: 'My Session',
  created: '2025-11-26T...',
  updated: '2025-11-26T...',
  cwd: '/current/working/dir',
  messages: [],
  context: {},
  metadata: { messageCount: 0, lastMessage: null }
}
```

#### `getSession(sessionId)`
Get a session by ID or partial ID match.

```javascript
const session = await sessions.getSession('abc123')
// Partial match also works:
const session = await sessions.getSession('abc')
```

#### `updateSession(sessionId, updates)`
Update a session with new data.

```javascript
const updated = await sessions.updateSession(sessionId, {
  name: 'New Name',
  context: { custom: 'data' }
})
```

#### `addMessage(sessionId, role, content)`
Add a message to a session (auto-saves).

```javascript
await sessions.addMessage(sessionId, 'user', 'Hello Claude')
await sessions.addMessage(sessionId, 'assistant', 'Hi there!')
```

#### `listSessions(options?)`
List all sessions with metadata, newest first.

```javascript
// Get all sessions
const allSessions = await sessions.listSessions()

// With options
const recent = await sessions.listSessions({ limit: 10 })
const found = await sessions.listSessions({ search: 'bug fix' })
```

Returns array of session metadata:
```javascript
{
  id: 'uuid',
  name: 'Session Name',
  created: '2025-11-26T...',
  updated: '2025-11-26T...',
  cwd: '/path',
  messageCount: 5,
  lastMessage: { role: 'assistant', content: '...', timestamp: '...' }
}
```

#### `getLatestSession()`
Get the most recent session.

```javascript
const latest = await sessions.getLatestSession()
```

#### `deleteSession(sessionId)`
Delete a session file.

```javascript
await sessions.deleteSession(sessionId)
```

#### `exportSessionMarkdown(sessionId, filename?)`
Export session to markdown format.

```javascript
const path = await sessions.exportSessionMarkdown(sessionId)
// Custom filename:
const path = await sessions.exportSessionMarkdown(sessionId, 'conversation.md')
```

#### `exportSessionJSON(sessionId, filename?)`
Export session to JSON format.

```javascript
const path = await sessions.exportSessionJSON(sessionId)
const path = await sessions.exportSessionJSON(sessionId, 'session.json')
```

#### `formatSessionList(sessions)`
Format session list for terminal display.

```javascript
const formatted = sessions.formatSessionList(sessionList)
console.log(formatted)
```

## CLI Integration

### Command-Line Flags

#### `--continue`
Resume the most recent session automatically.

```bash
node cli.mjs --continue
```

#### `--resume <id>`
Resume a specific session by ID or partial match.

```bash
node cli.mjs --resume abc123
node cli.mjs --resume abc  # Partial match
```

### Slash Commands

#### `/resume`
Show a list of recent sessions and prompt for selection.

```
> /resume

Recent Sessions:
─────────────────────────────────────────────────────
1. My Bug Fix Session
   ID: abc123def456
   Created: 11/26/2025 | Updated: 14:30:42
   Messages: 12 | Last: I found the issue...
─────────────────────────────────────────────────────
```

#### `/export`
Export the current session to markdown or JSON.

```
> /export markdown session.md
> /export json session.json
```

## Session Data Format

Each session is stored as JSON with the following structure:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Bug Fix Session",
  "created": "2025-11-26T14:20:00.000Z",
  "updated": "2025-11-26T14:35:00.000Z",
  "cwd": "/Users/jkneen/project",
  "messages": [
    {
      "role": "user",
      "content": "What's wrong with this code?",
      "timestamp": "2025-11-26T14:20:10.000Z"
    },
    {
      "role": "assistant",
      "content": "I found the issue...",
      "timestamp": "2025-11-26T14:20:15.000Z"
    }
  ],
  "context": {},
  "metadata": {
    "messageCount": 2,
    "lastMessage": {
      "role": "assistant",
      "content": "I found the issue...",
      "timestamp": "2025-11-26T14:20:15.000Z"
    }
  }
}
```

## File Storage

Sessions are stored in: `~/.dario/sessions/`

Each session file is named: `{session-id}.json`

Directory structure:
```
~/.dario/
├── sessions/
│   ├── 123e4567-e89b-12d3-a456-426614174000.json
│   ├── 234e4567-e89b-12d3-a456-426614174001.json
│   └── 345e4567-e89b-12d3-a456-426614174002.json
└── .env
```

## Integration Points

### In `app.mjs`
The app initializes sessions on startup and passes the current session through the conversation loop:

```javascript
export async function initialize(options = {}) {
  // Initialize sessions
  await sessions.initSessions()

  // Handle resume flags
  let currentSession = null
  if (options.continue) {
    currentSession = await sessions.getLatestSession()
  } else if (options.resume) {
    currentSession = await sessions.getSession(options.resume)
  } else {
    currentSession = await sessions.createSession()
  }

  // Pass session to conversation
  await startConversation(currentSession)
}

async function startConversation(currentSession) {
  // Load previous messages
  const conversation = currentSession.messages || []

  // Save each new message
  await sessions.addMessage(currentSession.id, 'user', input)
  await sessions.addMessage(currentSession.id, 'assistant', response)
}
```

### In `commands.mjs`
Two new commands are available:

- `/resume` - List and select sessions
- `/export` - Export session to file

```javascript
async function handleResume(input) {
  const sessionList = await sessions.listSessions({ limit: 10 })
  ui.print(sessions.formatSessionList(sessionList))
}

async function handleExport(input) {
  const [, format, filename] = input.split(' ')
  if (format === 'markdown') {
    await sessions.exportSessionMarkdown(sessionId, filename)
  } else if (format === 'json') {
    await sessions.exportSessionJSON(sessionId, filename)
  }
}
```

## Testing

### Create a test session
```javascript
const session = await sessions.createSession('Test Session')
await sessions.addMessage(session.id, 'user', 'Hello')
await sessions.addMessage(session.id, 'assistant', 'Hi there')
```

### List sessions
```javascript
const all = await sessions.listSessions()
console.log(all)
```

### Export a session
```javascript
const path = await sessions.exportSessionMarkdown(session.id)
console.log(`Exported to: ${path}`)
```

### Resume a session
```javascript
const resumed = await sessions.getSession(session.id)
console.log(`Resuming: ${resumed.name}`)
```

## Future Enhancements

- Session search and filtering UI
- Session tagging and organization
- Automatic session cleanup (delete old sessions)
- Session diff and comparison
- Session sharing (encrypted export)
- Session compression for large conversations
- Background session sync
- Cloud session backup
