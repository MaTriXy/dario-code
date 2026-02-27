/**
 * Example Integration of Mentions Module into Dario
 *
 * This file shows how to integrate the mentions module into the main
 * application's conversation loop (src/cli/app.mjs).
 *
 * To integrate, apply these changes to src/cli/app.mjs:
 */

// ============================================================================
// CHANGES TO src/cli/app.mjs
// ============================================================================

// 1. ADD THESE IMPORTS AT THE TOP
import * as mentions from '../mentions/index.mjs'
import * as mentionIntegration from '../mentions/integration.mjs'
import { createReadlineWithMentionCompletion } from '../mentions/completer.mjs'

// 2. MODIFY THE startConversation FUNCTION
// Replace the current ui.prompt with readline + mention completion

// OLD CODE:
/*
async function startConversation() {
  const conversation = [];

  while (true) {
    const input = await ui.prompt('> ');
    // ... rest of code
  }
}
*/

// NEW CODE:
import readline from 'readline'

async function startConversation() {
  const conversation = []

  // Create readline interface with mention completion
  const rl = createReadlineWithMentionCompletion(
    process.stdin,
    process.stdout
  )

  const askQuestion = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer)
      })
    })
  }

  try {
    while (true) {
      // Get user input with mention tab completion
      const rawInput = await askQuestion('> ')

      // Check if it's a command
      if (commands.isCommand(rawInput)) {
        const handled = await commands.processCommand(rawInput)
        if (handled) continue
      }

      // Process mentions and send to Claude
      try {
        // Process user input for @-mentions
        const processed = await mentionIntegration.processUserInput(rawInput)

        // Display summary of included files
        if (processed.displaySummary) {
        }

        // Add to conversation with processed content
        conversation.push({
          role: 'user',
          content: processed.messageContent
        })

        // Send request to Claude with injected file content
        const response = await api.sendRequest(conversation)

        // Display response
        ui.showResponse(response.response)

        // Add response to conversation history
        conversation.push({
          role: 'assistant',
          content: response.response
        })
      } catch (error) {
        ui.showError(`Error communicating with Claude: ${error.message}`)
      }
    }
  } finally {
    rl.close()
  }
}

// ============================================================================
// EXAMPLE USAGE IN CONVERSATION
// ============================================================================

/*
Example 1: Single file mention
> Review @src/utils.mjs for bugs

-- Files included --
src/utils.mjs (2.3 KB, 58 lines)

[Claude receives the full file content to analyze]

Example 2: Multiple files with glob
> Check all test files @**/*.test.mjs for coverage

-- Files included --
tests/utils.test.mjs (1.8 KB, 42 lines)
tests/api.test.mjs (2.1 KB, 51 lines)
tests/config.test.mjs (1.2 KB, 29 lines)

Example 3: Tab completion
> Fix issues in @src/
                   ├─ api/
                   ├─ cli/
                   ├─ components/
                   ├─ config/
                   ├─ core/
                   ├─ tools/
                   ├─ utils/
                   └─ wasm/

Example 4: Relative path
> Review @./CLAUDE.md for guidelines

-- Files included --
CLAUDE.md (1.5 KB, 35 lines)

Example 5: Home directory
> Check ~/.dario/config.json for settings

-- Files included --
~/.dario/config.json (856 B, 18 lines)
*/

// ============================================================================
// MIDDLEWARE APPROACH (Alternative Integration)
// ============================================================================

/*
If you want a more non-invasive integration, use middleware:

// In src/cli/app.mjs, wrap the api.sendRequest call:

import { createMentionsMiddleware } from '../mentions/integration.mjs'

// In initialize() or startConversation():
const originalSendRequest = api.sendRequest
api.sendRequest = createMentionsMiddleware(originalSendRequest)

// Now all messages automatically get mention processing
conversation.push({ role: 'user', content: rawInput })
const response = await api.sendRequest(conversation)
// ↑ Mentions are automatically processed here
*/

// ============================================================================
// TESTING THE INTEGRATION
// ============================================================================

// Test file: tests/mentions.test.mjs
/*
import { expect } from 'chai'
import { parseMentions, processMentions, createMentionContext } from '../src/mentions/index.mjs'
import { processUserInput } from '../src/mentions/integration.mjs'

describe('Mentions Module', () => {
  it('should parse mentions from input', () => {
    const input = 'Check @src/app.js and @README.md'
    const mentions = parseMentions(input)
    expect(mentions).to.have.length(2)
    expect(mentions[0].path).to.equal('src/app.js')
    expect(mentions[1].path).to.equal('README.md')
  })

  it('should process mentions and read files', async () => {
    const input = 'Review @package.json'
    const results = await processMentions(input)
    expect(results.files.length).to.be.greaterThan(0)
    expect(results.warnings).to.be.empty
  })

  it('should handle missing files gracefully', async () => {
    const input = 'Check @nonexistent.js'
    const results = await processMentions(input)
    expect(results.warnings).to.have.length.greaterThan(0)
  })

  it('should create mention context', async () => {
    const input = 'Review @package.json'
    const results = await processMentions(input)
    const context = await createMentionContext(results)
    expect(context).to.include('package.json')
  })

  it('should process user input end-to-end', async () => {
    const input = 'Check @src/ files'
    const processed = await processUserInput(input)
    expect(processed.mentions).to.be.an('array')
    expect(processed.messageContent).to.be.a('string')
    expect(processed.files).to.be.an('array')
  })
})
*/

// ============================================================================
// CONFIGURATION OPTIONS
// ============================================================================

// To customize mention behavior, add to src/config/constants.mjs:
export const MENTIONS_CONFIG = {
  // Maximum lines per file before truncation
  maxLinesPerFile: 2000,

  // Maximum number of files from glob pattern
  maxGlobFiles: 50,

  // File size warning threshold (bytes)
  fileSizeWarningThreshold: 1024 * 1024, // 1 MB

  // Automatically exclude these patterns
  excludePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**'
  ],

  // Enable image paste from clipboard
  enableImagePaste: true,

  // Enable glob pattern expansion
  enableGlobPatterns: true,

  // Tab completion options
  tabCompletion: {
    enabled: true,
    maxSuggestions: 10,
    showPreviews: false
  }
}

// Usage in mentions/index.mjs:
// import { MENTIONS_CONFIG } from '../config/constants.mjs'
// const { maxLinesPerFile } = MENTIONS_CONFIG
// const { content, truncated } = truncateContent(fileContent, maxLinesPerFile)

export default {
  startConversation
}
