# Sandbox Mode for Dario

Sandbox Mode provides security-critical command execution sandboxing on macOS using `sandbox-exec`. This prevents potentially dangerous commands from breaking out of their intended scope.

## Features

- **Platform Detection**: Automatically detects macOS and enables sandboxing
- **Escape Attempt Detection**: Identifies and blocks common sandbox escape patterns
- **Profile Generation**: Dynamically creates sandbox-exec profiles with configurable restrictions
- **Permission Boundaries**: Restricts file writes, network access, and process execution
- **Settings Integration**: Reads sandbox configuration from `.dario/settings.json`
- **Unsandboxed Allowlist**: Supports whitelisting commands to run outside the sandbox

## Installation

The sandbox module is built-in. Access it via `globalThis.__dario.sandbox`:

```javascript
const sandbox = globalThis.__dario.sandbox
```

## Configuration

Add sandbox settings to `~/.dario/settings.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": false,
    "allowNetwork": true,
    "readOnlyPaths": ["/usr/local"],
    "writePaths": ["/tmp", "/Users/username/project"],
    "allowProcessExec": true
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable sandbox for all commands |
| `allowUnsandboxedCommands` | boolean | `false` | Allow commands to run outside sandbox |
| `allowNetwork` | boolean | `true` | Allow network access in sandbox |
| `readOnlyPaths` | string[] | `[]` | Paths accessible in read-only mode |
| `writePaths` | string[] | `["/tmp", projectDir]` | Paths where writes are allowed |
| `allowProcessExec` | boolean | `true` | Allow subprocess execution |

## API Reference

### isSandboxSupported()

Check if the current platform supports sandboxing (macOS only).

```javascript
if (globalThis.__dario.sandbox.isSandboxSupported()) {
  console.log('Sandbox available')
}
```

**Returns**: `boolean`

### detectEscapeAttempt(command)

Detect if a command contains patterns that indicate sandbox escape attempts.

```javascript
const result = globalThis.__dario.sandbox.detectEscapeAttempt('ptrace -p 123')
if (result.detected) {
  console.log(`Escape detected: ${result.message}`)
}
```

**Parameters**:
- `command` (string): Command to check

**Returns**:
```javascript
{
  detected: boolean,
  pattern: string | null,
  message: string | null
}
```

### createSandboxProfile(options)

Generate a sandbox-exec profile with specified restrictions.

```javascript
const profile = globalThis.__dario.sandbox.createSandboxProfile({
  projectDir: '/Users/username/project',
  allowNetwork: true,
  writePaths: ['/tmp', '/Users/username/project'],
  allowProcessExec: true
})
```

**Parameters**:
- `options` (object):
  - `projectDir` (string): Project directory for write access
  - `allowNetwork` (boolean): Enable network operations
  - `readOnlyPaths` (string[]): Paths with read-only access
  - `writePaths` (string[]): Paths where writes are allowed
  - `denyPaths` (string[]): Paths to explicitly deny
  - `allowProcessExec` (boolean): Allow subprocess execution
  - `allowSubprocesses` (boolean): Allow child processes

**Returns**: `string` - Sandbox profile content

### writeSandboxProfile(profile)

Write a sandbox profile to a temporary file.

```javascript
const profilePath = globalThis.__dario.sandbox.writeSandboxProfile(profile)
```

**Parameters**:
- `profile` (string): Profile content

**Returns**: `string` - Path to the temporary profile file

### wrapCommand(command, profilePath)

Wrap a command with sandbox-exec to execute it in the sandbox.

```javascript
const wrapped = globalThis.__dario.sandbox.wrapCommand('ls -la', profilePath)
// Returns: sandbox-exec -f "/tmp/.sandbox-profile-1234.sb" sh -c 'ls -la'
```

**Parameters**:
- `command` (string): Command to wrap
- `profilePath` (string): Path to sandbox profile

**Returns**: `string | null` - Wrapped command or null if unsupported

### executeWithSandbox(command, options)

Execute a command with optional sandboxing (recommended high-level API).

```javascript
const result = globalThis.__dario.sandbox.executeWithSandbox('npm install', {
  enabled: true,
  projectDir: '/Users/username/project',
  allowNetwork: true
})

console.log(result.stdout)
console.log(result.stderr)
console.log(result.code)
console.log(result.sandboxed)  // Was it sandboxed?
console.log(result.escaped)    // Escape attempt detected?
```

**Parameters**:
- `command` (string): Command to execute
- `options` (object): Configuration options (see Configuration Options)

**Returns**:
```javascript
{
  stdout: string,
  stderr: string,
  code: number,
  sandboxed: boolean,
  escaped: boolean
}
```

### getSandboxSettings(configLoader)

Load sandbox settings from configuration.

```javascript
const settings = globalThis.__dario.sandbox.getSandboxSettings(configLoader)
```

**Parameters**:
- `configLoader` (object): Config loader with `loadSettings()` method

**Returns**: `object` - Sandbox settings

### applySandboxSettings(options, settings)

Merge sandbox settings with provided options.

```javascript
const merged = globalThis.__dario.sandbox.applySandboxSettings(
  { enabled: true },
  { allowNetwork: false }
)
```

**Parameters**:
- `options` (object): Override options
- `settings` (object): Base settings

**Returns**: `object` - Merged settings

### isInAllowlist(command, allowlist)

Check if a command is in the unsandboxed allowlist.

```javascript
const allowlist = ['git', 'npm', /^node/]
if (globalThis.__dario.sandbox.isInAllowlist('git status', allowlist)) {
  // Run without sandbox
}
```

**Parameters**:
- `command` (string): Command to check
- `allowlist` (array): Array of strings or regex patterns

**Returns**: `boolean`

## Usage Examples

### Example 1: Basic Sandbox Execution

```javascript
const sandbox = globalThis.__dario.sandbox

