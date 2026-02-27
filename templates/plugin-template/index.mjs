/**
 * Template Plugin for Dario
 *
 * This is an example plugin showing the expected structure and hooks.
 * Replace this with your actual plugin code.
 */

/**
 * Plugin initialization hook
 * Called when the plugin is first loaded
 */
export async function init(plugin) {
  console.log(`Plugin initialized: ${plugin.name}@${plugin.manifest.version}`);

  // Perform any one-time initialization here
  // - Load configuration
  // - Initialize external connections
  // - Set up data structures
}

/**
 * Plugin enable hook
 * Called when the plugin is enabled
 */
export async function onEnable(plugin) {
  console.log(`Plugin enabled: ${plugin.name}`);

  // Register commands, tools, or event listeners
  // This is called during the enable lifecycle
}

/**
 * Plugin disable hook
 * Called when the plugin is disabled
 */
export async function onDisable(plugin) {
  console.log(`Plugin disabled: ${plugin.name}`);

  // Clean up commands, tools, or event listeners
  // This is called when the plugin is disabled
}

/**
 * Plugin unload hook
 * Called when the plugin is being unloaded
 */
export async function onUnload(plugin) {
  console.log(`Plugin unloaded: ${plugin.name}`);

  // Clean up all resources
  // Close connections, write state, etc.
}

/**
 * Example command handler
 * Handlers are referenced in the manifest.json file
 */
export async function handleTemplateCommand(args) {
  console.log('Template command executed with args:', args);
  return {
    success: true,
    message: 'Template command completed'
  };
}

/**
 * Example tool handler
 * Tools can be called by the AI as part of its capabilities
 */
export async function handleTemplateTool(input) {
  console.log('Template tool called with input:', input);
  return {
    success: true,
    result: `Tool processed: ${input}`
  };
}

export default {
  init,
  onEnable,
  onDisable,
  onUnload,
  handleTemplateCommand,
  handleTemplateTool
};
