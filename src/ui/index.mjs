/**
 * Dario UI Module
 * Status line and theme exports used by cli.mjs
 */

// Theme system
export {
  lightTheme,
  lightDaltonizedTheme,
  darkTheme,
  darkDaltonizedTheme,
  statusColors,
  taskStatusColors,
  taskStatusIcons,
  statusIcons,
  getTheme,
  themes
} from './theme.mjs'

// Statusline exports (used by cli.mjs)
export {
  StatusModes,
  ModeConfig,
  ModeOrder,
  getNextMode,
  getModeDisplay,
  getStatusLineManager,
  handleShiftTab,
  handleTabThinking
} from './statusline.mjs'
export { default as statusline } from './statusline.mjs'

// Onboarding exports (used by cli.mjs)
export {
  initOnboarding,
  completeOnboarding,
  incrementStartupCounter,
  getApprovedTools,
  removeApprovedTool,
  handleCliError,
  validateField,
  StickerRequestForm,
  ClaudeSpinner,
  initConfigFunctions
} from './onboarding.mjs'
export { default as onboarding } from './onboarding.mjs'
