#!/usr/bin/env node

/**
 * Quick test of mentions module
 */

import { parseMentions, getTabCompletions } from './src/mentions/index.mjs'

console.log('=== Mentions Module Test ===\n')

// Test 1: Parse mentions from input
console.log('Test 1: Parse mentions from input')
const input1 = 'Review @src/core/utils.mjs and @CLAUDE.md?'
const mentions1 = parseMentions(input1)
console.log('Input:', input1)
console.log('Found mentions:', mentions1.length)
console.log('Paths:', mentions1.map(m => m.path))
console.log()

// Test 2: Parse multiple patterns
console.log('Test 2: Parse glob patterns')
const input2 = 'Check all tests @**/*.test.mjs and config @**/*.json'
const mentions2 = parseMentions(input2)
console.log('Input:', input2)
console.log('Found mentions:', mentions2.length)
console.log('Paths:', mentions2.map(m => m.path))
console.log()

// Test 3: Tab completion
console.log('Test 3: Tab completion for @src/')
try {
  const completions = getTabCompletions('@src/')
  console.log('Found suggestions:', completions.length)
  if (completions.length > 0) {
    console.log('First 5 suggestions:')
    completions.slice(0, 5).forEach(c => {
      console.log(`  - ${c.label}${c.suffix}`)
    })
  }
} catch (e) {
  console.error('Error during tab completion:', e.message)
}
console.log()

// Test 4: Parse relative paths
console.log('Test 4: Parse different path formats')
const input4 = 'Review @./relative.js, @~/home/file.md, and @/absolute/path.txt'
const mentions4 = parseMentions(input4)
console.log('Input:', input4)
console.log('Found mentions:', mentions4.length)
mentions4.forEach((m, i) => {
  console.log(`  ${i + 1}. ${m.path}`)
})
console.log()

// Test 5: Parse home directory reference
console.log('Test 5: Home directory expansion')
const input5 = 'Check @~/.dario/config.json'
const mentions5 = parseMentions(input5)
console.log('Input:', input5)
console.log('Found mentions:', mentions5.length)
if (mentions5.length > 0) {
  console.log('Path:', mentions5[0].path)
}
console.log()

console.log('=== All Tests Completed ===')
