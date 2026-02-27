/**
 * Dario Code Theme
 *
 * Visual style for Dario Code
 */

/**
 * Dario Code color palette
 * Theme color palette
 */
export const CLAUDE_COLORS = {
  // Brand colors
  claude: '#CC9B7A',           // Claude brand orange/tan
  claudeLight: '#E5C4A8',      // Lighter variant
  claudeDark: '#A67C5D',       // Darker variant

  // Semantic colors
  success: '#10B981',          // Green for success
  error: '#EF4444',            // Red for errors
  warning: '#F59E0B',          // Orange for warnings
  info: '#3B82F6',             // Blue for info

  // Text colors (light theme)
  text: '#1F2937',             // Primary text
  textSecondary: '#6B7280',    // Secondary/dim text
  textTertiary: '#9CA3AF',     // Very dim text

  // Background colors
  background: '#FFFFFF',       // Main background
  backgroundSecondary: '#F9FAFB', // Secondary background
  border: '#E5E7EB',           // Border color

  // Tool use colors
  toolBorder: '#CC9B7A',       // Tool card border (claude color)
  toolBackground: '#FFF7ED',   // Tool card background (warm white)

  // Thinking block colors
  thinkingBorder: '#9CA3AF',   // Thinking block border (gray)
  thinkingBackground: '#F3F4F6', // Thinking background (light gray)
  thinkingCollapsed: '#D1D5DB', // Collapsed indicator

  // Status line
  statusBackground: '#1F2937',  // Dark background
  statusText: '#F9FAFB',        // Light text
  statusAccent: '#CC9B7A',      // Claude accent

  // Syntax highlighting (for code blocks)
  syntax: {
    keyword: '#D73A49',         // Red
    string: '#032F62',          // Blue
    function: '#6F42C1',        // Purple
    comment: '#6A737D',         // Gray
    number: '#005CC5',          // Blue
    operator: '#D73A49',        // Red
    variable: '#E36209'         // Orange
  }
}

/**
 * Get theme colors based on user's theme setting
 *
 * @param {string} theme - Theme name (dark, light, dark-daltonized, light-daltonized)
 * @returns {Object} Color palette
 */
export function getThemeColors(theme = 'dark') {
  // For now, return the standard palette
  // TODO: Implement theme variations
  return CLAUDE_COLORS
}

/**
 * ANSI color codes for terminal rendering
 */
export const ANSI = {
  // Reset
  reset: '\x1b[0m',

  // Text styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Claude brand
  claude: '\x1b[38;2;204;155;122m',

  // Semantic
  success: '\x1b[38;2;16;185;129m',
  error: '\x1b[38;2;239;68;68m',
  warning: '\x1b[38;2;245;158;11m',
  info: '\x1b[38;2;59;130;246m',

  // Text
  text: '\x1b[38;2;31;41;55m',
  textSecondary: '\x1b[38;2;107;114;128m',
  textTertiary: '\x1b[38;2;156;163;175m'
}

/**
 * Box drawing characters for borders
 */
export const BOX_CHARS = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
  topT: '┬',
  bottomT: '┴',
  cross: '┼',

  // Rounded corners
  roundTopLeft: '╭',
  roundTopRight: '╮',
  roundBottomLeft: '╰',
  roundBottomRight: '╯',

  // Heavy variants
  heavyHorizontal: '━',
  heavyVertical: '┃'
}

/**
 * Unicode symbols
 */
export const SYMBOLS = {
  // Status indicators
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  thinking: '🤔',
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',

  // Tool indicators
  toolUse: '⚙',
  toolResult: '→',

  // Navigation
  arrow: '→',
  bullet: '•',
  ellipsis: '…'
}

export default {
  CLAUDE_COLORS,
  ANSI,
  BOX_CHARS,
  SYMBOLS,
  getThemeColors
}
