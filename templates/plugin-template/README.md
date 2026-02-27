# Template Plugin for Dario

This is a template plugin demonstrating the structure and capabilities of the Dario plugin system.

## Structure

A plugin consists of:

1. **manifest.json** - Metadata about the plugin (required)
2. **index.mjs** - Main plugin code (required)
3. **README.md** - Documentation (optional)

## Manifest Schema

```json
{
  "name": "plugin-name",           // Unique identifier (lowercase, hyphens only)
  "version": "1.0.0",              // Semantic versioning
  "description": "What it does",   // Short description
  "author": "Your Name",           // (optional)
  "license": "MIT",                // (optional)
  "entry": "index.mjs",            // (optional) Entry point, default: index.mjs
  "commands": [],                  // (optional) CLI commands provided
  "tools": [],                     // (optional) MCP tools provided
  "config": {}                     // (optional) Default configuration
}
```

## Plugin Hooks

Plugins can export the following lifecycle hooks:

### init(plugin)
Called when the plugin is first loaded. Use this for one-time initialization.

```javascript
export async function init(plugin) {
  // plugin.name - Plugin name
  // plugin.manifest - Plugin manifest object
  // plugin.dir - Plugin directory path
}
```

### onEnable(plugin)
Called when the plugin is enabled. Register commands, tools, listeners here.

```javascript
export async function onEnable(plugin) {
  // Set up active functionality
}
```

### onDisable(plugin)
Called when the plugin is disabled. Clean up active functionality.

```javascript
export async function onDisable(plugin) {
  // Clean up
}
```

### onUnload(plugin)
Called when the plugin is being unloaded. Free all resources.

```javascript
export async function onUnload(plugin) {
  // Final cleanup
}
```

## Commands

Define custom CLI commands in manifest.json:

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

Then export the handler function:

```javascript
export async function handleMyCommand(args) {
  // args contains parsed command arguments
  return {
    success: true,
    message: "Command completed"
  };
}
```

Usage: `/my-command [args]`

## Tools

Define MCP tools in manifest.json:

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

Then export the handler function:

```javascript
export async function handleMyTool(input) {
  // Process input using MCP protocol
  return {
    success: true,
    result: "Tool result"
  };
}
```

## Configuration

Plugins can define default configuration values:

```json
{
  "config": {
    "setting1": "value1",
    "setting2": true
  }
}
```

Configuration is merged from multiple sources:
1. Plugin manifest defaults
2. Global settings in ~/.dario/settings.json
3. Project-specific settings in .dario/settings.json

## Installation

```bash
# Install from npm registry
/plugin install plugin-name

# Install from local directory
/plugin install /path/to/plugin

# List installed plugins
/plugin list

# Enable a plugin
/plugin enable plugin-name

# Disable a plugin
/plugin disable plugin-name

# Remove a plugin
/plugin remove plugin-name
```

## Best Practices

1. Use semantic versioning (MAJOR.MINOR.PATCH)
2. Name plugins with lowercase and hyphens (e.g., my-awesome-plugin)
3. Implement proper error handling in all hooks and handlers
4. Clean up resources in disable/unload hooks
5. Document your plugin's features and configuration
6. Test your plugin locally before publishing
7. Use consistent naming conventions in your code

## Example Plugin

See the template files in this directory for a complete example.

## Resources

- [Plugin System Documentation](../../docs/plugins.md)
- [Dario GitHub](https://github.com/jkneen/dario)
