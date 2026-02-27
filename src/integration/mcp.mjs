/**
 * MCP (Model Context Protocol) Integration
 *
 * Handles connection to external MCP servers, dynamic tool/prompt loading,
 * and server configuration management.
 *
 * MCP servers can be configured at three scopes:
 * - global: User's global config (~/.dario/config.json)
 * - project: Project-level config (.dario/config.json)
 * - mcprc: Legacy .mcprc file support
 *
 */

import { homedir } from 'os'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  ListPromptsResultSchema,
  GetPromptResultSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Lenient pass-through schema for responses where the strict SDK schemas
 * reject valid-but-nonstandard data (e.g. tools with anyOf inputSchema
 * instead of type:"object").
 */
const LENIENT_SCHEMA = { parse: (v) => v }

// Map method names to their result schemas.
// tools/list uses a lenient schema because real-world MCP servers like
// `claude mcp serve` return tools with union-type inputSchema (anyOf)
// that the strict Zod ListToolsResultSchema rejects.
const RESULT_SCHEMAS = {
  'tools/list': LENIENT_SCHEMA,
  'tools/call': CallToolResultSchema,
  'prompts/list': ListPromptsResultSchema,
  'prompts/get': GetPromptResultSchema,
}

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Parse environment variables from CLI arguments
 *
 * @param {string[]} envArgs - Array of "KEY=value" strings
 * @returns {Object} Parsed environment variables
 *
 */
export function parseEnvironmentVariables(envArgs) {
  const env = {}

  if (envArgs) {
    for (const arg of envArgs) {
      const [key, ...valueParts] = arg.split('=')

      if (!key || valueParts.length === 0) {
        throw new Error(
          `Invalid environment variable format: ${arg}, ` +
          `environment variables should be added as: -e KEY1=value1 -e KEY2=value2`
        )
      }

      env[key] = valueParts.join('=')
    }
  }

  return env
}

/**
 * Valid MCP server scopes
 */
const VALID_SCOPES = ['project', 'global', 'mcprc']

/**
 * Validate and normalize MCP server scope
 *
 * @param {string} scope - Scope to validate
 * @returns {string} Validated scope (defaults to 'project')
 * @throws {Error} If scope is invalid
 *
 */
export function validateScope(scope) {
  if (!scope) return 'project'

  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(
      `Invalid scope: ${scope}. Must be one of: ${VALID_SCOPES.join(', ')}`
    )
  }

  return scope
}

/**
 * Add or update an MCP server configuration
 *
 * @param {string} name - Server name
 * @param {Object} config - Server configuration
 * @param {string} scope - Configuration scope ('project', 'global', or 'mcprc')
 * @param {Object} dependencies - Injected dependencies
 * @param {Function} dependencies.getGlobalConfig - Get global config
 * @param {Function} dependencies.setGlobalConfig - Set global config
 * @param {Function} dependencies.getProjectConfig - Get project config
 * @param {Function} dependencies.setProjectConfig - Set project config
 * @param {Function} dependencies.getCurrentDir - Get current directory
 * @param {Object} dependencies.fs - File system module
 * @param {Object} dependencies.path - Path module
 *
 */
export function addMcpServer(name, config, scope = 'project', dependencies) {
  const {
    getGlobalConfig,
    setGlobalConfig,
    getProjectConfig,
    setProjectConfig,
    getCurrentDir,
    fs,
    path
  } = dependencies

  if (scope === 'mcprc') {
    const mcprcPath = path.join(getCurrentDir(), '.mcprc')
    let mcprcConfig = {}

    if (fs.existsSync(mcprcPath)) {
      try {
        const content = fs.readFileSync(mcprcPath, 'utf-8')
        const parsed = JSON.parse(content)
        if (parsed && typeof parsed === 'object') {
          mcprcConfig = parsed
        }
      } catch (error) {
        // Ignore parse errors, will create new config
      }
    }

    mcprcConfig[name] = config

    try {
      fs.writeFileSync(mcprcPath, JSON.stringify(mcprcConfig, null, 2), 'utf-8')
    } catch (error) {
      throw new Error(`Failed to write to .mcprc: ${error}`)
    }
  } else if (scope === 'global') {
    const globalConfig = getGlobalConfig()
    if (!globalConfig.mcpServers) {
      globalConfig.mcpServers = {}
    }
    globalConfig.mcpServers[name] = config
    setGlobalConfig(globalConfig)
  } else {
    // project scope
    const projectConfig = getProjectConfig()
    if (!projectConfig.mcpServers) {
      projectConfig.mcpServers = {}
    }
    projectConfig.mcpServers[name] = config
    setProjectConfig(projectConfig)
  }
}

/**
 * Remove an MCP server configuration
 *
 * @param {string} name - Server name
 * @param {string} scope - Configuration scope
 * @param {Object} dependencies - Injected dependencies (same as addMcpServer)
 * @throws {Error} If server not found
 *
 */
export function removeMcpServer(name, scope = 'project', dependencies) {
  const {
    getGlobalConfig,
    setGlobalConfig,
    getProjectConfig,
    setProjectConfig,
    getCurrentDir,
    fs,
    path
  } = dependencies

  if (scope === 'mcprc') {
    const mcprcPath = path.join(getCurrentDir(), '.mcprc')

    if (!fs.existsSync(mcprcPath)) {
      throw new Error('No .mcprc file found in this directory')
    }

    try {
      const content = fs.readFileSync(mcprcPath, 'utf-8')
      const config = JSON.parse(content)

      if (!config || typeof config !== 'object' || !config[name]) {
        throw new Error(`No MCP server found with name: ${name} in .mcprc`)
      }

      delete config[name]
      fs.writeFileSync(mcprcPath, JSON.stringify(config, null, 2), 'utf-8')
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error(`Failed to remove from .mcprc: ${error}`)
    }
  } else if (scope === 'global') {
    const config = getGlobalConfig()
    if (!config.mcpServers?.[name]) {
      throw new Error(`No global MCP server found with name: ${name}`)
    }
    delete config.mcpServers[name]
    setGlobalConfig(config)
  } else {
    const config = getProjectConfig()
    if (!config.mcpServers?.[name]) {
      throw new Error(`No local MCP server found with name: ${name}`)
    }
    delete config.mcpServers[name]
    setProjectConfig(config)
  }
}

