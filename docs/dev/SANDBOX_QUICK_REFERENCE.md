# Sandbox Module Quick Reference

## Quick Start

### Access the Module
```javascript
const sandbox = globalThis.__dario.sandbox
```

### Check Escape Attempts
```javascript
if (sandbox.detectEscapeAttempt(command).detected) {
  throw new Error('Escape attempt detected')
}
```

### Execute with Sandbox
```javascript
const result = sandbox.executeWithSandbox('npm install', {
  enabled: true,
  projectDir: process.cwd()
})

console.log(result.stdout)      // Command output
console.log(result.stderr)      // Error output
console.log(result.code)        // Exit code
console.log(result.sandboxed)   // Was it sandboxed?
console.log(result.escaped)     // Escape attempt detected?
```

## Common Tasks

### Detect Sandbox Escape
```javascript
const escape = sandbox.detectEscapeAttempt('LD_PRELOAD=... bash')
if (escape.detected) {
  console.error(escape.message)
}
```

### Create Custom Profile
```javascript
const profile = sandbox.createSandboxProfile({
  projectDir: '/Users/user/project',
  allowNetwork: false,
  writePaths: ['/tmp']
})
```

### Check Allowlist
```javascript
const allowlist = ['git', 'npm', /^node/]
if (sandbox.isInAllowlist('git status', allowlist)) {
  // Command is allowed unsandboxed
}
```

### Load Settings from Config
```javascript
const settings = sandbox.getSandboxSettings(configLoader)
const result = sandbox.executeWithSandbox(cmd, settings)
```

### Merge Settings
```javascript
const merged = sandbox.applySandboxSettings(
  { enabled: true },
  { allowNetwork: false }
)
// Result: { enabled: true, allowNetwork: false, ... }
```

## API Summary

| Function | Purpose | Returns |
|----------|---------|---------|
| `isSandboxSupported()` | Check macOS support | boolean |
| `detectEscapeAttempt(cmd)` | Find escape patterns | {detected, pattern, message} |
| `createSandboxProfile(opts)` | Generate profile | string |
| `writeSandboxProfile(profile)` | Save to temp file | string (path) |
| `deleteSandboxProfile(path)` | Clean up file | void |
| `wrapCommand(cmd, path)` | Add sandbox prefix | string |
| `executeWithSandbox(cmd, opts)` | Run sandboxed | {stdout, stderr, code, sandboxed, escaped} |
| `getSandboxSettings(loader)` | Load from config | object |
| `applySandboxSettings(opts, settings)` | Merge config | object |
| `isInAllowlist(cmd, list)` | Check allowlist | boolean |

## Configuration

### ~/.dario/settings.json
```json
{
  "sandbox": {
    "enabled": true,
    "allowNetwork": true,
    "writePaths": ["/tmp", "/Users/user/project"]
  }
}
```

### Options
- `enabled` (bool) - Enable sandboxing
- `allowNetwork` (bool) - Allow network access
- `allowProcessExec` (bool) - Allow subprocess execution
- `projectDir` (string) - Project directory path
- `writePaths` (array) - Directories for file writes
- `readOnlyPaths` (array) - Read-only directories
- `denyPaths` (array) - Explicitly denied paths

## Escape Patterns Detected

- `sandbox-exec -p` - Direct sandbox bypass
- `ptrace|dtrace|strace` - Process debugging
- `LD_PRELOAD` - Library injection
- `launchctl load` - Service loading
- `sudo sandbox-exec` - Privilege escalation
- `codesign -R` - Code signature stripping
- And 6 more patterns...

## Code Examples

### Example 1: Simple Execution
```javascript
const sandbox = globalThis.__dario.sandbox
const result = sandbox.executeWithSandbox('ls -la')
console.log(result.stdout)
```

### Example 2: Escape Detection
```javascript
const escape = sandbox.detectEscapeAttempt(userCommand)
if (escape.detected) {
  console.error(`Blocked: ${escape.message}`)
  return
}
```

### Example 3: With Allowlist
```javascript
const allowlist = ['git', 'npm', /^node/]
const shouldSandbox = !sandbox.isInAllowlist(cmd, allowlist)

if (shouldSandbox) {
  const result = sandbox.executeWithSandbox(cmd, options)
} else {
  // Run directly
}
```

### Example 4: Custom Profile
```javascript
const profile = sandbox.createSandboxProfile({
  projectDir: process.cwd(),
  allowNetwork: false,  // Restrict network
  writePaths: ['/tmp'],  // Only /tmp
  denyPaths: ['~/.ssh']  // Deny SSH
})
const profilePath = sandbox.writeSandboxProfile(profile)
const wrapped = sandbox.wrapCommand('npm install', profilePath)
sandbox.executeWithSandbox(wrapped)
sandbox.deleteSandboxProfile(profilePath)
```

## Return Value: executeWithSandbox()

```javascript
{
  stdout: string,        // Standard output
  stderr: string,        // Standard error
  code: number,          // Exit code (0 = success)
  sandboxed: boolean,    // Was command sandboxed?
  escaped: boolean       // Escape attempt detected?
}
```

## Platform Support

| Platform | Support | Behavior |
|----------|---------|----------|
| macOS | Full | Uses sandbox-exec |
| Linux | No | Runs unsandboxed |
| Windows | No | Runs unsandboxed |

## Files

- `src/sandbox/sandbox.mjs` - Implementation (408 lines)
- `src/sandbox/index.mjs` - Exports (31 lines)
- `SANDBOX_USAGE.md` - Full documentation
- `SANDBOX_INTEGRATION.md` - Integration guide
- `SANDBOX_IMPLEMENTATION.md` - Technical details
- `SANDBOX_QUICK_REFERENCE.md` - This file

## Security Notes

1. **Always check escapes**
   ```javascript
   if (detectEscapeAttempt(cmd).detected) return
   ```

2. **Use deny lists**
   ```javascript
   { denyPaths: ['~/.ssh', '~/.aws', '~/.kube'] }
   ```

3. **Minimal permissions**
   ```javascript
   { allowNetwork: false, allowProcessExec: false }
   ```

4. **Validate allowlist**
   - Don't allowlist: curl, wget, python, sudo, rm -rf
   - Safe to allowlist: git, npm, ls, node (if safe)

5. **Error handling**
   ```javascript
   try {
     const result = sandbox.executeWithSandbox(cmd, opts)
     if (result.code !== 0) handleError(result.stderr)
   } catch (error) {
     handleError(error)
   }
   ```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not supported" | Not on macOS - check `isSandboxSupported()` |
| "Permission denied" | Add path to `writePaths` in options |
| "Network failed" | Set `allowNetwork: true` in options |
| "Command not found" | Set `allowProcessExec: true` |
| "Escape detected" | Remove command from allowlist |

## Learn More

- See `SANDBOX_USAGE.md` for full API documentation
- See `SANDBOX_INTEGRATION.md` for integration patterns
- See `SANDBOX_IMPLEMENTATION.md` for technical details
- See `src/sandbox/sandbox.mjs` for implementation code
