#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env');

// Read .env file
let provider = 'groq'; // default
try {
  const envContent = readFileSync(envPath, 'utf8');
  const match = envContent.match(/^LLM_PROVIDER=(.*)$/m);
  if (match) {
    provider = match[1].trim();
  }
} catch (error) {
  console.log('⚠️  Could not read .env file, using default provider: groq');
}

// Build command based on provider and arguments
const includeEditor = process.argv.includes('--editor');
const includeOllama = provider === 'ollama';

let services = ['APP', 'SERVER'];
let colors = ['cyan', 'blue'];
let commands = ['npm run dev:app', 'npm run dev:server'];

if (includeOllama) {
  services.push('OLLAMA');
  colors.push('yellow');
  commands.push('npm run dev:ollama');
}

if (includeEditor) {
  services.push('EDITOR');
  colors.push('green');
  commands.push('npm run dev:editor');
}

services.push('LOGS');
colors.push('magenta');
commands.push('npm run dev:logs');

console.log(`🚀 Starting RPG with provider: ${provider}`);
console.log(`📦 Services: ${services.join(', ')}`);

// Run concurrently
const concurrentlyArgs = [
  '-n', services.join(','),
  '-c', colors.join(','),
  ...commands
];

const child = spawn('npx', ['concurrently', ...concurrentlyArgs], {
  stdio: 'inherit',
  cwd: join(__dirname, '..')
});

child.on('exit', (code) => {
  process.exit(code);
});