import { AIService, NPCContext } from "../services/AIService";
import { SpeechBubble } from "../ui/SpeechBubble";
import { BaseActor, Tool } from "./BaseActor";
import { EventBus } from "../systems/EventBus";

export class PersistentNPC extends BaseActor {
  public id: string;
  public name: string;
  public personality: string;
  public background: string;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;
  private currentScene: Phaser.Scene | null = null;
  private position: { x: number; y: number };
  private config: any;
  private state: any = {};

  // AI and behavior
  private aiService: AIService;
  private speechBubble: SpeechBubble | null = null;
  private timeoutHandle?: Phaser.Time.TimerEvent;
  private lastEventTime: number = 0;
  private pendingLLMRequest?: Promise<any>;
  private conversationHistory: any[] = [];

  // Following behavior
  protected isFollowing: boolean = false;
  protected followDistance: number = 96; // 2 tiles
  protected playerPosition: { x: number; y: number } = { x: 0, y: 0 };
  protected followTimer?: Phaser.Time.TimerEvent;

  private readonly MIN_TIMEOUT = 15000; // 15 seconds minimum (normal)
  private readonly MAX_TIMEOUT = 25000; // 25 seconds maximum (normal)
  private readonly INITIAL_MIN_TIMEOUT = 2000; // 2 seconds minimum (first action)
  private readonly INITIAL_MAX_TIMEOUT = 5000; // 5 seconds maximum (first action)
  
  private isFirstTimeout: boolean = true;

