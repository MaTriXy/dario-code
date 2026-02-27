/**
 * Dario Main Entry Point
 *
 * This module initializes and exports all Dario subsystems.
 * It sets up globalThis.__dario for runtime access.
 */

// Core modules
import * as core from './core/index.mjs'
import { initializeGlobalAPI } from './core/init.mjs'

// Subsystem imports
import * as plan from './plan/index.mjs'
import * as agents from './agents/index.mjs'
import * as tasks from './tasks/index.mjs'
import * as session from './session/index.mjs'
import * as sessions from './sessions/index.mjs'
import * as todos from './todos/index.mjs'
import * as plugins from './plugins/index.mjs'
import * as keyboard from './keyboard/index.mjs'
import * as mentions from './mentions/index.mjs'
import * as tools from './tools/index.mjs'
import * as api from './api/index.mjs'
import * as auth from './auth/index.mjs'
import * as cli from './cli/index.mjs'
import * as config from './config/index.mjs'
import * as terminal from './terminal/index.mjs'
import * as git from './git/index.mjs'
import * as utils from './utils/index.mjs'
import * as sandbox from './sandbox/index.mjs'
import * as wasm from './wasm/index.mjs'
import * as integration from './integration/index.mjs'

// Initialize global API with all subsystems
const dario = initializeGlobalAPI({
  plan,
  agents,
  tasks,
  session,
  sessions,
  todos,
  plugins,
  keyboard,
  mentions,
  tools,
  api,
  auth,
  cli,
  config,
  terminal,
  core,
  git,
  utils,
  sandbox,
  wasm,
  integration
})

// Export all modules
export {
  core,
  plan,
  agents,
  tasks,
  session,
  sessions,
  todos,
  plugins,
  keyboard,
  mentions,
  tools,
  api,
  auth,
  cli,
  config,
  terminal,
  git,
  utils,
  sandbox,
  wasm,
  integration
}

// Default export is the initialized global API
export default dario