/**
 * Get all MCP server configurations (merged from all scopes)
 *
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} All MCP server configurations
 *
 */
export function getAllMcpServers(dependencies) {
  const { getGlobalConfig, getMcprcConfig, getProjectConfig } = dependencies

  const globalConfig = getGlobalConfig()
  const mcprcConfig = getMcprcConfig()
  const projectConfig = getProjectConfig()

  return {
    ...globalConfig.mcpServers ?? {},
    ...mcprcConfig ?? {},
    ...projectConfig.mcpServers ?? {}
  }
}

/**
 * Get a single MCP server configuration with scope information
 *
 * @param {string} name - Server name
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object|undefined} Server config with scope, or undefined if not found
 *
 */
export function getSingleMcpServer(name, dependencies) {
  const { getGlobalConfig, getMcprcConfig, getProjectConfig } = dependencies

  const projectConfig = getProjectConfig()
  const mcprcConfig = getMcprcConfig()
  const globalConfig = getGlobalConfig()

  // Priority: project > mcprc > global
  if (projectConfig.mcpServers?.[name]) {
    return {
      ...projectConfig.mcpServers[name],
      scope: 'project'
    }
  }

  if (mcprcConfig?.[name]) {
    return {
      ...mcprcConfig[name],
      scope: 'mcprc'
    }
  }

  if (globalConfig.mcpServers?.[name]) {
    return {
      ...globalConfig.mcpServers[name],
      scope: 'global'
    }
  }

  return undefined
}

/**
 * Get approval status for an mcprc server
 *
 * @param {string} name - Server name
 * @param {Object} dependencies - Injected dependencies
 * @returns {'approved'|'rejected'|'pending'} Approval status
 *
 */
export function getMcprcServerApprovalStatus(name, dependencies) {
  const { getProjectConfig } = dependencies
  const config = getProjectConfig()

  if (config.approvedMcprcServers?.includes(name)) {
    return 'approved'
  }

  if (config.rejectedMcprcServers?.includes(name)) {
    return 'rejected'
  }

  return 'pending'
}

// ============================================================================
// MCP Client Connection
// ============================================================================

/**
 * Connect to an MCP server
 *
 * @param {string} name - Server name (for logging)
 * @param {Object} config - Server configuration
 * @param {string} config.type - Transport type ('sse' or 'stdio')
 * @param {string} config.url - Server URL (for SSE)
 * @param {string} config.command - Command to run (for stdio)
 * @param {string[]} config.args - Command arguments (for stdio)
 * @param {Object} config.env - Environment variables (for stdio)
 * @param {Object} dependencies - Injected dependencies
 * @param {Function} dependencies.logMcpServerMessage - Log function
 * @returns {Promise<Client>} Connected MCP client
 * @throws {Error} If connection times out or fails
 *
 */
export async function connectToMcpServer(name, config, dependencies) {
  const { logMcpServerMessage } = dependencies

  // Create transport based on type
  const transport = config.type === 'sse'
    ? new SSEClientTransport(new URL(config.url))
    : new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...process.env,
          ...config.env
        },
        stderr: 'pipe'
      })

  // Create MCP client
  const client = new Client(
    {
      name: 'dario',
      version: '0.1.0'
    },
    {
      capabilities: {}
    }
  )

  // Connect with timeout
  const CONNECTION_TIMEOUT = 5000
  const connectionPromise = client.connect(transport)
  const timeoutPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(
        `Connection to MCP server "${name}" timed out after ${CONNECTION_TIMEOUT}ms`
      ))
    }, CONNECTION_TIMEOUT)

    connectionPromise.then(
      () => clearTimeout(timeoutId),
      () => clearTimeout(timeoutId)
    )
  })

  await Promise.race([connectionPromise, timeoutPromise])

  // Attach stderr logging for stdio transport
  if (config.type === 'stdio' && transport.stderr) {
    transport.stderr.on('data', (data) => {
      const message = data.toString().trim()
      if (message) {
        logMcpServerMessage(name, `Server stderr: ${message}`)
      }
    })
  }

  return client
}

/**
 * Get all connected MCP clients (only approved mcprc servers)
 *
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} Array of {name, client, type: 'connected'|'failed'}
 *
 */
export async function getAllMcpClients(dependencies) {
  const {
    getGlobalConfig,
    getMcprcConfig,
    getProjectConfig,
    logEvent,
    logMcpServerMessage
  } = dependencies

  // Skip in CI
  if (process.env.CI) {
    return []
  }

  const globalServers = getGlobalConfig().mcpServers ?? {}
  const mcprcServers = getMcprcConfig()
  const projectServers = getProjectConfig().mcpServers ?? {}

  // Filter mcprc servers to only approved ones
  const approvedMcprcServers = {}
  if (mcprcServers) {
    for (const [name, config] of Object.entries(mcprcServers)) {
      if (getMcprcServerApprovalStatus(name, dependencies) === 'approved') {
        approvedMcprcServers[name] = config
      }
    }
  }

  // Merge all servers
  const allServers = {
    ...globalServers,
    ...approvedMcprcServers,
    ...projectServers
  }

  // Connect to all servers
  return await Promise.all(
    Object.entries(allServers).map(async ([name, config]) => {
      try {
        const client = await connectToMcpServer(name, config, dependencies)
        logEvent('tengu_mcp_server_connection_succeeded', {})

        return {
          name,
          client,
          type: 'connected'
        }
      } catch (error) {
        logEvent('tengu_mcp_server_connection_failed', {})
        const message = error instanceof Error ? error.message : String(error)
        logMcpServerMessage(name, `Connection failed: ${message}`)

        return {
          name,
          type: 'failed'
        }
      }
    })
  )
}

