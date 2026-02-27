/**
 * Main CLI Entry Point
 *
 * This is the primary entry point for the Dario Code CLI application.
 * Handles initialization, authentication, and command routing.
 *
 */

import { cwd as HU } from 'process';
import { homedir } from 'os';

/**
 * Main CLI entry function
 *
 * Orchestrates the entire CLI startup sequence:
 * 1. Restores authentication state and configuration
 * 2. Handles OAuth token restoration for Claude authentication
 * 3. Reads stdin if available (for piped input)
 * 4. Falls back to /dev/tty for interactive sessions
 * 5. Delegates to YX9 (setupCommanderCLI) for command processing
 *
 * @returns {Promise<void>}
 */
export async function mainCLIEntry() {
  try {
    // Attempt to restore authentication and configuration
    // This loads saved settings, API keys, and session state
    await restoreAuthAndConfig();

    // Handle OAuth token restoration if using Claude authentication mode
    const config = loadConfig();
    if (config.oauthMode === 'claude' && config.oauthToken) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = config.oauthToken;
    }

    // Read from stdin if not a TTY (piped input)
    let stdinContent = '';
    if (!process.stdin.isTTY) {
      stdinContent = await readStdin();
    }

    // If stdin is not available, fall back to /dev/tty for interactive sessions
    // This allows the CLI to work in contexts where stdin is redirected
    if (!process.stdin.isTTY && stdinContent === '') {
      const fs = await import('fs');
      const ttyStream = fs.createReadStream('/dev/tty');
      process.stdin = ttyStream;
    }

    // Delegate to the main command setup and execution
    await setupCommanderCLI(stdinContent, {
      cwd: process.cwd()
    });

  } catch (error) {
    await handleCLIError({ error });
    process.exit(1);
  }
}

/**
 * Reads all content from stdin asynchronously
 *
 *
 * @returns {Promise<string>} The content from stdin, or empty string if TTY
 */
async function readStdin() {
  // Return empty string if stdin is a TTY (interactive terminal)
  if (process.stdin.isTTY) {
    return '';
  }

  const chunks = [];

  return new Promise((resolve, reject) => {
    process.stdin.on('data', (chunk) => {
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    process.stdin.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Cleanup function executed on process exit
 * Shows the terminal cursor before exiting to prevent cursor disappearing
 *
 */
export function cleanupOnExit() {
  // Show cursor (CSI sequence)
  process.stdout.write('\x1B[?25h');
}

/**
 * Increments the startup counter in configuration
 * Used for analytics and feature unlock tracking
 *
 */
export function incrementStartupCounter() {
  const config = loadConfig();
  const updatedConfig = {
    ...config,
    numStartups: (config.numStartups ?? 0) + 1
  };
  saveConfig(updatedConfig);
}

// Register process event handlers
process.on('exit', () => {
  cleanupOnExit();
  // Close socket connection if active
  const socketInstance = getSocketInstance();
  if (socketInstance) {
    socketInstance.close();
  }
});

process.on('SIGINT', () => {
  process.exit(0);
});

// Import placeholder functions that will be implemented in other modules
function restoreAuthAndConfig() {
  // Implementation in src/auth/index.mjs
  throw new Error('Not implemented - see src/auth/index.mjs');
}

function loadConfig() {
  // Implementation in src/config/index.mjs
  throw new Error('Not implemented - see src/config/index.mjs');
}

function saveConfig() {
  // Implementation in src/config/index.mjs
  throw new Error('Not implemented - see src/config/index.mjs');
}

function setupCommanderCLI() {
  // Implementation in src/cli/commander-setup.mjs
  throw new Error('Not implemented - see src/cli/commander-setup.mjs');
}

function handleCLIError() {
  // Implementation in src/cli/error-handler.mjs
  throw new Error('Not implemented - see src/cli/error-handler.mjs');
}

function getSocketInstance() {
  // Implementation in src/api/index.mjs
  throw new Error('Not implemented - see src/api/index.mjs');
}
