# Background Tasks Quick Start

## Quick Overview

The background tasks system lets you run long-running commands without blocking the main conversation. Tasks run as separate processes, their output is captured, and you can check status, get results, or terminate them anytime.

## Getting Started

### Spawning a Task

```javascript
const task = globalThis.__dario.tasks.spawn('npm test')
console.log(`Task ${task.id} spawned`)
```

### Checking Task Status

```javascript
const status = globalThis.__dario.tasks.getStatus(task.id)
console.log(`Status: ${status.status}`)      // "running", "completed", "failed", "killed"
console.log(`PID: ${status.pid}`)
console.log(`Exit code: ${status.exitCode}`) // 0 = success
```

### Getting Task Output

```javascript
// As array of lines
const lines = globalThis.__dario.tasks.getOutput(task.id)
lines.forEach(line => console.log(line))

// As single string
const output = globalThis.__dario.tasks.getOutputAsString(task.id)
console.log(output)
```

### Waiting for Completion

```javascript
// Wait up to 30 seconds for task to finish
const completed = await globalThis.__dario.tasks.wait(task.id, 30000)
console.log(`Task completed: ${completed.status}`)
console.log(`Exit code: ${completed.exitCode}`)
```

### Listing Tasks

```javascript
// All tasks
const all = globalThis.__dario.tasks.list()

// Only running tasks
const running = globalThis.__dario.tasks.list({ status: 'running' })

// Only completed tasks
const completed = globalThis.__dario.tasks.list({ status: 'completed' })
```

### Killing a Task

```javascript
const success = globalThis.__dario.tasks.kill(task.id)
console.log(success ? 'Task terminated' : 'Kill failed')
```

### Getting Statistics

```javascript
const stats = globalThis.__dario.tasks.getStatistics()
console.log(`Running: ${stats.running}`)
console.log(`Completed: ${stats.completed}`)
console.log(`Failed: ${stats.failed}`)
console.log(`Total output lines: ${stats.totalOutputLines}`)
```

### Cleanup Old Tasks

```javascript
// Remove tasks older than 1 hour
const removed = globalThis.__dario.tasks.cleanup(3600000)
console.log(`Cleaned up ${removed} tasks`)

// Remove all completed tasks
const removed = globalThis.__dario.tasks.cleanup(0)
```

## Common Patterns

### Pattern 1: Fire and Forget (with periodic checks)

```javascript
const task = globalThis.__dario.tasks.spawn('npm run build')

// Check status periodically
setInterval(() => {
  const status = globalThis.__dario.tasks.getStatus(task.id)
  console.log(`Build status: ${status.status}`)

  if (status.status !== 'running') {
    console.log('Build finished!')
    clearInterval(interval)
  }
}, 5000)
```

### Pattern 2: Wait for Result

```javascript
try {
  const task = globalThis.__dario.tasks.spawn('npm test')
  const completed = await globalThis.__dario.tasks.wait(task.id, 60000)

  const output = globalThis.__dario.tasks.getOutputAsString(task.id)
  console.log('Test output:')
  console.log(output)
} catch (err) {
  console.log('Task timed out or failed')
}
```

### Pattern 3: Monitor Multiple Tasks

```javascript
const tasks = [
  globalThis.__dario.tasks.spawn('npm run build:web'),
  globalThis.__dario.tasks.spawn('npm run build:cli'),
  globalThis.__dario.tasks.spawn('npm run test')
]

// Wait for all
const results = await Promise.all(
  tasks.map(t => globalThis.__dario.tasks.wait(t.id))
)

// Check results
results.forEach((task, i) => {
  console.log(`Task ${i + 1}: ${task.status}`)
})
```

### Pattern 4: Real-time Output Streaming

```javascript
const task = globalThis.__dario.tasks.spawn('npm test')
let lastIndex = 0

const watcher = setInterval(() => {
  const output = globalThis.__dario.tasks.getOutput(task.id)
  const newLines = output.slice(lastIndex)

  // Print new lines
  newLines.forEach(line => console.log(line))
  lastIndex = output.length

  // Stop when done
  const status = globalThis.__dario.tasks.getStatus(task.id)
  if (status.status !== 'running') {
    clearInterval(watcher)
  }
}, 1000)
```

### Pattern 5: Timeout with Cleanup

