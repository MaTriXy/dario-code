/**
 * Skill Tool
 *
 * Execute skills (slash commands) within the conversation.
 * Skills provide specialized capabilities and domain knowledge.
 */

import path from 'path'
import { getLocalCommands, findCommand } from '../cli/commands.mjs'
import { getSkill as getDiscoveredSkill } from './skills-discovery.mjs'

// Tool metadata
export const SKILL_SHORT_DESCRIPTION = "Execute a skill within the conversation."

export const SKILL_PROMPT = `Execute a skill within the main conversation.

When users ask you to perform tasks, check if any of the available skills can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

When users ask you to run a "slash command" or reference "/<something>" (e.g., "/commit", "/review-pr"), they are referring to a skill. Use this tool to invoke the corresponding skill.

Example:
User: "run /commit"
Assistant: [Calls Skill tool with skill: "commit"]

How to invoke:
- Use this tool with the skill name and optional arguments
- Examples:
  - skill: "pdf" - invoke the pdf skill
  - skill: "commit", args: "-m 'Fix bug'" - invoke with arguments
  - skill: "review-pr", args: "123" - invoke with arguments
  - skill: "ms-office-suite:pdf" - invoke using fully qualified name

Important:
- When a skill is relevant, invoke this tool IMMEDIATELY as your first action
- NEVER just announce or mention a skill without actually calling this tool
- Only use skills listed in available skills
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)`

// Input schema
export const skillInputSchema = {
  type: 'object',
  properties: {
    skill: {
      type: 'string',
      description: 'The skill name. E.g., "commit", "review-pr", or "pdf"'
    },
    args: {
      type: 'string',
      description: 'Optional arguments for the skill'
    }
  },
  required: ['skill']
}

/**
 * Find a local command by name
 * @param {string} name - Command name to find
 * @returns {Object|null} Command object or null
 */
function findLocalCommand(name) {
  try {
    const localCommands = getLocalCommands()
    return findCommand(name, localCommands)
  } catch (e) {
    return null
  }
}

/**
 * Create the Skill tool
 */
export function createSkillTool(dependencies = {}) {
  const { skillManager, plugins } = dependencies

  return {
    name: 'Skill',

    description() {
      return SKILL_SHORT_DESCRIPTION
    },

    prompt() {
      return SKILL_PROMPT
    },

    inputSchema: skillInputSchema,

    userFacingName() {
      return 'Run Skill'
    },

    isEnabled() {
      return true
    },

    isReadOnly() {
      return true
    },

    needsPermissions() {
      return false
    },

    /**
     * Render result for assistant
     */
    renderResultForAssistant({ skill, output, error }) {
      if (error) return `Skill error: ${error}`
      return output || `Skill "${skill}" executed successfully.`
    },

    /**
     * Render tool use message
     */
    renderToolUseMessage(input) {
      const args = input.args ? ` with args: ${input.args}` : ''
      return `Launching skill: ${input.skill}${args}`
    },

    /**
     * Validate input
     */
    validateInput({ skill }) {
      if (!skill || typeof skill !== 'string') {
        return { result: false, message: 'skill must be a non-empty string.' }
      }

      if (skill.trim().length === 0) {
        return { result: false, message: 'skill name cannot be empty.' }
      }

      return { result: true }
    },

    /**
     * Execute skill
     */
    async * call({ skill, args }) {
      try {
        // Parse skill name - could be "commit" or "plugin:commit"
        let pluginName = null
        let skillName = skill

        if (skill.includes(':')) {
          const parts = skill.split(':')
          pluginName = parts[0]
          skillName = parts.slice(1).join(':')
        }

        // Look up skill from plugins or skill manager
        let skillDef = null

        if (plugins?.getSkill) {
          skillDef = await plugins.getSkill(skillName, pluginName)
        } else if (skillManager?.getSkill) {
          skillDef = await skillManager.getSkill(skillName)
        }

        // Check .claude/skills/ directory (CC 2.1.x)
        if (!skillDef) {
          const discovered = getDiscoveredSkill(skillName)
          if (discovered) {
            // Prepend the skill's base directory so the agent can resolve any
            // relative paths (e.g. ./rules/subtitles.md) referenced in the skill body.
            // Fix for: https://github.com/jasonkneen/open-claude-code/issues/1
            const skillDir = path.dirname(discovered.path)
            skillDef = {
              content: `Base directory for this skill: ${skillDir}\n\n${discovered.prompt}`,
              allowedTools: discovered.allowedTools,
              context: discovered.context,
            }
          }
        }

        // Fallback to local commands if skill not found in plugins
        if (!skillDef) {
          const localCmd = findLocalCommand(skillName)
          if (localCmd && typeof localCmd.call === 'function') {
            skillDef = {
              execute: async (cmdArgs) => {
                const context = { args: cmdArgs ? cmdArgs.split(/\s+/) : [] }
                return await localCmd.call(() => {}, context)
              }
            }
          }
        }

        if (!skillDef) {
          const result = {
            skill,
            output: '',
            error: `Skill "${skill}" not found. Check available skills with /help.`
          }
          yield {
            type: 'result',
            data: result,
            resultForAssistant: this.renderResultForAssistant(result)
          }
          return
        }

        // Execute the skill
        let output = ''

        if (typeof skillDef === 'function') {
          output = await skillDef(args)
        } else if (skillDef.execute) {
          output = await skillDef.execute(args)
        } else if (skillDef.content) {
          // Skill is just content to inject
          output = typeof skillDef.content === 'function'
            ? await skillDef.content(args)
            : skillDef.content
        } else {
          output = `Skill "${skill}" loaded but has no executable content.`
        }

        const result = {
          skill,
          output: output || `Skill "${skill}" executed.`,
          error: ''
        }

        yield {
          type: 'result',
          data: result,
          resultForAssistant: this.renderResultForAssistant(result)
        }
      } catch (err) {
        const result = {
          skill,
          output: '',
          error: err instanceof Error ? err.message : 'Skill execution failed'
        }
        yield {
          type: 'result',
          data: result,
          resultForAssistant: this.renderResultForAssistant(result)
        }
      }
    }
  }
}

export default createSkillTool
