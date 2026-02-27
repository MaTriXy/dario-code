/**
 * Dario Tools
 *
 * This module exports all available tools for the Claude CLI.
 * Each tool is a factory function that takes dependencies and returns
 * a tool definition compatible with the Messages API.
 */

// Tool creators and schemas
export { createBashTool, BLOCKED_COMMANDS, BASH_PROMPT, bashInputSchema } from './bash.mjs'
export { createReadTool, READ_PROMPT, readInputSchema, IMAGE_EXTENSIONS } from './read.mjs'
export { createEditTool, EDIT_PROMPT, editInputSchema } from './edit.mjs'
export { createWriteTool, WRITE_PROMPT, writeInputSchema } from './write.mjs'
export { createGlobTool, GLOB_PROMPT, globInputSchema } from './glob.mjs'
export { createGrepTool, GREP_PROMPT, grepInputSchema, buildRipgrepArgs } from './grep.mjs'
export { createTaskTool, TASK_PROMPT, taskInputSchema, generateTaskPrompt } from './task.mjs'
export { createTaskCreateTool, createTaskGetTool, createTaskUpdateTool, createTaskListTool, createTodoWriteTool, createTodoReadTool, TODO_WRITE_PROMPT, todoWriteInputSchema, todoReadInputSchema, taskCreateInputSchema, taskGetInputSchema, taskUpdateInputSchema, taskListInputSchema, getTodos, subscribeTodos, clearTodos } from './todo.mjs'
export { createWebFetchTool, WEB_FETCH_PROMPT, webFetchInputSchema, clearCache as clearWebFetchCache } from './webfetch.mjs'
export { createWebSearchTool, WEB_SEARCH_PROMPT, webSearchInputSchema, clearCache as clearWebSearchCache } from './websearch.mjs'
export { createNotebookEditTool, NOTEBOOK_EDIT_PROMPT, NOTEBOOK_EDIT_SHORT_DESCRIPTION, notebookEditInputSchema } from './notebook.mjs'
export { createAskUserQuestionTool, ASK_USER_PROMPT, ASK_USER_SHORT_DESCRIPTION, askUserInputSchema } from './askuser.mjs'
export { createLspTool, LSP_PROMPT, LSP_SHORT_DESCRIPTION, lspInputSchema, LSP_OPERATIONS } from './lsp.mjs'
export { createEnterPlanModeTool, createExitPlanModeTool, ENTER_PLAN_PROMPT, EXIT_PLAN_PROMPT, ENTER_PLAN_SHORT_DESCRIPTION, EXIT_PLAN_SHORT_DESCRIPTION, enterPlanInputSchema, exitPlanInputSchema } from './planmode.mjs'
export { createSkillTool, SKILL_PROMPT, SKILL_SHORT_DESCRIPTION, skillInputSchema } from './skill.mjs'
export { createMultiEditTool, MULTI_EDIT_PROMPT, MULTI_EDIT_SHORT_DESCRIPTION, multiEditInputSchema } from './multiedit.mjs'

// Import all tool creators
import { createBashTool } from './bash.mjs'
import { createReadTool } from './read.mjs'
import { createEditTool } from './edit.mjs'
import { createWriteTool } from './write.mjs'
import { createGlobTool } from './glob.mjs'
import { createGrepTool } from './grep.mjs'
import { createTaskTool } from './task.mjs'
import { createTaskCreateTool, createTaskGetTool, createTaskUpdateTool, createTaskListTool, createTodoWriteTool, createTodoReadTool } from './todo.mjs'
import { createWebFetchTool } from './webfetch.mjs'
import { createWebSearchTool } from './websearch.mjs'
import { createNotebookEditTool } from './notebook.mjs'
import { createAskUserQuestionTool } from './askuser.mjs'
import { createLspTool } from './lsp.mjs'
import { createEnterPlanModeTool, createExitPlanModeTool } from './planmode.mjs'
import { createSkillTool } from './skill.mjs'
import { createMultiEditTool } from './multiedit.mjs'

