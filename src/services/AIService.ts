export interface NPCTool {
    name: string;
    description: string;
    parameters?: any;
}

export interface NPCContext {
    name: string;
    background: string;
    personality: string;
    currentLocation: string;
    visibleObjects: string[];
    visibleCharacters: string[];
    availableTools: NPCTool[];
    conversationHistory?: any[];
}

export class AIService {
    private static instance: AIService;
    private baseUrl = 'http://localhost:11434/api/generate';
    
    static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }
    
    async generateNPCAction(context: NPCContext): Promise<{ action: string; parameters?: any; reasoning?: string }> {
        try {
            const systemPrompt = this.buildNPCSystemPrompt(context);
            const userPrompt = this.buildNPCUserPrompt(context);
            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:3b',
                    prompt: fullPrompt,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return this.parseNPCResponse(data.response);
            
        } catch (error) {
            console.warn('AI service failed, using fallback:', error);
            return this.getFallbackAction(context);
        }
    }
    
    async generateConversation(params: { 
        npcName: string; 
        npcPersonality: string; 
        npcBackground: string; 
        context: NPCContext; 
        conversationType: string 
    }): Promise<string> {
        try {
            const systemPrompt = `You are ${params.npcName}, an NPC in a mystery RPG game.

BACKGROUND: ${params.npcBackground}
PERSONALITY: ${params.npcPersonality}
CURRENT LOCATION: ${params.context.currentLocation}

INSTRUCTIONS:
- Generate a greeting or opening line to start a conversation with a visitor
- Keep it under 40 words and conversational
- Do NOT include actions, descriptions, or stage directions
- Just speak naturally as the character would
- Be engaging and in-character
- Address them as "Sir", "Ma'am", or "Hey there" - don't use "Player"
- If you're a police officer, be professional but approachable
- If investigating mysteries, show curiosity about the visitor`;

            const userPrompt = `Generate an opening greeting for ${params.npcName} to say to a visitor:`;

            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:3b',
                    prompt: fullPrompt,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return this.cleanResponse(data.response);
            
        } catch (error) {
            console.warn('AI greeting generation failed, using fallback:', error);
            return this.getGreetingFallback(params.npcName, params.npcPersonality);
        }
    }
    
    async generateConversationResponse(context: NPCContext, playerMessage: string): Promise<string> {
        try {
            const systemPrompt = `You are ${context.name}, an NPC in a mystery RPG game.

BACKGROUND: ${context.background}
PERSONALITY: ${context.personality}
CURRENT LOCATION: ${context.currentLocation}

INSTRUCTIONS:
- Respond as ${context.name} would speak directly to a visitor
- Keep responses under 50 words and conversational
- Do NOT include actions, descriptions, or stage directions
- Just speak naturally as the character
- Address them as "Sir", "Ma'am", or use their name if known - don't use "Player"
- If asked about whispering stones, be mysterious but helpful
- Stay in character but be engaging`;

            const userPrompt = `Player says: "${playerMessage}"

Respond as ${context.name} (speech only, no actions):`;

            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:3b',
                    prompt: fullPrompt,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return this.cleanResponse(data.response);
            
        } catch (error) {
            console.warn('AI conversation service failed, using fallback:', error);
            return this.getConversationFallback(context, playerMessage);
        }
    }
    
    private cleanResponse(response: string): string {
        return response.trim().replace(/^["']|["']$/g, '');
    }
    
    private getGreetingFallback(npcName: string, personality: string): string {
        const lowerPersonality = personality.toLowerCase();
        
        if (lowerPersonality.includes('chief') || lowerPersonality.includes('police')) {
            return `Hello there. I'm ${npcName}. What brings you to the station today?`;
        }
        
        if (lowerPersonality.includes('detective')) {
            return `Excuse me, I'm ${npcName}. I don't think we've met. Are you here about the recent incidents?`;
        }
        
        if (lowerPersonality.includes('sergeant')) {
            return `Good day. ${npcName} here. Is there something I can help you with?`;
        }
        
        return `Hello, I'm ${npcName}. Nice to meet you.`;
    }
    
    private buildNPCSystemPrompt(context: NPCContext): string {
        return `You are ${context.name}, an NPC in a mystery RPG game.

BACKGROUND: ${context.background}
PERSONALITY: ${context.personality}
CURRENT LOCATION: ${context.currentLocation}

VISIBLE OBJECTS: ${context.visibleObjects.join(', ') || 'none'}
VISIBLE CHARACTERS: ${context.visibleCharacters.join(', ') || 'none'}

AVAILABLE TOOLS:
${context.availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

INSTRUCTIONS:
- Stay in character as ${context.name}
- PRIORITIZE social interaction - if you can see other characters, consider talking to them
- Choose ONE tool to use based on your personality and situation
- Respond in JSON format: {"action": "tool_name", "parameters": {...}, "reasoning": "why you chose this"}
- Keep reasoning under 50 words
- Be social and interactive, not just procedural
- If you see colleagues, consider approaching them to chat about work or recent events`;
    }
    
    private buildNPCUserPrompt(context: NPCContext): string {
        return `What do you do next? Choose a tool and explain your reasoning briefly.`;
    }
    
    private parseNPCResponse(content: string): { action: string; parameters?: any; reasoning?: string } {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse NPC response as JSON:', error);
        }
        
        // Fallback parsing
        return {
            action: 'wait',
            reasoning: 'Could not parse AI response'
        };
    }
    
    private getFallbackAction(context: NPCContext): { action: string; parameters?: any; reasoning?: string } {
        const availableActions = context.availableTools.map(t => t.name);
        const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)] || 'wait';
        
        return {
            action: randomAction,
            reasoning: 'Fallback action due to AI service failure'
        };
    }
    
    private getConversationFallback(context: NPCContext, playerMessage: string): string {
        const lowerMessage = playerMessage.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return `Greetings, traveler. I am ${context.name}.`;
        }
        
        if (lowerMessage.includes('stone') || lowerMessage.includes('whisper')) {
            return "The stones... yes, they whisper secrets to those who listen carefully.";
        }
        
        if (lowerMessage.includes('help')) {
            return "I might be able to help, depending on what you need.";
        }
        
        return "That's... interesting. Tell me more.";
    }
    
    // Legacy method for backward compatibility
    async generateResponse(personality: string, userMessage: string, conversationHistory: any[] = []): Promise<string> {
        try {
            const prompt = `You are ${personality}. Keep responses under 100 words. Stay in character.\n\nUser: ${userMessage}\nResponse:`;
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:3b',
                    prompt: prompt,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.response;
            
        } catch (error) {
            console.warn('AI service failed, using fallback:', error);
            return this.getLegacyFallbackResponse(personality);
        }
    }
    
    private getLegacyFallbackResponse(personality: string): string {
        const fallbacks = {
            'hobo': [
                "Spare some change?",
                "Times are tough, friend.",
                "The streets ain't kind.",
                "Got any food to share?"
            ]
        };
        
        const personalityLower = personality.toLowerCase();
        let responses = ["Hello there."];
        
        if (personalityLower.includes('hobo') || personalityLower.includes('homeless')) {
            responses = fallbacks['hobo'];
        }
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
}