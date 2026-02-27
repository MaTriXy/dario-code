/**
 * Tasks UI Component for Dario
 *
 * Provides an interactive task selector UI:
 * - Arrow keys to navigate
 * - Enter to view task output
 * - k to kill a running task
 * - Escape to close
 */

import { taskManager, TaskStatus } from './background.mjs'

// Display constants
export const MAX_VISIBLE_TASKS = 7

/**
 * Task status icons and colors
 */
export const TaskStatusDisplay = {
  [TaskStatus.RUNNING]: { icon: '●', color: '#22C55E', label: 'running' },
  [TaskStatus.COMPLETED]: { icon: '✓', color: '#6B7280', label: 'completed' },
  [TaskStatus.FAILED]: { icon: '✗', color: '#EF4444', label: 'failed' },
  [TaskStatus.KILLED]: { icon: '⊘', color: '#F59E0B', label: 'killed' }
}

/**
 * Format task for display
 */
export function formatTaskForDisplay(task) {
  const status = TaskStatusDisplay[task.status] || TaskStatusDisplay[TaskStatus.RUNNING]
  const duration = task.completedAt
    ? formatDuration(task.completedAt - task.startedAt)
    : formatDuration(Date.now() - task.startedAt)

  // Truncate command if too long
  const maxCmdLen = 50
  const cmd = task.command.length > maxCmdLen
    ? task.command.substring(0, maxCmdLen - 3) + '...'
    : task.command

  return {
    id: task.id,
    command: cmd,
    fullCommand: task.command,
    status: task.status,
    statusIcon: status.icon,
    statusColor: status.color,
    statusLabel: status.label,
    duration,
    pid: task.pid,
    exitCode: task.exitCode,
    outputLineCount: task.output.length
  }
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}

/**
 * Get all tasks formatted for display
 */
export function getTasksForDisplay() {
  const tasks = taskManager.listBackgroundTasks()
  return tasks.map(formatTaskForDisplay).sort((a, b) => {
    // Running tasks first, then by start time (newest first)
    if (a.status === TaskStatus.RUNNING && b.status !== TaskStatus.RUNNING) return -1
    if (b.status === TaskStatus.RUNNING && a.status !== TaskStatus.RUNNING) return 1
    return 0
  })
}

/**
 * Task selector state manager
 * Used by the React component to manage selection state
 */
export class TaskSelectorState {
  constructor() {
    this.selectedIndex = 0
    this.viewingTaskId = null
    this.listeners = new Set()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.getState())
    }
  }

  getState() {
    return {
      selectedIndex: this.selectedIndex,
      viewingTaskId: this.viewingTaskId,
      tasks: getTasksForDisplay()
    }
  }

  moveUp() {
    const tasks = getTasksForDisplay()
    if (tasks.length === 0) return
    this.selectedIndex = Math.max(0, this.selectedIndex - 1)
    this.notify()
  }

  moveDown() {
    const tasks = getTasksForDisplay()
    if (tasks.length === 0) return
    this.selectedIndex = Math.min(tasks.length - 1, this.selectedIndex + 1)
    this.notify()
  }

  selectCurrent() {
    const tasks = getTasksForDisplay()
    if (tasks.length === 0) return null
    const task = tasks[this.selectedIndex]
    this.viewingTaskId = task.id
    this.notify()
    return task
  }

  killCurrent() {
    const tasks = getTasksForDisplay()
    if (tasks.length === 0) return false
    const task = tasks[this.selectedIndex]
    if (task.status === TaskStatus.RUNNING) {
      taskManager.killTask(task.id)
      this.notify()
      return true
    }
    return false
  }

  exitTaskView() {
    this.viewingTaskId = null
    this.notify()
  }

  isViewingTask() {
    return this.viewingTaskId !== null
  }

  getViewingTask() {
    if (!this.viewingTaskId) return null
    return taskManager.getTaskStatus(this.viewingTaskId)
  }

  getViewingTaskOutput() {
    if (!this.viewingTaskId) return []
    return taskManager.getTaskOutput(this.viewingTaskId)
  }
}

// Global selector state instance
let globalSelectorState = null

export function getTaskSelectorState() {
  if (!globalSelectorState) {
    globalSelectorState = new TaskSelectorState()
  }
  return globalSelectorState
}

/**
 * Handle key input for task selector
 * Returns: { handled: boolean, action: string | null }
 */
export function handleTaskSelectorKey(key, modifiers) {
  const state = getTaskSelectorState()

  // If viewing a task, escape goes back to list
  if (state.isViewingTask()) {
    if (modifiers.escape || key === 'q') {
      state.exitTaskView()
      return { handled: true, action: 'exit_view' }
    }
    // k kills the task being viewed
    if (key === 'k') {
      const task = state.getViewingTask()
      if (task && task.status === TaskStatus.RUNNING) {
        taskManager.killTask(task.id)
        return { handled: true, action: 'kill' }
      }
    }
    return { handled: false, action: null }
  }

  // List navigation
  if (modifiers.upArrow) {
    state.moveUp()
    return { handled: true, action: 'move_up' }
  }

  if (modifiers.downArrow) {
    state.moveDown()
    return { handled: true, action: 'move_down' }
  }

  if (modifiers.return) {
    const task = state.selectCurrent()
    return { handled: true, action: 'select', task }
  }

  if (key === 'k') {
    const killed = state.killCurrent()
    return { handled: true, action: killed ? 'kill' : 'kill_failed' }
  }

  if (modifiers.escape || key === 'q') {
    return { handled: true, action: 'close' }
  }

  return { handled: false, action: null }
}

/**
 * Render task list as text (for non-React contexts)
 */
export function renderTaskListText() {
  const tasks = getTasksForDisplay()
  const state = getTaskSelectorState()

  if (tasks.length === 0) {
    return 'No background tasks'
  }

  const lines = ['Background Tasks', '─'.repeat(40), '']

  tasks.forEach((task, index) => {
    const selected = index === state.selectedIndex
    const prefix = selected ? '→ ' : '  '
    const status = `${task.statusIcon} ${task.statusLabel}`
    lines.push(`${prefix}${task.command}`)
    lines.push(`    ${status} · ${task.duration} · ${task.outputLineCount} lines`)
    lines.push('')
  })

  lines.push('─'.repeat(40))
  lines.push('↑↓ navigate · enter view · k kill · esc close')

  return lines.join('\n')
}

export default {
  TaskStatus,
  TaskStatusDisplay,
  formatTaskForDisplay,
  getTasksForDisplay,
  TaskSelectorState,
  getTaskSelectorState,
  handleTaskSelectorKey,
  renderTaskListText,
  MAX_VISIBLE_TASKS
}
