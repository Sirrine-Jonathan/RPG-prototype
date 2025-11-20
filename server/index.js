import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Allow self-signed certificates for internal endpoints
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4200', 'http://127.0.0.1:5173', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST']
}));
app.use(express.json());

// LLM Configuration
function getProviderConfig() {
  const provider = process.env.LLM_PROVIDER || 'groq';
  
  const configs = {
    groq: {
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.1-8b-instant',
      requiresAuth: true
    },
    litellm: {
      baseUrl: process.env.LITELLM_BASE_URL || 'https://internal-ai-gateway.ancestryl1.int',
      apiKey: process.env.LITELLM_API_KEY,
      model: 'gemini-2.5-flash', // Use Gemini instead of Azure
      requiresAuth: true
    },
    ollama: {
      baseUrl: 'http://localhost:11434/v1',
      model: 'qwen2.5:7b',
      requiresAuth: false
    }
  };

  return configs[provider] || configs.groq;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, tools } = req.body;
    const config = getProviderConfig();

    console.log(`🔧 Using ${process.env.LLM_PROVIDER || 'groq'} with model ${config.model}`);
    console.log(`🔧 Tools provided: ${tools.map(t => t.function?.name || t.name).join(', ')}`);

    // Fix tool_calls arguments format for providers that need strings
    const fixedMessages = messages.map(msg => {
      if (msg.role === 'assistant' && msg.tool_calls) {
        return {
          ...msg,
          tool_calls: msg.tool_calls.map(tc => ({
            ...tc,
            function: {
              ...tc.function,
              arguments: typeof tc.function.arguments === 'object' 
                ? JSON.stringify(tc.function.arguments)
                : tc.function.arguments
            }
          }))
        };
      }
      return msg;
    });

    const requestBody = {
      model: config.model,
      messages: fixedMessages,
      tools,
      stream: false,
      temperature: 0.01,
      top_p: 0.7,
    };

    const headers = { "Content-Type": "application/json" };
    if (config.requiresAuth && config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message || data.message;
    
    res.json({ message });
  } catch (error) {
    console.error('LLM Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 RPG Server running on port ${PORT}`);
  console.log(`🤖 Using LLM provider: ${process.env.LLM_PROVIDER || 'groq'}`);
});