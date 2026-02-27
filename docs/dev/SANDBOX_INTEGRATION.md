# Sandbox Integration Guide

This guide explains how to integrate the sandbox module into your Dario tools and extensions.

## Overview

The sandbox module provides command execution sandboxing on macOS using `sandbox-exec`. It's accessible via:

```javascript
globalThis.__dario.sandbox
```

## Integration Steps

### 1. Import the Module

In your tool implementation:

```javascript
import {
  detectEscapeAttempt,
  executeWithSandbox,
  isInAllowlist
} from './src/sandbox/index.mjs'
```

### 2. Check for Escape Attempts

Before executing any command, check for escape patterns:

```javascript
const escape = detectEscapeAttempt(command)
if (escape.detected) {
  return {
    stderr: `Sandbox escape detected: ${escape.message}`,
    code: 1
  }
}
```

### 3. Execute with Sandbox

Use `executeWithSandbox` for safe execution:

```javascript
const result = executeWithSandbox(command, {
  enabled: true,
  projectDir: process.cwd(),
  allowNetwork: true
})
```

### 4. Handle the Result

```javascript
if (result.code !== 0) {
  console.error(result.stderr)
}
console.log(result.stdout)
console.log(`Command ran in sandbox: ${result.sandboxed}`)
```

## Bash Tool Integration Example

Here's how to integrate sandbox into the bash tool:

```javascript
/**
 * Enhanced bash tool with sandbox support
 */
export function createBashToolWithSandbox(dependencies) {
  const {
    executeCommand,
    // ... other dependencies
  } = dependencies

  return {
    name: 'Bash',

    async validateInput({ command }) {
      const sandbox = globalThis.__dario.sandbox

      // Check for escape attempts
      const escape = sandbox.detectEscapeAttempt(command)
      if (escape.detected) {
        return {
          result: false,
          message: `Sandbox escape detected: ${escape.message}`
        }
      }

      return { result: true }
    },

    async *call({ command, timeout = 120000 }, context) {
      const sandbox = globalThis.__dario.sandbox

      // Get sandbox settings
      const settings = sandbox.getSandboxSettings(configLoader)

      // Apply settings
      const options = sandbox.applySandboxSettings(
        { timeout },
        settings
      )

      // Execute with sandbox
      const result = sandbox.executeWithSandbox(command, options)

      yield {
        type: 'result',
        data: {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code
        }
      }
    }
  }
}
```

## Configuration Examples

### Basic Configuration

Store in `~/.dario/settings.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "allowNetwork": true,
    "allowProcessExec": true
  }
}
```

### Restrictive Configuration

For sensitive projects:

```json
{
  "sandbox": {
    "enabled": true,
    "allowNetwork": false,
    "allowProcessExec": false,
    "writePaths": ["/tmp"],
    "denyPaths": [
      "~/.ssh",
      "~/.aws",
      "~/.kube",
      "~/.git-credentials"
    ]
  }
}
```

### Custom Project Configuration

Add to project's `.dario/settings.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "projectDir": "/path/to/project",
    "writePaths": [
      "/tmp",
      "/path/to/project",
      "/path/to/project/dist",
      "/path/to/project/build"
    ],
    "allowNetwork": true
  }
}
```

## Command Allowlisting

For commands that must run unsandboxed (like git), use allowlisting:

```javascript
const unsandboxedCommands = [
  'git',
  'npm',
  'yarn',
  'pnpm',
  /^node/,
  /^npx/
]

function shouldSandbox(command) {
  return !sandbox.isInAllowlist(command, unsandboxedCommands)
}

// Usage
if (shouldSandbox(command)) {
  result = sandbox.executeWithSandbox(command, options)
} else {
  result = executeDirectly(command)
}
```

## API Reference for Integration

### escapeCheck = detectEscapeAttempt(command)

Detect sandbox escape patterns.

```javascript
const escape = sandbox.detectEscapeAttempt('LD_PRELOAD=... bash')
if (escape.detected) {
  console.error('Escape:', escape.message)
}
```

### result = executeWithSandbox(command, options)

Execute command in sandbox (high-level API).

```javascript
const result = sandbox.executeWithSandbox('npm install', {
  enabled: true,
  projectDir: process.cwd(),
  allowNetwork: true
})