// Execute a command with sandbox
const result = sandbox.executeWithSandbox('ls -la /tmp', {
  enabled: true,
  projectDir: process.cwd()
})

if (result.escaped) {
  console.error('Sandbox escape attempt detected!')
} else {
  console.log('Output:', result.stdout)
}
```

### Example 2: Custom Profile with Restricted Network

```javascript
const profile = sandbox.createSandboxProfile({
  projectDir: '/Users/jkneen/myproject',
  allowNetwork: false,  // No network access
  writePaths: ['/tmp']  // Only write to /tmp
})

const profilePath = sandbox.writeSandboxProfile(profile)
const wrapped = sandbox.wrapCommand('curl https://example.com', profilePath)

// This will fail because network is disabled
sandbox.executeWithSandbox(wrapped)

sandbox.deleteSandboxProfile(profilePath)  // Cleanup
```

### Example 3: Command Allowlist

```javascript
const unsandboxedCommands = ['git', 'npm', /^node/, /^npx/]

const commands = ['git status', 'npm install', 'node script.js', 'python script.py']

for (const cmd of commands) {
  const useSandbox = !sandbox.isInAllowlist(cmd, unsandboxedCommands)

  if (useSandbox) {
    console.log(`${cmd}: Running in sandbox`)
    // sandbox.executeWithSandbox(cmd, options)
  } else {
    console.log(`${cmd}: Running unsandboxed (allowlisted)`)
    // Execute directly
  }
}
```

### Example 4: Integration with Bash Tool

```javascript
// In your bash tool implementation:
import { executeWithSandbox } from './src/sandbox/index.mjs'

export async function bashTool(command, options) {
  // Detect and block escape attempts
  const escape = detectEscapeAttempt(command)
  if (escape.detected) {
    return { error: escape.message }
  }

  // Execute with sandbox
  const result = executeWithSandbox(command, {
    enabled: true,
    projectDir: process.cwd(),
    allowNetwork: true
  })

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code
  }
}
```

## Sandbox Escape Patterns Detected

The sandbox detects the following escape attempts:

1. **Direct Sandbox Exec**: `sandbox-exec -p`
2. **Rhino Sandbox**: `rhino sandbox`
3. **Library Injection**: `.dylib` injection attempts
4. **Debuggers**: `ptrace`, `dtrace`, `strace`
5. **Launch Services**: `launchctl load/unload`
6. **Kernel Extensions**: `kextload`, `kextunload`
7. **Privilege Escalation**: `sudo sandbox-exec`
8. **Code Signing**: `codesign -R` removal attempts
9. **Mach-O Manipulation**: `otool`, `install_name_tool`
10. **Boot Parameters**: `nvram`, `bless`
11. **Environment Injection**: `LD_PRELOAD`, `_JAVA_TOOL_OPTIONS`
12. **System Parameters**: `dmesg`, `sysctl` manipulation

## Security Considerations

1. **Platform Specific**: Sandboxing only works on macOS with `sandbox-exec`
2. **Not Perfect**: Sandbox-exec has known limitations; it's a defense layer, not absolute
3. **Escape Detection**: Add new patterns as new escape techniques are discovered
4. **File Permissions**: Sandbox respects OS file permissions
5. **Default Deny**: Profile uses "deny default" for maximum security
6. **Temporary Profiles**: Profiles are cleaned up automatically after execution

## Troubleshooting

### Sandbox Not Working on Non-macOS

Sandboxing is currently macOS-only. On other platforms, commands run unsandboxed:

```javascript
if (!sandbox.isSandboxSupported()) {
  console.log('Sandboxing not available on this platform')
}
```

### Permission Denied in Sandbox

If you get "Permission denied" errors:
1. Check `writePaths` includes the directory
2. Verify file permissions in `/tmp` and project dir
3. Add the directory to `writePaths` in settings

### Network Not Working in Sandbox

If network calls fail:
1. Ensure `allowNetwork: true` in options
2. Check system firewall settings
3. Verify network sandbox rules allow the connection

## Performance Impact

Sandbox-exec has minimal performance overhead:
- Profile generation: ~5ms
- Command execution: <1% overhead compared to unsandboxed
- Main cost: File I/O for temporary profile file

## Implementation Details

The sandbox module uses:
- **macOS sandbox-exec**: Mandatory Access Control (MAC) enforcement
- **Temporary Profiles**: Each command gets a unique profile file
- **Automatic Cleanup**: Profiles cleaned up after execution
- **Escape Detection**: Pattern matching for known bypass techniques
- **Profile Format**: Scheme-based rules matching sandbox policy language

## Files

- `src/sandbox/sandbox.mjs` - Core sandbox implementation
- `src/sandbox/index.mjs` - Module exports
- `SANDBOX_USAGE.md` - This documentation
- `test-sandbox.mjs` - Test suite and examples
