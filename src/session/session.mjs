/**
 * Dario Session Management
 *
 * Provides session persistence and resume capability:
 * - saveSession: Save conversation state to disk
 * - loadSession: Load conversation from disk
 * - listSessions: List all saved sessions
 * - getLastSession: Get most recent session
 * - deleteSession: Remove old session
 *
 * Session data structure:
 * {
 *   "id": "session_timestamp_random",
 *   "createdAt": "ISO date",
 *   "updatedAt": "ISO date",
 *   "messages": [...],
 *   "metadata": {
 *     "cwd": "/path",
 *     "model": "claude-...",
 *     "forkNumber": 0
 *   }
 * }
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

// Session directory — uses .claude/projects/ layout for compatibility
const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'projects')

/**
 * Ensure sessions directory exists
 */
function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  }
}

/**
 * Generate a session ID
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get session file path
 */
function getSessionPath(sessionId) {
  return path.join(SESSIONS_DIR, `${sessionId}.json`)
}

/**
 * Save session to disk
 *
 * @param {string} sessionId - Session ID
 * @param {Array} messages - Conversation messages
 * @param {Object} metadata - Session metadata
 * @returns {string} Path to saved session file
 */
export function saveSession(sessionId, messages, metadata = {}) {
  ensureSessionsDir()

  const session = {
    id: sessionId,
    createdAt: metadata.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: messages || [],
    metadata: {
      cwd: metadata.cwd || process.cwd(),
      model: metadata.model || 'claude-sonnet-4-6',
      forkNumber: metadata.forkNumber || 0,
      ...metadata
    }
  }

  const sessionPath = getSessionPath(sessionId)
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2))

  return sessionPath
}

/**
 * Load session from disk
 *
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Session data or null if not found
 */
export function loadSession(sessionId) {
  const sessionPath = getSessionPath(sessionId)

  if (!fs.existsSync(sessionPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(sessionPath, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Failed to load session ${sessionId}:`, error.message)
    return null
  }
}

/**
 * List all saved sessions
 *
 * @returns {Array} Array of session objects
 */
export function listSessions() {
  ensureSessionsDir()

  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse() // Most recent first

    return files.map(filename => {
      try {
        const content = fs.readFileSync(
          path.join(SESSIONS_DIR, filename),
          'utf8'
        )
        return JSON.parse(content)
      } catch (error) {
        return null
      }
    }).filter(Boolean)
  } catch (error) {
    console.error('Failed to list sessions:', error.message)
    return []
  }
}

/**
 * Get the most recent session
 *
 * @returns {Object|null} Last session or null if none exist
 */
export function getLastSession() {
  const sessions = listSessions()
  return sessions.length > 0 ? sessions[0] : null
}

/**
 * Get session by ID
 *
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Session data or null if not found
 */
export function getSession(sessionId) {
  return loadSession(sessionId)
}

/**
 * Delete a session
 *
 * @param {string} sessionId - Session ID
 * @returns {boolean} True if deleted, false otherwise
 */
export function deleteSession(sessionId) {
  const sessionPath = getSessionPath(sessionId)

  if (!fs.existsSync(sessionPath)) {
    return false
  }

  try {
    fs.unlinkSync(sessionPath)
    return true
  } catch (error) {
    console.error(`Failed to delete session ${sessionId}:`, error.message)
    return false
  }
}

/**
 * Create a new session
 *
 * @param {Object} options - Session options
 * @returns {string} New session ID
 */
export function createSession(options = {}) {
  const sessionId = generateSessionId()

  saveSession(sessionId, [], {
    cwd: options.cwd || process.cwd(),
    model: options.model || 'claude-sonnet-4-6',
    forkNumber: options.forkNumber || 0,
    ...options
  })

  return sessionId
}

/**
 * Update session messages
 *
 * @param {string} sessionId - Session ID
 * @param {Array} messages - New messages array
 * @returns {Object|null} Updated session or null if not found
 */
export function updateSessionMessages(sessionId, messages) {
  const session = loadSession(sessionId)

  if (!session) {
    return null
  }

  session.messages = messages
  session.updatedAt = new Date().toISOString()

  saveSession(
    sessionId,
    messages,
    { ...session.metadata, createdAt: session.createdAt }
  )

  return session
}

/**
 * Get session summary
 *
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Session summary or null if not found
 */
export function getSessionSummary(sessionId) {
  const session = loadSession(sessionId)

  if (!session) {
    return null
  }

  return {
    id: session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    model: session.metadata.model,
    cwd: session.metadata.cwd
  }
}

/**
 * Format session for display
 *
 * @param {Object} session - Session object
 * @returns {string} Formatted session info
 */
export function formatSession(session) {
  const createdDate = new Date(session.createdAt)
  const updatedDate = new Date(session.updatedAt)

  const lines = [
    `ID: ${session.id}`,
    `Created: ${createdDate.toLocaleString()}`,
    `Updated: ${updatedDate.toLocaleString()}`,
    `Messages: ${session.messages.length}`,
    `Model: ${session.metadata.model}`,
    `Directory: ${session.metadata.cwd}`
  ]

  return lines.join('\n')
}

/**
 * Clean up old sessions
 *
 * @param {number} daysOld - Delete sessions older than N days (default: 30)
 * @returns {Array} IDs of deleted sessions
 */
export function cleanupOldSessions(daysOld = 30) {
  const sessions = listSessions()
  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
  const deletedIds = []

  for (const session of sessions) {
    const sessionTime = new Date(session.updatedAt).getTime()
    if (sessionTime < cutoffTime) {
      if (deleteSession(session.id)) {
        deletedIds.push(session.id)
      }
    }
  }

  return deletedIds
}

export default {
  saveSession,
  loadSession,
  listSessions,
  getLastSession,
  getSession,
  deleteSession,
  createSession,
  updateSessionMessages,
  getSessionSummary,
  formatSession,
  cleanupOldSessions
}
