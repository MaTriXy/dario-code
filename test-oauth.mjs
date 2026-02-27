#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Load OAuth token
const tokenPath = path.join(os.homedir(), '.dario', 'oauth-token.json')
const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'))
const token = tokenData.access_token

console.log('Token prefix:', token.substring(0, 20) + '...')
console.log('Token length:', token.length)

// Test with authToken (Bearer auth)
console.log('\nCreating client with authToken...')
const client = new Anthropic({ authToken: token })

console.log('Sending test message...')
try {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: 'Say hello in one sentence.'
    }]
  })
  
  console.log('\n✅ SUCCESS!')
  console.log('Response:', message.content[0].text)
  console.log('Usage:', message.usage)
} catch (error) {
  console.error('\n❌ ERROR:', error.message)
  console.error('Status:', error.status)
  if (error.error) {
    console.error('Details:', JSON.stringify(error.error, null, 2))
  }
}