  constructor(scene: Phaser.Scene, config: any) {
    super(); // Call BaseActor constructor
    this.id = config.id;
    this.name = config.name;
    this.personality = config.personality || "Friendly";
    this.background = config.background || "Local resident";
    this.position = { x: config.x, y: config.y };
    this.config = config;
    this.aiService = new AIService();
    this.createSprite(scene);
    this.setupBehavior();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.eventBus) {
      // Listen for speech events from other NPCs
      gameManager.eventBus.subscribe("npc_speech", (event: any) => {
        this.handleSpeechEvent(event.data);
      });
    }
  }

  private handleSpeechEvent(speechData: any): void {
    // Don't react to our own speech
    if (speechData.speakerId === this.id) return;

    // Only react to speech from NPCs in the same scene
    if (!this.currentScene || speechData.sceneKey !== this.currentScene.scene.key) {
      return;
    }

    // Check if we're within hearing range
    const myPos = this.getPosition();
    const distance = Phaser.Math.Distance.Between(
      myPos.x,
      myPos.y,
      speechData.position.x,
      speechData.position.y
    );

    if (distance <= speechData.hearingRange) {
      console.log(
        `[NPC_FLOW] ${this.name}: Heard ${speechData.speakerName} say "${
          speechData.message
        }" (${Math.round(distance)}px away)`
      );

      // Trigger AI response to the speech
      this.triggerEvent("npc_speech_heard", {
        speakerName: speechData.speakerName,
        message: speechData.message,
        distance: Math.round(distance),
      });
    }
  }

  private createSprite(scene: Phaser.Scene): void {
    this.currentScene = scene;

    this.sprite = scene.add.sprite(
      this.position.x,
      this.position.y,
      this.config.spriteKey,
      0
    );
    this.sprite.setScale(2);
    this.sprite.setInteractive();

    this.nameText = scene.add
      .text(this.position.x, this.position.y - 35, this.name, {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 6, y: 3 },
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setAlpha(0.9);

    this.speechBubble = new SpeechBubble(scene);

    // Set up click interaction
    this.sprite.on("pointerdown", () => {
      console.log(
        `[NPC_FLOW] ${this.name}: Clicked! Triggering player_interaction event`
      );
      this.triggerEvent("player_interaction");
    });

    // Listen for player movement to update following behavior
    const eventBus = (globalThis as any).eventBus;
    if (eventBus) {
      eventBus.subscribe('player-moved', (event: any) => {
        this.playerPosition = { x: event.data.x, y: event.data.y };
        this.followPlayer();
      });
    }
  }

  private setupBehavior(): void {
    if (!this.currentScene) return;

    // Listen for our specific timeout event
    const eventBus = EventBus.getInstance();
    eventBus.subscribe(`timeout_event_${this.id}`, () => {
      console.log(`[NPC_FLOW] ${this.name}: Timeout event fired!`);
      this.triggerEvent('timeout_prompt');
    });

    // Start initial random timeout
    this.startRandomTimeout();
  }

  private startRandomTimeout(): void {
    // Clear existing timeout
    if (this.timeoutHandle) {
      this.timeoutHandle.destroy();
    }

    // Random delay between MIN and MAX (use shorter times for first timeout)
    const minTimeout = this.isFirstTimeout ? this.INITIAL_MIN_TIMEOUT : this.MIN_TIMEOUT;
    const maxTimeout = this.isFirstTimeout ? this.INITIAL_MAX_TIMEOUT : this.MAX_TIMEOUT;
    const delay = Math.random() * (maxTimeout - minTimeout) + minTimeout;
    
    // Mark that we've had our first timeout
    this.isFirstTimeout = false;
    
    this.timeoutHandle = this.currentScene!.time.addEvent({
      delay: delay,
      callback: () => {
        // Fire NPC-specific timeout event
        const eventBus = EventBus.getInstance();
        console.log(`[NPC_FLOW] ${this.name}: Firing timeout event after ${Math.round(delay)}ms`);
        eventBus.emit(`timeout_event_${this.id}`, {});
      },
      callbackScope: this,
      loop: false
    });

    console.log(`[NPC_FLOW] ${this.name}: Set random timeout for ${Math.round(delay)}ms`);
  }

  private resetTimeout(): void {
    console.log(`[NPC_FLOW] ${this.name}: Resetting timeout due to action`);
    this.startRandomTimeout();
  }

  private async performAIAction(
    eventType?: string,
    eventData?: any
  ): Promise<void> {
    try {
      // If this is an event-driven action, cancel any pending timed requests
      if (eventType && eventData && this.pendingLLMRequest) {
        console.log(
          `[NPC_FLOW] ${this.name}: Cancelling pending timed request due to event: ${eventType}`
        );
        this.pendingLLMRequest = undefined;
      }

      // For timed actions, check if enough time has passed since last event
      if (!eventType) {
        const timeSinceLastEvent = Date.now() - this.lastEventTime;

        if (timeSinceLastEvent < this.MIN_TIMEOUT) {
          console.log(
            `[NPC_FLOW] ${this.name}: Skipping timed action - only ${timeSinceLastEvent}ms since last event (need ${this.MIN_TIMEOUT}ms)`
          );
          this.startRandomTimeout();
          return;
        }
        console.log(
          `[NPC_FLOW] ${this.name}: Executing fallback timed action (${timeSinceLastEvent}ms since last event)`
        );
      }

      const now = Date.now();

      if (eventType) {
        console.log(
          `[NPC_FLOW] ${this.name}: Processing event: ${eventType}`,
          eventData
        );
        this.lastEventTime = now;
        // Handle specific events here
        await this.handleEvent(eventType, eventData || {});
      } else {
        // This shouldn't happen with the new timeout system
        console.log(`[NPC_FLOW] ${this.name}: No recent events, but timeout system should handle this`);
      }

      // Start new random timeout for next action (unless this was the timeout event)
      if (eventType !== 'timeout_prompt') {
        this.startRandomTimeout();
      }
    } catch (error) {
      console.error(`[NPC_FLOW] ${this.name}: AI action failed:`, error);
      this.startRandomTimeout();
    }
  }

  private async handleEvent(eventType: string, eventData: any): Promise<void> {
    console.log(`[NPC_FLOW] ${this.name}: Handling event "${eventType}"`);

    let chosenAction: string;

    // For proximity, speech, and timeout events, use AI to generate contextual responses
    if (
      eventType === "player_nearby" ||
      eventType === "player_left" ||
      eventType === "player_speech" ||
      eventType === "npc_speech_heard" ||
      eventType === "timeout_prompt"
    ) {
      try {
        const tools = this.getToolsForAI();
        console.log(
          `[NPC_FLOW] ${this.name}: Using AI for event "${eventType}" with ${tools.length} tools`
        );
        tools.forEach((tool) =>
          console.log(`[NPC_FLOW] ${this.name}: - ${tool.name}`)
        );

        // Create context description
        let contextDescription = "";
        const recentSpeech = this.conversationHistory
          .filter(
            (msg) => msg.role === "tool" && msg.content?.includes("said:")
          )
          .slice(-2);

        if (eventType === "player_nearby") {
          if (recentSpeech.length > 0) {
            contextDescription = `The player you recently spoke to is approaching again (${eventData.distance}px away). You just said something to them, so acknowledge their return or continue the conversation naturally.`;
          } else {
            contextDescription = `A player just approached you while you're walking around town (${eventData.distance}px away).`;
          }
        } else if (eventType === "player_left") {
          contextDescription = `A player just walked away from you while you're out in town (${eventData.distance}px away).`;
        } else if (eventType === "npc_speech_heard") {
          contextDescription = `${eventData.speakerName} just said "${eventData.message}" nearby while you're both out in town (${eventData.distance}px away).`;
        } else if (eventType === "player_speech") {
          contextDescription = `A player just said: "${eventData.message}" (${Math.round(eventData.distance)}px away). Respond appropriately to what they said.`;
        } else if (eventType === "timeout_prompt") {
          // Use scene-appropriate context
          const sceneContext = this.currentScene?.scene.key === 'NewLibraryScene' 
            ? 'in the library' 
            : 'walking around town outdoors';
          contextDescription = `You haven't done anything for a while and want to do something while ${sceneContext}. Choose an action that fits your character.`;
        }

        // Convert tools to proper tool calling format
        const toolDefinitions = tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters || {
              type: "object",
              properties:
                tool.name === "speak"
                  ? {
                      message: { type: "string", description: "What to say" },
                    }
                  : {},
              required: tool.name === "speak" ? ["message"] : [],
            },
          },
        }));

        // Build message history - avoid duplicate system messages
        const systemPrompt = this.buildSystemPrompt();
        
        const conversationMessages = this.conversationHistory.filter(
          (msg) => msg.role !== "system"
        );
        console.log(`[NPC] ${this.name}: Context -> ${contextDescription} (${conversationMessages.length} history msgs)`);
        
        const messages = [
          { role: "system", content: systemPrompt },
          ...conversationMessages,
          { role: "user", content: contextDescription },
        ];

        console.log(
          `[NPC_FLOW] ${this.name}: Using tool calling for "${eventType}"`
        );

        // Tool use loop - allow limited chaining to prevent infinite loops
        let currentMessages = [...messages];
        let toolsExecuted = false;
        let actionCount = 0;
        const MAX_ACTIONS = 3; // Limit to prevent infinite loops

        while (actionCount < MAX_ACTIONS) {
          const response = await this.aiService.generateResponseWithTools(
            currentMessages,
            toolDefinitions
          );

          console.log(
            `[NPC_FLOW] ${this.name}: AI response:`,
            JSON.stringify(response, null, 2)
          );
          console.log(
            `[NPC_FLOW] ${this.name}: Tool calls found:`,
            response?.tool_calls?.length || 0
          );

          if (
            response &&
            response.tool_calls &&
            response.tool_calls.length > 0
          ) {
            // Add AI response to conversation
            currentMessages.push(response);

            // Execute each tool call
            for (const toolCall of response.tool_calls) {
              const functionName = toolCall.function.name;
              const args =
                typeof toolCall.function.arguments === "string"
                  ? JSON.parse(toolCall.function.arguments)
                  : toolCall.function.arguments;

              console.log(
                `[NPC_FLOW] ${this.name}: Executing tool "${functionName}" with args:`,
                args
              );

              let toolResult = { success: false, message: "Unknown tool" };

              // Check if this NPC has a handler for this tool
              const availableTools = this.getToolsForAI();
              const tool = availableTools.find(t => t.name === functionName);
              
              console.log(`[NPC] ${this.name}: Available tools:`, availableTools.map(t => t.name));
              console.log(`[NPC] ${this.name}: Looking for tool:`, functionName);
              console.log(`[NPC] ${this.name}: Found tool:`, !!tool);
              
              if (tool && tool.handler) {
                console.log(`[NPC] ${this.name}: Executing tool handler for ${functionName}`);
                toolResult = await tool.handler(args);
                chosenAction = functionName;
                console.log(`[NPC] ${this.name}: Tool result ->`, JSON.stringify(toolResult));
              } else if (functionName === "speak") {
                // Validate speak message
                const speakMessage = args.message || "";
                if (!speakMessage.trim()) {
                  console.warn(`⚠️ [NPC] ${this.name}: Empty speak message - skipping tool execution`);
                  toolResult = { success: false, message: "Empty speak message" };
                } else {
                  toolResult = await this.handleSpeak(args.message);
                }
                chosenAction = "speak";
                console.log(`[NPC] ${this.name}: Speak result ->`, JSON.stringify(toolResult));
              } else if (functionName.startsWith("move_")) {
                const direction = functionName.replace("move_", "");
                toolResult = await this.handleMove(direction);
                chosenAction = functionName;
                console.log(`[NPC] ${this.name}: Move result ->`, JSON.stringify(toolResult));
              }

              // Add tool result to conversation
              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
              
              // Reset timeout since we took an action
              this.resetTimeout();
              toolsExecuted = true;
              
              // Break if AI chose to take a break
              if (functionName === 'take_a_break') {
                console.log(`[NPC_FLOW] ${this.name}: AI chose to take a break, ending action chain`);
                break;
              }
              
              actionCount++; // Increment action counter
            }

            // Continue the loop to get AI response to tool results
          } else {
            // No tool calls - either break or try to parse old format
            if (toolsExecuted) {
              // We executed tools, AI chose not to continue - that's fine
              console.log(`[NPC_FLOW] ${this.name}: AI chose to stop after executing tools`);
              break;
            }
            
            // No tools executed yet, check if there's text content to parse
            console.log(
              `[NPC_FLOW] ${this.name}: No tool calls in response, checking content`
            );
            if (response.content && response.content.trim()) {
              console.log(
                `[NPC_FLOW] ${this.name}: Found text content, attempting to parse: ${response.content}`
              );
              
              // Try to extract JSON from content (handle embedded JSON)
              const jsonMatch = response.content.match(/\{[^{}]*"name"[^{}]*"parameters"[^{}]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.name && parsed.parameters) {
                    console.log(
                      `[NPC_FLOW] ${this.name}: Parsed action from content: ${parsed.name}`
                    );
                    
                    // Execute the parsed tool
                    const availableTools = this.getToolsForAI();
                    const tool = availableTools.find(t => t.name === parsed.name);
                    if (tool && tool.handler) {
                      await tool.handler(parsed.parameters);
                      chosenAction = parsed.name;
                    } else if (parsed.name === "speak" && parsed.parameters.message) {
                      await this.handleSpeak(parsed.parameters.message);
                      chosenAction = "speak";
                    }
                  }
                } catch (e) {
                  console.log(
                    `[NPC_FLOW] ${this.name}: Could not parse embedded JSON: ${e.message}`
                  );
                }
              } else {
                // Try to parse entire content as JSON
                try {
                  const parsed = JSON.parse(response.content);
                  if (parsed.name && parsed.parameters) {
                    console.log(
                      `[NPC_FLOW] ${this.name}: Parsed action from content: ${parsed.name}`
                    );
                    if (parsed.name === "speak" && parsed.parameters.message) {
                      await this.handleSpeak(parsed.parameters.message);
                      chosenAction = "speak";
                    }
                  }
                } catch (e) {
                  console.log(
                    `[NPC_FLOW] ${this.name}: Could not parse content as JSON`
                  );
                }
              }
            }

            if (!chosenAction) {
              console.log(
                `[NPC_FLOW] ${this.name}: No action chosen, using fallback`
              );
              chosenAction = "wait";
            }
            break;
          }
          
          // Safety check - if we hit max actions, force break
          if (actionCount >= MAX_ACTIONS) {
            console.log(`[NPC_FLOW] ${this.name}: Hit max actions (${MAX_ACTIONS}), forcing break`);
            break;
          }
        }

        // Update conversation history (keep last 10 messages)
        this.conversationHistory = currentMessages.slice(-10);
      } catch (error) {
        console.error(
          `[NPC_FLOW] ${this.name}: AI failed for event "${eventType}":`,
          error
        );
        // No fallback actions - let failures be visible for development
        chosenAction = "ai_failed";
      }
    } else {
      // This shouldn't happen - log it as an error
      console.error(`[NPC_FLOW] ${this.name}: No AI response for event "${eventType}" - this should not happen!`);
      chosenAction = "ai_failed";
    }

    console.log(
      `[NPC_FLOW] ${this.name}: Chose action "${chosenAction}" for event "${eventType}"`
    );
  }

  // Public method to trigger events
  public triggerEvent(eventType: string, eventData?: any): void {
    console.log(`[NPC_FLOW] ${this.name}: Received event "${eventType}"`);
    
    // Check if this NPC is paused by the AI system
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.systemManager && gameManager.systemManager.aiSystem) {
      if (!gameManager.systemManager.aiSystem.isNPCActive(this.id)) {
        console.log(`[NPC_FLOW] ${this.name}: Ignoring event "${eventType}" - NPC is paused`);
        return;
      }
    }
    
    // Clear current timeout and start a new random one (unless this IS the timeout event)
    if (eventType !== 'timeout_prompt') {
      this.startRandomTimeout();
    }
    
    this.performAIAction(eventType, eventData);
  }

  private async handlePlayerInteraction(): Promise<void> {
    try {
      console.log(
        `[NPC_FLOW] ${this.name}: Direct AI prompt for player interaction`
      );

      const toolDefinitions = this.getPersistentTools().map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: tool.parameters || {},
          },
        },
      }));

      const messages = [
        {
          role: "system",
          content: this.buildSystemPrompt(),
        },
        {
          role: "user",
          content: "A player just walked up to you and clicked on you to start a conversation. Greet them appropriately.",
        },
      ];

      const response = await this.aiService.generateResponseWithTools(
        messages,
        toolDefinitions
      );

      if (response?.tool_calls?.[0]) {
        const toolCall = response.tool_calls[0];
        const functionName = toolCall.function.name;
        const args = toolCall.function.arguments;

        // Execute the tool using existing logic
        const availableTools = this.getToolsForAI();
        const tool = availableTools.find(t => t.name === functionName);
        
        if (tool && tool.handler) {
          await tool.handler(args);
        } else if (functionName === "speak") {
          // Validate speak message
          const speakMessage = args.message || "";
          if (!speakMessage.trim()) {
            console.warn(`⚠️ [NPC] ${this.name}: Empty speak message in player interaction - skipping`);
            return; // Don't say anything
          }
          await this.handleSpeak(args.message);
        } else {
          this.say("Hello there! How can I help you?");
        }
      } else {
        this.say("Hello there! How can I help you?");
      }
    } catch (error) {
      console.error(
        `[NPC_FLOW] ${this.name}: Player interaction AI failed:`,
        error
      );
      this.say("Hello there!");
    }
  }

  // Build system prompt - can be overridden by subclasses
  protected buildSystemPrompt(): string {
    // Get nearby objects for interaction (narrow range)
    const nearbyObjects = this.getNearbyObjects();
    const nearbyObjectNames = nearbyObjects.map(obj => obj.id || obj.name || 'Unknown Object');
    
    // Get all visible targets for movement (wide range)
    const visibleTargets = this.getVisibleTargets();
    const visibleObjects = visibleTargets.filter(t => t.type === 'object');
    const visibleNPCs = visibleTargets.filter(t => t.type === 'npc');
    
    return `You are ${this.name}, a ${this.personality} character with background: ${this.background}. You are currently walking around outdoors in the town center/streets.

VISIBLE OBJECTS: ${visibleObjects.map(o => o.id).join(', ') || 'none'}
PEOPLE NEARBY: ${visibleNPCs.map(n => n.id).join(', ') || 'none'}
NEARBY OBJECTS: ${nearbyObjectNames.join(', ') || 'none'}

CRITICAL: You can ONLY use these exact tools - no others exist:
- move_to (to go to a specific visible object or person)
- move_north, move_south, move_east, move_west (basic movement)
- toggle_following (to follow/unfollow someone)
- Any proximity-based tools when near objects

DO NOT invent tools like "examine_bookshelf" or "look_at_bookshelf" - they don't exist.
Use move_to to get close to objects, then use whatever tools become available.

BEHAVIORAL GUIDELINES:
- Use tools to interact with the world
- Speak to nearby characters when appropriate
- Move around naturally when no one is nearby
- Stay in character and be helpful when approached`;
  }

  // Implement BaseActor abstract method
  protected setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;

    if (this.sprite) {
      this.sprite.setPosition(x, y);
    }

    if (this.nameText) {
      this.nameText.setPosition(x, y - 35);
    }
  }

  // Implement smooth movement using pathfinding
  protected moveToPosition(x: number, y: number): void {
    if (!this.sprite || !this.sprite.scene) {
      this.setPosition(x, y);
      return;
    }

    const currentPos = this.getPosition();
    const dx = x - currentPos.x;
    const dy = y - currentPos.y;

    // Determine direction for animation
    let direction = "down";
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }

    // Play walking animation (use generic walk animation for now)
    const animKey = `adam_walk_${direction}`;
    if (this.sprite.anims && this.sprite.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    }

    // Move smoothly to target position
    this.sprite.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      x: x,
      y: (target: any) => (target === this.nameText ? y - 35 : y),
      duration: 300,
      ease: "Linear",
      onComplete: () => {
        this.setPosition(x, y);

        // Play idle animation
        const idleAnimKey = `adam_idle_${direction}`;
        if (this.sprite.anims && this.sprite.scene.anims.exists(idleAnimKey)) {
          this.sprite.play(idleAnimKey, true);
        }

        // Update proximity system
        const gameManager = (globalThis as any).gameManager;
        if (gameManager && gameManager.proximitySystem) {
          // ProximitySystem will automatically detect position changes
          // No need for explicit updateNPCPosition call
        }
      },
    });
  }

  // Override BaseActor handleSpeak to also display speech bubble
  protected async handleSpeak(
    message: string
  ): Promise<{ success: boolean; message: string }> {
    // Call parent method to fire events
    const result = await super.handleSpeak(message);

    // Also display speech bubble
    this.say(message);

    return result;
  }

  // Conditional tools based on current state/proximity
  protected getConditionalTools(): Tool[] {
    const tools: Tool[] = [];
    
    // Add 'speak' tool only if other actors are nearby
    if (this.hasNearbyActors()) {
      tools.push({
        name: 'speak',
        description: 'Speak to nearby characters',
        parameters: { 
          type: 'object',
          properties: {
            message: { type: 'string', description: 'What to say' }
          },
          required: ['message']
        },
        handler: async (params) => this.handleSpeak(params.message)
      });
    }
    
    return tools;
  }

  // Override to filter out movement tools when following
  public getAvailableTools(): Tool[] {
    const tools: Tool[] = [];
    
    // Add persistent tools (but filter movement if following)
    const persistentTools = this.getPersistentTools();
    if (this.isFollowing) {
      // When following, only allow toggle_following and NPC-specific tools (not movement)
      tools.push(...persistentTools.filter(tool => 
        !['move_north', 'move_south', 'move_east', 'move_west'].includes(tool.name)
      ));
    } else {
      tools.push(...persistentTools);
    }
    
    // Add conditional tools
    tools.push(...this.getConditionalTools());
    
    // Add tools offered by nearby objects
    const nearbyObjects = this.getNearbyObjects();
    nearbyObjects.forEach(obj => {
      tools.push(...obj.getOfferedTools());
    });
    
    return tools;
  }

  // Override BaseActor methods - NPCs offer no tools to others
  public getOfferedTools(): Tool[] {
    return []; // NPCs don't offer tools - communication happens via proximity and speak tool
  }

  // Override to add NPC-specific persistent tools
  protected getPersistentTools(): Tool[] {
    const baseTools = super.getPersistentTools();
    
    // Add toggle_following tool for all NPCs
    baseTools.push({
      name: 'toggle_following',
      description: 'Start or stop following the player',
      parameters: {
        type: 'object',
        properties: {
          follow: { type: 'boolean', description: 'Whether to follow the player' }
        },
        required: ['follow']
      },
      handler: async (params) => this.handleToggleFollowing(params.follow)
    });
    
    return baseTools;
  }

  // Handle following toggle
  protected async handleToggleFollowing(follow: boolean): Promise<{ success: boolean; message: string }> {
    this.isFollowing = follow;
    const response = follow ? "I'll follow you." : "I'll stay here.";
    this.say(response);
    
    if (follow) {
      this.startFollowTimer();
    } else {
      this.stopFollowTimer();
    }
    
    return { success: true, message: `${this.name} following: ${follow}` };
  }

  // Start continuous following timer
  private startFollowTimer(): void {
    if (this.followTimer) {
      this.followTimer.destroy();
    }
    
    this.followTimer = this.currentScene!.time.addEvent({
      delay: 500, // Check every 500ms
      callback: () => this.followPlayer(),
      callbackScope: this,
      loop: true
    });
    
    console.log(`[NPC_FLOW] ${this.name}: Started continuous following`);
  }

  // Stop continuous following timer
  private stopFollowTimer(): void {
    if (this.followTimer) {
      this.followTimer.destroy();
      this.followTimer = undefined;
    }
    
    console.log(`[NPC_FLOW] ${this.name}: Stopped continuous following`);
  }

  // Enhanced following behavior - actively move toward player
  protected followPlayer(): void {
    if (!this.isFollowing) return;
    
    // Get actual player position from EntityManager instead of relying on events
    const gameManager = (globalThis as any).gameManager;
    const player = gameManager?.entityManager?.getPlayer();
    if (!player) return;
    
    const playerPos = player.getPosition();
    const currentPos = this.getPosition();
    const distance = Phaser.Math.Distance.Between(
      currentPos.x, currentPos.y,
      playerPos.x, playerPos.y
    );
    
    console.log(`[NPC_FOLLOW] ${this.name}: Player at (${playerPos.x}, ${playerPos.y}), NPC at (${currentPos.x}, ${currentPos.y}), distance: ${Math.round(distance)}`);
    
    // Only move if player is far enough away
    if (distance > this.followDistance) {
      // Calculate direction to player (move closer, not away)
      const deltaX = playerPos.x - currentPos.x;
      const deltaY = playerPos.y - currentPos.y;
      
      // Normalize the direction
      const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      // Use pathfinding system for intelligent following
      const gameManager = (globalThis as any).gameManager;
      if (gameManager?.systemManager?.pathfindingSystem && !gameManager.systemManager.pathfindingSystem.isPathfindingActive()) {
        // Use pathfinding to move toward player (only if not already pathfinding)
        gameManager.systemManager.pathfindingSystem.movePlayerTo(this, playerPos.x, playerPos.y);
        console.log(`[NPC_FOLLOW] ${this.name}: Using pathfinding to follow player`);
      } else {
        // Fallback to direct movement
        const normalizedX = deltaX / magnitude;
        const normalizedY = deltaY / magnitude;
        
        // Move toward player
        const moveDistance = Math.min(48, distance - this.followDistance + 24); // Don't overshoot
        const targetX = currentPos.x + normalizedX * moveDistance;
        const targetY = currentPos.y + normalizedY * moveDistance;
        
        console.log(`[NPC_FOLLOW] ${this.name}: Moving toward player to (${Math.round(targetX)}, ${Math.round(targetY)})`);
        this.moveToPosition(targetX, targetY);
      }
    } else {
      console.log(`[NPC_FOLLOW] ${this.name}: Close enough to player (${Math.round(distance)}px <= ${this.followDistance}px)`);
    }
  }

  public transferToScene(newScene: Phaser.Scene): void {
    // Save current position and state
    if (this.sprite) {
      this.position.x = this.sprite.x;
      this.position.y = this.sprite.y;
      this.sprite.destroy();
      this.nameText?.destroy();
    }

    // Clean up timers
    if (this.timeoutHandle) {
      this.timeoutHandle.destroy();
    }

    // Create sprite in new scene
    this.createSprite(newScene);
    this.setupBehavior();
  }

  public saveState(): void {
    if (this.sprite) {
      this.position.x = this.sprite.x;
      this.position.y = this.sprite.y;
    }
  }

  public prepareForTransfer(): void {
    this.saveState();
    if (this.timeoutHandle) {
      this.timeoutHandle.destroy();
    }
    if (this.followTimer) {
      this.followTimer.destroy();
    }
  }

  public say(message: string): void {
    if (this.speechBubble && this.sprite) {
      this.speechBubble.show(this.sprite.x, this.sprite.y - 60, message, this.name, true, this.sprite);
    }
  }

  // Get available tools for AI decision making
  public getToolsForAI(): Tool[] {
    const tools = this.getAvailableTools();
    console.log(
      `[NPC_FLOW] ${this.name}: Available tools: ${tools
        .map((t) => t.name)
        .join(", ")}`
    );
    return tools;
  }

  public getPosition(): { x: number; y: number } {
    if (this.sprite) {
      return { x: this.sprite.x, y: this.sprite.y };
    }
    return { ...this.position };
  }

  public getSprite(): Phaser.GameObjects.Sprite | null {
    return this.sprite;
  }

  public destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.nameText?.destroy();
      this.sprite = null;
      this.nameText = null;
    }

    if (this.timeoutHandle) {
      this.timeoutHandle.destroy();
    }

    if (this.speechBubble) {
      this.speechBubble.destroy();
    }

    this.currentScene = null;
  }
}