```javascript
const task = globalThis.__dario.tasks.spawn('long-running-command')

try {
  await globalThis.__dario.tasks.wait(task.id, 300000) // 5 minutes
} catch (err) {
  // Timeout
  console.log('Command timeout, killing...')
  globalThis.__dario.tasks.kill(task.id)
}

// Clean up old tasks
globalThis.__dario.tasks.cleanup(3600000)
```

## Task Statuses

```javascript
const TaskStatus = globalThis.__dario.tasks.TaskStatus

// TaskStatus.RUNNING    - Task is currently running
// TaskStatus.COMPLETED  - Task finished successfully (exit code 0)
// TaskStatus.FAILED     - Task failed (non-zero exit code)
// TaskStatus.KILLED     - Task was terminated by kill()
```

## Task Data Structure

Each task object contains:

```javascript
{
  id: "task_1764092867935_1",  // Unique ID
  command: "npm test",          // Command that ran
  status: "running",            // Current status
  pid: 42054,                   // Process ID
  startedAt: Date,              // When spawned
  completedAt: null,            // When finished (null if running)
  exitCode: null,               // Exit code (null if running)
  output: [],                   // Array of output lines
  stdout: "",                   // Combined stdout
  stderr: "",                   // Combined stderr
  error: null                   // Error message if failed
}
```

## API Reference

### `spawn(command, options)`
Start a background task
- Returns: Task object

### `wait(taskId, timeoutMs)`
Wait for task completion
- Returns: Promise<Task>

### `getStatus(taskId)`
Get current task status
- Returns: Task object or null

### `getOutput(taskId, options)`
Get output lines
- Returns: Array of strings

### `getOutputAsString(taskId, options)`
Get output as single string
- Returns: String

### `list(options)`
List tasks
- Returns: Array of Task objects

### `kill(taskId)`
Terminate a running task
- Returns: Boolean (success/failure)

### `cleanup(maxAgeMs)`
Remove old completed tasks
- Returns: Number of tasks removed

### `getStatistics()`
Get task counts
- Returns: Statistics object

### `getRunningCount()`
Get number of running tasks
- Returns: Number

### `clearAll()`
Stop all tasks and clear
- Returns: Promise

## Tips and Tricks

### Parallel Task Management

```javascript
// Spawn multiple tasks in parallel
const [task1, task2, task3] = [
  globalThis.__dario.tasks.spawn('npm run build:web'),
  globalThis.__dario.tasks.spawn('npm run build:cli'),
  globalThis.__dario.tasks.spawn('npm run build:mobile')
]

// Wait for all in parallel
await Promise.all([
  globalThis.__dario.tasks.wait(task1.id),
  globalThis.__dario.tasks.wait(task2.id),
  globalThis.__dario.tasks.wait(task3.id)
])
```

### Conditional Execution

```javascript
const task = globalThis.__dario.tasks.spawn('npm test')
const result = await globalThis.__dario.tasks.wait(task.id, 60000)

if (result.status === 'completed' && result.exitCode === 0) {
  console.log('Tests passed, proceeding with build...')
  const buildTask = globalThis.__dario.tasks.spawn('npm run build')
  // ...
}
```

### Output Filtering

```javascript
const task = globalThis.__dario.tasks.spawn('npm test -- --reporter=json')
const output = globalThis.__dario.tasks.getOutputAsString(task.id)

// Find test results in output
const lines = output.split('\n')
const results = lines.filter(line => line.includes('FAIL') || line.includes('PASS'))
results.forEach(r => console.log(r))
```

### Automatic Cleanup

```javascript
// Every 10 minutes, cleanup tasks older than 1 hour
setInterval(() => {
  const removed = globalThis.__dario.tasks.cleanup(3600000)
  if (removed > 0) {
    console.log(`Cleaned up ${removed} old tasks`)
  }
}, 600000)
```

## Limitations

- Maximum 10,000 output lines per task
- Maximum 5MB output per task
- Output is buffered in memory (not persisted)
- Task IDs are not persistent across sessions

## Examples

See `examples/background-tasks.mjs` for complete working examples of all features.

Run examples with:
```bash
node examples/background-tasks.mjs
```

## More Information

For complete API documentation, see `BACKGROUND_TASKS.md`
