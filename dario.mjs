#!/usr/bin/env node
/**
 * Dario - Entry point with readable tool implementations
 *
 * This entry point automatically enables readable tool overrides.
 *
 * Usage:
 *   ./dario.mjs          # Run with readable tools
 *   ./dario.mjs --debug  # Run with debug output
 */

// Enable readable tools automatically
process.env.DARIO_USE_READABLE_TOOLS = '1'

// Check for debug flag
if (process.argv.includes('--debug') || process.argv.includes('-d')) {
  process.env.DEBUG = 'true'
}

// Import cli.mjs which will auto-register readable tool overrides
import('./cli.mjs')
