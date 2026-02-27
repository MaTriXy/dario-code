# Session Management Integration Guide

This guide shows how to integrate the session persistence feature into Dario.

## Files Created

- `/src/session/session.mjs` - Core session management logic (305 lines)
- `/src/session/index.mjs` - Module exports (20 lines)

## Integration Steps

### Step 1: Update CLI Argument Parser

**File**: `src/cli/parse-args.mjs`

Add session flags to the argument parser:

```javascript
export function parseArgs(argv) {
  const args = argv.slice(2)
  const options = {
    help: false,
    version: false,
    debug: false,
    file: null,
    continue: false,        // NEW: Resume last session
    resume: null,           // NEW: Resume specific session
    newSession: false,      // NEW: Force new session
    listSessions: false,    // NEW: List sessions
    cleanupSessions: false  // NEW: Clean old sessions
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
    } else if (arg === '--cleanup') {
      options.cleanupSessions = true
    }
  }

  return options
}

export function printHelp() {
  console.log(`
Usage: dario [options]

Options:
  -h, --help        Show this help message
  -v, --version     Show version information
  --debug           Enable debug mode
  -f, --file        Read input from file
  --continue        Continue the last session
  --resume <id>     Resume a specific session by ID
  --new             Start a new session
  --list            List all saved sessions
  --cleanup         Clean up sessions older than 30 days
  `)
}
```

### Step 2: Update App Initialization

**File**: `src/cli/app.mjs`

Import session module and integrate into application flow:

```javascript
import * as session from '../session/index.mjs'

export async function initialize() {
  try {
    // Load environment variables
    loadEnv()

    // Parse command line arguments
    const options = parseArgs(process.argv)

    // Handle --list flag
    if (options.listSessions) {
      await handleListSessions()
      process.exit(0)
    }

    // Handle --cleanup flag
    if (options.cleanupSessions) {
      const deleted = session.cleanupOldSessions(30)
      console.log(`Deleted ${deleted.length} sessions older than 30 days`)
      process.exit(0)
    }

    // Show welcome message
    ui.showWelcome()
    console.log(`Dario v${VERSION}`)

    // Determine session to use
    let sessionId = null
    let messages = []

    if (options.continue) {
      // Resume last session
      const lastSession = session.getLastSession()
      if (lastSession) {
        sessionId = lastSession.id
        messages = lastSession.messages
        console.log(`Resuming session: ${sessionId}`)
      } else {
        console.log('No previous session found, starting new session')
        sessionId = session.createSession({ model: DEFAULT_MODEL })
      }
    } else if (options.resume) {
      // Resume specific session
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
      sessionId = session.createSession({ model: DEFAULT_MODEL })
    } else {
      // Explicit new session
      sessionId = session.createSession({ model: DEFAULT_MODEL })
    }

    // Check if current directory is a git repository
    const isGitRepo = await git.isGitRepo()
    if (isGitRepo) {
      const repoInfo = await git.getRepoInfo()
      console.log(`Working with repository: ${repoInfo.currentBranch}`)
    }

    // Start conversation with loaded or empty messages
    await startConversation(sessionId, messages)
  } catch (error) {
    ui.showError(`Initialization error: ${error.message}`)
    process.exit(1)
  }
}

async function startConversation(sessionId, initialMessages = []) {
  const messages = [...initialMessages]

  while (true) {
    // Get user input
    const input = await ui.prompt('> ')

    // Check if it's a command
    if (commands.isCommand(input)) {
      const handled = await commands.processCommand(input, sessionId)
      if (handled) continue
    }

    // Not a command, send to Claude
    try {
      messages.push({ role: 'user', content: input })

      // Send request to Claude
      const response = await api.sendRequest(messages)

      // Display response
      ui.showResponse(response.response)

      // Add response to conversation history
      messages.push({ role: 'assistant', content: response.response })

      // Save session after each exchange
      session.saveSession(sessionId, messages, {
        cwd: process.cwd(),
        model: DEFAULT_MODEL
      })
    } catch (error) {
      ui.showError(`Error communicating with Claude: ${error.message}`)
    }
  }
}

async function handleListSessions() {
  const sessions = session.listSessions()

  if (sessions.length === 0) {
    console.log('No saved sessions')
    return
  }

  console.log('\n=== Saved Sessions ===\n')
  sessions.forEach((s, index) => {
    const summary = session.getSessionSummary(s.id)
    const created = new Date(summary.createdAt).toLocaleString()
    const updated = new Date(summary.updatedAt).toLocaleString()

    console.log(`${index + 1}. ${s.id}`)
    console.log(`   Created: ${created}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Messages: ${summary.messageCount}`)
    console.log(`   Model: ${summary.model}`)
    console.log()
  })
}
```

