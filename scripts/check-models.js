#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Allow self-signed certificates
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const baseUrl = 'https://internal-ai-gateway.ancestryl1.int';
const apiKey = 'sk-1pidoLiwLhID7rvOgDgt9g';

async function checkModels() {
  try {
    console.log('🔍 Checking available models...');
    
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('\n📋 Available Models:');
    console.log('===================');
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((model, index) => {
        console.log(`${index + 1}. ${model.id}`);
        if (model.owned_by) console.log(`   Owner: ${model.owned_by}`);
        if (model.created) console.log(`   Created: ${new Date(model.created * 1000).toLocaleDateString()}`);
        console.log('');
      });
      
      // Recommend best models for RPG
      console.log('\n🎯 Recommendations for RPG:');
      console.log('===========================');
      
      const models = data.data.map(m => m.id);
      
      if (models.some(m => m.includes('gpt-4o'))) {
        console.log('✅ BEST: gpt-4o (or gpt-4o-mini) - Excellent reasoning and tool calling');
      } else if (models.some(m => m.includes('gpt-4'))) {
        console.log('✅ GOOD: gpt-4-turbo - Strong reasoning capabilities');
      } else if (models.some(m => m.includes('claude-3'))) {
        console.log('✅ GOOD: claude-3-sonnet - Great for creative content');
      } else if (models.some(m => m.includes('llama'))) {
        console.log('✅ OK: llama models - Good open source option');
      }
      
    } else {
      console.log('Unexpected response format:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkModels();