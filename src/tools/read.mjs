/**
 * Read Tool - Read files from the filesystem
 *
 * This tool allows Claude to read file contents with support for:
 * - Text files with line numbering
 * - Image files (PNG, JPG, GIF, BMP, WEBP)
 * - Pagination via offset and limit
 */

import { z } from 'zod'

// Configuration constants
export const DEFAULT_LINE_LIMIT = 2000
export const MAX_LINE_LENGTH = 2000
export const MAX_FILE_SIZE = 262144 // 256KB
export const MAX_IMAGE_SIZE = 3932160 // ~3.75MB
export const MAX_IMAGE_WIDTH = 2000
export const MAX_IMAGE_HEIGHT = 2000
export const PREVIEW_LINES = 3

// Supported image extensions
export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'])

// Input schema for the Read tool
export const readInputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the file to read'),
  offset: z.number().optional().describe('The line number to start reading from. Only provide if the file is too large to read at once'),
  limit: z.number().optional().describe('The number of lines to read. Only provide if the file is too large to read at once.')
})

// Short description
export const READ_DESCRIPTION = 'Read a file from the local filesystem.'

// Full prompt/documentation
export const READ_PROMPT = `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to ${DEFAULT_LINE_LIMIT} lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- This tool allows reading images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as this is a multimodal LLM interface.
- This tool can read PDF files (.pdf). PDFs are processed page by page, extracting both text and visual content for analysis.
- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs, combining code, text, and visualizations.
- This tool can only read files, not directories. To read a directory, use an ls command via the Bash tool.
- You can call multiple tools in a single response. It is always better to speculatively read multiple potentially useful files in parallel.
- You will regularly be asked to read screenshots. If the user provides a path to a screenshot, ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths.
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.`

/**
 * Format file content with line numbers (cat -n style)
 */
export function formatFileContent(content, startLine = 1) {
  const lines = content.split('\n')
  const maxLineNum = startLine + lines.length - 1
  const lineNumWidth = String(maxLineNum).length

  return lines.map((line, index) => {
    const lineNum = startLine + index
    const paddedLineNum = String(lineNum).padStart(lineNumWidth, ' ')
    // Truncate long lines
    const truncatedLine = line.length > MAX_LINE_LENGTH
      ? line.slice(0, MAX_LINE_LENGTH) + '...'
      : line
    return `${paddedLineNum}\t${truncatedLine}`
  }).join('\n')
}

/**
 * Read file with pagination
 */
export function readFileWithPagination(filePath, offset = 0, limit, fs) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const totalLines = lines.length

  const startIndex = offset
  const endIndex = limit ? Math.min(offset + limit, totalLines) : totalLines
  const selectedLines = lines.slice(startIndex, endIndex)

  return {
    content: formatFileContent(selectedLines.join('\n'), offset + 1),
    lineCount: selectedLines.length,
    totalLines
  }
}

/**
 * Check if path is an image file
 */
