# Dario Plugin System

The plugin system allows developers to extend Dario with custom functionality through a standardized plugin interface.

## Overview

The plugin system provides:

- Plugin discovery and installation
- Plugin lifecycle management (init, enable, disable, unload)
- Custom command registration
- MCP tool integration
- Configuration management
- Plugin registry and state management

## Plugin Architecture

### Directories

```
~/.dario/plugins/
├── plugin-name-1/
│   ├── manifest.json
│   ├── index.mjs
│   └── ...
└── plugin-name-2/
    ├── manifest.json
    ├── index.mjs
    └── ...
```

### Configuration

Plugin metadata and registry is stored in `~/.dario/settings.json`:

```json
{
  "plugins": {
    "enabled": ["plugin-name-1"],
    "disabled": ["plugin-name-2"],
    "registry": "https://registry.npmjs.org"
  }
}
```

## Plugin Manifest

Every plugin must have a `manifest.json` file describing its capabilities:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A brief description of what the plugin does",
  "author": "Your Name",
  "license": "MIT",
  "entry": "index.mjs",
  "commands": [
    {
      "name": "command-name",
      "description": "What the command does",
      "handler": "handleCommandName"
    }
  ],
  "tools": [
    {
      "name": "tool-name",
      "description": "What the tool does",
      "handler": "handleToolName"
    }
  ],
  "config": {
    "setting1": "default-value"
  }
}
```

### Manifest Fields

- **name** (required): Unique plugin identifier. Must be lowercase with hyphens (e.g., `my-awesome-plugin`)
- **version** (required): Semantic version number (e.g., `1.0.0`)
- **description** (required): Brief description of the plugin's purpose
- **author** (optional): Plugin author name
- **license** (optional): Plugin license (default: MIT)
- **entry** (optional): Entry point file (default: `index.mjs`)
- **commands** (optional): Array of CLI commands provided by the plugin
- **tools** (optional): Array of MCP tools provided by the plugin
- **config** (optional): Default configuration values

## Plugin Implementation

### Basic Structure

```javascript
// index.mjs
export async function init(plugin) {
  // One-time initialization
}

export async function onEnable(plugin) {
  // Called when plugin is enabled
}

export async function onDisable(plugin) {
  // Called when plugin is disabled
}

export async function onUnload(plugin) {
  // Final cleanup
}

export async function handleCommandName(args) {
  // Command handler
  return { success: true };
}

export async function handleToolName(input) {
  // Tool handler
  return { result: "..." };
}
```

### Lifecycle Hooks

#### init(plugin)
- Called once when the plugin is first loaded
- Use for one-time setup: load configuration, initialize connections, set up data structures
- Runs even if plugin is not enabled

```javascript
export async function init(plugin) {
  console.log(`Initializing ${plugin.name}@${plugin.manifest.version}`);
  // Load plugin configuration, initialize database connections, etc.
}
```

#### onEnable(plugin)
- Called when the plugin is enabled
- Use to activate functionality: register commands, start listeners, activate tools

```javascript
export async function onEnable(plugin) {
  console.log(`Enabling ${plugin.name}`);
  // Start any background tasks, register event listeners
}
```

#### onDisable(plugin)
- Called when the plugin is disabled
- Use to deactivate functionality: remove listeners, stop tasks

```javascript
export async function onDisable(plugin) {
  console.log(`Disabling ${plugin.name}`);
  // Stop background tasks, remove event listeners
}
```

#### onUnload(plugin)
- Called when the plugin is being unloaded (during removal)
- Use for final cleanup: close connections, write state

```javascript
export async function onUnload(plugin) {
  console.log(`Unloading ${plugin.name}`);
  // Close database connections, save state, etc.
}
```

### Command Handlers

Commands are custom CLI commands that plugins provide:

```javascript
export async function handleMyCommand(args) {
  // args contains the parsed command arguments
  return {
    success: true,
    message: "Command executed successfully"
  };
}
```

Register in manifest:

```json
{
  "commands": [
    {
      "name": "my-command",
      "description": "What my command does",
      "handler": "handleMyCommand"
    }
  ]
}
```

Usage: `/my-command [args]`

### Tool Handlers

Tools are MCP protocol handlers that Claude can call:

```javascript
export async function handleMyTool(input) {
  // Process input according to MCP protocol
  return {
    success: true,
    result: "Tool result"
  };
}
```

Register in manifest:

```json
{
  "tools": [
    {
      "name": "my-tool",
      "description": "What my tool does",
      "handler": "handleMyTool"
    }
  ]
}
```

## Plugin Lifecycle

### Installation

```bash
# Install from npm registry
/plugin install plugin-name