/**
 * Send a request to all connected MCP servers that support a capability
 *
 * @param {Object} request - MCP request object
 * @param {string} request.method - Request method
 * @param {Object} params - Request parameters
 * @param {string} capability - Required server capability
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} Array of {client, result} from servers that responded
 *
 */
export async function requestFromAllMcpServers(request, params, capability, dependencies) {
  const { logMcpServerMessage } = dependencies
  const clients = await getAllMcpClients(dependencies)

  const results = await Promise.allSettled(
    clients.map(async (clientInfo) => {
      if (clientInfo.type === 'failed') {
        return null
      }

      try {
        // Check if server supports the capability
        const capabilities = await clientInfo.client.getServerCapabilities()
        if (!capabilities?.[capability]) {
          return null
        }

        // Make the request with proper result schema
        const resultSchema = RESULT_SCHEMAS[request.method] || {}
        const result = await clientInfo.client.request(request, resultSchema)

        return {
          client: clientInfo,
          result
        }
      } catch (error) {
        if (clientInfo.type === 'connected') {
          const message = error instanceof Error ? error.message : String(error)
          logMcpServerMessage(
            clientInfo.name,
            `Failed to request '${request.method}': ${message}`
          )
        }
        return null
      }
    })
  )

  // Filter to successful results
  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value)
    .filter(value => value !== null)
}

// ============================================================================
// MCP Tools
// ============================================================================

/**
 * Get all MCP tools from connected servers
 *
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} Array of tool definitions
 *
 */
export async function getMcpTools(dependencies) {
  const responses = await requestFromAllMcpServers(
    { method: 'tools/list' },
    {}, // empty params
    'tools',
    dependencies
  )

  return responses.flatMap(({ client, result }) => {
    const { tools } = result

    return tools.map(tool => ({
      name: `mcp__${client.name}__${tool.name}`,
      description: tool.description ?? '',
      inputJSONSchema: tool.inputSchema,
      serverName: client.name,
      toolName: tool.name
    }))
  })
}

/**
 * Call an MCP tool
 *
 * @param {Object} client - MCP client info
 * @param {string} toolName - Tool name
 * @param {Object} args - Tool arguments
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<string|Array>} Tool result
 * @throws {Error} If tool call fails
 *
 */
export async function callMcpTool(client, toolName, args, dependencies) {
  const { logMcpServerMessage } = dependencies

  const response = await client.client.callTool(
    {
      name: toolName,
      arguments: args
    },
    CallToolResultSchema
  )

  // Handle error response
  if ('isError' in response && response.isError) {
    const errorMessage = `Error calling tool ${toolName}: ${response.error}`
    logMcpServerMessage(client.name, errorMessage)
    throw new Error(errorMessage)
  }

  // Handle legacy toolResult format
  if ('toolResult' in response) {
    return String(response.toolResult)
  }

  // Handle content array format
  if ('content' in response && Array.isArray(response.content)) {
    return response.content.map(item => {
      if (item.type === 'image') {
        return {
          type: 'image',
          source: {
            type: 'base64',
            data: String(item.data),
            media_type: item.mimeType
          }
        }
      }
      return item
    })
  }

  throw new Error(`Unexpected response format from tool ${toolName}`)
}

// ============================================================================
// MCP Prompts
// ============================================================================

/**
 * Get all MCP prompts from connected servers
 *
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} Array of prompt definitions
 *
 */
export async function getMcpPrompts(dependencies) {
  const responses = await requestFromAllMcpServers(
    { method: 'prompts/list' },
    {},
    'prompts',
    dependencies
  )

  return responses.flatMap(({ client, result }) => {
    return result.prompts?.map(prompt => {
      const argNames = Object.values(prompt.arguments ?? {}).map(arg => arg.name)

      return {
        type: 'prompt',
        name: `mcp__${client.name}__${prompt.name}`,
        description: prompt.description ?? '',
        argNames,
        serverName: client.name,
        promptName: prompt.name
      }
    }) ?? []
  })
}

/**
 * Get an MCP prompt with arguments
 *
 * @param {string} name - Prompt name
 * @param {Object} client - MCP client info
 * @param {Object} args - Prompt arguments
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} Array of message objects
 * @throws {Error} If prompt retrieval fails
 *
 */
export async function getMcpPrompt(name, client, args, dependencies) {
  const { logMcpServerMessage } = dependencies

  try {
    const response = await client.client.request(
      { method: 'prompts/get', params: { name, arguments: args } },
      GetPromptResultSchema
    )

    return response.messages.map(message => ({
      role: message.role,
      content: [
        message.content.type === 'text'
          ? {
              type: 'text',
              text: message.content.text
            }
          : {
              type: 'image',
              source: {
                data: String(message.content.data),
                media_type: message.content.mimeType,
                type: 'base64'
              }
            }
      ]
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logMcpServerMessage(client.name, `Error running command '${name}': ${message}`)
    throw error
  }
}

// ============================================================================
// Schema Normalization
// ============================================================================

/**
 * Normalize an MCP tool's input schema to ensure it always has a `type` field.
 * The API requires `input_schema.type` on every tool — MCP servers
 * sometimes omit it (e.g. union-type schemas with only `anyOf`).
 *
 * @param {Object} schema - Raw inputSchema from an MCP tool
 * @returns {Object} Schema guaranteed to have `type: "object"`
 */
export function normalizeToolSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: {} }
  }
  if (!schema.type) {
    return { ...schema, type: 'object' }
  }
  return schema
}

