/**
 * Core Constants for Dario Code CLI
 *
 * This module contains important constants used throughout the application
 * including timeouts, limits, UI elements, and messages.
 *
 * Extracted from cli.mjs
 */

import os from 'os';

// =============================================================================
// TIMEOUT AND RETRY CONSTANTS
// =============================================================================

/**
 * Default timeout in milliseconds for file read operations
 * Original: R79 at line 181363
 */
export const TIMEOUT_MS = 2000;

/**
 * Maximum line length before truncation in file reads
 * Original: U79 at line 181364
 */
export const MAX_LINE_LENGTH = 2000;

/**
 * Maximum number of retry attempts for API calls
 * Original: GJ1 at line 181367
 */
export const MAX_RETRIES = 3;

/**
 * Maximum file size in bytes before overflow check (256KB)
 * Original: wJ1 at line 181368
 */
export const MAX_FILE_SIZE = 262144;

/**
 * Default lines to read from a file
 * Original: Ss at line 181370
 */
export const DEFAULT_READ_LINES = 2000;

/**
 * Default line truncation length
 * Original: Ls at line 181371
 */
export const DEFAULT_TRUNCATE_LENGTH = 2000;

/**
 * Maximum image size in bytes (~3.75MB)
 * Original: CJ1 at line 181372
 */
export const MAX_IMAGE_SIZE = 3932160;

// =============================================================================
// OUTPUT SIZE LIMITS
// =============================================================================

/**
 * Maximum output size in characters before truncation (30KB)
 * Original: Ws at line 181781
 */
export const MAX_OUTPUT_SIZE = 30000;

/**
 * Maximum number of lines to display
 * Original: a$ at line 181782
 */
export const MAX_DISPLAY_LINES = 50;

// =============================================================================
// API CONSTANTS
// =============================================================================

/**
 * Maximum number of API retries
 * Original: hZ9 at line 182593
 */
export const API_MAX_RETRIES = 10;

/**
 * Base delay for exponential backoff (ms)
 * Original: jZ9 at line 182594
 */
export const API_RETRY_BASE_DELAY = 500;

/**
 * API Error messages
 */
export const API_ERRORS = {
  GENERIC: 'API Error',
  PROMPT_TOO_LONG: 'Prompt is too long',
  LOW_BALANCE: 'Credit balance is too low',
  INVALID_KEY: 'Invalid API key - Please run /login',
  NO_CONTENT: '(no content)'
};

// Original constants:
// hZ = "API Error"
// HJ1 = "Prompt is too long"
// FJ1 = "Credit balance is too low"
// Os = "Invalid API key - Please run /login"
// FH = "(no content)"

// =============================================================================
// UI CONSTANTS - RECORDING INDICATOR
// =============================================================================

/**
 * Recording indicator symbol (platform-specific)
 * Uses a filled circle, with different unicode on macOS
 * Original: AU at line 189068
 */
export const RECORDING_INDICATOR = os.platform() === 'darwin' ? '\u23FA' : '\u25CF';
// macOS: ⏺ (U+23FA RECORDING ICON)
// Other: ● (U+25CF BLACK CIRCLE)

// =============================================================================
// UI CONSTANTS - SHIMMER ANIMATION
// =============================================================================

/**
 * Color palette for shimmer/loading animation
 * Gradient from teal (#37afa9) to gold (#febc38)
 * Original: SHIMMER_COLORS at line 189071
 */
export const SHIMMER_COLORS = [
  '#37afa9', // Teal
  '#63b19e',
  '#80b393',
  '#97b488',
  '#abb67d',
  '#beb771',
  '#cfb965',
  '#dfba57',
  '#efbb49',
  '#febc38'  // Gold
];

/**
 * Interval between shimmer color changes (ms)
 * Original: SHIMMER_INTERVAL at line 189072
 */
export const SHIMMER_INTERVAL = 100;

// =============================================================================
// USER INTERACTION MESSAGES
// =============================================================================

/**
 * Message shown when user interrupts a request
 * Original: KW at line 188292
 */
export const USER_INTERRUPT_MESSAGE = '[Request interrupted by user]';

