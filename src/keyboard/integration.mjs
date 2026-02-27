/**
 * Keyboard integration module
 * Integrates all keyboard functionality into the CLI
 */

import { keyboardManager } from './index.mjs'
import { keyboardConfig, initializeKeyboardConfig } from './config.mjs'
import { historySearch, createHistorySearch } from './history-search.mjs'
import { suspendManager, setupSuspendSignalHandlers } from './suspend.mjs'
import { vimMode } from './vim-mode.mjs'

class KeyboardIntegration {
  constructor() {
    this.initialized = false
    this.rl = null
    this.history = []
    this.historySearch = null
    this.config = null
    this.eventHandlers = new Map()
  }

  /**
   * Initialize keyboard integration
   */
  async init(rl) {
    try {
      // Load configuration
      this.config = initializeKeyboardConfig()

      // Store readline interface
      this.rl = rl

      // Initialize suspend signal handlers
      setupSuspendSignalHandlers(suspendManager)

      // Set up keyboard manager
      keyboardManager.init(rl)

      // Set initial mode
      const mode = this.config.keyboard.mode
      keyboardManager.setMode(mode)

      if (mode === 'vim') {
        vimMode.enable()
      }

      // Setup history search
      this.historySearch = createHistorySearch(rl, this.history)

      // Register event handlers
      this.setupEventHandlers()

      this.initialized = true

      return true
    } catch (error) {
      console.error(`Failed to initialize keyboard integration: ${error.message}`)
      return false
    }
  }

  /**
   * Setup keyboard event handlers
   */
  setupEventHandlers() {
    // History search event
    keyboardManager.on('history-search', () => {
      if (this.historySearch) {
        this.historySearch.start()
      }
    })

    // Suspend operation event
    keyboardManager.on('suspend', () => {
      process.kill(process.pid, 'SIGTSTP')
    })

    // Thinking toggle event
    keyboardManager.on('toggle-thinking', () => {
      // This would be handled by the application
    })

    // Mode cycling event
    keyboardManager.on('cycle-mode', () => {
      // This would be handled by the application
    })

    // Vim mode events
    vimMode.onModeChange((mode) => {
      // Display mode change
    })

    vimMode.onCommand((command) => {
      // Handle vim commands
    })

    // Suspend events
    suspendManager.onSuspend((info) => {
    })

    suspendManager.onResume((info) => {
    })

    // Emacs mode events
    keyboardManager.on('emacs-begin-line', () => {
      if (this.rl) {
        this.rl.line = this.rl.line.slice(0)
        this.rl.cursor = 0
        this.rl._refreshLine()
      }
    })

    keyboardManager.on('emacs-end-line', () => {
      if (this.rl) {
        this.rl.cursor = this.rl.line.length
        this.rl._refreshLine()
      }
    })

    keyboardManager.on('emacs-kill-line', () => {
      if (this.rl) {
        this.rl.line = this.rl.line.slice(0, this.rl.cursor)
        this.rl._refreshLine()
      }
    })

    keyboardManager.on('emacs-kill-start', () => {
      if (this.rl) {
        this.rl.line = this.rl.line.slice(this.rl.cursor)
        this.rl.cursor = 0
        this.rl._refreshLine()
      }
    })

    keyboardManager.on('emacs-delete-word', () => {
      if (this.rl) {
        // Delete word backward
        let pos = this.rl.cursor
        while (pos > 0 && this.rl.line[pos - 1] === ' ') {
          pos--
        }
        while (pos > 0 && this.rl.line[pos - 1] !== ' ') {
          pos--
        }

        this.rl.line = this.rl.line.slice(0, pos) + this.rl.line.slice(this.rl.cursor)
        this.rl.cursor = pos
        this.rl._refreshLine()
      }
    })

    keyboardManager.on('emacs-forward-word', () => {
      if (this.rl) {
        let pos = this.rl.cursor
        while (pos < this.rl.line.length && this.rl.line[pos] === ' ') {
          pos++
        }
        while (pos < this.rl.line.length && this.rl.line[pos] !== ' ') {
          pos++
        }

        this.rl.cursor = pos
        this.rl._refreshLine()
      }
    })

    keyboardManager.on('emacs-backward-word', () => {
      if (this.rl) {
        let pos = this.rl.cursor
        if (pos > 0) {
          pos--
        }
        while (pos > 0 && this.rl.line[pos] === ' ') {
          pos--
        }
        while (pos > 0 && this.rl.line[pos - 1] !== ' ') {
          pos--
        }

        this.rl.cursor = pos
        this.rl._refreshLine()
      }
    })
  }

  /**
   * Add entry to history
   */
  addToHistory(entry) {
    this.history.push(entry)
    keyboardManager.addToHistory(entry)
  }

  /**
   * Get current mode
   */
  getMode() {
    return this.config.keyboard.mode
  }

  /**
   * Set keyboard mode
   */
  setMode(mode) {
    try {
      this.config.setMode(mode)
      keyboardManager.setMode(mode)

      if (mode === 'vim') {
        vimMode.enable()
      } else {
        vimMode.disable()
      }

      return true
    } catch (error) {
      console.error(`Failed to set keyboard mode: ${error.message}`)
      return false
    }
  }

  /**
   * Get keyboard shortcuts help
   */
  getHelp() {
    const help = `
Keyboard Shortcuts for Dario
==================================

Global Shortcuts:
  Ctrl+R         - Search command history (reverse-i-search style)
  Ctrl+Z         - Suspend current operation
  Tab            - Toggle thinking animation
  Shift+Tab      - Cycle through display modes

Emacs Mode Shortcuts:
  Ctrl+A         - Move to beginning of line
  Ctrl+E         - Move to end of line
  Ctrl+K         - Kill (delete) to end of line
  Ctrl+U         - Kill (delete) to beginning of line
  Ctrl+W         - Delete word backward
  Alt+F          - Move forward one word
  Alt+B          - Move backward one word

Vim Mode Shortcuts:
  ESC            - Enter normal mode
  i              - Enter insert mode
  a              - Append mode

  Navigation (normal mode):
    h/j/k/l      - Move left/down/up/right
    w/b/e        - Move to next/prev/end of word
    0/$          - Move to beginning/end of line

  Edit (normal mode):
    x            - Delete character at cursor
    dd           - Delete entire line
    yy           - Copy line
    p            - Paste
    u            - Undo
    Ctrl+R       - Redo

  Command mode:
    :q           - Quit
    :w           - Write/Save
    :set mode    - Set keyboard mode (normal, emacs, vim)

Current Mode: ${this.getMode()}
`
    return help
  }

  /**
   * Show suspended operations
   */
  showSuspended() {
    const operations = suspendManager.list()
    if (operations.length === 0) {
      return
    }

    operations.forEach((op) => {
      const duration = Math.floor((Date.now() - op.timestamp) / 1000)
    })
  }

  /**
   * Cleanup on exit
   */
  cleanup() {
    if (keyboardManager) {
      keyboardManager.destroy()
    }
  }

  /**
   * Check if keyboard integration is initialized
   */
  isInitialized() {
    return this.initialized
  }
}

// Export singleton instance
export const keyboardIntegration = new KeyboardIntegration()

/**
 * Initialize keyboard integration with CLI
 */
export async function initializeKeyboardIntegration(rl) {
  return keyboardIntegration.init(rl)
}

/**
 * Get integrated keyboard help
 */
export function getKeyboardHelp() {
  return keyboardIntegration.getHelp()
}