// ============================================================================
// MCP Tool Wrappers (make MCP tools compatible with the executor)
// ============================================================================

/**
 * Wrap MCP tools as callable tool objects compatible with executeToolUse().
 * Each wrapped tool has name, inputSchema, call(), and other methods
 * the executor expects.
 *
 * @param {Array} mcpTools - Tools from getMcpTools()
 * @param {Array} mcpClientInfos - Client infos from getAllMcpClients()
 * @param {Object} dependencies - Injected dependencies
 * @returns {Array} Array of tool objects compatible with executeToolUse
 */
export function wrapMcpToolsForExecutor(mcpTools, mcpClientInfos, dependencies) {
  return mcpTools.map(mcpTool => {
    const clientInfo = mcpClientInfos.find(c => c.name === mcpTool.serverName && c.type === 'connected')
    if (!clientInfo) return null

    return {
      name: mcpTool.name,
      description: mcpTool.description || `MCP tool from ${mcpTool.serverName}`,
      inputSchema: normalizeToolSchema(mcpTool.inputJSONSchema),

      userFacingName() { return mcpTool.name },
      isReadOnly() { return false },
      async isEnabled() { return true },
      needsPermissions() { return true },
      async prompt() { return mcpTool.description || '' },

      renderToolUseMessage(input) {
        return `[MCP:${mcpTool.serverName}] ${mcpTool.toolName}`
      },
      renderToolUseRejectedMessage() { return null },
      renderToolResultMessage() { return null },
      renderResultForAssistant(result) {
        return result?.resultForAssistant || ''
      },

      async *call(input, context) {
        try {
          const result = await callMcpTool(clientInfo, mcpTool.toolName, input, dependencies)

          // Normalize result to string
          let resultText
          if (typeof result === 'string') {
            resultText = result
          } else if (Array.isArray(result)) {
            resultText = result.map(item => {
              if (item.type === 'text') return item.text
              if (item.type === 'image') return '[image]'
              return JSON.stringify(item)
            }).join('\n')
          } else {
            resultText = JSON.stringify(result)
          }

          yield {
            type: 'result',
            data: result,
            resultForAssistant: resultText,
          }
        } catch (error) {
          yield {
            type: 'result',
            data: null,
            resultForAssistant: `Error: ${error.message}`,
          }
        }
      }
    }
  }).filter(Boolean)
}

/**
 * Get MCP server instructions to inject into the system prompt.
 * Fetches prompts from all connected servers and formats them.
 *
 * @param {Array} mcpClientInfos - Client infos from getAllMcpClients()
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<string>} Formatted MCP instructions for system prompt
 */
export async function getMcpSystemInstructions(mcpClientInfos, dependencies) {
  if (!mcpClientInfos || mcpClientInfos.length === 0) return ''

  const connectedClients = mcpClientInfos.filter(c => c.type === 'connected')
  if (connectedClients.length === 0) return ''

  const sections = []

  for (const clientInfo of connectedClients) {
    try {
      const capabilities = await clientInfo.client.getServerCapabilities()

      // Get server instructions if supported
      if (capabilities?.prompts) {
        try {
          const promptsResponse = await clientInfo.client.request(
            { method: 'prompts/list' },
            ListPromptsResultSchema
          )
          if (promptsResponse?.prompts?.length > 0) {
            const promptDescs = promptsResponse.prompts.map(p =>
              `  - ${p.name}: ${p.description || 'No description'}`
            ).join('\n')
            sections.push(`## ${clientInfo.name}\nAvailable prompts:\n${promptDescs}`)
          }
        } catch {}
      }

      // Get tool list for instructions
      if (capabilities?.tools) {
        try {
          const toolsResponse = await clientInfo.client.request(
            { method: 'tools/list' },
            LENIENT_SCHEMA
          )
          if (toolsResponse?.tools?.length > 0) {
            const toolDescs = toolsResponse.tools.map(t =>
              `  - mcp__${clientInfo.name}__${t.name}: ${t.description || 'No description'}`
            ).join('\n')
            sections.push(`## MCP Server: ${clientInfo.name}\nTools:\n${toolDescs}`)
          }
        } catch {}
      }
    } catch {}
  }

  if (sections.length === 0) return ''

  return `# MCP Server Instructions\n\nThe following MCP servers are connected and provide additional tools:\n\n${sections.join('\n\n')}`
}

/**
 * Initialize MCP: connect to servers, discover tools, return everything needed.
 * This is the main entry point for MCP integration at startup.
 *
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Object>} { clients, tools, systemInstructions }
 */
export async function initializeMcp(dependencies) {
  try {
    const clients = await getAllMcpClients(dependencies)
    const connectedClients = clients.filter(c => c.type === 'connected')

    if (connectedClients.length === 0) {
      return { clients: [], tools: [], systemInstructions: '' }
    }

    const mcpToolDefs = await getMcpTools(dependencies)
    const tools = wrapMcpToolsForExecutor(mcpToolDefs, clients, dependencies)
    const systemInstructions = await getMcpSystemInstructions(clients, dependencies)

    return { clients, tools, systemInstructions }
  } catch (error) {
    if (process.env.DEBUG_TUI) {
      console.error('[MCP] Initialization failed:', error.message)
    }
    return { clients: [], tools: [], systemInstructions: '' }
  }
}

// ============================================================================
// Lazy MCP Loading
// ============================================================================

const MCP_CACHE_DIR = '.dario/mcp-cache'
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

// Valid startup modes for MCP servers
export const STARTUP_MODES = ['always', 'ondemand', 'asneeded']
const STARTUP_MODE_DEFAULT = 'always'

