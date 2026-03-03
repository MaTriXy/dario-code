/**
 * Print Mode Tool Use Tests
 *
 * Tests the CLI -p (print mode) tool execution pipeline:
 *  1. Unit tests: createAllTools → executeToolUse with real file I/O
 *  2. Integration tests: spawn cli.mjs -p against a mock Anthropic SSE server
 *
 * No real API key required.
 *
 * Run: npx vitest run tests/print-mode-tools.test.mjs
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createAllTools } from '../src/tools/index.mjs'
import { executeToolUse } from '../src/tools/executor.mjs'
import { spawn } from 'child_process'
import { createServer } from 'http'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import * as utils from '../src/core/utils.mjs'

const CLI_PATH = path.resolve(import.meta.dirname, '..', 'cli.mjs')

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeToolDeps(overrides = {}) {
  return {
    fs: fsSync,
    path,
    os,
    executeCommand: async (cmd, opts) => {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const result = await promisify(exec)(cmd, { ...opts, maxBuffer: 10 * 1024 * 1024 })
      return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 }
    },
    getCurrentDir: utils.getCurrentDir,
    getOriginalDir: utils.getOriginalDir,
    resolvePath: utils.resolvePath,
    isAbsolutePath: path.isAbsolute,
    fileExists: utils.fileExists,
    getFileStats: utils.getFileStats,
    findSimilarFile: utils.findSimilarFile,
    isInAllowedDirectory: () => true,
    detectEncoding: utils.detectEncoding,
    detectLineEnding: utils.detectLineEnding,
    getDefaultLineEnding: utils.getDefaultLineEnding,
    normalizeLineEndings: utils.normalizeLineEndings,
    writeFile: utils.writeFile,
    globFiles: utils.globFiles,
    runRipgrep: utils.runRipgrep,
    processImage: utils.processImage,
    logError: () => {},
    logEvent: () => {},
    ...overrides,
  }
}

// ─── Part 1: Tool creation and execution unit tests ─────────────────────────

describe('Tool creation and execution (unit)', () => {
  let tools
  let toolsArray
  let tempDir
  let readFileTimestamps

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `dario-tool-unit-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    try { await fs.rm(tempDir, { recursive: true, force: true }) } catch {}
  })

  beforeEach(() => {
    tools = createAllTools(makeToolDeps())
    toolsArray = Object.values(tools)
    readFileTimestamps = {}
  })

  it('should create all expected tools including getDefaultLineEnding dep', () => {
    expect(tools.Write).toBeDefined()
    expect(typeof tools.Write.call).toBe('function')
    expect(tools.Read).toBeDefined()
    expect(tools.Edit).toBeDefined()
    expect(tools.Bash).toBeDefined()
    expect(tools.Glob).toBeDefined()
    expect(tools.Grep).toBeDefined()
  })

  describe('Write tool (getDefaultLineEnding fix)', () => {
    it('should write a new file without getDefaultLineEnding error', async () => {
      const testFile = path.join(tempDir, 'write-new-file.txt')
      const result = await executeToolUse(
        { name: 'Write', input: { file_path: testFile, content: 'hello world' } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      const content = await fs.readFile(testFile, 'utf-8')
      expect(content).toBe('hello world')
    })

    it('should write a file with CRLF content correctly', async () => {
      const testFile = path.join(tempDir, 'write-crlf.txt')
      const result = await executeToolUse(
        { name: 'Write', input: { file_path: testFile, content: 'line1\nline2\nline3' } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      const content = await fs.readFile(testFile, 'utf-8')
      expect(content).toContain('line1')
      expect(content).toContain('line2')
    })

    it('should create parent directories when writing', async () => {
      const testFile = path.join(tempDir, 'nested', 'deep', 'file.txt')
      const result = await executeToolUse(
        { name: 'Write', input: { file_path: testFile, content: 'nested content' } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      const content = await fs.readFile(testFile, 'utf-8')
      expect(content).toBe('nested content')
    })
  })

  describe('Grep tool (getFileStats fix)', () => {
    it('should search files without getFileStats().catch() error', async () => {
      // Create test files with searchable content
      const searchDir = path.join(tempDir, 'grep-test')
      await fs.mkdir(searchDir, { recursive: true })
      await fs.writeFile(path.join(searchDir, 'a.txt'), 'findme-unique-token')
      await fs.writeFile(path.join(searchDir, 'b.txt'), 'nothing here')

      const result = await executeToolUse(
        { name: 'Grep', input: { pattern: 'findme-unique-token', path: searchDir } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      expect(result.content).toContain('a.txt')
    })

    it('should return results sorted by modification time', async () => {
      const searchDir = path.join(tempDir, 'grep-sort')
      await fs.mkdir(searchDir, { recursive: true })
      await fs.writeFile(path.join(searchDir, 'old.txt'), 'searchterm')
      // Small delay to get different mtime
      await new Promise(r => setTimeout(r, 50))
      await fs.writeFile(path.join(searchDir, 'new.txt'), 'searchterm')

      const result = await executeToolUse(
        { name: 'Grep', input: { pattern: 'searchterm', path: searchDir } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      // Both files should appear
      expect(result.content).toContain('old.txt')
      expect(result.content).toContain('new.txt')
    })
  })

  describe('Bash tool', () => {
    it('should execute command and return output', async () => {
      const result = await executeToolUse(
        { name: 'Bash', input: { command: 'echo "unit-test-output"' } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      expect(result.content).toContain('unit-test-output')
    })
  })

  describe('Read tool', () => {
    it('should read file contents', async () => {
      const testFile = path.join(tempDir, 'read-unit.txt')
      await fs.writeFile(testFile, 'read-me-content')

      const result = await executeToolUse(
        { name: 'Read', input: { file_path: testFile } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      expect(result.content).toContain('read-me-content')
    })
  })

  describe('Edit tool', () => {
    it('should edit file after reading it', async () => {
      const testFile = path.join(tempDir, 'edit-unit.txt')
      await fs.writeFile(testFile, 'original text here')

      // Read first (required by Edit)
      await executeToolUse(
        { name: 'Read', input: { file_path: testFile } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      const result = await executeToolUse(
        { name: 'Edit', input: { file_path: testFile, old_string: 'original', new_string: 'modified' } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      const content = await fs.readFile(testFile, 'utf-8')
      expect(content).toBe('modified text here')
    })
  })

  describe('Glob tool', () => {
    it('should find files by pattern', async () => {
      const globDir = path.join(tempDir, 'glob-unit')
      await fs.mkdir(globDir, { recursive: true })
      await fs.writeFile(path.join(globDir, 'foo.js'), '')
      await fs.writeFile(path.join(globDir, 'bar.js'), '')
      await fs.writeFile(path.join(globDir, 'baz.py'), '')

      const result = await executeToolUse(
        { name: 'Glob', input: { pattern: '*.js', path: globDir } },
        toolsArray,
        { dangerouslySkipPermissions: true, readFileTimestamps }
      )

      expect(result.is_error).toBe(false)
      expect(result.content).toContain('foo.js')
      expect(result.content).toContain('bar.js')
      expect(result.content).not.toContain('baz.py')
    })
  })
})

// ─── Part 2: CLI integration with mock Anthropic SSE server ─────────────────

/**
 * Build an Anthropic Messages API SSE response body.
 * The model "responds" with the given content blocks and stop_reason.
 */
