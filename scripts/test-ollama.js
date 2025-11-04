// Simple Ollama connectivity test
async function testOllama() {
  try {
    console.log('Testing Ollama connection...');
    
    // Test models endpoint
    const modelsResponse = await fetch('http://localhost:11434/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ollama'
      }
    });
    
    if (!modelsResponse.ok) {
      throw new Error(`Models endpoint failed: ${modelsResponse.status}`);
    }
    
    const models = await modelsResponse.json();
    console.log('Available models:', models);
    
    // Test chat completion
    const chatResponse = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ollama'
      },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Respond in one sentence.' },
          { role: 'user', content: 'Say hello' }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });
    
    if (!chatResponse.ok) {
      throw new Error(`Chat endpoint failed: ${chatResponse.status}`);
    }
    
    const chatResult = await chatResponse.json();
    console.log('Chat test successful:', chatResult.choices[0].message.content);
    
    return true;
    
  } catch (error) {
    console.error('Ollama test failed:', error);
    return false;
  }
}

// Run the test
testOllama().then(success => {
  console.log('Ollama test result:', success ? 'SUCCESS' : 'FAILED');
});