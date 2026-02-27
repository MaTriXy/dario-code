/**
 * Provider Registry
 * Loads built-in provider definitions from providers-data.json
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

/** @type {Array} All built-in provider definitions */
export const BUILTIN_PROVIDERS = require(join(__dirname, 'providers-data.json'))

/**
 * Get a provider definition by ID
 * @param {string} id - Provider ID (e.g. 'anthropic', 'groq')
 * @returns {Object|undefined}
 */
export function getProvider(id) {
  return BUILTIN_PROVIDERS.find(p => p.id === id)
}

/**
 * Get all provider definitions
 * @returns {Array}
 */
export function getAllProviders() {
  return BUILTIN_PROVIDERS
}