// TODO: Eager connect delay (5s after startup) and stagger interval (1s between servers)
// are hardcoded. Consider making these configurable if users have many servers or slow networks.

/**
 * Read cached tool manifest for a server
 *
 * @param {string} serverName - Server name
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object|null} Cached manifest { tools, timestamp } or null
 */
function readToolCache(serverName, dependencies) {
  const { fs, path } = dependencies
  try {
    const cacheDir = path.join(homedir(), MCP_CACHE_DIR)
    const cachePath = path.join(cacheDir, `${serverName}.json`)
    if (!fs.existsSync(cachePath)) return null
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
    if (!data || !Array.isArray(data.tools)) return null
    return data
  } catch {
    return null
  }
}

/**
 * Write tool manifest cache for a server
 *
 * @param {string} serverName - Server name
 * @param {Array} tools - Tool definitions [{ name, description, inputSchema }]
 * @param {Object} dependencies - Injected dependencies
 */
function writeToolCache(serverName, tools, dependencies) {
  const { fs, path } = dependencies
  try {
    const cacheDir = path.join(homedir(), MCP_CACHE_DIR)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    const cachePath = path.join(cacheDir, `${serverName}.json`)
    fs.writeFileSync(cachePath, JSON.stringify({
      tools: tools.map(t => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema || t.inputJSONSchema || { type: 'object', properties: {} },
      })),
      timestamp: Date.now(),
    }, null, 2))
  } catch {
    // Non-fatal: cache write failure doesn't break functionality
  }
}

/**
 * Check if cache is stale (older than 24h)
 */
function isCacheStale(cache) {
  if (!cache || !cache.timestamp) return true
  return (Date.now() - cache.timestamp) > CACHE_MAX_AGE_MS
}

/**
 * Read cached summary for a server (used by "as needed" mode)
 *
 * @param {string} serverName - Server name
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object|null} { description, toolNames, toolCount, timestamp } or null
 */
function readSummaryCache(serverName, dependencies) {
  const { fs, path } = dependencies
  try {
    const cacheDir = path.join(homedir(), MCP_CACHE_DIR)
    const cachePath = path.join(cacheDir, `${serverName}-summary.json`)
    if (!fs.existsSync(cachePath)) return null
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
    if (!data || !data.description) return null
    return data
  } catch {
    return null
  }
}

/**
 * Write summary cache for a server (generated after each successful connection)
 *
 * @param {string} serverName - Server name
 * @param {Array} tools - Tool definitions [{ name, description, inputSchema }]
 * @param {Object} dependencies - Injected dependencies
 */
function writeSummaryCache(serverName, tools, dependencies) {
  const { fs, path } = dependencies
  try {
    const cacheDir = path.join(homedir(), MCP_CACHE_DIR)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    const cachePath = path.join(cacheDir, `${serverName}-summary.json`)
    const summary = generateServerSummary(tools)
    fs.writeFileSync(cachePath, JSON.stringify({
      description: summary,
      toolNames: tools.map(t => {
        const name = t.name || ''
        return name.startsWith('mcp__') ? name.split('__').slice(2).join('__') : name
      }),
      toolCount: tools.length,
      timestamp: Date.now(),
    }, null, 2))
  } catch {
    // Non-fatal
  }
}

/**
 * Generate a 1-2 sentence summary of what an MCP server does from its tools
 *
 * @param {Array} tools - Tool definitions
 * @returns {string} Summary description
 */
// TODO: Summary generation is naive (concatenates tool descriptions, truncates to 200 chars).
// Quality depends on tools having meaningful descriptions. Consider using the LLM to generate
// a proper 1-2 sentence summary, or at least deduplicating common words across tool descriptions.
function generateServerSummary(tools) {
  if (!tools || tools.length === 0) return 'MCP server with no tools discovered yet.'

  // Collect unique description keywords
  const descriptions = tools
    .map(t => t.description || '')
    .filter(Boolean)
    .join('. ')

  // Take first 200 chars of combined descriptions as a rough summary
  const truncated = descriptions.length > 200 ? descriptions.slice(0, 200) + '...' : descriptions
  return truncated || `MCP server providing ${tools.length} tools.`
}

/**
 * Create lazy proxy tools for a server that auto-connect on first call.
 *
 * @param {string} serverName - MCP server name
 * @param {Object} serverConfig - Server configuration
 * @param {Array|null} cachedTools - Cached tool definitions, or null
 * @param {Object} dependencies - Injected dependencies
 * @param {Function} replaceTools - Callback to replace proxy tools with real ones
 * @returns {Array} Array of proxy tool objects
 */
