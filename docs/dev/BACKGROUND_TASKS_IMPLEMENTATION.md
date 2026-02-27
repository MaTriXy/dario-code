# Background Task Management Implementation Summary

## Overview

A complete background task management system has been implemented for Dario, enabling long-running commands to execute without blocking the main conversation loop.

## Files Created

### 1. `/src/tasks/background.mjs`
The core background task management module (360+ lines)

**Key Components:**
- `BackgroundTaskManager` class extending EventEmitter
- Task spawning with configurable shell options
- Output buffering with size limits (10,000 lines max, 5MB max)
- Process lifecycle management (spawn, monitor, kill)
- Event emission for task state changes

**Exported Functions:**
- `spawnBackgroundTask(command, options)` - Start a background task
- `getTaskStatus(taskId)` - Get current task state
- `getTaskOutput(taskId, options)` - Retrieve buffered output
- `getTaskOutputAsString(taskId, options)` - Get output as string
- `listBackgroundTasks(options)` - List all tasks with filtering
- `killTask(taskId)` - Terminate a running task
- `waitForTask(taskId, timeoutMs)` - Promise-based task completion
- `cleanupTasks(maxAgeMs)` - Remove old completed tasks
- `getRunningTaskCount()` - Get count of running tasks
- `getStatistics()` - Get task statistics
- `clearAll()` - Stop all processes and clear tasks

**Task Data Structure:**
```javascript
{
  id: "task_timestamp_counter",
  command: "npm test",
  status: "running|completed|failed|killed",
  pid: 12345,
  startedAt: Date,
  completedAt: Date|null,
  exitCode: number|null,
  output: string[],      // Buffered output lines
  stdout: string,        // Combined stdout
  stderr: string,        // Combined stderr
  error: string|null     // Error message if failed
}
```

### 2. `/src/tasks/index.mjs`
Module entry point and public API (27 lines)

**Exports:**
- All functions and constants from background.mjs
- Default export: taskManager singleton instance
- TaskStatus enum

### 3. `/cli.mjs`
Updated main CLI entry point to integrate background tasks

**Additions:**
- Import of all background task functions and constants
- Setup hook for process cleanup on exit
- Export to `globalThis.__dario.tasks` object

**New Global API:**
```javascript
globalThis.__dario.tasks = {
  TaskStatus,           // Enum: RUNNING, COMPLETED, FAILED, KILLED
  manager,              // BackgroundTaskManager instance
  spawn,                // spawnBackgroundTask function
  list,                 // listBackgroundTasks function
  getOutput,            // getTaskOutput function
  getOutputAsString,    // getTaskOutputAsString function
  getStatus,            // getTaskStatus function
  kill,                 // killTask function
  cleanup,              // cleanupTasks function
  wait,                 // waitForTask function
  getRunningCount,      // getRunningTaskCount function
  getStatistics,        // getStatistics function
  clearAll              // clearAll function
}
```

### 4. `/BACKGROUND_TASKS.md`
Comprehensive documentation (350+ lines)

**Contents:**
- Full API reference with examples
- Usage patterns and best practices
- Performance considerations
- Event system documentation
- Troubleshooting guide
- Integration instructions

## Key Features

### 1. Robust Process Management
- Spawn processes with configurable working directories and environment variables
- Support for shell commands and direct executable execution
- Process group handling for proper child process cleanup
- Graceful termination with fallback handling

### 2. Smart Output Buffering
- Line-based buffering with automatic stream tagging (STDOUT/STDERR)
- Configurable limits to prevent memory issues
- Dual output handling (lines array + combined strings)
- Efficient memory management with size-based trimming

### 3. Flexible Task Querying
- Get status of individual tasks
- List all tasks with optional filtering by status
- Retrieve task output with line count and offset options
- Stream-aware output separation (stdout/stderr)

### 4. Promise-Based Wait
- `waitForTask()` for awaiting task completion
- Optional timeout support with proper error handling
- Non-blocking operation for main thread

### 5. Event-Driven Architecture
- Task spawn events
- Task completion/failure events
- Real-time output events
- Cleanup notification events
- Listener pattern for extending functionality

### 6. Statistics and Monitoring
- Get counters for running/completed/failed/killed tasks
- Track total output lines across all tasks
- Running task count for resource monitoring

### 7. Cleanup and Resource Management
- Configurable cleanup of old completed tasks
- Clear all tasks with process termination
- Process cleanup on application exit via hooks

## Testing

All functionality has been tested and verified:

### Test Coverage
✓ Basic command execution and output capture
✓ Multiple concurrent tasks
✓ Task status tracking
✓ Output buffering and retrieval
✓ Task killing with proper error handling
✓ Promise-based waiting with timeouts
✓ Task statistics and monitoring
✓ Cleanup of old tasks
✓ Event emission and handling
✓ Global API integration

### Test Results
```
✓ All functions properly exported
✓ TaskStatus enum accessible
✓ Tasks spawn and complete successfully
✓ Output buffering works
✓ Task listing and filtering works
✓ Statistics tracking works
✓ Promise-based wait works
✓ Cleanup functionality works
✓ Event system works
✓ Global integration ready
```

## Usage Examples

### Spawn a Background Task
```javascript
const task = globalThis.__dario.tasks.spawn('npm test')
console.log(`Task ${task.id} spawned with PID ${task.pid}`)
```

### Wait for Task Completion
```javascript
const completed = await globalThis.__dario.tasks.wait(taskId, 30000)
console.log(`Task finished: ${completed.status}`)
```

### Retrieve Task Output
```javascript
const output = globalThis.__dario.tasks.getOutputAsString(taskId)
console.log('Output:')
console.log(output)
```

### List Running Tasks
```javascript
const running = globalThis.__dario.tasks.list({ status: 'running' })
console.log(`${running.length} tasks currently running`)
```

### Monitor Task Statistics
```javascript
const stats = globalThis.__dario.tasks.getStatistics()
console.log(`Total: ${stats.total}, Running: ${stats.running}`)
```

## Integration Points

The background task system is integrated at multiple levels:

1. **Global API**: Available via `globalThis.__dario.tasks`
2. **Module Import**: Can be imported directly from `src/tasks/index.mjs`
3. **Process Lifecycle**: Hooks into CLI exit handlers for cleanup
4. **Event System**: Can listen to task events via the manager instance

## Architecture Decisions

### Why EventEmitter?
- Allows monitoring without polling
- Extensible for future integrations
- Follows Node.js conventions
- Enables real-time features

### Why Output Buffering?
- Tasks may complete before output is retrieved
- Prevents memory overflow with size limits
- Supports large output with line-based access
- Allows post-completion analysis

### Why Process Groups?
- Ensures child processes are properly cleaned up
- Prevents orphaned processes on system
- Graceful termination with SIGTERM before force kill
- Cross-platform compatibility with fallback

### Why Singleton Pattern?
- Single instance across application lifetime
- Consistent state management
- Simplified API
- Efficient resource usage

## Performance Characteristics

- **Task Spawning**: O(1) - instant
- **Status Check**: O(1) - constant time lookup
- **Output Retrieval**: O(n) where n = lines requested
- **Task Cleanup**: O(k) where k = completed tasks
- **Memory**: Bounded by 5MB per task + configuration limits
- **CPU**: Minimal - event-driven, no polling

## Summary

The background task management system provides a robust, production-ready foundation for managing long-running processes in Dario. It follows Node.js conventions, integrates cleanly with the existing codebase, and provides a comprehensive API for task management, output buffering, and event handling.

All code is syntactically valid, thoroughly tested, and ready for integration into the Dario Code platform.
