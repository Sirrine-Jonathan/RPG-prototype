export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  requiresAuth: boolean;
}

// Safe environment variable access
const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

export class LLMConfig {
  private static providers: Record<string, LLMProvider> = {
    groq: {
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: getEnv('GROQ_API_KEY'),
      defaultModel: 'llama-3.1-8b-instant',
      requiresAuth: true
    },
    litellm: {
      name: 'LiteLLM',
      baseUrl: getEnv('LITELLM_BASE_URL') || 'https://internal-ai-gateway.ancestryl1.int',
      apiKey: getEnv('LITELLM_API_KEY'),
      defaultModel: 'azure-gpt-4o-mini',
      requiresAuth: true
    },
    ollama: {
      name: 'Ollama',
      baseUrl: 'http://localhost:11434/v1',
      defaultModel: 'qwen2.5:7b',
      requiresAuth: false
    }
  };

  static getProvider(): LLMProvider {
    const providerName = getEnv('LLM_PROVIDER') || 'groq';
    const provider = this.providers[providerName];
    
    if (!provider) {
      throw new Error(`Unknown LLM provider: ${providerName}`);
    }

    return {
      ...provider,
      baseUrl: getEnv('LLM_BASE_URL') || provider.baseUrl,
      apiKey: getEnv('LLM_API_KEY') || provider.apiKey,
      defaultModel: getEnv('LLM_MODEL') || provider.defaultModel
    };
  }

  static getAvailableProviders(): string[] {
    return Object.keys(this.providers);
  }
}