export function createLazyMcpTools(serverName, serverConfig, cachedTools, dependencies, replaceTools) {
  const { logMcpServerMessage } = dependencies

  // Shared state for all proxies from this server
  let connectionPromise = null
  let connected = false
  let realClient = null
  let realTools = null

  /**
   * Connect to the server, discover tools, replace proxies with real tools
   */
  async function connectAndReplace() {
    if (connected && realTools) return realTools
    if (connectionPromise) return connectionPromise

    connectionPromise = (async () => {
      try {
        logMcpServerMessage(serverName, 'Lazy-connecting on first tool call...')

        // Connect to the server
        realClient = await connectToMcpServer(serverName, serverConfig, dependencies)

        // Discover tools
        const capabilities = await realClient.getServerCapabilities()
        let discoveredTools = []

        if (capabilities?.tools) {
          const toolsResponse = await realClient.request(
            { method: 'tools/list' },
            LENIENT_SCHEMA
          )
          discoveredTools = (toolsResponse?.tools || []).map(tool => ({
            name: `mcp__${serverName}__${tool.name}`,
            description: tool.description ?? '',
            inputJSONSchema: tool.inputSchema,
            serverName,
            toolName: tool.name,
          }))
        }

        // Cache the discovered tools for next startup
        writeToolCache(serverName, discoveredTools, dependencies)
        // Also write summary cache for "as needed" mode
        writeSummaryCache(serverName, discoveredTools, dependencies)

        // Wrap as real executor-compatible tools
        const clientInfo = { name: serverName, client: realClient, type: 'connected' }
        realTools = wrapMcpToolsForExecutor(discoveredTools, [clientInfo], dependencies)
        connected = true

        // Replace proxy tools with real tools in the tools array
        replaceTools(serverName, realTools, clientInfo)

        logMcpServerMessage(serverName, `Connected: ${realTools.length} tools loaded`)
        return realTools
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logMcpServerMessage(serverName, `Lazy connection failed: ${message}`)
        connectionPromise = null
        throw error
      }
    })()

    return connectionPromise
  }

  // If we have cached tools, create a proxy for each one
  if (cachedTools && cachedTools.length > 0) {
    return cachedTools.map(cached => {
      const fullName = cached.name.startsWith('mcp__') ? cached.name : `mcp__${serverName}__${cached.name}`
      const toolName = cached.name.startsWith('mcp__') ? cached.name.split('__').slice(2).join('__') : cached.name

      return {
        name: fullName,
        description: cached.description || `MCP tool from ${serverName}`,
        inputSchema: normalizeToolSchema(cached.inputSchema),
        _lazy: true,
        _serverName: serverName,

        userFacingName() { return fullName },
        isReadOnly() { return false },
        async isEnabled() { return true },
        needsPermissions() { return true },
        async prompt() { return cached.description || '' },

        renderToolUseMessage(input) {
          return `[MCP:${serverName}] ${toolName}`
        },
        renderToolUseRejectedMessage() { return null },
        renderToolResultMessage() { return null },
        renderResultForAssistant(result) {
          return result?.resultForAssistant || ''
        },

        async *call(input, context) {
          try {
            // Trigger connection and tool replacement
            const tools = await connectAndReplace()

            // Find the now-real tool and delegate
            const realTool = tools.find(t => t.name === fullName)
            if (!realTool) {
              yield {
                type: 'result',
                data: null,
                resultForAssistant: `Error: Tool ${fullName} not found after connecting to server`,
              }
              return
            }

            // Delegate to the real tool
            yield* realTool.call(input, context)
          } catch (error) {
            yield {
              type: 'result',
              data: null,
              resultForAssistant: `Error connecting to MCP server "${serverName}": ${error.message}`,
            }
          }
        }
      }
    })
  }

  // No cached tools — create a single placeholder that connects on first call
  return [{
    name: `mcp__${serverName}__discover`,
    description: `Connects to MCP server "${serverName}" and discovers available tools. Call this first to see what tools are available.`,
    inputSchema: { type: 'object', properties: {} },
    _lazy: true,
    _serverName: serverName,

    userFacingName() { return `mcp__${serverName}__discover` },
    isReadOnly() { return true },
    async isEnabled() { return true },
    needsPermissions() { return false },
    async prompt() { return this.description },

    renderToolUseMessage() {
      return `[MCP:${serverName}] Discovering tools...`
    },
    renderToolUseRejectedMessage() { return null },
    renderToolResultMessage() { return null },
    renderResultForAssistant(result) {
      return result?.resultForAssistant || ''
    },

    async *call(input, context) {
      try {
        const tools = await connectAndReplace()
        const toolList = tools.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n')
        yield {
          type: 'result',
          data: { tools: tools.map(t => t.name) },
          resultForAssistant: `Connected to "${serverName}". Available tools:\n${toolList}`,
        }
      } catch (error) {
        yield {
          type: 'result',
          data: null,
          resultForAssistant: `Error connecting to MCP server "${serverName}": ${error.message}`,
        }
      }
    }
  }]
}

/**
 * Generate system instructions from cached tool manifests (no live connection needed)
 *
 * @param {Object} serverToolMap - Map of serverName → cached tool array
 * @param {Object} serverModes - Map of serverName → { mode, summary } for "as needed" servers
 * @returns {string} Formatted system instructions
 */
export function getMcpSystemInstructionsFromCache(serverToolMap, serverModes = {}) {
  const sections = []

  for (const [serverName, tools] of Object.entries(serverToolMap)) {
    const modeInfo = serverModes[serverName]

    // "As needed" mode: show summary only, not full tool schemas
    if (modeInfo?.mode === 'asneeded' && modeInfo.summary) {
      sections.push(
        `## MCP Server: ${serverName} (as needed)\n` +
        `${modeInfo.summary.description} ${modeInfo.summary.toolCount} tools available.\n` +
        `Use mcp__${serverName}__discover to load tools when needed.`
      )
      continue
    }

    // Full tool listing (always + on demand)
    if (tools && tools.length > 0) {
      const toolDescs = tools.map(t => {
        const fullName = t.name.startsWith('mcp__') ? t.name : `mcp__${serverName}__${t.name}`
        return `  - ${fullName}: ${t.description || 'No description'}`
      }).join('\n')
      sections.push(`## MCP Server: ${serverName}\nTools:\n${toolDescs}`)
    }
  }

  if (sections.length === 0) return ''

  return `# MCP Server Instructions\n\nThe following MCP servers are configured and provide additional tools:\n\n${sections.join('\n\n')}`
}

/**
 * Initialize MCP with startup mode awareness.
 * Each server's `startupMode` determines behavior:
 * - 'always': returned in `eagerServers` for async connection after startup
 * - 'ondemand': lazy proxy with cached schemas (existing behavior)
 * - 'asneeded': summary-only in prompt, discover tool to load schemas
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {Function} replaceTools - Callback: (serverName, realTools, clientInfo) => void
 * @returns {Promise<Object>} { tools, systemInstructions, serverNames, eagerServers }
 */
