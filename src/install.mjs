#!/usr/bin/env node

/**
 * First-time installation script for Dario Code CLI
 * - Verifies environment
 * - Installs dependencies
 * - Sets up configuration
 */

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import { fileURLToPath } from 'url';
import os from 'os';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

/**
 * Check Node.js version
 */
async function checkNodeVersion() {
  const requiredVersion = '18.0.0';
  const currentVersion = process.version.slice(1); // Remove the 'v' prefix

  if (compareVersions(currentVersion, requiredVersion) < 0) {
    console.error(`❌ Error: Dario Code requires Node.js v${requiredVersion} or higher.`);
    console.error(`   Current version: ${process.version}`);
    console.error('   Please upgrade Node.js and try again.');
    return false;
  }

  return true;
}

/**
 * Compare version numbers
 */
function compareVersions(a, b) {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  
  return 0;
}

/**
 * Install dependencies
 */
async function installDependencies() {
  try {
    await execFileAsync('npm', ['install'], { cwd: __dirname });
    return true;
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    return false;
  }
}

/**
 * Create configuration
 */
async function createConfig() {
  
  const configDir = getConfigDir();
  const configPath = path.join(configDir, 'config.json');
  
  try {
    await fs.mkdir(configDir, { recursive: true });
    
    // Check if config already exists
    try {
      await fs.access(configPath);
      return true;
    } catch {
      // Config doesn't exist, create it
      const defaultConfig = {
        version: '1.0.0',
        createdAt: new Date().toISOString()
      };
      
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      return true;
    }
  } catch (error) {
    console.error('❌ Error creating configuration:', error.message);
    return false;
  }
}

/**
 * Get configuration directory path
 */
function getConfigDir() {
  const homeDir = os.homedir();
  const appName = 'claude-code';
  
  if (process.platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Roaming', appName);
  } else if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', appName);
  } else {
    // Linux, BSD, etc.
    return path.join(homeDir, '.config', appName);
  }
}

/**
 * Run installation
 */
async function install() {
  
  const nodeVersionOk = await checkNodeVersion();
  if (!nodeVersionOk) process.exit(1);
  
  const depsInstalled = await installDependencies();
  if (!depsInstalled) process.exit(1);
  
  const configCreated = await createConfig();
  if (!configCreated) process.exit(1);
  
  
  rl.close();
}

// Run the installer
install().catch(error => {
  console.error('Unhandled error during installation:', error);
  process.exit(1);
});