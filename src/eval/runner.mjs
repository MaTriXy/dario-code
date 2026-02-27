/**
 * Eval Runner - Run Dario CLI and capture streaming logs
 */

import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function runEval(prompt, options = {}) {
  const evalId = randomUUID()
  const logDir = join(process.cwd(), '.evals', evalId)
  await mkdir(logDir, { recursive: true })

  const messages = []
  const toolCalls = []
  const toolResults = []
  const errors = []
  let finalText = ''

  return new Promise((resolve, reject) => {
    const args = [
      join(process.cwd(), 'cli.mjs'),
      '-p',
      '--output-format', 'stream-json',
      prompt
    ]

    if (options.model) args.push('--model', options.model)
    if (options.verbose) args.push('--verbose')
    if (options.debug) args.push('--debug')

    const child = spawn('node', args, {
      cwd: process.cwd(),
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
      const lines = stdout.split('\n')
      stdout = lines.pop() // Keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const message = JSON.parse(line)
          messages.push(message)

          // Extract tool calls
          if (message.type === 'assistant' && Array.isArray(message.message?.content)) {
            for (const block of message.message.content) {
              if (block.type === 'tool_use') {
                toolCalls.push({
                  id: block.id,
                  name: block.name,
                  input: block.input,
                  timestamp: Date.now()
                })
              } else if (block.type === 'text') {
                finalText += block.text
              }
            }
          }

          // Extract tool results
          if (message.type === 'user' && Array.isArray(message.message?.content)) {
            for (const block of message.message.content) {
              if (block.type === 'tool_result') {
                toolResults.push({
                  tool_use_id: block.tool_use_id,
                  content: block.content,
                  is_error: block.is_error,
                  timestamp: Date.now()
                })
                if (block.is_error) {
                  errors.push({
                    tool_use_id: block.tool_use_id,
                    error: block.content
                  })
                }
              }
            }
          }
        } catch (e) {
          // Ignore parse errors for incomplete JSON
        }
      }
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', async (code) => {
      const result = {
        evalId,
        prompt,
        exitCode: code,
        messages,
        toolCalls,
        toolResults,
        errors,
        finalText: finalText.trim(),
        stderr: stderr.trim(),
        timestamp: new Date().toISOString(),
        duration: Date.now() - parseInt(evalId.split('-')[0], 16)
      }

      // Save logs
      await writeFile(
        join(logDir, 'messages.json'),
        JSON.stringify(messages, null, 2)
      )
      await writeFile(
        join(logDir, 'result.json'),
        JSON.stringify(result, null, 2)
      )

      if (code === 0) {
        resolve(result)
      } else {
        result.error = `Process exited with code ${code}`
        reject(result)
      }
    })

    child.on('error', (error) => {
      reject({ evalId, error: error.message })
    })
  })
}