export async function initializeMcpLazy(dependencies, replaceTools) {
  try {
    // Skip in CI
    if (process.env.CI) {
      return { tools: [], systemInstructions: '', serverNames: [], eagerServers: [] }
    }

    const {
      getGlobalConfig,
      getMcprcConfig,
      getProjectConfig,
    } = dependencies

    const globalServers = getGlobalConfig().mcpServers ?? {}
    const mcprcServers = getMcprcConfig()
    const projectServers = getProjectConfig().mcpServers ?? {}

    // Filter mcprc servers to only approved ones
    const approvedMcprcServers = {}
    if (mcprcServers) {
      for (const [name, config] of Object.entries(mcprcServers)) {
        if (getMcprcServerApprovalStatus(name, dependencies) === 'approved') {
          approvedMcprcServers[name] = config
        }
      }
    }

    // Merge all servers
    const allServers = {
      ...globalServers,
      ...approvedMcprcServers,
      ...projectServers,
    }

    const serverNames = Object.keys(allServers)
    if (serverNames.length === 0) {
      return { tools: [], systemInstructions: '', serverNames: [], eagerServers: [] }
    }

    // Build proxy tools for each server using cache, respecting startup mode
    const allTools = []
    const serverToolMap = {}
    const serverModes = {} // mode metadata for system instructions
    const eagerServers = [] // servers that need async connection (mode=always)

    for (const [name, config] of Object.entries(allServers)) {
      const mode = config.startupMode || STARTUP_MODE_DEFAULT
      const cache = readToolCache(name, dependencies)
      const cachedTools = cache?.tools || null

      if (mode === 'asneeded') {
        // "As needed" — summary in prompt, discover tool only
        const summary = readSummaryCache(name, dependencies)

        // Create only a discover placeholder (no full proxy tools)
        const discoverTool = createAsNeededDiscoverTool(name, config, dependencies, replaceTools)
        allTools.push(discoverTool)

        // Use summary for system instructions
        serverModes[name] = { mode: 'asneeded', summary }
        if (summary) {
          serverToolMap[name] = [{ name: 'discover', description: summary.description }]
        } else {
          serverToolMap[name] = [{ name: 'discover', description: 'Connect to discover available tools' }]
        }
      } else {
        // "always" and "ondemand" — both create full lazy proxy tools from cache
        const proxyTools = createLazyMcpTools(name, config, cachedTools, dependencies, replaceTools)
        allTools.push(...proxyTools)

        // For system instructions, use cache data
        if (cachedTools) {
          serverToolMap[name] = cachedTools
        } else {
          serverToolMap[name] = [{ name: 'discover', description: 'Connect to discover available tools' }]
        }

        // "always" servers go into eager queue for async connection
        if (mode === 'always') {
          eagerServers.push({ name, config })
        }
      }
    }

    // Generate system instructions from cache (no live connections)
    const systemInstructions = getMcpSystemInstructionsFromCache(serverToolMap, serverModes)

    if (process.env.DEBUG_TUI) {
      const cachedCount = Object.values(serverToolMap).filter(t => t.length > 0 && t[0].name !== 'discover').length
      const eagerCount = eagerServers.length
      const asNeededCount = Object.values(serverModes).filter(m => m.mode === 'asneeded').length
      console.error(`[MCP:Lazy] ${serverNames.length} servers: ${eagerCount} always, ${serverNames.length - eagerCount - asNeededCount} ondemand, ${asNeededCount} asneeded, ${cachedCount} cached, ${allTools.length} tools`)
    }

    return { tools: allTools, systemInstructions, serverNames, eagerServers }
  } catch (error) {
    if (process.env.DEBUG_TUI) {
      console.error('[MCP:Lazy] Initialization failed:', error.message)
    }
    return { tools: [], systemInstructions: '', serverNames: [], eagerServers: [] }
  }
}

/**
 * Create a lightweight discover tool for "as needed" mode servers.
 * This tool connects to the server and loads full schemas when called.
 */
function createAsNeededDiscoverTool(serverName, serverConfig, dependencies, replaceTools) {
  const { logMcpServerMessage } = dependencies

  let connectionPromise = null
  let connected = false

  return {
    name: `mcp__${serverName}__discover`,
    description: `Connects to MCP server "${serverName}" and discovers available tools. Call this to load tools when needed.`,
    inputSchema: { type: 'object', properties: {} },
    _lazy: true,
    _serverName: serverName,

    userFacingName() { return `mcp__${serverName}__discover` },
    isReadOnly() { return true },
    async isEnabled() { return true },
    needsPermissions() { return false },
    async prompt() { return this.description },

    renderToolUseMessage() { return `[MCP:${serverName}] Discovering tools...` },
    renderToolUseRejectedMessage() { return null },
    renderToolResultMessage() { return null },
    renderResultForAssistant(result) { return result?.resultForAssistant || '' },

    // TODO: "As needed" discover requires Claude to explicitly call this tool before using
    // any tools from this server. The system prompt tells Claude about the discover tool,
    // but there's no guarantee Claude will call it proactively. Consider adding a hint in
    // the system prompt or auto-discovering when Claude attempts a tool from a dormant server.
    async *call(input, context) {
      if (connected) {
        yield { type: 'result', data: null, resultForAssistant: `Server "${serverName}" is already connected.` }
        return
      }
      if (connectionPromise) {
        yield { type: 'result', data: null, resultForAssistant: `Server "${serverName}" is already connecting...` }
        return
      }

      try {
        connectionPromise = (async () => {
          logMcpServerMessage(serverName, 'As-needed: connecting on discover call...')
          const client = await connectToMcpServer(serverName, serverConfig, dependencies)
          const capabilities = await client.getServerCapabilities()
          let discoveredTools = []

          if (capabilities?.tools) {
            const toolsResponse = await client.request({ method: 'tools/list' }, LENIENT_SCHEMA)
            discoveredTools = (toolsResponse?.tools || []).map(tool => ({
              name: `mcp__${serverName}__${tool.name}`,
              description: tool.description ?? '',
              inputJSONSchema: tool.inputSchema,
              serverName,
              toolName: tool.name,
            }))
          }

          writeToolCache(serverName, discoveredTools, dependencies)
          writeSummaryCache(serverName, discoveredTools, dependencies)

          const clientInfo = { name: serverName, client, type: 'connected' }
          const realTools = wrapMcpToolsForExecutor(discoveredTools, [clientInfo], dependencies)
          connected = true

          // Replace this discover tool with real tools
          replaceTools(serverName, realTools, clientInfo)
          return realTools
        })()

        const tools = await connectionPromise
        const toolList = tools.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n')
        yield {
          type: 'result',
          data: { tools: tools.map(t => t.name) },
          resultForAssistant: `Connected to "${serverName}". Available tools:\n${toolList}`,
        }
      } catch (error) {
        connectionPromise = null
        yield {
          type: 'result',
          data: null,
          resultForAssistant: `Error connecting to MCP server "${serverName}": ${error.message}`,
        }
      }
    }
  }
}

