/**
 * Sandbox Module for Dario
 *
 * Exports all sandbox functionality for command execution security
 */

export {
  isSandboxSupported,
  detectEscapeAttempt,
  createSandboxProfile,
  writeSandboxProfile,
  deleteSandboxProfile,
  wrapCommand,
  getSandboxSettings,
  applySandboxSettings,
  executeWithSandbox,
  isInAllowlist
} from './sandbox.mjs'

import {
  isSandboxSupported,
  detectEscapeAttempt,
  createSandboxProfile,
  writeSandboxProfile,
  deleteSandboxProfile,
  wrapCommand,
  getSandboxSettings,
  applySandboxSettings,
  executeWithSandbox,
  isInAllowlist
} from './sandbox.mjs'

// Export as default object for compatibility
export default {
  isSandboxSupported,
  detectEscapeAttempt,
  createSandboxProfile,
  writeSandboxProfile,
  deleteSandboxProfile,
  wrapCommand,
  getSandboxSettings,
  applySandboxSettings,
  executeWithSandbox,
  isInAllowlist
}
