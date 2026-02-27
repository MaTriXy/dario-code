/**
 * Plugin discovery service
 * Fetches and caches available plugins from npm registry
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CACHE_DIR = path.join(os.homedir(), '.dario')
const CACHE_FILE = path.join(CACHE_DIR, 'plugin-registry-cache.json')
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search'
const SEARCH_KEYWORD = 'dario-plugin'
const DEFAULT_SIZE = 50
const SAMPLES_DIR = path.join(__dirname, 'samples')

/**
 * Bundled sample plugins that always appear in the Discover tab.
 * These represent realistic plugins users would expect to find.
 */
export const BUNDLED_PLUGINS = [
  {
    name: 'hello-world',
    version: '1.0.0',
    description: 'A starter template plugin — adds a /hello command. Great for learning plugin development.',
    author: 'dario',
    keywords: ['dario-plugin', 'template', 'starter'],
    date: '2026-01-15',
    downloads: 12400,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'code-stats',
    version: '1.0.0',
    description: 'Counts lines of code, functions, and classes across your project. Adds a line_counter tool.',
    author: 'dario',
    keywords: ['dario-plugin', 'stats', 'analysis'],
    date: '2026-01-20',
    downloads: 8700,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'theme-dark',
    version: '1.0.0',
    description: 'Custom dark color theme for the TUI. Config-only plugin — no code, just style overrides.',
    author: 'dario',
    keywords: ['dario-plugin', 'theme', 'colors'],
    date: '2026-01-18',
    downloads: 6200,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'git-summary',
    version: '0.9.0',
    description: 'Summarize recent git activity — commits, branches, and contributors at a glance.',
    author: 'devtools-collective',
    keywords: ['dario-plugin', 'git', 'summary'],
    date: '2026-01-22',
    downloads: 15300,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'snippet-library',
    version: '1.2.0',
    description: 'Save, search, and insert reusable code snippets from a personal library.',
    author: 'codecraft',
    keywords: ['dario-plugin', 'snippets', 'productivity'],
    date: '2026-01-25',
    downloads: 9800,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'test-runner',
    version: '2.0.0',
    description: 'Run tests directly from the CLI with inline pass/fail output and coverage reports.',
    author: 'devtools-collective',
    keywords: ['dario-plugin', 'testing', 'runner'],
    date: '2026-01-28',
    downloads: 22100,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'doc-generator',
    version: '1.1.0',
    description: 'Auto-generate JSDoc, TSDoc, or Markdown documentation from your source code.',
    author: 'doctools',
    keywords: ['dario-plugin', 'docs', 'documentation'],
    date: '2026-01-30',
    downloads: 11200,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'env-manager',
    version: '0.8.0',
    description: 'Switch between .env files for different environments (dev, staging, prod).',
    author: 'configkit',
    keywords: ['dario-plugin', 'env', 'config'],
    date: '2026-02-01',
    downloads: 7400,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'todo-tracker',
    version: '1.3.0',
    description: 'Find and track TODO/FIXME/HACK comments across your codebase with priority sorting.',
    author: 'codecraft',
    keywords: ['dario-plugin', 'todo', 'tracking'],
    date: '2026-02-03',
    downloads: 13600,
    npmUrl: '',
    bundled: true,
  },
  {
    name: 'ai-commit',
    version: '0.5.0',
    description: 'Generate conventional commit messages from staged diffs using the active LLM.',
    author: 'dario',
    keywords: ['dario-plugin', 'git', 'ai', 'commits'],
    date: '2026-02-05',
    downloads: 18900,
    npmUrl: '',
    bundled: true,
  },
]

/**
 * Check if a plugin name is a bundled sample plugin
 */
export function isBundledPlugin(name) {
  return BUNDLED_PLUGINS.some(p => p.name === name)
}

/**
 * Get the local filesystem path for a bundled sample plugin.
 * Returns null if the plugin is not bundled or the sample dir doesn't exist.
 */
export function getSamplePluginPath(name) {
  if (!isBundledPlugin(name)) return null
  const samplePath = path.join(SAMPLES_DIR, name)
  try {
    if (fs.existsSync(samplePath)) return samplePath
  } catch {
    // ignore
  }
  return null
}

/**
 * Fetch JSON from a URL via https
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Invalid JSON response'))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

/**
 * Read cached plugin data
 * @returns {{ plugins: Array, timestamp: number } | null}
 */
function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null
    const raw = fs.readFileSync(CACHE_FILE, 'utf8')
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.plugins) || typeof data.timestamp !== 'number') return null
    return data
  } catch {
    return null
  }
}

/**
 * Write plugin data to cache
 */
function writeCache(plugins) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ plugins, timestamp: Date.now() }, null, 2))
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Normalize npm search result into a plugin descriptor
 */
function normalizeResult(obj) {
  const pkg = obj.package || {}
  return {
    name: pkg.name || 'unknown',
    version: pkg.version || '0.0.0',
    description: (pkg.description || '').slice(0, 200),
    author: pkg.author?.name || pkg.publisher?.username || 'unknown',
    keywords: pkg.keywords || [],
    date: pkg.date || '',
    downloads: obj.downloads?.all || obj.score?.detail?.popularity
      ? Math.round((obj.score?.detail?.popularity || 0) * 150000)
      : 0,
    npmUrl: pkg.links?.npm || '',
  }
}

/**
 * Fetch available plugins from npm
 * Uses cache when available and fresh
 *
 * @param {string} [query] - Optional search query to append
 * @returns {Promise<Array>} Normalized plugin descriptors
 */
export async function fetchAvailablePlugins(query) {
  // Check cache first (only for unfiltered fetches)
  if (!query) {
    const cached = readCache()
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.plugins
    }
  }

  const searchText = query
    ? `keywords:${SEARCH_KEYWORD} ${query}`
    : `keywords:${SEARCH_KEYWORD}`

  const url = `${NPM_SEARCH_URL}?text=${encodeURIComponent(searchText)}&size=${DEFAULT_SIZE}`

  try {
    const data = await fetchJson(url)
    const npmPlugins = (data.objects || []).map(normalizeResult)

    // Merge bundled plugins with npm results (deduped — npm wins if name matches)
    const merged = mergeBundledPlugins(npmPlugins)

    // Cache unfiltered results
    if (!query) {
      writeCache(merged)
    }

    return merged
  } catch (err) {
    // Fallback to cache on network error
    const cached = readCache()
    if (cached) {
      return cached.plugins
    }
    // If no cache and no npm results, return bundled plugins only
    return [...BUNDLED_PLUGINS]
  }
}

/**
 * Merge bundled plugins with npm results.
 * npm results take priority for name collisions.
 */
function mergeBundledPlugins(npmPlugins) {
  const npmNames = new Set(npmPlugins.map(p => p.name))
  const bundledOnly = BUNDLED_PLUGINS.filter(p => !npmNames.has(p.name))
  return [...bundledOnly, ...npmPlugins]
}

/**
 * Client-side filter of plugin list by name/description
 *
 * @param {string} query - Search string
 * @param {Array} plugins - Plugin list to filter
 * @returns {Array} Filtered plugins
 */
export function searchPlugins(query, plugins) {
  if (!query || !query.trim()) return plugins
  const lower = query.toLowerCase().trim()
  return plugins.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower) ||
    p.author.toLowerCase().includes(lower)
  )
}

/**
 * Force-clear the plugin cache so next fetch hits npm
 */
export function clearPluginCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE)
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Format download count for display (e.g. 104100 -> "104.1K")
 */
export function formatDownloads(n) {
  if (!n || n < 1000) return n ? String(n) : '0'
  if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
}