/**
 * Connect "always" mode servers asynchronously with staggered delays.
 * Called ~5s after TUI renders. Each server connects 1s apart.
 *
 * @param {Array} eagerServers - [{ name, config }]
 * @param {Object} dependencies - Injected dependencies
 * @param {Function} replaceTools - Callback to replace proxy tools
 */
// REVIEW: If a user has 10+ "always" servers, staggered connections take 10+ seconds.
// Consider connecting in parallel with a concurrency limit (e.g. 3 at a time) instead.
export async function connectEagerServers(eagerServers, dependencies, replaceTools) {
  const { logMcpServerMessage } = dependencies

  for (let i = 0; i < eagerServers.length; i++) {
    const { name, config } = eagerServers[i]

    // Stagger: wait 1s between each server
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    try {
      logMcpServerMessage(name, 'Eager connect (always mode)...')
      const client = await connectToMcpServer(name, config, dependencies)

      // Discover tools
      const capabilities = await client.getServerCapabilities()
      let discoveredTools = []

      if (capabilities?.tools) {
        const toolsResponse = await client.request({ method: 'tools/list' }, LENIENT_SCHEMA)
        discoveredTools = (toolsResponse?.tools || []).map(tool => ({
          name: `mcp__${name}__${tool.name}`,
          description: tool.description ?? '',
          inputJSONSchema: tool.inputSchema,
          serverName: name,
          toolName: tool.name,
        }))
      }

      // Update caches
      writeToolCache(name, discoveredTools, dependencies)
      writeSummaryCache(name, discoveredTools, dependencies)

      // Replace proxy tools with real tools
      const clientInfo = { name, client, type: 'connected' }
      const realTools = wrapMcpToolsForExecutor(discoveredTools, [clientInfo], dependencies)
      replaceTools(name, realTools, clientInfo)

      logMcpServerMessage(name, `Eager connected: ${realTools.length} tools`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logMcpServerMessage(name, `Eager connection failed: ${message}`)
    }
  }
}

/**
 * Update a server's startupMode in its config scope
 *
 * @param {string} name - Server name
 * @param {string} mode - New startup mode ('always', 'ondemand', 'asneeded')
 * @param {Object} dependencies - Injected dependencies
 */
export function updateServerStartupMode(name, mode, dependencies) {
  const {
    getGlobalConfig,
    setGlobalConfig,
    getProjectConfig,
    setProjectConfig,
    getCurrentDir,
    fs,
    path
  } = dependencies

  if (!STARTUP_MODES.includes(mode)) return

  // Find which scope the server is in and update there
  const projectConfig = getProjectConfig()
  if (projectConfig.mcpServers?.[name]) {
    projectConfig.mcpServers[name].startupMode = mode
    setProjectConfig(projectConfig)
    return
  }

  // Check mcprc
  try {
    const mcprcPath = path.join(getCurrentDir(), '.mcprc')
    if (fs.existsSync(mcprcPath)) {
      const content = fs.readFileSync(mcprcPath, 'utf8')
      const mcprcConfig = JSON.parse(content)
      if (mcprcConfig?.[name]) {
        mcprcConfig[name].startupMode = mode
        fs.writeFileSync(mcprcPath, JSON.stringify(mcprcConfig, null, 2), 'utf-8')
        return
      }
    }
  } catch {}

  // Fall back to global
  const globalConfig = getGlobalConfig()
  if (globalConfig.mcpServers?.[name]) {
    globalConfig.mcpServers[name].startupMode = mode
    setGlobalConfig(globalConfig)
  }
}

export default {
  // Configuration
  parseEnvironmentVariables,
  validateScope,
  addMcpServer,
  removeMcpServer,
  getAllMcpServers,
  getSingleMcpServer,
  getMcprcServerApprovalStatus,

  // Connection
  connectToMcpServer,
  getAllMcpClients,
  requestFromAllMcpServers,

  // Tools
  getMcpTools,
  callMcpTool,
  wrapMcpToolsForExecutor,
  normalizeToolSchema,

  // Prompts
  getMcpPrompts,
  getMcpPrompt,

  // Integration
  getMcpSystemInstructions,
  initializeMcp,

  // Lazy Loading
  createLazyMcpTools,
  initializeMcpLazy,
  getMcpSystemInstructionsFromCache,
  connectEagerServers,
  updateServerStartupMode,

  // Constants
  VALID_SCOPES,
  STARTUP_MODES,
}