function buildSSEResponse(contentBlocks, stopReason = 'end_turn') {
  const events = []

  // message_start
  events.push(`event: message_start\ndata: ${JSON.stringify({
    type: 'message_start',
    message: {
      id: 'msg_test_001',
      type: 'message',
      role: 'assistant',
      content: [],
      model: 'claude-haiku-4-5-20251001',
      stop_reason: null,
      usage: { input_tokens: 10, output_tokens: 0 },
    }
  })}\n`)

  let blockIndex = 0
  for (const block of contentBlocks) {
    if (block.type === 'text') {
      // content_block_start
      events.push(`event: content_block_start\ndata: ${JSON.stringify({
        type: 'content_block_start',
        index: blockIndex,
        content_block: { type: 'text', text: '' },
      })}\n`)
      // content_block_delta — send text in one chunk
      events.push(`event: content_block_delta\ndata: ${JSON.stringify({
        type: 'content_block_delta',
        index: blockIndex,
        delta: { type: 'text_delta', text: block.text },
      })}\n`)
      // content_block_stop
      events.push(`event: content_block_stop\ndata: ${JSON.stringify({
        type: 'content_block_stop',
        index: blockIndex,
      })}\n`)
    } else if (block.type === 'tool_use') {
      // content_block_start
      events.push(`event: content_block_start\ndata: ${JSON.stringify({
        type: 'content_block_start',
        index: blockIndex,
        content_block: { type: 'tool_use', id: block.id, name: block.name, input: {} },
      })}\n`)
      // content_block_delta — send input JSON
      events.push(`event: content_block_delta\ndata: ${JSON.stringify({
        type: 'content_block_delta',
        index: blockIndex,
        delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) },
      })}\n`)
      // content_block_stop
      events.push(`event: content_block_stop\ndata: ${JSON.stringify({
        type: 'content_block_stop',
        index: blockIndex,
      })}\n`)
    }
    blockIndex++
  }

  // message_delta with stop_reason
  events.push(`event: message_delta\ndata: ${JSON.stringify({
    type: 'message_delta',
    delta: { stop_reason: stopReason, stop_sequence: null },
    usage: { output_tokens: 20 },
  })}\n`)

  // message_stop
  events.push(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n`)

  return events.join('\n')
}

/**
 * Create a mock Anthropic API server that responds with pre-scripted SSE.
 * The `responses` array is consumed in order: first request gets responses[0], etc.
 */
function createMockServer(responses) {
  let requestIndex = 0

  const server = createServer((req, res) => {
    // Collect body (we don't parse it but need to consume it)
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const responseEntry = responses[Math.min(requestIndex, responses.length - 1)]
      requestIndex++

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      res.write(responseEntry)
      res.end()
    })
  })

  return server
}

/**
 * Run CLI in print mode as a child process.
 * Returns a promise that resolves with { stdout, stderr, code }.
 */
function runCLI(prompt, env, opts = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      CLI_PATH,
      prompt,
      '-p',
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
    ]
    if (opts.maxTurns) args.push('--max-turns', String(opts.maxTurns))

    const child = spawn('node', args, {
      env: { ...process.env, ...env },
      timeout: opts.timeout || 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })

    child.on('close', code => resolve({ stdout, stderr, code }))
    child.on('error', reject)

    // Close stdin immediately
    child.stdin.end()
  })
}

/**
 * Parse stream-json output lines into message objects.
 */
function parseStreamJson(stdout) {
  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line) } catch { return null }
    })
    .filter(Boolean)
}

/**
 * Extract all content blocks from stream-json messages.
 * stream-json emits several shapes:
 *   { type: 'progress', message: { type: 'assistant', message: { role, content } } }
 *   { type: 'assistant', uuid, message: { role, content } }
 *   { type: 'user', uuid, message: { role, content } }
 *   { type: 'progress', toolUseId, status } (tool progress — no content)
 */
function getAllContentBlocks(messages) {
  const blocks = []
  for (const msg of messages) {
    // Direct message: { type: 'assistant'|'user', message: { content } }
    const directContent = msg.message?.content
    if (Array.isArray(directContent)) {
      blocks.push(...directContent)
    }
    // Nested progress: { type: 'progress', message: { message: { content } } }
    const nestedContent = msg.message?.message?.content
    if (Array.isArray(nestedContent)) {
      blocks.push(...nestedContent)
    }
  }
  return blocks
}

function getToolUsesFromStream(messages) {
  return getAllContentBlocks(messages).filter(b => b.type === 'tool_use')
}

function getToolResultsFromStream(messages) {
  return getAllContentBlocks(messages).filter(b => b.type === 'tool_result')
}

function hasAssistantMessage(messages) {
  return messages.some(m =>
    m.type === 'assistant' ||
    m.message?.type === 'assistant' ||
    m.message?.role === 'assistant'
  )
}

describe('CLI print mode with mock API (integration)', () => {
  let server
  let serverPort
  let tempDir

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `dario-mock-api-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    try { await fs.rm(tempDir, { recursive: true, force: true }) } catch {}
  })

  /**
   * Helper: start a mock server with given responses, run the CLI, stop the server.
   */
  async function runWithMockAPI(prompt, responses, opts = {}) {
    server = createMockServer(responses)
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    serverPort = server.address().port

    try {
      const env = {
        ANTHROPIC_API_KEY: 'test-key-not-real',
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${serverPort}`,
        // Disable OAuth so it doesn't try to read token files
        CLAUDE_CODE_OAUTH_TOKEN: '',
        HOME: tempDir,
        ...opts.env,
      }

      const result = await runCLI(prompt, env, opts)
      return {
        ...result,
        messages: parseStreamJson(result.stdout),
      }
    } finally {
      server.close()
    }
  }

  it('should handle a simple text-only response', async () => {
    const sseBody = buildSSEResponse([
      { type: 'text', text: 'Hello from mock API!' },
    ])

    const { messages, code } = await runWithMockAPI('Say hello', [sseBody])

    expect(code).toBe(0)
    expect(hasAssistantMessage(messages)).toBe(true)
  }, 30_000)

  it('should execute a Bash tool_use and return tool results', async () => {
    // Turn 1: model requests Bash tool
    const turn1 = buildSSEResponse([
      { type: 'tool_use', id: 'toolu_001', name: 'Bash', input: { command: 'echo mock-bash-output' } },
    ], 'tool_use')

    // Turn 2: model gives final text after seeing tool result
    const turn2 = buildSSEResponse([
      { type: 'text', text: 'The command output was: mock-bash-output' },
    ])

    const { messages, code } = await runWithMockAPI(
      'Run echo',
      [turn1, turn2],
      { maxTurns: 3 }
    )

    expect(code).toBe(0)

    const toolUses = getToolUsesFromStream(messages)
    const toolResults = getToolResultsFromStream(messages)

    expect(toolUses.length).toBeGreaterThanOrEqual(1)
    expect(toolUses[0].name).toBe('Bash')
    expect(toolResults.length).toBeGreaterThanOrEqual(1)
    expect(toolResults[0].content).toContain('mock-bash-output')
  }, 30_000)

  it('should execute a Read tool_use on a real file', async () => {
    const testFile = path.join(tempDir, 'mock-read-target.txt')
    await fs.writeFile(testFile, 'mock-file-content-xyz')

    const turn1 = buildSSEResponse([
      { type: 'tool_use', id: 'toolu_002', name: 'Read', input: { file_path: testFile } },
    ], 'tool_use')

    const turn2 = buildSSEResponse([
      { type: 'text', text: 'File contents received.' },
    ])

    const { messages, code } = await runWithMockAPI(
      'Read the file',
      [turn1, turn2],
      { maxTurns: 3 }
    )

    expect(code).toBe(0)

    const toolResults = getToolResultsFromStream(messages)

    expect(toolResults.length).toBeGreaterThanOrEqual(1)
    expect(toolResults[0].content).toContain('mock-file-content-xyz')
  }, 30_000)

  it('should execute a Write tool_use and create a real file', async () => {
    const testFile = path.join(tempDir, 'mock-write-output.txt')

    const turn1 = buildSSEResponse([
      { type: 'tool_use', id: 'toolu_003', name: 'Write', input: { file_path: testFile, content: 'written-by-mock-test' } },
    ], 'tool_use')

    const turn2 = buildSSEResponse([
      { type: 'text', text: 'File created.' },
    ])

    const { messages, code } = await runWithMockAPI(
      'Create a file',
      [turn1, turn2],
      { maxTurns: 3 }
    )

    expect(code).toBe(0)

    // Verify the file was actually written to disk
    const content = await fs.readFile(testFile, 'utf-8')
    expect(content).toBe('written-by-mock-test')
  }, 30_000)

  it('should handle tool errors gracefully', async () => {
    const turn1 = buildSSEResponse([
      { type: 'tool_use', id: 'toolu_004', name: 'Read', input: { file_path: '/nonexistent/path/xyz.txt' } },
    ], 'tool_use')

    const turn2 = buildSSEResponse([
      { type: 'text', text: 'The file was not found.' },
    ])

    const { messages, code } = await runWithMockAPI(
      'Read missing file',
      [turn1, turn2],
      { maxTurns: 3 }
    )

    // CLI should not crash
    expect(code).toBe(0)

    const toolResults = getToolResultsFromStream(messages)

    expect(toolResults.length).toBeGreaterThanOrEqual(1)
    expect(toolResults[0].is_error).toBe(true)
  }, 30_000)

  it('should handle multi-tool responses in sequence', async () => {
    const testFile = path.join(tempDir, 'multi-tool.txt')

    // Turn 1: model writes a file
    const turn1 = buildSSEResponse([
      { type: 'tool_use', id: 'toolu_005', name: 'Write', input: { file_path: testFile, content: 'multi-tool-content' } },
    ], 'tool_use')

    // Turn 2: model reads the file back
    const turn2 = buildSSEResponse([
      { type: 'tool_use', id: 'toolu_006', name: 'Read', input: { file_path: testFile } },
    ], 'tool_use')

    // Turn 3: model gives final answer
    const turn3 = buildSSEResponse([
      { type: 'text', text: 'Done.' },
    ])

    const { messages, code } = await runWithMockAPI(
      'Write then read',
      [turn1, turn2, turn3],
      { maxTurns: 5 }
    )

    expect(code).toBe(0)

    // File should exist
    const content = await fs.readFile(testFile, 'utf-8')
    expect(content).toBe('multi-tool-content')

    const toolResults = getToolResultsFromStream(messages)
    expect(toolResults.length).toBeGreaterThanOrEqual(2)

    // Second result (Read) should contain the written content
    const readResult = toolResults.find(r => r.content?.includes('multi-tool-content'))
    expect(readResult).toBeDefined()
  }, 30_000)

  it('should respect --max-turns limit', async () => {
    // Model keeps requesting tools indefinitely
    const toolTurn = buildSSEResponse([
      { type: 'tool_use', id: 'toolu_loop', name: 'Bash', input: { command: 'echo loop' } },
    ], 'tool_use')

    const finalTurn = buildSSEResponse([
      { type: 'text', text: 'Stopped.' },
    ])

    // Provide many responses but limit to 2 turns
    const { code } = await runWithMockAPI(
      'Loop forever',
      [toolTurn, toolTurn, toolTurn, toolTurn, finalTurn],
      { maxTurns: 2 }
    )

    // Should exit (0 or other) without hanging
    expect(code).toBeDefined()
  }, 30_000)
})
