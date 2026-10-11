#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env');

const providers = {
  groq: { name: 'Groq', model: 'llama-3.1-8b-instant' },
  litellm: { name: 'LiteLLM', model: 'gpt-4o-mini' },
  ollama: { name: 'Ollama', model: 'qwen2.5:7b' }
};

const provider = process.argv[2];
const model = process.argv[3];

if (!provider || !providers[provider]) {
  console.log('Usage: node switch-llm.js <provider> [model]');
  console.log('Providers:', Object.keys(providers).join(', '));
  process.exit(1);
}

let envContent = readFileSync(envPath, 'utf8');
envContent = envContent.replace(/^LLM_PROVIDER=.*/m, `LLM_PROVIDER=${provider}`);

if (model) {
  envContent = envContent.replace(/^LLM_MODEL=.*/m, `LLM_MODEL=${model}`);
} else {
  envContent = envContent.replace(/^LLM_MODEL=.*/m, `LLM_MODEL=`);
}

writeFileSync(envPath, envContent);
console.log(`✅ Switched to ${providers[provider].name}${model ? ` with model ${model}` : ''}`);