/**
 * Create all tools with the given dependencies
 *
 * @param {Object} dependencies - Shared dependencies for all tools
 * @param {Object} dependencies.fs - File system module
 * @param {Object} dependencies.path - Path module
 * @param {Object} dependencies.os - OS module
 * @param {Function} dependencies.getCurrentDir - Get current working directory
 * @param {Function} dependencies.getOriginalDir - Get original working directory
 * @param {Function} dependencies.resolvePath - Resolve a path
 * @param {Function} dependencies.isAbsolutePath - Check if path is absolute
 * @param {Function} dependencies.fileExists - Check if file exists
 * @param {Function} dependencies.getFileStats - Get file stats
 * @param {Function} dependencies.findSimilarFile - Find similar file path
 * @param {Function} dependencies.isInAllowedDirectory - Check if path is allowed
 * @param {Function} dependencies.detectEncoding - Detect file encoding
 * @param {Function} dependencies.detectLineEnding - Detect line ending style
 * @param {Function} dependencies.normalizeLineEndings - Normalize line endings
 * @param {Function} dependencies.writeFile - Write file with encoding/line endings
 * @param {Function} dependencies.executeCommand - Execute shell command
 * @param {Function} dependencies.globFiles - Glob for files
 * @param {Function} dependencies.runRipgrep - Run ripgrep search
 * @param {Function} dependencies.processImage - Process image for reading
 * @param {Function} dependencies.logError - Log errors
 * @param {Function} dependencies.logEvent - Log events
 * @param {Object} dependencies.React - React for rendering (optional)
 */
export function createAllTools(dependencies) {
  return {
    Bash: createBashTool(dependencies),
    Read: createReadTool(dependencies),
    Edit: createEditTool(dependencies),
    Write: createWriteTool(dependencies),
    Glob: createGlobTool(dependencies),
    Grep: createGrepTool(dependencies),
    Task: createTaskTool(dependencies),
    TaskCreate: createTaskCreateTool(dependencies),
    TaskGet: createTaskGetTool(dependencies),
    TaskUpdate: createTaskUpdateTool(dependencies),
    TaskList: createTaskListTool(dependencies),
    WebFetch: createWebFetchTool(dependencies),
    WebSearch: createWebSearchTool(dependencies),
    NotebookEdit: createNotebookEditTool(dependencies),
    AskUserQuestion: createAskUserQuestionTool(dependencies),
    LSP: createLspTool(dependencies),
    EnterPlanMode: createEnterPlanModeTool(dependencies),
    ExitPlanMode: createExitPlanModeTool(dependencies),
    Skill: createSkillTool(dependencies),
    MultiEdit: createMultiEditTool(dependencies)
  }
}

/**
 * Tool names for reference
 */
export const TOOL_NAMES = {
  // Core tools
  BASH: 'Bash',
  READ: 'Read',
  EDIT: 'Edit',
  WRITE: 'Write',
  GLOB: 'Glob',
  GREP: 'Grep',
  TASK: 'Task',

  // Task management
  TASK_CREATE: 'TaskCreate',
  TASK_GET: 'TaskGet',
  TASK_UPDATE: 'TaskUpdate',
  TASK_LIST: 'TaskList',
  TODO_WRITE: 'TodoWrite',
  TODO_READ: 'TodoRead',

  // Web tools
  WEB_FETCH: 'WebFetch',
  WEB_SEARCH: 'WebSearch',

  // Notebook tools
  NOTEBOOK_EDIT: 'NotebookEdit',

  // User interaction
  ASK_USER: 'AskUserQuestion',

  // Code intelligence
  LSP: 'LSP',

  // Plan mode
  ENTER_PLAN: 'EnterPlanMode',
  EXIT_PLAN: 'ExitPlanMode',

  // Skills and commands
  SKILL: 'Skill',

  // Multi-file operations
  MULTI_EDIT: 'MultiEdit'
}

/**
 * Tool categories for organization
 */
