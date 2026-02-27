/**
 * Core Module for Dario
 *
 * Exports utilities, configuration, hooks, initialization, and shared functionality.
 */

// Utilities
export * from './utils.mjs'
export { default as utils } from './utils.mjs'

// Configuration
export * from './config.mjs'
export { default as config } from './config.mjs'

// Hooks
export * from './hooks.mjs'
export { default as hooks } from './hooks.mjs'

// Initialization (readable versions of cli.mjs lines 1-315)
export * from './init.mjs'
export { default as init } from './init.mjs'

// Re-export commonly used functions at top level
import {
  getCurrentDir,
  getOriginalDir,
  resolvePath,
  fileExists,
  getFileStats,
  readFile,
  writeFile,
  isInAllowedDirectory
} from './utils.mjs'

import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  loadClaudeMd,
  loadCustomCommands,
  getDefaultModel,
  getApiKey
} from './config.mjs'

import {
  HookType,
  HookAction,
  loadHooks,
  runHooks,
  runPreToolUse,
  runPostToolUse,
  runSessionStart,
  runNotification,
  runStop,
  createHook
} from './hooks.mjs'

import {
  loadEnvFile,
  loadAllEnvFiles,
  runStopHooks,
  registerExitHandlers,
  darioHooksAPI,
  initializeGlobalAPI,
  initialize
} from './init.mjs'

export {
  // Utils
  getCurrentDir,
  getOriginalDir,
  resolvePath,
  fileExists,
  getFileStats,
  readFile,
  writeFile,
  isInAllowedDirectory,

  // Config
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  loadClaudeMd,
  loadCustomCommands,
  getDefaultModel,
  getApiKey,

  // Hooks
  HookType,
  HookAction,
  loadHooks,
  runHooks,
  runPreToolUse,
  runPostToolUse,
  runSessionStart,
  runNotification,
  runStop,
  createHook,

  // Init (readable versions of cli.mjs core functions)
  loadEnvFile,
  loadAllEnvFiles,
  runStopHooks,
  registerExitHandlers,
  darioHooksAPI,
  initializeGlobalAPI,
  initialize
}
