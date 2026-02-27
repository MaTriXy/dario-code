/**
 * WebFetch Tool - Fetch and analyze web content
 *
 * This tool fetches content from a URL and processes it using an AI model
 * to extract specific information based on a prompt.
 */

import { z } from 'zod'

// Input schema for WebFetch
export const webFetchInputSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from'),
  prompt: z.string().describe('The prompt to run on the fetched content')
})

// Prompt/documentation for WebFetch
export const WEB_FETCH_PROMPT = `- Fetches content from a specified URL and processes it using an AI model
- Takes a URL and a prompt as input
- Fetches the URL content, converts HTML to markdown
- Processes the content with the prompt using a small, fast model
- Returns the model's response about the content
- Use this tool when you need to retrieve and analyze web content

Usage notes:
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - The prompt should describe what information you want to extract from the page
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large
  - Includes a self-cleaning 15-minute cache for faster responses`

// Simple HTML to text converter
function htmlToText(html) {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Replace common block elements with newlines
  text = text.replace(/<\/?(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n')

  // Remove all other tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n\n')
  text = text.trim()

  return text
}

// Simple cache for fetched content
const cache = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

function getCached(url) {
  const entry = cache.get(url)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.content
  }
  cache.delete(url)
  return null
}

function setCache(url, content) {
  // Clean old entries
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key)
    }
  }
  cache.set(url, { content, timestamp: now })
}

/**
 * Create the WebFetch tool definition
 */
export function createWebFetchTool(dependencies = {}) {
  const {
    React = null,
    fetch = globalThis.fetch,
    processWithAI = null, // Function to process content with AI
    logError = console.error
  } = dependencies

  return {
    name: 'WebFetch',

    async description() {
      return 'Fetch and analyze content from a URL'
    },

    userFacingName() {
      return 'WebFetch'
    },

    inputSchema: webFetchInputSchema,

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
      return WEB_FETCH_PROMPT
    },

    renderToolUseMessage({ url, prompt } = {}) {
      const shortUrl = url.length > 50 ? url.substring(0, 50) + '...' : url
      const shortPrompt = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt
      return `Fetching ${shortUrl} with prompt: "${shortPrompt}"`
    },

    renderToolUseRejectedMessage() {
      if (!React) return null
      return React.createElement('span', { style: { color: 'red' } }, 'WebFetch rejected')
    },

    renderToolResultMessage(result) {
      if (!React) return null
      const data = typeof result === 'string' ? JSON.parse(result) : result
      const status = data.success ? 'Success' : 'Failed'
      return React.createElement('span', null, `  ⎿  ${status}: ${data.contentLength || 0} chars processed`)
    },

    async *call({ url, prompt }, { abortController }) {
      const startTime = Date.now()

      try {
        // Upgrade HTTP to HTTPS
        let fetchUrl = url
        if (fetchUrl.startsWith('http://')) {
          fetchUrl = fetchUrl.replace('http://', 'https://')
        }

        // Check cache first
        let content = getCached(fetchUrl)
        let fromCache = !!content

        if (!content) {
          // Fetch the URL
          const response = await fetch(fetchUrl, {
            headers: {
              'User-Agent': 'Dario/1.0 (WebFetch Tool)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            signal: abortController?.signal
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          // Check for redirects to different host
          const finalUrl = response.url
          if (new URL(finalUrl).host !== new URL(fetchUrl).host) {
            yield {
              type: 'result',
              data: {
                success: false,
                redirect: true,
                redirectUrl: finalUrl,
                message: `URL redirects to a different host: ${finalUrl}`
              },
              resultForAssistant: `The URL redirects to a different host. Please make a new WebFetch request with this URL: ${finalUrl}`
            }
            return
          }

          const html = await response.text()
          content = htmlToText(html)

          // Cache the content
          setCache(fetchUrl, content)
        }

        // Truncate if too long
        const maxLength = 50000
        let truncated = false
        if (content.length > maxLength) {
          content = content.substring(0, maxLength)
          truncated = true
        }

        // Process with AI if available
        let analysis = null
        if (processWithAI) {
          analysis = await processWithAI(content, prompt)
        } else {
          // Fallback: return raw content with prompt context
          analysis = `Content from ${url} (${content.length} chars${truncated ? ', truncated' : ''}):\n\n${content.substring(0, 5000)}${content.length > 5000 ? '\n\n[Content truncated...]' : ''}`
        }

        yield {
          type: 'result',
          data: {
            success: true,
            url: fetchUrl,
            contentLength: content.length,
            truncated,
            fromCache,
            durationMs: Date.now() - startTime
          },
          resultForAssistant: analysis
        }

      } catch (error) {
        logError('WebFetch error:', error)

        yield {
          type: 'result',
          data: {
            success: false,
            error: error.message,
            url
          },
          resultForAssistant: `Failed to fetch ${url}: ${error.message}`
        }
      }
    },

    renderResultForAssistant(result) {
      return result.resultForAssistant || 'WebFetch completed'
    }
  }
}

/**
 * Clear the cache (for testing)
 */
export function clearCache() {
  cache.clear()
}

export default {
  createWebFetchTool,
  webFetchInputSchema,
  WEB_FETCH_PROMPT,
  clearCache
}
