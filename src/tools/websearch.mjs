/**
 * WebSearch Tool - Search the web and return results
 *
 * This tool performs web searches and returns structured results
 * that can be used by the AI to find information and include sources
 * in responses.
 */

import { z } from 'zod'

// Input schema for WebSearch
export const webSearchInputSchema = z.object({
  query: z.string().describe('The search query to perform'),
  limit: z.number().optional().default(10).describe('Maximum number of results to return (default: 10)'),
  allowedDomains: z.array(z.string()).optional().describe('Only return results from these domains (optional)'),
  blockedDomains: z.array(z.string()).optional().describe('Never return results from these domains (optional)')
})

// Prompt/documentation for WebSearch
export const WEB_SEARCH_PROMPT = `- Performs web searches and returns structured results
- Takes a search query and optional domain filters
- Returns results with title, URL, snippet, and source
- Can filter results by allowed or blocked domains
- Results are formatted for easy reference and citation
- Use this tool when you need current information or web sources
- Results include source URLs that can be cited in responses

Usage notes:
  - Search query can be a phrase, keywords, or natural language
  - limit parameter controls number of results (default: 10)
  - allowedDomains restricts results to specific domains
  - blockedDomains excludes results from specific domains
  - Each result includes a URL that can be fetched with WebFetch for more details
  - Results are cached for 15 minutes to reduce API calls`

/**
 * Simple cache for search results
 */
const searchCache = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

function getCachedResults(cacheKey) {
  const entry = searchCache.get(cacheKey)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.results
  }
  searchCache.delete(cacheKey)
  return null
}

function setCachedResults(cacheKey, results) {
  // Clean old entries
  const now = Date.now()
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key)
    }
  }
  searchCache.set(cacheKey, { results, timestamp: now })
}

/**
 * Create cache key from search parameters
 */
function createCacheKey(query, allowedDomains, blockedDomains) {
  const key = [
    query,
    allowedDomains?.sort().join(',') || '',
    blockedDomains?.sort().join(',') || ''
  ].join('|')
  return Buffer.from(key).toString('base64')
}

/**
 * Perform a DuckDuckGo search (HTML API, no API key needed)
 */
