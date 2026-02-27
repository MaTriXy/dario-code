/**
 * Plugin registry for managing installed and enabled plugins
 * Tracks plugin state and lifecycle
 */

import path from 'path'
import os from 'os'
import { loadSettings, saveSettings } from '../core/config.mjs'
import { fileExists, readFile, writeFile, safeJsonParse } from '../core/utils.mjs'

const HOME_DIR = os.homedir()
const PLUGINS_DIR = process.env.DARIO_PLUGINS_DIR || path.join(HOME_DIR, '.dario', 'plugins')

/**
 * Load the plugin registry from settings
 */
export function loadRegistry() {
  const settings = loadSettings()
  return settings.plugins || {
    enabled: [],
    disabled: [],
    registry: 'https://registry.npmjs.org'
  }
}

/**
 * Save the plugin registry to settings
 */
export function saveRegistry(registry) {
  const settings = loadSettings()
  settings.plugins = registry
  saveSettings(settings)
}

/**
 * Enable a plugin
 */
export function enablePlugin(pluginName) {
  const registry = loadRegistry()

  // Move from disabled to enabled
  registry.disabled = registry.disabled.filter(p => p !== pluginName)
  if (!registry.enabled.includes(pluginName)) {
    registry.enabled.push(pluginName)
  }

  saveRegistry(registry)
  return registry
}

/**
 * Disable a plugin
 */
export function disablePlugin(pluginName) {
  const registry = loadRegistry()

  // Move from enabled to disabled
  registry.enabled = registry.enabled.filter(p => p !== pluginName)
  if (!registry.disabled.includes(pluginName)) {
    registry.disabled.push(pluginName)
  }

  saveRegistry(registry)
  return registry
}

/**
 * Register a new plugin
 */
export function registerPlugin(pluginName) {
  const registry = loadRegistry()

  if (!registry.enabled.includes(pluginName) && !registry.disabled.includes(pluginName)) {
    registry.disabled.push(pluginName) // New plugins start disabled
  }

  saveRegistry(registry)
  return registry
}

/**
 * Unregister a plugin
 */
export function unregisterPlugin(pluginName) {
  const registry = loadRegistry()

  registry.enabled = registry.enabled.filter(p => p !== pluginName)
  registry.disabled = registry.disabled.filter(p => p !== pluginName)

  saveRegistry(registry)
  return registry
}

/**
 * Check if a plugin is enabled
 */
export function isPluginEnabled(pluginName) {
  const registry = loadRegistry()
  return registry.enabled.includes(pluginName)
}

/**
 * Check if a plugin is registered (either enabled or disabled)
 */
export function isPluginRegistered(pluginName) {
  const registry = loadRegistry()
  return registry.enabled.includes(pluginName) || registry.disabled.includes(pluginName)
}

/**
 * Get list of enabled plugins
 */
export function getEnabledPlugins() {
  const registry = loadRegistry()
  return registry.enabled
}

/**
 * Get list of all registered plugins
 */
export function getRegisteredPlugins() {
  const registry = loadRegistry()
  return [...registry.enabled, ...registry.disabled]
}

/**
 * Get plugin status
 */
export function getPluginStatus(pluginName) {
  const registry = loadRegistry()

  if (registry.enabled.includes(pluginName)) {
    return 'enabled'
  } else if (registry.disabled.includes(pluginName)) {
    return 'disabled'
  } else {
    return 'not-registered'
  }
}

/**
 * Load plugin manifest from disk
 */
export function loadPluginManifest(pluginName) {
  const pluginDir = path.join(PLUGINS_DIR, pluginName)
  const manifestPath = path.join(pluginDir, 'manifest.json')

  if (!fileExists(manifestPath)) {
    return null
  }

  try {
    const content = readFile(manifestPath)
    return safeJsonParse(content, null)
  } catch (e) {
    return null
  }
}

/**
 * Save plugin manifest to disk
 */
export function savePluginManifest(pluginName, manifest) {
  const pluginDir = path.join(PLUGINS_DIR, pluginName)
  const manifestPath = path.join(pluginDir, 'manifest.json')

  writeFile(manifestPath, JSON.stringify(manifest, null, 2))
}

/**
 * Get the plugins directory
 */
export function getPluginsDir() {
  return PLUGINS_DIR
}

/**
 * Get plugin directory
 */
export function getPluginDir(pluginName) {
  return path.join(PLUGINS_DIR, pluginName)
}

// ─── Marketplace / Registry Management ────────────────────

const DEFAULT_REGISTRY = { name: 'npm', url: 'https://registry.npmjs.org', default: true }

/**
 * Get configured registries
 * @returns {Array<{ name: string, url: string, default?: boolean }>}
 */
export function getRegistries() {
  const registry = loadRegistry()
  const registries = registry.registries || []
  // Ensure npm default is always present
  if (!registries.some(r => r.default)) {
    return [DEFAULT_REGISTRY, ...registries]
  }
  return registries
}

/**
 * Add a custom plugin registry
 * @param {string} name - Registry display name
 * @param {string} url - Registry URL
 */
export function addRegistry(name, url) {
  const registry = loadRegistry()
  if (!registry.registries) {
    registry.registries = [DEFAULT_REGISTRY]
  }
  // Don't add duplicates
  if (registry.registries.some(r => r.url === url)) {
    return registry.registries
  }
  registry.registries.push({ name, url, default: false })
  saveRegistry(registry)
  return registry.registries
}

/**
 * Remove a custom plugin registry (cannot remove default)
 * @param {string} url - Registry URL to remove
 */
export function removeRegistry(url) {
  const registry = loadRegistry()
  if (!registry.registries) return [DEFAULT_REGISTRY]
  registry.registries = registry.registries.filter(r => r.default || r.url !== url)
  saveRegistry(registry)
  return registry.registries
}

export default {
  loadRegistry,
  saveRegistry,
  enablePlugin,
  disablePlugin,
  registerPlugin,
  unregisterPlugin,
  isPluginEnabled,
  isPluginRegistered,
  getEnabledPlugins,
  getRegisteredPlugins,
  getPluginStatus,
  loadPluginManifest,
  savePluginManifest,
  getPluginsDir,
  getPluginDir,
  getRegistries,
  addRegistry,
  removeRegistry,
}