export const TOOL_CATEGORIES = {
  FILE_OPERATIONS: ['Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'MultiEdit'],
  AGENTS: ['Task'],
  TASK_MANAGEMENT: ['TaskCreate', 'TaskGet', 'TaskUpdate', 'TaskList', 'TodoWrite', 'TodoRead'],
  WEB: ['WebFetch', 'WebSearch'],
  UI: ['AskUserQuestion'],
  NOTEBOOKS: ['NotebookEdit'],
  COMMANDS: ['Skill'],
  PLANNING: ['EnterPlanMode', 'ExitPlanMode'],
  CODE_INTELLIGENCE: ['LSP']
}

/**
 * Get tool definitions for the API
 * Returns simplified tool schemas for the API
 */
export function getTools() {
  return [
    {
      name: 'Bash',
      description: 'Execute a bash command in the terminal. Use for git, npm, build commands, and process management. Do NOT use for file reading (use Read), searching (use Grep/Glob), or file editing (use Edit).',
      input_schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to execute' },
          timeout: { type: 'number', description: 'Optional timeout in milliseconds (max 600000)' },
          description: { type: 'string', description: 'Clear, concise description of what this command does' },
          run_in_background: { type: 'boolean', description: 'Set to true to run in background' }
        },
        required: ['command']
      }
    },
    {
      name: 'Read',
      description: 'Read a file from the filesystem. Supports text files, images, PDFs, and Jupyter notebooks.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Absolute path to the file to read' },
          offset: { type: 'number', description: 'Line number to start reading from' },
          limit: { type: 'number', description: 'Number of lines to read' },
          pages: { type: 'string', description: 'Page range for PDF files (e.g., "1-5")' }
        },
        required: ['file_path']
      }
    },
    {
      name: 'Edit',
      description: 'Edit a file by performing exact string replacement. You must Read a file before editing it.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Absolute path to the file to modify' },
          old_string: { type: 'string', description: 'The exact text to replace (must be unique in the file)' },
          new_string: { type: 'string', description: 'The replacement text' },
          replace_all: { type: 'boolean', description: 'Replace all occurrences (default false)', default: false }
        },
        required: ['file_path', 'old_string', 'new_string']
      }
    },
    {
      name: 'MultiEdit',
      description: 'Perform multiple edits to a file in a single operation. Each edit is an exact string replacement.',
      input_schema: {
        type: 'object',
        properties: {
          edits: {
            type: 'array',
            description: 'Array of edits to apply',
            items: {
              type: 'object',
              properties: {
                file_path: { type: 'string', description: 'Path to the file' },
                old_string: { type: 'string', description: 'Text to replace' },
                new_string: { type: 'string', description: 'Replacement text' }
              },
              required: ['file_path', 'old_string', 'new_string']
            }
          }
        },
        required: ['edits']
      }
    },
    {
      name: 'Write',
      description: 'Write content to a file, overwriting if it exists. You must Read existing files before writing.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Absolute path to the file to write' },
          content: { type: 'string', description: 'Content to write to the file' }
        },
        required: ['file_path', 'content']
      }
    },
    {
      name: 'Glob',
      description: 'Fast file pattern matching. Returns matching file paths sorted by modification time.',
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern to match (e.g., "**/*.js", "src/**/*.ts")' },
          path: { type: 'string', description: 'Directory to search in (defaults to cwd)' }
        },
        required: ['pattern']
      }
    },
    {
      name: 'Grep',
      description: 'Search file contents using ripgrep. Supports regex, file type filters, and multiple output modes.',
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search for' },
          path: { type: 'string', description: 'File or directory to search in' },
          glob: { type: 'string', description: 'Glob pattern to filter files (e.g., "*.js")' },
          type: { type: 'string', description: 'File type filter (e.g., "js", "py", "rust")' },
          output_mode: { type: 'string', enum: ['content', 'files_with_matches', 'count'], description: 'Output mode (default: files_with_matches)' },
          '-i': { type: 'boolean', description: 'Case insensitive search' },
          '-n': { type: 'boolean', description: 'Show line numbers (default true for content mode)' },
          '-A': { type: 'number', description: 'Lines to show after each match' },
          '-B': { type: 'number', description: 'Lines to show before each match' },
          '-C': { type: 'number', description: 'Context lines before and after each match' },
          context: { type: 'number', description: 'Alias for -C' },
          head_limit: { type: 'number', description: 'Limit output to first N entries' },
          offset: { type: 'number', description: 'Skip first N entries' },
          multiline: { type: 'boolean', description: 'Enable multiline matching' }
        },
        required: ['pattern']
      }
    },
    {
      name: 'Task',
      description: 'Launch a new agent to handle complex, multi-step tasks autonomously.',
      input_schema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The task for the agent to perform' },
          description: { type: 'string', description: 'Short description of the task (3-5 words)' },
          subagent_type: { type: 'string', description: 'Agent type: "Explore" (read-only, fast), "Plan" (architecture), "general-purpose" (full tools)' },
          model: { type: 'string', enum: ['sonnet', 'opus', 'haiku'], description: 'Model to use (optional)' },
          run_in_background: { type: 'boolean', description: 'Run agent in background' }
        },
        required: ['prompt']
      }
    },
    {
      name: 'TaskCreate',
      description: 'Create a new task in the task list for tracking progress.',
      input_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Brief title for the task' },
          description: { type: 'string', description: 'Detailed description of what needs to be done' },
          activeForm: { type: 'string', description: 'Present continuous form shown when in_progress (e.g., "Running tests")' }
        },
        required: ['subject', 'description']
      }
    },
    {
      name: 'TaskGet',
      description: 'Retrieve a task by ID with full details.',
      input_schema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The ID of the task to retrieve' }
        },
        required: ['taskId']
      }
    },
    {
      name: 'TaskUpdate',
      description: 'Update a task status, subject, description, or dependencies.',
      input_schema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The ID of the task to update' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'deleted'], description: 'New status' },
          subject: { type: 'string', description: 'New subject' },
          description: { type: 'string', description: 'New description' },
          activeForm: { type: 'string', description: 'Present continuous form for spinner' },
          owner: { type: 'string', description: 'Task owner (agent name)' },
          addBlocks: { type: 'array', items: { type: 'string' }, description: 'Task IDs this task blocks' },
          addBlockedBy: { type: 'array', items: { type: 'string' }, description: 'Task IDs that block this task' }
        },
        required: ['taskId']
      }
    },
    {
      name: 'TaskList',
      description: 'List all tasks with summary (id, subject, status, owner, blockedBy).',
      input_schema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'WebFetch',
      description: 'Fetch content from a URL and process it. Returns processed/summarized content.',
      input_schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to fetch content from' },
          prompt: { type: 'string', description: 'What information to extract from the page' }
        },
        required: ['url', 'prompt']
      }
    },
    {
      name: 'WebSearch',
      description: 'Search the web for current information. Returns structured results with URLs.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          allowed_domains: { type: 'array', items: { type: 'string' }, description: 'Only include results from these domains' },
          blocked_domains: { type: 'array', items: { type: 'string' }, description: 'Exclude results from these domains' }
        },
        required: ['query']
      }
    },
    {
      name: 'NotebookEdit',
      description: 'Edit Jupyter notebook cells. Supports replace, insert, and delete operations.',
      input_schema: {
        type: 'object',
        properties: {
          notebook_path: { type: 'string', description: 'Absolute path to the notebook file' },
          cell_id: { type: 'string', description: 'The ID of the cell to edit' },
          new_source: { type: 'string', description: 'New source content for the cell' },
          cell_type: { type: 'string', enum: ['code', 'markdown'], description: 'Cell type' },
          edit_mode: { type: 'string', enum: ['replace', 'insert', 'delete'], description: 'Edit mode (default: replace)' }
        },
        required: ['notebook_path', 'new_source']
      }
    },
    {
      name: 'AskUserQuestion',
      description: 'Ask the user a question with predefined options to gather preferences or clarify instructions.',
      input_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            description: 'Questions to ask (1-4)',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'The question to ask' },
                header: { type: 'string', description: 'Short label (max 12 chars)' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      description: { type: 'string' }
                    },
                    required: ['label', 'description']
                  }
                },
                multiSelect: { type: 'boolean', description: 'Allow multiple selections', default: false }
              },
              required: ['question', 'header', 'options', 'multiSelect']
            }
          }
        },
        required: ['questions']
      }
    },
    {
      name: 'EnterPlanMode',
      description: 'Enter plan mode to explore the codebase and design an implementation approach before writing code.',
      input_schema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'ExitPlanMode',
      description: 'Exit plan mode after writing a plan, requesting user approval before implementation.',
      input_schema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'Skill',
      description: 'Execute a skill/slash command within the conversation.',
      input_schema: {
        type: 'object',
        properties: {
          skill: { type: 'string', description: 'The skill name (e.g., "commit", "review-pr")' },
          args: { type: 'string', description: 'Optional arguments for the skill' }
        },
        required: ['skill']
      }
    }
  ]
}

// Re-export executor functions
export { executeToolUse, hasPermissionsToUseTool, getApprovedTools, approveToolUse, revokeToolApproval, createInteractivePermissionHandler } from './executor.mjs'

/**
 * Alias for getTools (matches bootstrap API)
 */
export function getAllTools() {
  return getTools()
}

export default createAllTools
