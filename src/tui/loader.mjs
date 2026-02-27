/**
 * TUI Loader
 *
 * Dynamically loads TUI implementations based on configuration
 * Allows swapping between different TUI styles via environment variables
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Available TUI implementations
 */
const AVAILABLE_TUIS = {
  claude: {
    id: 'claude',
    name: 'Dario Code',
    description: 'Dario Code TUI',
    path: './claude/index.mjs'
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple prompt-based interface',
    path: './minimal/index.mjs'
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'User-customizable TUI',
    path: './custom/index.mjs'
  }
}

/**
 * Load a TUI implementation
 *
 * @param {string} tuiId - TUI identifier (claude, minimal, custom)
 * @returns {Promise<TUI>} TUI instance
 * @throws {Error} If TUI not found or fails to load
 */
export async function loadTUI(tuiId = 'claude') {
  const tuiConfig = AVAILABLE_TUIS[tuiId]

  if (!tuiConfig) {
    throw new Error(
      `Unknown TUI: ${tuiId}. Available: ${Object.keys(AVAILABLE_TUIS).join(', ')}`
    )
  }

  try {
    const tuiModule = await import(tuiConfig.path)
    const TUIClass = tuiModule.default || tuiModule.ClaudeTUI || tuiModule.TUI

    if (!TUIClass) {
      throw new Error(`TUI module ${tuiId} does not export a default class`)
    }

    // Create instance
    const instance = new TUIClass()

    // Attach metadata
    instance.metadata = tuiConfig

    return instance
  } catch (error) {
    throw new Error(
      `Failed to load TUI '${tuiId}': ${error.message}`
    )
  }
}

/**
 * Get list of available TUIs
 *
 * @returns {Array} Array of TUI metadata objects
 */
export function listAvailableTUIs() {
  return Object.values(AVAILABLE_TUIS)
}

/**
 * Get TUI from environment variable or config
 *
 * @param {Object} config - User configuration
 * @returns {string} TUI ID to load
 */
export function getTUIFromConfig(config = {}) {
  // Priority: env var > config > default
  return (
    process.env.DARIO_TUI ||
    config.tui ||
    'claude'
  )
}

export default {
  loadTUI,
  listAvailableTUIs,
  getTUIFromConfig,
  AVAILABLE_TUIS
}