async function searchDuckDuckGo(query, limit = 10, fetch = globalThis.fetch) {
  try {
    // Use DuckDuckGo HTML search API
    const searchUrl = new URL('https://html.duckduckgo.com/')
    searchUrl.searchParams.set('q', query)

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'claude-code/1.0 (WebSearch Tool)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      throw new Error(`DuckDuckGo HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const results = []

    // Parse DuckDuckGo HTML results
    // Look for result containers with class "result__body"
    const resultRegex = /class="result__body"[\s\S]*?<h2[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*>([^<]*)<\/a>[\s\S]*?<p[^>]*>([^<]*)<\/p>/g

    let match
    while ((match = resultRegex.exec(html)) && results.length < limit) {
      const url = match[1]
      const title = match[2]?.trim()
      const source = match[3]?.trim()
      const snippet = match[4]?.trim()

      // Skip if missing critical fields
      if (!url || !title) continue

      // Decode URL if it's a redirect
      let finalUrl = url
      if (url.startsWith('/l/')) {
        // Extract actual URL from DuckDuckGo redirect
        const urlMatch = url.match(/\/l\/\?kh=-1&uddg=(.+?)(?:&|$)/)
        if (urlMatch) {
          try {
            finalUrl = decodeURIComponent(urlMatch[1])
          } catch {
            finalUrl = url
          }
        }
      }

      // Extract domain from source text or URL
      let domain = source
      if (!domain) {
        try {
          const urlObj = new URL(finalUrl)
          domain = urlObj.hostname.replace('www.', '')
        } catch {
          domain = 'unknown'
        }
      }

      results.push({
        title,
        url: finalUrl,
        snippet: snippet || '',
        source: domain
      })
    }

    return results
  } catch (error) {
    throw new Error(`DuckDuckGo search failed: ${error.message}`)
  }
}

/**
 * Filter results by allowed/blocked domains
 */
function filterResults(results, allowedDomains, blockedDomains) {
  return results.filter(result => {
    try {
      const url = new URL(result.url)
      const domain = url.hostname.replace('www.', '')

      // Check blocked domains first
      if (blockedDomains?.some(blocked => domain.includes(blocked))) {
        return false
      }

      // Check allowed domains if specified
      if (allowedDomains?.length > 0) {
        return allowedDomains.some(allowed => domain.includes(allowed))
      }

      return true
    } catch {
      // If URL parsing fails, keep the result
      return true
    }
  })
}

/**
 * Create the WebSearch tool definition
 */
export function createWebSearchTool(dependencies = {}) {
  const {
    React = null,
    fetch = globalThis.fetch,
    logError = console.error
  } = dependencies

  return {
    name: 'WebSearch',

    async description() {
      return 'Search the web for information and return results with sources'
    },

    userFacingName() {
      return 'WebSearch'
    },

    inputSchema: webSearchInputSchema,

    async isEnabled() {
      return true
    },

    isReadOnly() {
      return true
    },

    needsPermissions() {
      return false
    },

    async prompt() {
      return WEB_SEARCH_PROMPT
    },

    renderToolUseMessage({ query, limit, allowedDomains, blockedDomains } = {}) {
      let msg = `Searching web: "${query}"`
      if (limit && limit !== 10) msg += ` (limit: ${limit})`
      if (allowedDomains?.length) msg += ` from: ${allowedDomains.join(', ')}`
      return msg
    },

    renderToolUseRejectedMessage() {
      if (!React) return null
      return React.createElement('span', { style: { color: 'red' } }, 'WebSearch rejected')
    },

    renderToolResultMessage(result) {
      if (!React) return null
      const data = typeof result === 'string' ? JSON.parse(result) : result
      const resultCount = data.results?.length || 0
      return React.createElement(
        'span',
        null,
        `  ⎿  Found ${resultCount} result${resultCount !== 1 ? 's' : ''}`
      )
    },

    async *call({ query, limit = 10, allowedDomains, blockedDomains }, { abortController }) {
      const startTime = Date.now()

      try {
        // Create cache key
        const cacheKey = createCacheKey(query, allowedDomains, blockedDomains)

        // Check cache
        let results = getCachedResults(cacheKey)
        let fromCache = !!results

        if (!results) {
          // Perform search
          results = await searchDuckDuckGo(query, limit * 2, fetch) // Get more to account for filtering

          // Filter by domains
          results = filterResults(results, allowedDomains, blockedDomains)

          // Limit final results
          results = results.slice(0, limit)

          // Cache results
          setCachedResults(cacheKey, results)
        } else {
          // Apply limit to cached results
          results = results.slice(0, limit)
        }

        yield {
          type: 'result',
          data: {
            success: true,
            query,
            resultCount: results.length,
            fromCache,
            durationMs: Date.now() - startTime
          },
          resultForAssistant: formatResultsForAssistant(query, results)
        }

      } catch (error) {
        logError('WebSearch error:', error)

        yield {
          type: 'result',
          data: {
            success: false,
            error: error.message,
            query
          },
          resultForAssistant: `Failed to search for "${query}": ${error.message}`
        }
      }
    },

    renderResultForAssistant(result) {
      return result.resultForAssistant || 'WebSearch completed'
    }
  }
}

/**
 * Format search results for assistant
 */
function formatResultsForAssistant(query, results) {
  if (results.length === 0) {
    return `No results found for "${query}"`
  }

  let output = `Search results for "${query}":\n\n`

  results.forEach((result, index) => {
    output += `${index + 1}. ${result.title}\n`
    output += `   URL: ${result.url}\n`
    output += `   Source: ${result.source}\n`
    if (result.snippet) {
      output += `   Snippet: ${result.snippet}\n`
    }
    output += '\n'
  })

  output += 'You can use WebFetch to get more details from any of these URLs.'
  return output
}

/**
 * Clear the cache (for testing)
 */
export function clearCache() {
  searchCache.clear()
}

export default {
  createWebSearchTool,
  webSearchInputSchema,
  WEB_SEARCH_PROMPT,
  clearCache
}
