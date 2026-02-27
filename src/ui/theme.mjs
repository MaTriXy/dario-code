/**
 * Dario Theme System
 * Theme colors
 */

import { platform } from 'os'

/**
 * Light theme (default for light terminals)
 */
export const lightTheme = {
  bashBorder: '#ff0087',      // Hot Pink - tool/bash borders
  claude: '#D97757',          // Burnt Orange - Claude messages
  permission: '#5769f7',      // Periwinkle Blue - permission prompts
  secondaryBorder: '#999',    // Medium Gray
  text: '#000',               // Black - primary text
  secondaryText: '#666',      // Dark Gray - secondary text
  suggestion: '#5769f7',      // Periwinkle Blue - suggestions
  success: '#2c7a39',         // Forest Green
  error: '#ab2b3f',           // Crimson
  warning: '#966c1e',         // Brown
  diff: {
    added: '#69db7c',         // Light Green
    removed: '#ffa8b4',       // Light Red
    addedDimmed: '#c7e1cb',   // Pale Green
    removedDimmed: '#fdd2d8'  // Pale Red
  }
}

/**
 * Light theme (colorblind-friendly / daltonized)
 */
export const lightDaltonizedTheme = {
  bashBorder: '#0066cc',      // Bright Blue
  claude: '#ff9933',          // Orange
  permission: '#3366ff',      // Royal Blue
  secondaryBorder: '#999',    // Medium Gray
  text: '#000',               // Black
  secondaryText: '#666',      // Dark Gray
  suggestion: '#3366ff',      // Royal Blue
  success: '#006699',         // Navy
  error: '#cc0000',           // Red
  warning: '#ff9900',         // Orange
  diff: {
    added: '#99ccff',         // Light Blue
    removed: '#ffcccc',       // Light Red
    addedDimmed: '#d1e7fd',   // Pale Blue
    removedDimmed: '#ffe9e9'  // Pale Red
  }
}

/**
 * Dark theme (default for dark terminals)
 */
export const darkTheme = {
  bashBorder: '#fd5db1',      // Pink - tool/bash borders
  claude: '#D97757',          // Burnt Orange - Claude messages
  permission: '#b1b9f9',      // Light Blue - permission prompts
  secondaryBorder: '#888',    // Medium Gray
  text: '#fff',               // White - primary text
  secondaryText: '#999',      // Light Gray - secondary text
  suggestion: '#b1b9f9',      // Light Blue - suggestions
  success: '#4eba65',         // Medium Green
  error: '#ff6b80',           // Light Red
  warning: '#ffc107',         // Amber
  diff: {
    added: '#225c2b',         // Dark Green
    removed: '#7a2936',       // Dark Red
    addedDimmed: '#47584a',   // Gray-Green
    removedDimmed: '#69484d'  // Gray-Red
  }
}

/**
 * Dark theme (colorblind-friendly / daltonized)
 */
export const darkDaltonizedTheme = {
  bashBorder: '#3399ff',      // Light Blue
  claude: '#ff9933',          // Orange
  permission: '#99ccff',      // Sky Blue
  secondaryBorder: '#888',    // Medium Gray
  text: '#fff',               // White
  secondaryText: '#999',      // Light Gray
  suggestion: '#99ccff',      // Sky Blue
  success: '#3399ff',         // Light Blue
  error: '#ff6666',           // Light Red
  warning: '#ffcc00',         // Yellow
  diff: {
    added: '#004466',         // Dark Blue
    removed: '#660000',       // Dark Red
    addedDimmed: '#3e515b',   // Slate Blue
    removedDimmed: '#3e2c2c'  // Slate Red
  }
}

/**
 * Status line mode colors
 */
export const statusColors = {
  acceptEdits: '#A855F7',     // Purple
  planMode: '#14B8A6',        // Teal
  bypassPermissions: '#EF4444' // Red
}

/**
 * Task status colors
 */
export const taskStatusColors = {
  running: '#22C55E',         // Green
  completed: '#6B7280',       // Gray
  failed: '#EF4444',          // Red
  killed: '#F59E0B'           // Amber
}

/**
 * Task status icons
 */
export const taskStatusIcons = {
  running: '●',
  completed: '✓',
  failed: '✗',
  killed: '⊘'
}

/**
 * Status line mode icons
 */
export const statusIcons = {
  acceptEdits: '▸▸',
  planMode: '▌▌',
  bypassPermissions: '▸▸'
}

/**
 * Get configuration (placeholder - integrate with actual config system)
 */
function getConfig() {
  return {
    theme: process.env.DARIO_THEME || 'dark'
  }
}

/**
 * Get the current theme based on configuration
 * @param {string} [themeName] - Optional theme name override
 * @returns {object} The theme object
 */
export function getTheme(themeName) {
  const config = getConfig()
  const theme = themeName ?? config.theme

  switch (theme) {
    case 'light':
      return lightTheme
    case 'light-daltonized':
      return lightDaltonizedTheme
    case 'dark-daltonized':
      return darkDaltonizedTheme
    case 'dark':
    default:
      return darkTheme
  }
}

/**
 * All available themes
 */
export const themes = {
  light: lightTheme,
  'light-daltonized': lightDaltonizedTheme,
  dark: darkTheme,
  'dark-daltonized': darkDaltonizedTheme
}

export default {
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
}
