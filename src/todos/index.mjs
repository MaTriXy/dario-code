/**
 * Todo List Module for Dario
 *
 * Provides todo list functionality for tracking tasks during a session.
 * The AI can write/update todos, and users can view them in the UI.
 */

import { EventEmitter } from 'events'

/**
 * Todo status enumeration
 */
export const TodoStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
}

/**
 * Todo manager class - manages all todos for the session
 */
class TodoManager extends EventEmitter {
  constructor() {
    super()
    this.todos = []
    this.todoCounter = 0
  }

  /**
   * Generate a unique todo ID
   */
  generateTodoId() {
    return `todo_${Date.now()}_${++this.todoCounter}`
  }

  /**
   * Add a new todo item
   *
   * @param {Object} todo - Todo item
   * @param {string} todo.content - Todo description (imperative form)
   * @param {string} todo.activeForm - Present continuous form for display
   * @param {string} todo.status - Todo status (pending, in_progress, completed)
   * @returns {Object} Created todo item with ID
   */
  addTodo(todo) {
    const newTodo = {
      id: this.generateTodoId(),
      content: todo.content,
      activeForm: todo.activeForm || todo.content,
      status: todo.status || TodoStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.todos.push(newTodo)
    this.emit('todo-added', newTodo)
    this.emit('todos-changed', this.todos)
    return newTodo
  }

  /**
   * Update an existing todo
   *
   * @param {string} id - Todo ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated todo or null if not found
   */
  updateTodo(id, updates) {
    const index = this.todos.findIndex(t => t.id === id)
    if (index === -1) return null

    this.todos[index] = {
      ...this.todos[index],
      ...updates,
      updatedAt: new Date()
    }

    this.emit('todo-updated', this.todos[index])
    this.emit('todos-changed', this.todos)
    return this.todos[index]
  }

  /**
   * Remove a todo
   *
   * @param {string} id - Todo ID
   * @returns {boolean} True if removed
   */
  removeTodo(id) {
    const index = this.todos.findIndex(t => t.id === id)
    if (index === -1) return false

    const removed = this.todos.splice(index, 1)[0]
    this.emit('todo-removed', removed)
    this.emit('todos-changed', this.todos)
    return true
  }

  /**
   * Set the entire todo list (replaces all todos)
   *
   * @param {Array} todos - Array of todo objects
   * @returns {Array} The new todo list
   */
  setTodos(todos) {
    this.todos = todos.map((todo, index) => ({
      id: todo.id || this.generateTodoId(),
      content: todo.content,
      activeForm: todo.activeForm || todo.content,
      status: todo.status || TodoStatus.PENDING,
      createdAt: todo.createdAt || new Date(),
      updatedAt: new Date()
    }))

    this.emit('todos-changed', this.todos)
    return this.todos
  }

  /**
   * Get all todos
   *
   * @param {Object} options - Filter options
   * @param {string} options.status - Filter by status
   * @returns {Array} Array of todo objects
   */
  getTodos(options = {}) {
    const { status = null } = options
    if (status) {
      return this.todos.filter(t => t.status === status)
    }
    return [...this.todos]
  }

  /**
   * Get a specific todo by ID
   *
   * @param {string} id - Todo ID
   * @returns {Object|null} Todo object or null
   */
  getTodo(id) {
    return this.todos.find(t => t.id === id) || null
  }

  /**
   * Update todo status
   *
   * @param {string} id - Todo ID
   * @param {string} status - New status
   * @returns {Object|null} Updated todo or null
   */
  setTodoStatus(id, status) {
    return this.updateTodo(id, { status })
  }

  /**
   * Mark a todo as in progress
   *
   * @param {string} id - Todo ID
   * @returns {Object|null} Updated todo or null
   */
  startTodo(id) {
    return this.setTodoStatus(id, TodoStatus.IN_PROGRESS)
  }

  /**
   * Mark a todo as completed
   *
   * @param {string} id - Todo ID
   * @returns {Object|null} Updated todo or null
   */
  completeTodo(id) {
    return this.setTodoStatus(id, TodoStatus.COMPLETED)
  }

  /**
   * Get statistics about todos
   */
  getStatistics() {
    return {
      total: this.todos.length,
      pending: this.todos.filter(t => t.status === TodoStatus.PENDING).length,
      inProgress: this.todos.filter(t => t.status === TodoStatus.IN_PROGRESS).length,
      completed: this.todos.filter(t => t.status === TodoStatus.COMPLETED).length
    }
  }

  /**
   * Clear all todos
   */
  clear() {
    this.todos = []
    this.emit('todos-changed', this.todos)
  }

  /**
   * Get the currently active (in_progress) todo
   *
   * @returns {Object|null} The in-progress todo or null
   */
  getActiveTodo() {
    return this.todos.find(t => t.status === TodoStatus.IN_PROGRESS) || null
  }
}

// Export singleton instance
export const todoManager = new TodoManager()

/**
 * Convenience functions for module-level API
 */

export function addTodo(todo) {
  return todoManager.addTodo(todo)
}

export function updateTodo(id, updates) {
  return todoManager.updateTodo(id, updates)
}

export function removeTodo(id) {
  return todoManager.removeTodo(id)
}

export function setTodos(todos) {
  return todoManager.setTodos(todos)
}

export function getTodos(options = {}) {
  return todoManager.getTodos(options)
}

export function getTodo(id) {
  return todoManager.getTodo(id)
}

export function setTodoStatus(id, status) {
  return todoManager.setTodoStatus(id, status)
}

export function startTodo(id) {
  return todoManager.startTodo(id)
}

export function completeTodo(id) {
  return todoManager.completeTodo(id)
}

export function getStatistics() {
  return todoManager.getStatistics()
}

export function clearTodos() {
  return todoManager.clear()
}

export function getActiveTodo() {
  return todoManager.getActiveTodo()
}

export default todoManager
