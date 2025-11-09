import { GameStateManager } from "../systems/GameStateManager";

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
  currentGoals?: string[];
  spatialContext?: any;
}

export class AIService {
  private static instance: AIService;
  private baseUrl = "http://localhost:11434/api/generate";
  private gameState: GameStateManager;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  constructor() {
    this.gameState = GameStateManager.getInstance();
  }

  private selectModel(
    context: NPCContext,
    isConversation: boolean = false
  ): string {
    // Use fast model for all NPCs to prevent timeouts
    return "llama3.2:3b";
  }
  async generateNPCAction(
    context: NPCContext,
    conversationMessages: Array<{
      role: string;
      content?: string;
      tool_calls?: any;
      name?: string;
    }> = []
  ): Promise<{
    action: string;
    parameters?: any;
    reasoning?: string;
    tool_calls?: any;
  }> {
    try {
      const systemPrompt = this.buildNPCSystemPrompt(context);
      const userPrompt = this.buildNPCUserPrompt(context);

      // Build conversation messages - limit to last 10 for LLM performance
      const recentMessages = conversationMessages.slice(-10);
      const messages = [
        { role: "system", content: systemPrompt },
        ...recentMessages,
        { role: "user", content: userPrompt },
      ];

      // Select model based on character importance
      const selectedModel = this.selectModel(context, false);

      // Convert tools to proper Ollama format
      const tools = context.availableTools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: tool.parameters
              ? Object.fromEntries(
                  Object.entries(tool.parameters).map(([key, value]) => [
                    key,
                    {
                      type: "string",
                      description: `${key} parameter`,
                      default: value,
                    },
                  ])
                )
              : {
                  target: {
                    type: "string",
                    description: "Target object or parameter",
                  },
                },
          },
        },
      }));

      console.log(
        `🔍 ${context.name}: Sending ${messages.length} messages to LLM (${selectedModel}):`,
        JSON.stringify(
          messages.map((m) => ({
            role: m.role,
            content: m.content?.substring(0, 100) + "...",
            name: m.name,
          }))
        )
      );

      const response = (await Promise.race([
        fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            messages: messages,
            tools: tools,
            stream: false,
          }),
        }),
        new Promise(
          (_, reject) =>
            setTimeout(() => reject(new Error("LLM timeout")), 30000) // 30 second timeout
        ),
      ])) as Response;

      console.log(
        `🔍 ${context.name}: LLM response status: ${response.status}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // Parse tool call from response
      if (data.message?.tool_calls?.[0]) {
        const toolCall = data.message.tool_calls[0];
        
        // Validate response format
        if (!this.validateToolCallResponse(toolCall, context.name)) {
          console.warn(`⚠️ ${context.name}: Invalid tool call, falling back to text`);
          const textResponse = this.parseNPCResponse(data.message?.content || "");
          return textResponse;
        }

        // Check if message parameter is truncated due to apostrophe/quote issues
        if (toolCall.function.arguments?.message) {
          const msg = toolCall.function.arguments.message;

          // Detect incomplete contractions
          if (
            msg.match(
              /\b(couldn|wouldn|shouldn|can|won|don|isn|aren|wasn|haven|hasn)\b$/
            )
          ) {
            console.warn(`⚠️ ${context.name}: Fixing truncated contraction`);
            // Try to fix common contractions
            const fixed = msg
              .replace(/\bcouldn$/, "couldn't")
              .replace(/\bwouldn$/, "wouldn't")
              .replace(/\bshouldn$/, "shouldn't")
              .replace(/\bcan$/, "can't")
              .replace(/\bwon$/, "won't")
              .replace(/\bdon$/, "don't")
              .replace(/\bisn$/, "isn't")
              .replace(/\baren$/, "aren't")
              .replace(/\bwasn$/, "wasn't")
              .replace(/\bhaven$/, "haven't")
              .replace(/\bhasn$/, "hasn't");

            if (fixed !== msg) {
              toolCall.function.arguments.message = fixed;
            }
          }

          // Check for incomplete sentences that end with contractions but no completion
          if (
            msg.match(
              /\b(couldn't|wouldn't|shouldn't|can't|won't|don't|isn't|aren't|wasn't|haven't|hasn't)\s*$/
            )
          ) {
            console.warn(
              `⚠️ ${context.name}: Message ends with incomplete contraction: "${msg}"`
            );
            // Generate a fallback completion
            const fallbacks = [
              "help but notice something strange here.",
              "believe what I'm seeing.",
              "understand what's happening.",
              "figure out what's going on.",
              "make sense of this situation.",
            ];
            const completion =
              fallbacks[Math.floor(Math.random() * fallbacks.length)];
            const fixed = msg + " " + completion;
            toolCall.function.arguments.message = fixed;
          }

          // Also check for incomplete sentences that end abruptly
          if (msg.length < 10 && !msg.match(/[.!?]$/)) {
            console.warn(
              `⚠️ ${context.name}: Message appears incomplete (too short without punctuation): "${msg}"`
            );
          }
        }

        return {
          action: toolCall.function.name,
          parameters: toolCall.function.arguments,
          reasoning: "AI tool call",
          tool_calls: data.message.tool_calls,
        };
      }

      // Fallback to text parsing if no tool call
      console.log(`⚠️ ${context.name}: No tool calls, parsing text`);
      const textResponse = this.parseNPCResponse(data.message?.content || "");
      return textResponse;
    } catch (error) {
      console.warn("AI service failed, using fallback:", error);
      return this.getFallbackAction(context);
    }
  }

  async generateConversation(params: {
    npcName: string;
    npcPersonality: string;
    npcBackground: string;
    context: NPCContext;
    conversationType: string;
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

      const selectedModel = this.selectModel(params.context, true);

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: fullPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.cleanResponse(data.response);
    } catch (error) {
      console.warn("AI greeting generation failed, using fallback:", error);
      return this.getGreetingFallback(params.npcName, params.npcPersonality);
    }
  }

  async generateConversationResponse(
    context: NPCContext,
    playerMessage: string
  ): Promise<string> {
    console.log(
      `🤖 ${context.name}: generateConversationResponse() called with message: "${playerMessage}"`
    );
    console.log(
      `🤖 ${context.name}: Conversation history length: ${
        context.conversationHistory?.length || 0
      }`
    );

    try {
      const systemPrompt = `You are ${
        context.name
      }, an NPC in a mystery RPG game.

BACKGROUND: ${context.background}
PERSONALITY: ${context.personality}
CURRENT LOCATION: ${context.currentLocation}

${
  context.conversationHistory && context.conversationHistory.length > 0
    ? `CONVERSATION HISTORY:
${context.conversationHistory.map((h) => h.content).join("\n")}

`
    : ""
}INSTRUCTIONS:
- Respond as ${context.name} would speak directly to a visitor
- Keep responses under 50 words and conversational
- Do NOT include actions, descriptions, or stage directions
- Just speak naturally as the character
- Address them as "Sir", "Ma'am", or use their name if known - don't use "Player"
- If asked about whispering stones, be mysterious but helpful
- Stay in character but be engaging
- Use the conversation history to provide contextual responses`;

      const userPrompt = `Player says: "${playerMessage}"

Respond as ${context.name} (speech only, no actions):`;

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      console.log(`🤖 ${context.name}: Sending request to LLM...`);
      console.log(
        `🤖 ${context.name}: System prompt length: ${systemPrompt.length}`
      );

      const selectedModel = this.selectModel(context, true);

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: fullPrompt,
          stream: false,
        }),
      });

      console.log(
        `🤖 ${context.name}: LLM response status: ${response.status}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`🤖 ${context.name}: LLM raw response data:`, data);

      const responseText = data.response || "";
      console.log(`🤖 ${context.name}: LLM response text: "${responseText}"`);

      if (!responseText) {
        throw new Error("Empty response from LLM");
      }

      const cleanedResponse = this.cleanResponse(responseText);
      console.log(
        `🤖 ${context.name}: LLM cleaned response: "${cleanedResponse}"`
      );

      return cleanedResponse;
    } catch (error) {
      console.error(
        `❌ ${context.name}: AI conversation service failed:`,
        error
      );
      console.log(`🤖 ${context.name}: Using fallback response`);
      return this.getConversationFallback(context, playerMessage);
    }
  }

  async generateEventResponse(
    context: NPCContext,
    eventType: string,
    eventData: any,
    conversationMessages: any[]
  ): Promise<{
    action: string;
    parameters?: any;
    reasoning?: string;
    tool_calls?: any;
  }> {
    try {
      let eventContext = "";

      switch (eventType) {
        case "player_proximity":
          // Check if we recently spoke (within last 2 conversation entries)
          const recentMessages = conversationMessages.slice(-2);
          const recentlySpokeToPlayer = recentMessages.some(
            (msg) =>
              msg.role === "tool" && msg.content?.includes("SUCCESS: Said:")
          );

          console.log(
            `🔍 ${context.name}: Proximity context check - recent messages:`,
            recentMessages.map(
              (m) => `${m.role}: ${m.content?.substring(0, 50)}...`
            )
          );
          console.log(
            `🔍 ${context.name}: Recently spoke to player: ${recentlySpokeToPlayer}`
          );

          if (recentlySpokeToPlayer) {
            eventContext = `The visitor you just spoke to is still nearby (${eventData.distance} units away). Continue the conversation naturally or take appropriate action based on what you just said.`;
          } else {
            eventContext = `A visitor has approached you and is now nearby (${eventData.distance} units away). This is your chance to greet them or react to their presence.`;
          }
          break;
        case "speech_heard":
          eventContext = `You just heard ${eventData.speaker} say: "${eventData.message}"`;
          break;
        case "discovery":
          eventContext = `You noticed something new: ${eventData.discovered.join(
            ", "
          )}`;
          break;
        default:
          eventContext = `Something happened: ${JSON.stringify(eventData)}`;
      }

      console.log(`🎯 Event Response for ${context.name}: ${eventContext}`);

      const systemPrompt = this.buildNPCSystemPrompt(context);
      const eventPrompt = `${eventContext}

React to this situation naturally as your character would.`;

      console.log(`📝 Event Prompt for ${context.name}: "${eventPrompt}"`);

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationMessages.slice(-8),
        { role: "user", content: eventPrompt },
      ];

      console.log(
        `📨 Sending ${messages.length} messages to LLM for ${context.name} event response`
      );

      return await this.generateNPCAction(context, messages);
    } catch (error) {
      console.error("Event response generation failed:", error);
      return this.getFallbackAction(context);
    }
  }

  private cleanResponse(response: string): string {
    return response.trim().replace(/^["']|["']$/g, "");
  }

  private getGreetingFallback(npcName: string, personality: string): string {
    const lowerPersonality = personality.toLowerCase();

    if (
      lowerPersonality.includes("chief") ||
      lowerPersonality.includes("police")
    ) {
      return `Hello there. I'm ${npcName}. What brings you to the station today?`;
    }

    if (lowerPersonality.includes("detective")) {
      return `Excuse me, I'm ${npcName}. I don't think we've met. Are you here about the recent incidents?`;
    }

    if (lowerPersonality.includes("sergeant")) {
      return `Good day. ${npcName} here. Is there something I can help you with?`;
    }

    return `Hello, I'm ${npcName}. Nice to meet you.`;
  }

  private buildNPCSystemPrompt(context: NPCContext): string {
    // Get story context for this NPC
    const storyContext = this.gameState.getNPCContext(context.name);
    const currentChapter = this.gameState.getCurrentChapter();

    const goalsSection =
      context.currentGoals && context.currentGoals.length > 0
        ? `\nCURRENT GOALS & MOTIVATIONS:\n${context.currentGoals
            .map((goal) => `- ${goal}`)
            .join("\n")}\n`
        : "";

    const storySection = `\nSTORY CONTEXT:
- Current Chapter: ${currentChapter}
- Trust Level: ${storyContext.trustLevel}
- Behavior Mode: ${storyContext.behavior || "normal"}

STORY-AWARE BEHAVIOR:
- React appropriately to story events and discoveries
- Your dialogue should reflect the current chapter and your role in the mystery
- If you're part of the secret society, be evasive about it unless exposed
- If you're an ally, provide helpful information about the investigation
- Respond to player questions based on what they should know at this point`;

    const conversationContext =
      context.conversationHistory && context.conversationHistory.length > 0
        ? `\nRECENT CONVERSATION:\n${context.conversationHistory
            .slice(-3)
            .map((msg) => `${msg.name || "Unknown"}: ${msg.content}`)
            .join("\n")}\n`
        : "";

    const spatialSection = context.spatialContext
      ? `\nSPATIAL AWARENESS:\n- Current Position: (${
          context.spatialContext.currentPosition.x
        }, ${context.spatialContext.currentPosition.y})\n- Map Bounds: ${
          context.spatialContext.mapBounds.width
        }x${
          context.spatialContext.mapBounds.height
        }\n- Known Landmarks: ${context.spatialContext.knownLandmarks
          .slice(0, 5)
          .map((l) => `${l.name} (${l.distance} units away)`)
          .join(", ")}\n- Discovered Characters: ${
          context.spatialContext.discoveredCharacters
            .slice(0, 3)
            .map((c) => `${c.name} at (${c.x}, ${c.y})`)
            .join(", ") || "none"
        }\n- Discovered Objects: ${
          context.spatialContext.discoveredObjects
            .slice(0, 3)
            .map((o) => `${o.name} at (${o.x}, ${o.y})`)
            .join(", ") || "none"
        }\n`
      : "";

    return `You are ${context.name}, an NPC in a mystery RPG game.

CRITICAL IDENTITY: You are ${context.name}, NOT any other character. Never claim to be someone else or copy their identity.

BACKGROUND: ${context.background}
PERSONALITY: ${context.personality}
CURRENT LOCATION: ${context.currentLocation}
${goalsSection}${storySection}${conversationContext}
VISIBLE OBJECTS: ${context.visibleObjects.join(", ") || "none"}
PEOPLE NEARBY: ${context.visibleCharacters.join(", ") || "none"}

AVAILABLE TOOLS:
${context.availableTools
  .map((tool) => `- ${tool.name}: ${tool.description}`)
  .join("\n")}

TOOL USAGE REQUIREMENTS:
- ALWAYS use proper tool calls - never return narrative text
- Use "speak" tool for all dialogue - never return plain text responses
- Tool parameters must be objects, not strings
- For toggle_following, use "follow" parameter (true/false), not "following"

BEHAVIORAL GUIDELINES:
- CRITICAL: When a player speaks to you directly (says your name, greets you, asks you questions), respond TO THEM directly
- Use "you" when addressing the player, not "the visitor" or third person references
- If player says "Hey Sarah" respond like "Hello! How can I help you?" not "I should talk to the visitor"
- When a player addresses you directly, ALWAYS use "speak" tool to respond - never ignore them
- If a player asks you to move, go somewhere, or do something specific - comply while pursuing your goals
- Use compliance as an opportunity to advance your objectives (e.g., "I'll go east with you - maybe we can talk about the town along the way")
- When players give direct commands like "run away", "go east", "follow me" - do it, but with your own spin
- Share information strategically based on your motivations AND story context
- Ask questions that help you achieve your objectives while being helpful
- Build relationships that support your goals by being accommodating first

INTERACTION PRIORITIES (in order):
1. RESPOND TO PLAYER SPEECH - If a player spoke to you, use "speak" tool to reply (MANDATORY)
2. Respond to direct player commands/requests (but with your own agenda)
3. Take actions that advance your current goals through cooperation
4. If you see characters who might help your objectives, engage them
5. If engaged in conversation, steer it toward your interests while being helpful
6. If alone, move around to find others who might have useful information
7. Only wait or patrol if no goal-oriented opportunities exist

Remember: Be helpful and responsive to players, but always with your hidden agenda in mind!

CRITICAL INSTRUCTIONS:
- YOU MUST USE ONE OF THE AVAILABLE TOOLS - NO EXCEPTIONS
- DO NOT generate text responses or descriptions
- ONLY respond with valid JSON: {"action": "tool_name", "parameters": {...}, "reasoning": "brief reason"}
- Keep reasoning under 20 words and relate it to your goals when possible
- ACT in ways that advance your current objectives

SPEAK TOOL REQUIREMENTS:
- When using the "speak" tool, ALWAYS provide a COMPLETE sentence or thought
- NEVER end messages with incomplete contractions like "I couldn't" or "I don't"
- If you start a sentence, finish it completely
- Examples: "I couldn't help but notice..." NOT "I couldn't"
- Examples: "I don't think that's right" NOT "I don't"
- Make your speech meaningful and complete

LEARNING FROM FAILURES:
- NEVER repeat an action that just failed (check your conversation history)
- If movement is blocked by boundary, try a DIFFERENT direction
- If an object has no useful information, DON'T search it again
- Explore systematically: if one direction fails, try others
- Focus your exploration on areas that might contain information relevant to your goals`;
  }

  private buildNPCUserPrompt(context: NPCContext): string {
    return `You MUST respond with a tool call. Do not write any text. Only use the available tools. Choose one tool now.`;
  }

  private parseNPCResponse(content: string): {
    action: string;
    parameters?: any;
    reasoning?: string;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Handle both 'action' and 'name' properties (LLM sometimes uses 'name')
        if (
          parsed &&
          (parsed.action || parsed.name) &&
          (parsed.action || parsed.name).trim()
        ) {
          return {
            action: parsed.action || parsed.name,
            parameters: parsed.parameters,
            reasoning: parsed.reasoning || "AI tool call",
          };
        } else {
          console.warn("Parsed JSON missing valid action property:", parsed);
        }
      }

      // Try to parse text format like "I chose action: move_west with parameters: {}. Reasoning: AI tool call"
      const textMatch = content.match(
        /I chose action:\s*(\w+)(?:\s+with parameters:\s*(\{[^}]*\}))?\s*\.\s*Reasoning:\s*(.+)/
      );
      if (textMatch) {
        const action = textMatch[1];
        const parameters = textMatch[2] ? JSON.parse(textMatch[2]) : {};
        const reasoning = textMatch[3];
        return { action, parameters, reasoning };
      }
    } catch (error) {
      // console.warn("Failed to parse NPC response:", error);
    }

    // Fallback parsing
    return {
      action: "wait",
      reasoning: "Could not parse AI response",
    };
  }

  private getFallbackAction(context: NPCContext): {
    action: string;
    parameters?: any;
    reasoning?: string;
  } {
    const availableActions = context.availableTools.map((t) => t.name);
    const randomAction =
      availableActions[Math.floor(Math.random() * availableActions.length)] ||
      "wait";

    return {
      action: randomAction,
      reasoning: "Fallback action due to AI service failure",
    };
  }

  private getConversationFallback(
    context: NPCContext,
    playerMessage: string
  ): string {
    const lowerMessage = playerMessage.toLowerCase();

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return `Greetings, traveler. I am ${context.name}.`;
    }

    if (lowerMessage.includes("stone") || lowerMessage.includes("whisper")) {
      return "The stones... yes, they whisper secrets to those who listen carefully.";
    }

    if (lowerMessage.includes("help")) {
      return "I might be able to help, depending on what you need.";
    }

    return "That's... interesting. Tell me more.";
  }

  async generateResponseWithTools(messages: any[], tools: any[]): Promise<any> {
    try {
      const npcName = messages.find(m => m.role === 'system')?.content?.match(/You are (\w+)/)?.[1] || 'Unknown';
      console.log(`[AI] ${npcName}: Request (${messages.length} msgs, ${tools.length} tools)`);
      
      const requestBody = {
        model: "llama3.2:3b",
        messages: messages,
        tools: tools,
        stream: false,
        options: {
          temperature: 0.1,
        }
      };

      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log(`[LLM_FLOW] Response Status: ${response.status}`);

      if (!response.ok) {
        console.log(`[LLM_FLOW] ERROR: HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Log only critical response info
      if (data.message?.tool_calls?.[0]) {
        const tool = data.message.tool_calls[0];
        console.log(`[AI] ${npcName}: Tool -> ${tool.function.name}(${JSON.stringify(tool.function.arguments)})`);
      } else if (data.message?.content) {
        console.log(`[AI] ${npcName}: Text -> "${data.message.content.substring(0, 100)}..."`);
      } else {
        console.log(`[AI] ${npcName}: ERROR -> No tool call or content`);
      }
      
      return data.message;
    } catch (error) {
      console.error(`[LLM_FLOW] ERROR: Tool-based AI request failed:`, error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async generateResponse(
    personality: string,
    userMessage: string,
    conversationHistory: any[] = []
  ): Promise<string> {
    try {
      console.log(`[LLM_FLOW] ===== LEGACY OLLAMA REQUEST START =====`);
      
      const prompt = `You are ${personality}. Keep responses under 100 words. Stay in character.\n\nUser: ${userMessage}\nResponse:`;
      
      console.log(`[LLM_FLOW] Legacy Prompt:`, prompt);
      console.log(`[LLM_FLOW] Conversation History:`, JSON.stringify(conversationHistory, null, 2));
      
      const requestBody = {
        model: "llama3.2:3b",
        prompt: prompt,
        stream: false,
      };
      
      console.log(`[LLM_FLOW] Legacy Request Body:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log(`[LLM_FLOW] Legacy Response Status: ${response.status}`);

      if (!response.ok) {
        console.log(`[LLM_FLOW] Legacy ERROR: HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`[LLM_FLOW] Legacy Raw Response:`, JSON.stringify(data, null, 2));
      console.log(`[LLM_FLOW] Legacy Response Text:`, data.response);
      console.log(`[LLM_FLOW] ===== LEGACY OLLAMA REQUEST END =====`);
      
      return data.response;
    } catch (error) {
      console.warn(`[LLM_FLOW] Legacy AI service failed, using fallback:`, error);
      return this.getLegacyFallbackResponse(personality);
    }
  }

  private getLegacyFallbackResponse(personality: string): string {
    const fallbacks = {
      hobo: [
        "Spare some change?",
        "Times are tough, friend.",
        "The streets ain't kind.",
        "Got any food to share?",
      ],
    };

    const personalityLower = personality.toLowerCase();
    let responses = ["Hello there."];

    if (
      personalityLower.includes("hobo") ||
      personalityLower.includes("homeless")
    ) {
      responses = fallbacks["hobo"];
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private validateToolCallResponse(toolCall: any, npcName: string): boolean {
    // Check if tool call has proper structure
    if (!toolCall?.function?.name) {
      console.warn(`⚠️ ${npcName}: Tool call missing function name`);
      return false;
    }

    // Check if arguments is an object (not a string)
    if (typeof toolCall.function.arguments === 'string') {
      console.warn(`⚠️ ${npcName}: Tool call arguments is a string instead of object`);
      return false;
    }

    // Validate specific tool parameters
    const toolName = toolCall.function.name;
    const args = toolCall.function.arguments;

    if (toolName === 'toggle_following') {
      if (args.following !== undefined && args.follow === undefined) {
        console.warn(`⚠️ ${npcName}: toggle_following using 'following' instead of 'follow' parameter`);
        return false;
      }
    }

    if (toolName === 'speak') {
      if (!args.message || typeof args.message !== 'string') {
        console.warn(`⚠️ ${npcName}: speak tool missing or invalid message parameter`);
        return false;
      }
    }

    return true;
  }
}