export function isImageFile(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

/**
 * Get file size error message
 */
export function getFileSizeError(size) {
  return `File content (${Math.round(size / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_FILE_SIZE / 1024)}KB). Please use offset and limit parameters to read specific portions of the file, or use the GrepTool to search for specific content.`
}

/**
 * Create the Read tool definition
 */
export function createReadTool(dependencies) {
  const {
    fs,
    path,
    getCurrentDir,
    resolvePath,
    fileExists,
    getFileStats,
    findSimilarFile,
    isInAllowedDirectory,
    processImage,
    logError,
    React
  } = dependencies

  return {
    name: 'View', // Internal name
    userFacingName() {
      return 'Read'
    },

    async description() {
      return READ_DESCRIPTION
    },

    async prompt() {
      return READ_PROMPT
    },

    inputSchema: readInputSchema,

    isReadOnly() {
      return true
    },

    async isEnabled() {
      return true
    },

    needsPermissions({ file_path }) {
      // Check if file is in allowed directory
      return !isInAllowedDirectory?.(file_path || getCurrentDir())
    },

    renderToolUseMessage(input, { verbose } = {}) {
      if (!input || !input.file_path) {
        return 'file_path: [undefined]'
      }
      const { file_path, ...rest } = input
      const displayPath = verbose ? file_path : path.relative(getCurrentDir(), file_path)
      return [
        ['file_path', displayPath],
        ...Object.entries(rest)
      ].map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')
    },

    renderToolResultMessage(result, { verbose }) {
      if (!React) return null

      switch (result.type) {
        case 'image':
          return React.createElement('div', null, '  ⎿  Read image')

        case 'text': {
          const { filePath, content, numLines } = result.file
          const displayContent = content || '(No content)'
          const previewContent = verbose
            ? displayContent
            : displayContent.split('\n').slice(0, PREVIEW_LINES).filter(l => l.trim()).join('\n')

          return React.createElement('div', null,
            React.createElement('span', null, '  ⎿  '),
            React.createElement('pre', null, previewContent),
            !verbose && numLines > PREVIEW_LINES &&
              React.createElement('span', { style: { color: 'gray' } },
                `... (+${numLines - PREVIEW_LINES} lines)`)
          )
        }
      }
    },

    renderToolUseRejectedMessage() {
      return React?.createElement?.('span', { style: { color: 'red' } }, 'Read rejected')
    },

    async validateInput({ file_path, offset, limit }) {
      const resolvedPath = resolvePath(file_path)

      if (!fileExists(resolvedPath)) {
        const similar = findSimilarFile?.(resolvedPath)
        let message = 'File does not exist.'
        if (similar) message += ` Did you mean ${similar}?`
        return { result: false, message }
      }

      const stats = getFileStats(resolvedPath)

      // Reject directories
      if (stats.isDirectory()) {
        return { result: false, message: `${file_path} is a directory, not a file. Use the Glob or Bash tool to list directory contents.` }
      }
      const ext = path.extname(resolvedPath).toLowerCase()

      // Allow images without size check
      if (!IMAGE_EXTENSIONS.has(ext)) {
        if (stats.size > MAX_FILE_SIZE && !offset && !limit) {
          return {
            result: false,
            message: getFileSizeError(stats.size),
            meta: { fileSize: stats.size }
          }
        }
      }

      return { result: true }
    },

    async *call({ file_path, offset = 1, limit }, { readFileTimestamps }) {
      const ext = path.extname(file_path).toLowerCase()
      const resolvedPath = resolvePath(file_path)

      // Track file access
      // Use file's actual mtime to avoid race conditions with high-res filesystem timestamps
      const fileStats = getFileStats(resolvedPath)
      readFileTimestamps[resolvedPath] = fileStats ? fileStats.mtimeMs : Date.now()

      // Handle image files
      if (IMAGE_EXTENSIONS.has(ext)) {
        const imageResult = await processImage(resolvedPath, ext)
        yield {
          type: 'result',
          data: imageResult,
          resultForAssistant: this.renderResultForAssistant(imageResult)
        }
        return
      }

      // Handle text files
      const startOffset = offset === 0 ? 0 : offset - 1
      const { content, lineCount, totalLines } = readFileWithPagination(
        resolvedPath,
        startOffset,
        limit,
        fs
      )

      if (!IMAGE_EXTENSIONS.has(ext) && content.length > MAX_FILE_SIZE) {
        throw new Error(getFileSizeError(content.length))
      }

      const result = {
        type: 'text',
        file: {
          filePath: file_path,
          content,
          numLines: lineCount,
          startLine: offset,
          totalLines
        }
      }

      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    },

    renderResultForAssistant(result) {
      switch (result.type) {
        case 'image':
          // processImage already returns a Claude API-ready image block
          // { type: 'image', source: { type: 'base64', data, media_type } }
          return [result]
        case 'text':
          return result.file.content
      }
    }
  }
}

export default createReadTool