console.log('stdout:', result.stdout)
console.log('stderr:', result.stderr)
console.log('code:', result.code)
console.log('sandboxed:', result.sandboxed)  // Was it sandboxed?
console.log('escaped:', result.escaped)      // Escape attempt detected?
```

### settings = getSandboxSettings(configLoader)

Load settings from config.

```javascript
const settings = sandbox.getSandboxSettings({
  loadSettings: () => {
    return JSON.parse(fs.readFileSync(settingsFile))
  }
})
```

### merged = applySandboxSettings(options, settings)

Merge options with base settings.

```javascript
const merged = sandbox.applySandboxSettings(
  { enabled: true },
  { allowNetwork: false }
)
// Result: { enabled: true, allowNetwork: false, ... }
```

### allowed = isInAllowlist(command, allowlist)

Check if command is in allowlist.

```javascript
const allowlist = ['git', 'npm', /^node/]
const allowed = sandbox.isInAllowlist('git status', allowlist)  // true
```

## Security Best Practices

### 1. Always Check Escapes

Never skip escape detection:

```javascript
// BAD
executeWithSandbox(command, options)

// GOOD
if (detectEscapeAttempt(command).detected) {
  throw new Error('Escape attempt')
}
executeWithSandbox(command, options)
```

### 2. Use Explicit Deny Paths

Deny sensitive directories:

```javascript
const options = {
  denyPaths: [
    '~/.ssh',
    '~/.aws',
    '~/.kube',
    '~/.gnupg',
    '~/.netrc'
  ]
}
```

### 3. Minimal Permission Principle

Grant only necessary permissions:

```javascript
// BAD - Too permissive
{ allowNetwork: true, allowProcessExec: true }

// GOOD - Only what's needed
{ allowNetwork: true, allowProcessExec: false }
```

### 4. Validate Allowlist

Review commands in the allowlist carefully:

```javascript
// Commands that should NOT be allowlisted:
// - curl, wget (network)
// - nc, telnet (network)
// - python, perl (arbitrary code execution)
// - sudo (privilege escalation)
// - dd, rm -rf (destructive)

const safeAllowlist = [
  'git',      // Safe SCM
  'npm',      // Package manager
  'node',     // Runtime (if safe)
  'ls',       // Read-only
]
```

### 5. Catch Exceptions

Always handle execution errors:

```javascript
try {
  const result = sandbox.executeWithSandbox(command, options)
  if (result.code !== 0) {
    console.error('Command failed:', result.stderr)
  }
} catch (error) {
  console.error('Execution error:', error.message)
}
```

## Testing Your Integration

### Test Escape Detection

```javascript
const testCases = [
  { cmd: 'ls -la', shouldEscape: false },
  { cmd: 'ptrace -p 123', shouldEscape: true },
  { cmd: 'LD_PRELOAD=/lib/c.so npm', shouldEscape: true },
]

for (const test of testCases) {
  const result = sandbox.detectEscapeAttempt(test.cmd)
  console.assert(result.detected === test.shouldEscape, test.cmd)
}
```

### Test Sandbox Execution

```javascript
// Test that writes are restricted
const result = sandbox.executeWithSandbox(
  'echo test > /root/test.txt',
  { writePaths: ['/tmp'] }
)
console.assert(result.code !== 0, 'Write outside allowed paths should fail')

// Test that reads work
const result2 = sandbox.executeWithSandbox('cat /etc/hosts')
console.assert(result2.code === 0, 'Reading public files should work')
```

### Test Settings Loading

```javascript
const settings = sandbox.getSandboxSettings(configLoader)
console.assert(settings.enabled !== undefined)
console.assert(settings.allowNetwork !== undefined)
```

## Troubleshooting

### Sandbox Not Working

Check if sandboxing is supported:

```javascript
if (!sandbox.isSandboxSupported()) {
  console.log('Sandboxing not available - running unsandboxed')
}
```

### Permission Denied Errors

Ensure write paths are configured:

```javascript
const options = {
  writePaths: [
    '/tmp',
    process.cwd(),  // Add current directory
    '/Users/user/dist'  // Add other needed directories
  ]
}
```

### Network Not Working

Enable network access:

```javascript
const options = {
  allowNetwork: true  // Must be true for curl, npm install, etc.
}
```

### Profile Generation Issues

Check profile path is valid:

```javascript
const profilePath = sandbox.writeSandboxProfile(profile)
console.log('Profile written to:', profilePath)
console.assert(fs.existsSync(profilePath), 'Profile file not created')
```

## Files Modified

1. **cli.mjs** - Added sandbox imports and globalThis exports
2. **src/sandbox/sandbox.mjs** - Core sandbox implementation
3. **src/sandbox/index.mjs** - Module exports

## Next Steps

1. Integrate sandbox into bash tool
2. Add sandbox settings UI to configuration
3. Create per-command sandbox policies
4. Add escape attempt logging and analytics
5. Extend escape pattern detection as needed

## Reference Documentation

- See `SANDBOX_USAGE.md` for complete API documentation
- See `src/sandbox/sandbox.mjs` for implementation details