### Step 3: Add /resume Command

**File**: `src/cli/commands.mjs`

Add a `/resume` command to list and select sessions interactively:

```javascript
import * as session from '../session/index.mjs'

export const COMMANDS = {
  '/resume': handleResumeCommand,
  // ... other commands
}

async function handleResumeCommand() {
  const sessions = session.listSessions()

  if (sessions.length === 0) {
    console.log('No saved sessions available')
    return false
  }

  console.log('\nAvailable sessions:\n')
  sessions.forEach((s, index) => {
    const summary = session.getSessionSummary(s.id)
    const updated = new Date(summary.updatedAt).toLocaleTimeString()
    console.log(`${index + 1}. ${s.id}`)
    console.log(`   Messages: ${summary.messageCount}, Updated: ${updated}`)
  })

  const selection = await ui.prompt('\nSelect session number to resume (or "q" to cancel): ')

  if (selection.toLowerCase() === 'q') {
    return false
  }

  const index = parseInt(selection) - 1
  if (index < 0 || index >= sessions.length) {
    console.log('Invalid selection')
    return false
  }

  // Return the selected session ID
  // The app needs to handle resuming this session
  return sessions[index].id
}
```

### Step 4: Export to GlobalThis (Optional)

**File**: `src/index.mjs` or in the main bundle entry point

Make session module accessible globally:

```javascript
import * as sessionModule from './session/index.mjs'

// Export to globalThis for accessibility
if (!globalThis.__dario) {
  globalThis.__dario = {}
}

globalThis.__dario.session = sessionModule

// Now accessible as: globalThis.__dario.session.listSessions()
```

## Usage Examples

### Command Line

```bash
# Start a new session (default)
dario

# Continue the last session
dario --continue

# Resume a specific session
dario --resume session_1732104825123_abc123def456

# List all sessions
dario --list

# Clean up sessions older than 30 days
dario --cleanup
```

### Programmatic Usage

```javascript
import * as session from './src/session/index.mjs'

// Create new session
const id = session.createSession()

// Save messages
session.saveSession(id, [
  { role: 'user', content: 'Hello' }
])

// Load session
const loaded = session.loadSession(id)

// List all sessions
const all = session.listSessions()

// Get most recent
const last = session.getLastSession()

// Delete
session.deleteSession(id)

// Clean old sessions
session.cleanupOldSessions(30)
```

## Data Storage

Sessions are stored in JSON format in `~/.dario/sessions/` directory:

```
~/.dario/sessions/
├── session_1732104825123_abc123def456.json
├── session_1732104722019_xyz789uvw012.json
└── session_1732104619847_ghi345jkl678.json
```

Each session file contains:
- Session ID
- Created and updated timestamps
- Complete message history
- Metadata (model, working directory, etc.)

## Testing

Verify integration with:

```bash
# Test the session module
node --input-type=module -e "
import * as s from './src/session/index.mjs'
const id = s.createSession()
s.saveSession(id, [{role: 'user', content: 'test'}])
const loaded = s.loadSession(id)
console.log('Session test:', loaded.messages.length === 1 ? 'PASS' : 'FAIL')
s.deleteSession(id)
"
```

## Performance Notes

- Session files are stored as individual JSON files
- Listing sessions reads all files from disk
- Consider archiving old sessions if storage becomes an issue
- File operations are synchronous (intentional for simplicity)

## Error Handling

The module handles common errors gracefully:

- Missing sessions return `null`
- Delete operations return boolean (success/failure)
- Load operations catch and log JSON parsing errors
- Directory creation is automatic and recursive

## Migration from Previous Sessions

If you have existing sessions in a different format, you can migrate them:

```javascript
import * as session from './src/session/index.mjs'

// Load old session data
const oldData = JSON.parse(fs.readFileSync('old-session.json'))

// Create new session with old data
const id = session.createSession()
session.saveSession(id, oldData.messages, oldData.metadata)
```
