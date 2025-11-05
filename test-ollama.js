#!/usr/bin/env node

const BASE_URL = 'http://localhost:11434';

async function testOllamaEndpoints() {
    console.log('🔍 Testing Ollama endpoints...\n');
    
    // Test 1: Check if Ollama is running
    try {
        const response = await fetch(`${BASE_URL}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Ollama is running');
            console.log('📋 Available models:', data.models.map(m => m.name).join(', '));
        }
    } catch (error) {
        console.log('❌ Ollama not running:', error.message);
        return;
    }
    
    // Test 2: Try basic generation
    console.log('\n🧪 Testing basic generation...');
    try {
        const response = await fetch(`${BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:3b',
                prompt: 'Respond with only: {"action": "test", "reasoning": "basic test"}',
                stream: false
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Basic generation works');
            console.log('📝 Response:', data.response);
        } else {
            console.log('❌ Basic generation failed:', response.status);
        }
    } catch (error) {
        console.log('❌ Basic generation error:', error.message);
    }
    
    // Test 3: Try chat endpoint
    console.log('\n🧪 Testing chat endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:3b',
                messages: [
                    { role: 'user', content: 'Say "chat works"' }
                ],
                stream: false
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Chat endpoint works');
            console.log('📝 Response:', data.message?.content || 'No content');
        } else {
            console.log('❌ Chat endpoint failed:', response.status);
            const errorText = await response.text();
            console.log('📝 Error:', errorText);
        }
    } catch (error) {
        console.log('❌ Chat endpoint error:', error.message);
    }
    
    // Test 4: Try function calling
    console.log('\n🧪 Testing function calling...');
    try {
        const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:3b',
                messages: [
                    { role: 'user', content: 'Use the search tool to find something' }
                ],
                tools: [{
                    type: "function",
                    function: {
                        name: "search",
                        description: "Search for objects",
                        parameters: {
                            type: "object",
                            properties: {
                                target: { type: "string" }
                            }
                        }
                    }
                }],
                stream: false
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Function calling request accepted');
            console.log('📝 Response:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ Function calling failed:', response.status);
            const errorText = await response.text();
            console.log('📝 Error:', errorText);
        }
    } catch (error) {
        console.log('❌ Function calling error:', error.message);
    }
    
    // Test 5: Check model info
    console.log('\n🧪 Getting model info...');
    try {
        const response = await fetch(`${BASE_URL}/api/show`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'llama3.2:3b'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Model info retrieved');
            console.log('📝 Model details:', {
                name: data.details?.family,
                format: data.details?.format,
                parameters: data.details?.parameter_size,
                quantization: data.details?.quantization_level
            });
        }
    } catch (error) {
        console.log('❌ Model info error:', error.message);
    }
}

testOllamaEndpoints().catch(console.error);