# Install from local directory
/plugin install /path/to/plugin
```

Installation flow:
1. Fetch plugin from source (npm or local)
2. Validate manifest
3. Copy to `~/.dario/plugins/{name}/`
4. Register in settings (disabled by default)

### Enabling

```bash
/plugin enable plugin-name
```

Enabling flow:
1. Update registry (move to enabled list)
2. Plugin will load on next Dario startup
3. All lifecycle hooks run in order: `init()` → `onEnable()`

### Disabling

```bash
/plugin disable plugin-name
```

Disabling flow:
1. Update registry (move to disabled list)
2. Plugin will unload on next Dario startup
3. `onDisable()` hook is called

### Removal

```bash
/plugin remove plugin-name
```

Removal flow:
1. Delete plugin directory from `~/.dario/plugins/`
2. Remove from registry
3. All resources are freed

## Plugin Management Commands

### List Plugins

```bash
/plugin list
```

Shows all installed plugins with their status (enabled/disabled):

```
Installed plugins:
  [ENABLED] plugin-name-1@1.0.0
           A brief description
  [DISABLED] plugin-name-2@2.0.0
            Another description
```

### Install Plugin

```bash
# From npm registry
/plugin install plugin-name

# From local directory
/plugin install /path/to/plugin/directory
```

Options:
- **npm registry**: Plugin must be published to npm and have a valid manifest.json
- **local path**: Directory must contain manifest.json and index.mjs

### Enable Plugin

```bash
/plugin enable plugin-name
```

Makes a plugin active (loads on next startup).

### Disable Plugin

```bash
/plugin disable plugin-name
```

Deactivates a plugin (unloads on next startup).

### Remove Plugin

```bash
/plugin remove plugin-name
```

Completely uninstalls a plugin and frees all disk space.

## Configuration Management

### Plugin Configuration

Plugins can define default configuration in manifest.json:

```json
{
  "config": {
    "apiKey": "default-key",
    "timeout": 5000,
    "debug": false
  }
}
```

### Loading Configuration

Configuration is loaded from multiple sources in order:

1. Plugin manifest defaults (lowest priority)
2. Global settings: `~/.dario/settings.json`
3. Project settings: `./.dario/settings.json` (highest priority)

Configuration is merged at each level, with later sources overriding earlier ones.

### Accessing Configuration

Plugins receive their manifest object during lifecycle hooks:

```javascript
export async function init(plugin) {
  const config = plugin.manifest.config;
  const apiKey = config.apiKey;
}
```

## Plugin Directory Structure

### Minimal Plugin

```
my-plugin/
├── manifest.json
└── index.mjs
```

### Full-Featured Plugin

```
my-plugin/
├── manifest.json
├── index.mjs
├── README.md
├── package.json (for dependencies)
├── src/
│   ├── handlers/
│   │   ├── command.mjs
│   │   └── tool.mjs
│   └── utils/
│       └── helper.mjs
└── tests/
    └── index.test.mjs
```

## Best Practices

### Naming Conventions

- Use lowercase with hyphens for plugin names: `my-awesome-plugin`
- Use camelCase for functions: `handleMyCommand()`
- Use PascalCase for classes: `MyClass`

### Versioning

- Follow semantic versioning: MAJOR.MINOR.PATCH
- Increment MAJOR for breaking changes
- Increment MINOR for new features
- Increment PATCH for bug fixes

### Error Handling

Always implement proper error handling:

```javascript
export async function handleMyCommand(args) {
  try {
    // Do something
    return { success: true, result: data };
  } catch (error) {
    console.error('Command failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Resource Cleanup

Always clean up resources in disable/unload hooks:

```javascript
let timer = null;

export async function onEnable(plugin) {
  // Start a timer
  timer = setInterval(() => {
    // Do something
  }, 1000);
}

export async function onDisable(plugin) {
  // Stop the timer
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
```

### Logging

Use console methods for logging, they'll be captured by the logger:

```javascript
export async function init(plugin) {
  console.log(`Initializing ${plugin.name}`);
  console.info('Plugin loaded successfully');
  console.warn('This is a warning');
  console.error('This is an error');
}
```

## Security Considerations

### Input Validation

Always validate and sanitize plugin inputs:

```javascript
export async function handleMyCommand(args) {
  if (!args || typeof args !== 'object') {
    return { success: false, error: 'Invalid arguments' };
  }

  // Validate specific fields
  if (!args.name || typeof args.name !== 'string') {
    return { success: false, error: 'Name is required' };
  }

  // Use the validated input
}
```

### File System Access

Be careful with file system operations:

```javascript
import fs from 'fs';
import path from 'path';

export async function handleFileOperation(plugin) {
  // Use the plugin directory for file operations
  const pluginDir = plugin.dir;
  const file = path.join(pluginDir, 'data.json');

  // Prevent directory traversal
  if (!file.startsWith(pluginDir)) {
    throw new Error('Access denied');
  }

  return fs.readFileSync(file, 'utf-8');
}
```

### Dependencies

- Minimize external dependencies
- Use only trusted packages
- Keep dependencies up to date
- Document all dependencies in package.json

## API Reference

### Plugin Object

The plugin object passed to lifecycle hooks:

```javascript
{
  name: string,              // Plugin name
  manifest: object,          // Plugin manifest
  module: object,            // Plugin module exports
  dir: string,               // Plugin directory path
  enabled: boolean,          // Is plugin currently enabled
  initialized: boolean       // Has plugin been initialized
}
```

### Registry API

Access the plugin registry from your plugin:

```javascript
import {
  getPluginStatus,
  getRegisteredPlugins,
  getEnabledPlugins,
  isPluginEnabled,
  loadPluginManifest
} from '../plugins/registry.mjs';

const status = getPluginStatus('plugin-name');        // 'enabled', 'disabled', 'not-registered'
const all = getRegisteredPlugins();                   // Array of plugin names
const active = getEnabledPlugins();                   // Array of enabled plugin names
const enabled = isPluginEnabled('plugin-name');       // boolean
const manifest = loadPluginManifest('plugin-name');   // manifest object
```

### Loader API

Load and manage plugins:

```javascript
import {
  loadPlugin,
  initializePlugin,
  enablePlugin,
  disablePlugin,
  unloadPlugin,
  loadEnabledPlugins,
  collectPluginCommands,
  collectPluginTools
} from '../plugins/loader.mjs';

const plugin = await loadPlugin('plugin-name');
await initializePlugin(plugin);
await enablePlugin(plugin);
await disablePlugin(plugin);
await unloadPlugin(plugin);

const { plugins, errors } = await loadEnabledPlugins();
const commands = collectPluginCommands(plugins);
const tools = collectPluginTools(plugins);
```

### Installer API

Install and remove plugins:

```javascript
import {
  installFromNpm,
  installFromLocal,
  uninstallPlugin,
  updatePlugin
} from '../plugins/installer.mjs';

const result = await installFromNpm('plugin-name');
const result = await installFromLocal('/path/to/plugin');
await uninstallPlugin('plugin-name');
const result = await updatePlugin('plugin-name');
```

## Examples

### Example 1: Simple Command Plugin

```javascript
// manifest.json
{
  "name": "hello-plugin",
  "version": "1.0.0",
  "description": "Says hello",
  "commands": [
    {
      "name": "hello",
      "description": "Say hello",
      "handler": "handleHello"
    }
  ]
}

// index.mjs
export async function handleHello(args) {
  const name = args?.name || 'World';
  return {
    success: true,
    message: `Hello, ${name}!`
  };
}
```

Usage: `/hello` or `/hello name=John`

### Example 2: Timer Plugin

```javascript
// manifest.json
{
  "name": "timer-plugin",
  "version": "1.0.0",
  "description": "Manages timers",
  "config": {
    "interval": 5000
  }
}

// index.mjs
let timers = [];

export async function onEnable(plugin) {
  const interval = plugin.manifest.config.interval;
  const timer = setInterval(() => {
    console.log('Timer tick');
  }, interval);
  timers.push(timer);
}

export async function onDisable(plugin) {
  timers.forEach(clearInterval);
  timers = [];
}
```

### Example 3: Integration Plugin

```javascript
// manifest.json
{
  "name": "api-plugin",
  "version": "1.0.0",
  "description": "Integrates with external API",
  "tools": [
    {
      "name": "fetch-data",
      "description": "Fetch data from API",
      "handler": "handleFetchData"
    }
  ],
  "config": {
    "apiUrl": "https://api.example.com"
  }
}

// index.mjs
let client;

export async function init(plugin) {
  const { apiUrl } = plugin.manifest.config;
  client = new ApiClient(apiUrl);
}

export async function onDisable(plugin) {
  await client.disconnect();
}

export async function handleFetchData(input) {
  try {
    const data = await client.fetch(input.endpoint);
    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Troubleshooting

### Plugin Won't Load

1. Check manifest.json is valid JSON
2. Verify all required fields are present
3. Check index.mjs exists at entry path
4. Check for syntax errors in index.mjs
5. Review console output for error messages

### Plugin Not Appearing in List

1. Verify plugin directory exists: `~/.dario/plugins/{name}/`
2. Run `/plugin list` to see all plugins
3. Check registry in settings.json

### Plugin Not Running Hooks

1. Verify hooks are exported: `export async function init() {}`
2. Check manifest.json for correct paths
3. Verify plugin is enabled: `/plugin enable {name}`
4. Restart Dario to reload plugins

## Publishing Plugins

### Publishing to npm

1. Create your plugin directory with manifest.json and index.mjs
2. Create package.json:

```json
{
  "name": "dario-my-plugin",
  "version": "1.0.0",
  "description": "My Dario plugin",
  "main": "index.mjs",
  "files": [
    "manifest.json",
    "index.mjs",
    "src/**/*",
    "README.md"
  ]
}
```

3. Publish to npm: `npm publish`
4. Install with: `/plugin install dario-my-plugin`

### Creating a Plugin Registry

You can create a custom registry by:

1. Hosting plugins on a server (npm, GitHub, etc.)
2. Creating an index file listing available plugins
3. Configuring the registry URL in settings.json

## FAQ

**Q: Can plugins access Claude's conversation context?**
A: Not directly. Plugins can provide tools and commands, but don't have access to the conversation history. Plugins can be called by Claude as part of the tool system.

**Q: Can one plugin depend on another plugin?**
A: Plugins are isolated. However, you can use the registry API to check if another plugin is enabled.

**Q: How do I debug a plugin?**
A: Use console.log() for logging. Output is captured by the Dario logger. You can also run Dario with `--debug` flag for more verbose output.

**Q: Can plugins modify Dario settings?**
A: Yes, plugins can use the config module to read and write settings.

**Q: What permissions do plugins have?**
A: Plugins run with the same permissions as the Dario process. Be cautious about what plugins you install.
