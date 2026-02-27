# Background Tasks Module

The background tasks system allows Dario to spawn and manage long-running processes without blocking the main conversation loop. This is useful for:

- Running tests, builds, or deployments in the background
- Monitoring long-running operations
- Managing multiple concurrent tasks
- Retrieving output from background processes

## API Reference

### Core Functions

#### `spawnBackgroundTask(command, options)`

Spawns a new background task and returns immediately.

**Parameters:**
- `command` (string): The shell command to execute
- `options` (object, optional):
  - `cwd` (string): Working directory for the command (default: current process cwd)
  - `env` (object): Environment variables (default: process.env)
  - `shell` (boolean): Use shell for execution (default: true)

**Returns:** Task object

```javascript
const task = globalThis.__dario.tasks.spawn('npm test')
// {
//   id: "task_1764092867935_1",
//   command: "npm test",
//   status: "running",
//   pid: 42054,
//   startedAt: Date,
//   completedAt: null,
//   exitCode: null,
//   output: [],
//   error: null
// }
```

#### `getTaskStatus(taskId)`

Gets the current status of a task.

**Parameters:**
- `taskId` (string): The task ID returned from `spawn()`

**Returns:** Task object or null if not found

```javascript
const status = globalThis.__dario.tasks.getStatus('task_1764092867935_1')
console.log(status.status)  // "running" | "completed" | "failed" | "killed"
console.log(status.exitCode) // 0 for success, non-zero for failure
```

#### `getTaskOutput(taskId, options)`

Retrieves buffered output from a task.

**Parameters:**
- `taskId` (string): The task ID
- `options` (object, optional):
  - `lines` (number): Number of lines to return (-1 for all, default: -1)
  - `offset` (number): Starting line offset (default: 0)

**Returns:** Array of output lines

```javascript
const output = globalThis.__dario.tasks.getOutput('task_1764092867935_1')
output.forEach(line => console.log(line))
// [STDOUT] Hello from task
// [STDERR] Warning message
```

#### `getTaskOutputAsString(taskId, options)`

Retrieves buffered output as a single string.

**Parameters:** Same as `getTaskOutput()`

**Returns:** String with all output lines joined by newlines

```javascript
const fullOutput = globalThis.__dario.tasks.getOutputAsString('task_1764092867935_1')
```

#### `listBackgroundTasks(options)`

Lists all tasks (running and completed).

**Parameters:**
- `options` (object, optional):
  - `status` (string): Filter by status ("running", "completed", "failed", "killed")
  - `includeCompleted` (boolean): Include completed tasks (default: true)

**Returns:** Array of task objects

```javascript
const running = globalThis.__dario.tasks.list({ status: 'running' })
console.log(`${running.length} tasks running`)
```

#### `killTask(taskId)`

Terminates a running task.

**Parameters:**
- `taskId` (string): The task ID

**Returns:** boolean - true if kill was successful, false otherwise

```javascript
const success = globalThis.__dario.tasks.kill('task_1764092867935_1')
if (success) console.log('Task terminated')
```

#### `waitForTask(taskId, timeoutMs)`

Waits for a task to complete.

**Parameters:**
- `taskId` (string): The task ID
- `timeoutMs` (number, optional): Timeout in milliseconds (default: no timeout)

**Returns:** Promise<Task> - Resolves when task completes or rejects on timeout

```javascript
try {
  const completed = await globalThis.__dario.tasks.wait('task_1764092867935_1', 30000)
  console.log(`Task completed with status: ${completed.status}`)
} catch (err) {
  console.error(`Task timeout: ${err.message}`)
}
```

#### `cleanupTasks(maxAgeMs)`

Removes completed tasks older than specified time.

**Parameters:**
- `maxAgeMs` (number, optional): Maximum age in milliseconds (default: 3600000 = 1 hour)

**Returns:** number - Count of tasks removed

```javascript
const removed = globalThis.__dario.tasks.cleanup(1800000)  // 30 minutes
console.log(`Cleaned up ${removed} tasks`)
```

#### `getStatistics()`

Gets statistics about all tasks.

**Returns:** Object with task counts

```javascript
const stats = globalThis.__dario.tasks.getStatistics()
// {
//   total: 5,
//   running: 1,
//   completed: 3,
//   failed: 1,
//   killed: 0,
//   totalOutputLines: 2500
// }
```

#### `clearAll()`

Stops all running processes and clears all tasks.

**Returns:** Promise<void>

```javascript
await globalThis.__dario.tasks.clearAll()
console.log('All tasks cleared')
```

### Status Constants

```javascript
const TaskStatus = globalThis.__dario.tasks.TaskStatus
// {
//   RUNNING: "running",
//   COMPLETED: "completed",
//   FAILED: "failed",
//   KILLED: "killed"
// }
```

## Usage Examples

### Example 1: Running tests in background

```javascript
// Spawn tests without blocking
const testTask = globalThis.__dario.tasks.spawn('npm test -- --watch')
console.log(`Tests running in background (PID: ${testTask.pid})`)

// Continue with other work...

// Later, check test results
const status = globalThis.__dario.tasks.getStatus(testTask.id)
if (status.status === 'completed') {
  const output = globalThis.__dario.tasks.getOutputAsString(testTask.id)
  console.log('Test Results:\n' + output)
}
```

### Example 2: Managing multiple parallel tasks