/**
 * Message shown when user interrupts during tool use
 * Original: _X at line 188293
 */
export const USER_INTERRUPT_TOOL_MESSAGE = '[Request interrupted by user for tool use]';

/**
 * Message when user declines to take an action
 * Original: BU at line 188294
 */
export const USER_DECLINED_ACTION = "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed.";

/**
 * Message when user rejects a tool use
 * Original: fu at line 188295
 */
export const USER_REJECTED_TOOL = "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.";

/**
 * Message when no response is requested
 * Original: Xu at line 188296
 */
export const NO_RESPONSE_REQUESTED = 'No response requested.';

/**
 * Set of all synthetic/system messages that should not be responded to
 * Original: nC2 at line 188297
 */
export const SYNTHETIC_MESSAGES = new Set([
  USER_INTERRUPT_MESSAGE,
  USER_INTERRUPT_TOOL_MESSAGE,
  USER_DECLINED_ACTION,
  USER_REJECTED_TOOL,
  NO_RESPONSE_REQUESTED
]);

// =============================================================================
// BANNED COMMANDS (Security)
// =============================================================================

/**
 * Commands that are banned for security reasons
 * Original: DJ1 at line 181783
 */
export const BANNED_COMMANDS = [
  'alias',
  'curl',
  'curlie',
  'wget',
  'axel',
  'aria2c',
  'nc',
  'telnet',
  'lynx',
  'w3m',
  'links',
  'httpie',
  'xh',
  'http-prompt',
  'chrome',
  'firefox',
  'safari'
];

// =============================================================================
// FILE TYPE CONSTANTS
// =============================================================================

/**
 * Image file extensions that can be displayed
 * Original: ZJ1 at line 181369
 */
export const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp'
]);

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Prompt caching enabled flag
 * Original: GK at line 182577
 */
export const PROMPT_CACHING_ENABLED = !process.env.DISABLE_PROMPT_CACHING;

/**
 * Rate limiting thresholds
 */
export const RATE_LIMITS = {
  pK2: 0.8,   // 80% threshold
  iK2: 4,     // Multiplier
  uZ9: 1,     // Base unit
  TZ9: 0.08,  // Small threshold
  OZ9: 3,     // Count limit
  mZ9: 15,    // Time window
  lZ9: 3.75,  // Rate factor
  bZ9: 0.3,   // Decay rate
  t$: 1       // Base multiplier
};

// =============================================================================
// PARSING CONSTANTS
// =============================================================================

/**
 * Temporary placeholder for single quotes during parsing
 * Original: vF1 at line 739
 */
export const QUOTE_PLACEHOLDER = '__SINGLE_QUOTE__';

/**
 * Agent dispatch action type
 * Original: qa at line 881
 */
export const DISPATCH_AGENT = 'dispatch_agent';

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Timeouts and retries
  TIMEOUT_MS,
  MAX_LINE_LENGTH,
  MAX_RETRIES,
  MAX_FILE_SIZE,
  DEFAULT_READ_LINES,
  DEFAULT_TRUNCATE_LENGTH,
  MAX_IMAGE_SIZE,

  // Output limits
  MAX_OUTPUT_SIZE,
  MAX_DISPLAY_LINES,

  // API
  API_MAX_RETRIES,
  API_RETRY_BASE_DELAY,
  API_ERRORS,

  // UI
  RECORDING_INDICATOR,
  SHIMMER_COLORS,
  SHIMMER_INTERVAL,

  // Messages
  USER_INTERRUPT_MESSAGE,
  USER_INTERRUPT_TOOL_MESSAGE,
  USER_DECLINED_ACTION,
  USER_REJECTED_TOOL,
  NO_RESPONSE_REQUESTED,
  SYNTHETIC_MESSAGES,

  // Security
  BANNED_COMMANDS,

  // File types
  IMAGE_EXTENSIONS,

  // Rate limiting
  PROMPT_CACHING_ENABLED,
  RATE_LIMITS,

  // Parsing
  QUOTE_PLACEHOLDER,
  DISPATCH_AGENT
};
