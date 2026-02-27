/**
 * Source Badge Component
 *
 * Renders a small colored chip/indicator showing where an item comes from:
 *   OC  = .dario (primary, green)
 *   CC  = .claude     (shared/read-only, blue)
 *   PRJ = project-local
 *   OC+CC = exists in both
 */

import React from 'react'
import { Text } from 'ink'

const BADGE_CONFIG = {
  'dario':        { label: 'OC',    color: '#22C55E', title: '.dario' },
  'claude':            { label: 'CC',    color: '#3B82F6', title: '.claude' },
  'project':           { label: 'PRJ',   color: '#A855F7', title: 'project' },
  'global-dario': { label: 'OC',    color: '#22C55E', title: '~/.dario' },
  'global-claude':     { label: 'CC',    color: '#3B82F6', title: '~/.claude' },
  'personal':          { label: 'OC',    color: '#22C55E', title: '~/.dario' },
  'both':              { label: 'OC+CC', color: '#F59E0B', title: 'both' },
  'builtin':           { label: 'SYS',   color: '#6B7280', title: 'built-in' },
}

/**
 * Render a source badge
 *
 * @param {Object} props
 * @param {string} props.source - Source key (dario, claude, project, both, etc.)
 * @param {boolean} [props.dim=false] - Dim the badge (for unselected items)
 */
export function SourceBadge({ source, dim = false }) {
  const config = BADGE_CONFIG[source] || BADGE_CONFIG['builtin']
  return React.createElement(Text, {
    color: dim ? '#4B5563' : config.color,
    dimColor: dim,
    bold: !dim,
  }, ` [${config.label}]`)
}

/**
 * Determine combined source when item exists in multiple locations.
 *
 * @param {boolean} inOpenclaude - Exists in .dario
 * @param {boolean} inClaude - Exists in .claude
 * @param {boolean} [inProject=false] - Exists in project dir
 * @returns {string} Source key
 */
export function resolveSource(inOpenclaude, inClaude, inProject = false) {
  if (inProject) return 'project'
  if (inOpenclaude && inClaude) return 'both'
  if (inOpenclaude) return 'dario'
  if (inClaude) return 'claude'
  return 'builtin'
}

export default SourceBadge