```javascript
// Spawn multiple builds
const builds = [
  globalThis.__dario.tasks.spawn('npm run build:web'),
  globalThis.__dario.tasks.spawn('npm run build:cli'),
  globalThis.__dario.tasks.spawn('npm run build:mobile')
]

// Wait for all to complete
const completed = await Promise.all(
  builds.map(b => globalThis.__dario.tasks.wait(b.id))
)

// Check results
completed.forEach((task, i) => {
  console.log(`Build ${i + 1}: ${task.status}`)
})
```

### Example 3: Monitoring task output in real-time

```javascript
const task = globalThis.__dario.tasks.spawn('npm test')
let lastLines = 0

// Poll for new output
const monitor = setInterval(() => {
  const output = globalThis.__dario.tasks.getOutput(task.id)
  const newLines = output.slice(lastLines)

  newLines.forEach(line => console.log(line))
  lastLines = output.length

  const status = globalThis.__dario.tasks.getStatus(task.id)
  if (status.status !== 'running') {
    clearInterval(monitor)
    console.log(`Task finished with status: ${status.status}`)
  }
}, 1000)
```

### Example 4: Timeout and cleanup

```javascript
const task = globalThis.__dario.tasks.spawn('long-running-process')

try {
  // Wait up to 5 minutes
  await globalThis.__dario.tasks.wait(task.id, 300000)
} catch (err) {
  // Timeout occurred, kill the task
  console.log('Task timeout, killing...')
  globalThis.__dario.tasks.kill(task.id)
}

// Clean up old tasks periodically
globalThis.__dario.tasks.cleanup(3600000)  // Remove tasks older than 1 hour
```

## Task Data Structure

Each task has the following structure:

```javascript
{
  id: string,                    // Unique task ID (e.g., "task_1764092867935_1")
  command: string,               // The command that was executed
  status: string,                // "running" | "completed" | "failed" | "killed"
  pid: number,                   // Process ID of the spawned process
  startedAt: Date,               // When the task was spawned
  completedAt: Date|null,        // When the task completed (null if running)
  exitCode: number|null,         // Exit code (0 for success, non-zero for failure)
  output: string[],              // Array of output lines
  stdout: string,                // Combined stdout output
  stderr: string,                // Combined stderr output
  error: string|null             // Error message if task failed
}
```

## Output Handling

- **Buffering**: Output is automatically buffered as the task produces it
- **Line-based**: Output is split into individual lines for easier processing
- **Limits**: Maximum 10,000 lines or 5MB per task to prevent memory issues
- **Streams**: Lines are tagged with `[STDOUT]` or `[STDERR]` prefix to indicate the stream

## Performance Considerations

1. **Memory**: Each task buffers output in memory. Use cleanup() to remove old tasks
2. **Process limits**: The system can handle many concurrent tasks, but OS process limits apply
3. **Output retrieval**: Retrieving output is O(lines), so very large outputs may be slow
4. **Polling**: Use waitForTask() instead of polling getStatus() to avoid busy-waiting

## Event System

The task manager emits events that can be listened to:

```javascript
const manager = globalThis.__dario.tasks.manager

manager.on('task-spawn', (taskId, task) => {
  console.log(`Task spawned: ${taskId}`)
})

manager.on('task-complete', (taskId, task) => {
  console.log(`Task completed: ${task.status}`)
})

manager.on('task-killed', (taskId, task) => {
  console.log(`Task killed: ${taskId}`)
})

manager.on('task-output', (taskId, line, stream) => {
  console.log(`[${taskId}] ${stream}: ${line}`)
})
```

## Best Practices

1. **Always wait or cleanup**: Don't spawn tasks and forget about them; use waitForTask() or cleanup()
2. **Check status before getting output**: Verify task status before retrieving output
3. **Handle timeouts**: Use timeout parameter in waitForTask() for long-running tasks
4. **Clean up periodically**: Call cleanup() to remove old completed tasks
5. **Use proper shell commands**: Wrap complex commands in quotes or use shell: true
6. **Monitor resource usage**: Use getStatistics() to monitor task counts and output size

## Integration with Dario

The background tasks system is integrated into Dario's global API:

```javascript
// Via globalThis.__dario.tasks
globalThis.__dario.tasks.spawn(command)
globalThis.__dario.tasks.list()
globalThis.__dario.tasks.getStatus(taskId)
globalThis.__dario.tasks.getOutput(taskId)
globalThis.__dario.tasks.kill(taskId)
globalThis.__dario.tasks.wait(taskId)
globalThis.__dario.tasks.cleanup()
globalThis.__dario.tasks.getStatistics()
globalThis.__dario.tasks.clearAll()

// Direct module import
import { spawnBackgroundTask, getTaskStatus } from './src/tasks/index.mjs'
```

## Troubleshooting

### Task stays in "running" status
- Check if the process actually started (valid command)
- Verify the process is still running with `ps <pid>`
- Long-running processes are normal; use wait() with timeout if needed

### No output captured
- Ensure the command produces output to stdout/stderr
- Some commands may buffer output; use a tool like `script` to force unbuffered output
- Check task status to confirm it completed

### High memory usage
- Call cleanup() more frequently to remove old tasks
- Reduce output buffer size by killing old tasks with kill()
- Clear all tasks with clearAll() if needed

### Process not terminating
- Some processes ignore SIGTERM; may need SIGKILL
- Child processes may not terminate if parent shell doesn't propagate signals
- Consider wrapping in explicit cleanup script
