/**
 * Dario Status Line Component
 *
 * Displays mode toggles at the bottom of the input:
 * - Left side: Shift+Tab cycles through modes (accept edits, plan mode, bypass permissions)
 * - Right side: Tab toggles thinking mode (shows for 3s then fades)
 */

// Status line modes
export const StatusModes = {
  ACCEPT_EDITS: 'accept_edits',
  PLAN_MODE: 'plan_mode',
  BYPASS_PERMISSIONS: 'bypass_permissions'
}

// Mode display configuration
export const ModeConfig = {
  [StatusModes.ACCEPT_EDITS]: {
    label: 'accept edits on',
    icon: '\u25B8\u25B8', // ▸▸
    color: '#A855F7' // Purple
  },
  [StatusModes.PLAN_MODE]: {
    label: 'plan mode on',
    icon: '\u258C\u258C', // ▌▌
    color: '#14B8A6' // Teal
  },
  [StatusModes.BYPASS_PERMISSIONS]: {
    label: 'bypass permissions on',
    icon: '\u25B8\u25B8', // ▸▸
    color: '#EF4444' // Red
  }
}

// Order for cycling through modes
export const ModeOrder = [
  StatusModes.ACCEPT_EDITS,
  StatusModes.PLAN_MODE,
  StatusModes.BYPASS_PERMISSIONS
]

/**
 * Get the next mode in the cycle
 */
export function getNextMode(currentMode) {
  const currentIndex = ModeOrder.indexOf(currentMode)
  const nextIndex = (currentIndex + 1) % ModeOrder.length
  return ModeOrder[nextIndex]
}

/**
 * Get mode display info
 */
export function getModeDisplay(mode) {
  return ModeConfig[mode] || ModeConfig[StatusModes.ACCEPT_EDITS]
}

/**
 * Status line state manager
 */
export class StatusLineManager {
  constructor() {
    this.currentMode = StatusModes.ACCEPT_EDITS
    this.thinkingEnabled = false
    this.thinkingVisible = false
    this.thinkingTimeout = null
    this.listeners = new Set()
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of state change
   */
  notify() {
    for (const listener of this.listeners) {
      listener(this.getState())
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      mode: this.currentMode,
      modeDisplay: getModeDisplay(this.currentMode),
      thinkingEnabled: this.thinkingEnabled,
      thinkingVisible: this.thinkingVisible
    }
  }

  /**
   * Cycle to next mode (Shift+Tab)
   */
  cycleMode() {
    this.currentMode = getNextMode(this.currentMode)
    this.notify()
    return this.currentMode
  }

  /**
   * Set specific mode
   */
  setMode(mode) {
    if (ModeOrder.includes(mode)) {
      this.currentMode = mode
      this.notify()
    }
  }

  /**
   * Toggle thinking mode (Tab)
   */
  toggleThinking() {
    this.thinkingEnabled = !this.thinkingEnabled
    this.showThinkingIndicator()
    this.notify()
    return this.thinkingEnabled
  }

  /**
   * Set thinking mode
   */
  setThinking(enabled) {
    this.thinkingEnabled = enabled
    this.showThinkingIndicator()
    this.notify()
  }

  /**
   * Show thinking indicator for 3 seconds then hide
   */
  showThinkingIndicator() {
    // Clear any existing timeout
    if (this.thinkingTimeout) {
      clearTimeout(this.thinkingTimeout)
    }

    // Show the indicator
    this.thinkingVisible = true
    this.notify()

    // Hide after 3 seconds
    this.thinkingTimeout = setTimeout(() => {
      this.thinkingVisible = false
      this.thinkingTimeout = null
      this.notify()
    }, 3000)
  }

  /**
   * Check if a mode is currently active
   */
  isModeActive(mode) {
    return this.currentMode === mode
  }

  /**
   * Clean up timeouts
   */
  destroy() {
    if (this.thinkingTimeout) {
      clearTimeout(this.thinkingTimeout)
    }
    this.listeners.clear()
  }
}

// Global instance
let globalStatusLine = null

/**
 * Get or create the global status line manager
 */
export function getStatusLineManager() {
  if (!globalStatusLine) {
    globalStatusLine = new StatusLineManager()
  }
  return globalStatusLine
}

/**
 * Handle Shift+Tab key press
 */
export function handleShiftTab() {
  return getStatusLineManager().cycleMode()
}

/**
 * Handle Tab key press for thinking toggle
 */
export function handleTabThinking() {
  return getStatusLineManager().toggleThinking()
}

export default {
  StatusModes,
  ModeConfig,
  ModeOrder,
  getNextMode,
  getModeDisplay,
  StatusLineManager,
  getStatusLineManager,
  handleShiftTab,
  handleTabThinking
}
