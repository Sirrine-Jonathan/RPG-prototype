import { AIService } from "../services/AIService";
import { SpeechBubble } from "../ui/SpeechBubble";
import { ActionBubble } from "../ui/ActionBubble";
import { BaseActor, Tool } from "./BaseActor";
import { EventBus } from "../systems/EventBus";
import { Logger, LogTag } from "../utils/Logger";

export class PersistentNPC extends BaseActor {
  public id: string;
  public name: string;
  public personality: string;
  public background: string;
  public sprite: Phaser.GameObjects.Sprite | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;
  private currentScene: Phaser.Scene | null = null;
  private position: { x: number; y: number };
  private config: any;
  private state: any = {};

  // AI and behavior
  private aiService: AIService;
  private speechBubble: SpeechBubble | null = null;
  private actionBubble: ActionBubble | null = null;
  private timeoutHandle?: Phaser.Time.TimerEvent;
  private lastEventTime: number = 0;
  private pendingLLMRequest?: Promise<any>;
  private shouldInterruptLoop: boolean = false; // Flag to interrupt current loop
  private conversationHistory: any[] = []; // Legacy - will be replaced
  private messages: any[] = []; // New message-based context
  private logger = Logger.getInstance();

  // Following behavior
  protected isFollowing: boolean = false;
  protected followDistance: number = 96; // 2 tiles
  protected playerPosition: { x: number; y: number } = { x: 0, y: 0 };
  protected followTimer?: Phaser.Time.TimerEvent;
  private currentMoveTween?: Phaser.Tweens.Tween;

  // Context strategy configuration
  private readonly CONTEXT_STRATEGY:
    | "system_prompt"
    | "conversation_history"
    | "user_feedback"
    | "hybrid"
    | "full_context" = "full_context";
  private readonly MAX_CONTEXT_ACTIONS = 3;
  private readonly MIN_TIMEOUT = 8000; // 8 seconds minimum (reduced for responsiveness)
  private readonly MAX_TIMEOUT = 18000; // 18 seconds maximum (reduced for responsiveness)
  private readonly INITIAL_MIN_TIMEOUT = 2000; // 2 seconds minimum (first action)
  private readonly INITIAL_MAX_TIMEOUT = 5000; // 5 seconds maximum (first action)

  private isFirstTimeout: boolean = true;

  /**
   * Creates a new PersistentNPC with AI behavior, sprite, and event handling
   * @param scene - Phaser scene to add the NPC to
   * @param config - Configuration object with id, name, position, personality, etc.
   */
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

  /**
   * Sets up event listeners for NPC speech events via EventBus
   */
  private setupEventListeners(): void {
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.eventBus) {
      // Listen for speech events from other NPCs
      gameManager.eventBus.subscribe("npc_speech", (event: any) => {
        this.handleSpeechEvent(event.data);
      });
      
      // Note: player_speech events are handled by ProximitySystem calling triggerEvent
      // No need to subscribe directly to avoid duplicate events
    }
  }

  /**
   * Handles speech events from other NPCs - validates scene and distance
   */
  private handleSpeechEvent(speechData: any): void {
    // Don't react to our own speech
    if (speechData.speakerId === this.id) return;

    // Only react to speech from NPCs in the same scene
    if (
      !this.currentScene ||
      speechData.sceneKey !== this.currentScene.scene.key
    ) {
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

  /**
   * Creates the visual sprite, name text, and UI components for the NPC
   */
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
    this.actionBubble = new ActionBubble(scene);

    // Set up click interaction
    this.sprite.on("pointerdown", () => {
      console.log(
        `[NPC_FLOW] ${this.name}: Clicked! Triggering player_interaction event`
      );
      this.triggerEvent("player_interaction");
    });
  }

  /**
   * Initializes AI behavior system and starts random timeout cycle
   */
  private setupBehavior(): void {
    if (!this.currentScene) return;

    this.logger.npcBehavior(this.name, `Setting up AI behavior system`);

    // Listen for our specific timeout event
    const eventBus = EventBus.getInstance();
    eventBus.subscribe(`timeout_event_${this.id}`, () => {
      this.logger.npcBehavior(this.name, `Timeout event fired!`);
      this.triggerEvent("timeout_prompt");
    });

    // Start initial random timeout
    this.startRandomTimeout();
  }

  /**
   * Starts a random timeout for autonomous AI behavior (shorter for first action)
   */
  private startRandomTimeout(): void {
    // Clear existing timeout
    if (this.timeoutHandle) {
      this.timeoutHandle.destroy();
    }

    // Random delay between MIN and MAX (use shorter times for first timeout)
    const minTimeout = this.isFirstTimeout
      ? this.INITIAL_MIN_TIMEOUT
      : this.MIN_TIMEOUT;
    const maxTimeout = this.isFirstTimeout
      ? this.INITIAL_MAX_TIMEOUT
      : this.MAX_TIMEOUT;
    const delay = Math.random() * (maxTimeout - minTimeout) + minTimeout;

    // Mark that we've had our first timeout
    this.isFirstTimeout = false;

    this.timeoutHandle = this.currentScene!.time.addEvent({
      delay: delay,
      callback: () => {
        // Fire NPC-specific timeout event
        const eventBus = EventBus.getInstance();
        this.logger.npcBehavior(
          this.name,
          `Firing timeout event after ${Math.round(delay)}ms`
        );
        eventBus.emit(`timeout_event_${this.id}`, {});
      },
      callbackScope: this,
      loop: false,
    });

    this.logger.npcBehavior(
      this.name,
      `Set random timeout for ${Math.round(delay)}ms`
    );
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
      // Prevent concurrent LLM calls - ignore events if LLM chain is active
      if (this.pendingLLMRequest) {
        console.log(
          `[NPC_FLOW] ${this.name}: LLM chain active, ignoring event: ${eventType}`
        );
        return;
      }

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
        console.log(
          `[NPC_FLOW] ${this.name}: No recent events, but timeout system should handle this`
        );
      }

      // Start new random timeout for next action (unless this was the timeout event)
      if (eventType !== "timeout_prompt") {
        this.startRandomTimeout();
      }
    } catch (error) {
      console.error(`[NPC_FLOW] ${this.name}: AI action failed:`, error);
      this.startRandomTimeout();
    }
  }

  /**
   * Main AI decision-making method - processes events and executes tool chains
   */
  private async handleEvent(eventType: string, eventData: any): Promise<void> {
    this.logger.npcBehavior(this.name, `Handling event "${eventType}"`);

    let chosenAction: string = "none";

    // ALWAYS add event message to conversation history
    let contextDescription = "";
    if (eventType === "player_nearby") {
      contextDescription = `Detective Riley approached you (${Math.round(eventData.distance)}px away).`;
    } else if (eventType === "player_left") {
      contextDescription = `Detective Riley moved away from you (${Math.round(eventData.distance)}px away).`;
    } else if (eventType === "player_speech") {
      contextDescription = `Detective Riley just said: "${eventData.message}" (${Math.round(eventData.distance)}px away). Respond appropriately to what they said.`;
    } else if (eventType === "npc_speech_heard") {
      contextDescription = `${eventData.speakerName} said: "${eventData.message}" (${Math.round(eventData.distance)}px away). React appropriately.`;
    } else if (eventType === "timeout_prompt") {
      contextDescription = `You haven't done anything recently. Consider speaking to nearby characters about Maya's case, sharing information, or asking questions to advance the investigation. Be proactive!`;
    } else if (eventType === "initial_approach") {
      contextDescription = `You just arrived in town and see the detective you hired over the phone. This is your first meeting. You have Maya's photo in your inventory and need to approach them immediately to give it to them and explain the case.`;
    }

    // Add user message for this event
    this.messages.push({
      role: "user",
      content: contextDescription,
      timestamp: Date.now(),
      event: eventType,
    });

    console.log(`[DEBUG] ${this.name}: Added event message. Total messages: ${this.messages.length}`);
    console.log(`[DEBUG] ${this.name}: Messages:`, this.messages.map(m => `${m.role}: ${m.content?.substring(0, 50)}...`));

    // Reset timeout timer for any event
    this.startRandomTimeout();

    // If already processing, cancel current processing and restart with new event
    if (this.pendingLLMRequest) {
      this.logger.npcBehavior(this.name, `Cancelling current processing for new event: ${eventType}`);
      this.pendingLLMRequest = undefined; // Cancel current request
    }

    // For proximity, speech, and timeout events, use AI to generate contextual responses
    if (
      eventType === "player_nearby" ||
      eventType === "player_left" ||
      eventType === "player_speech" ||
      eventType === "npc_speech_heard" ||
      eventType === "timeout_prompt" ||
      eventType === "initial_approach"
    ) {
      try {
        const tools = this.getToolsForAI();
        this.logger.npcBehavior(
          this.name,
          `Using AI for event "${eventType}" with ${tools.length} tools`
        );
        tools.forEach((tool) =>
          this.logger.debug(LogTag.NPC_BEHAVIOR, `- ${tool.name}`, this.name)
        );

        // Build messages for LLM request
        const messages = [
          this.getSystemPrompt(),
          ...this.getRecentMessages()
        ];

        this.logger.llmRequest(
          this.name,
          `Context -> ${contextDescription} (fresh context)`
        );

        this.logger.npcBehavior(
          this.name,
          `Using tool calling for "${eventType}"`
        );

        // Create tool definitions from available tools
        const toolDefinitions = tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters || {
              type: "object",
              properties: tool.name === "speak" ? {
                message: { type: "string", description: "What to say" }
              } : {},
              required: tool.name === "speak" ? ["message"] : [],
            },
          },
        }));

        // Make single LLM request
        this.pendingLLMRequest = this.aiService.generateResponseWithTools(messages, toolDefinitions);
        
        try {
          const response = await this.pendingLLMRequest;
          
          // Reset timeout timer after LLM response
          this.startRandomTimeout();

          this.logger.llmResponse(this.name, `AI response received`, {
            hasToolCalls: response?.tool_calls?.length > 0,
            toolCallCount: response?.tool_calls?.length || 0,
          });

          if (response && response.tool_calls && response.tool_calls.length > 0) {
            // Add assistant message with tool calls
            this.messages.push({
              role: "assistant",
              content: response.content,
              tool_calls: response.tool_calls
            });

            // Execute the first tool call only
            const toolCall = response.tool_calls[0];
            const functionName = toolCall.function.name;
            const args = typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;

            this.logger.llmToolUsed(this.name, functionName, args);

            let toolResult = { success: false, message: "Unknown tool" };
            const availableTools = this.getToolsForAI();
            const tool = availableTools.find((t) => t.name === functionName);

            if (tool && tool.handler) {
              toolResult = await tool.handler(args);
              chosenAction = functionName;
            } else if (functionName === "speak") {
              if (!args.message?.trim()) {
                toolResult = { success: false, message: "Empty speak message" };
              } else {
                toolResult = await this.handleSpeak(args.message);
                chosenAction = "speak";
              }
            } else if (functionName.startsWith("move_")) {
              const direction = functionName.replace("move_", "");
              toolResult = await this.handleMove(direction);
              chosenAction = functionName;
            }

            // Add tool result message
            this.messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult.message
            });

            this.logger.llmToolResult(this.name, functionName, toolResult);
          } else if (response.content) {
            // Add assistant message without tool calls
            this.messages.push({
              role: "assistant",
              content: response.content
            });
          }
        } finally {
          // Always clear the pending request
          this.pendingLLMRequest = undefined;
        }
      } catch (error) {
        // Clear pending request on error
        this.pendingLLMRequest = undefined;

        console.error(
          `[NPC_FLOW] ${this.name}: AI failed for event "${eventType}":`,
          error
        );
        // No fallback actions - let failures be visible for development
        chosenAction = "ai_failed";
      }
    }

    console.log(
      `[NPC_FLOW] ${this.name}: Chose action "${chosenAction}" for event "${eventType}"`
    );
  }

  // Public method to trigger events
  /**
   * Public interface to trigger AI events - validates NPC state and starts processing
   */
  public triggerEvent(eventType: string, eventData?: any): void {
    this.logger.npcEventProcessed(this.name, eventType, eventData);
    this.logger.npcBehavior(this.name, `Received event "${eventType}"`);

    // Check if this NPC is paused by the AI system
    const gameManager = (globalThis as any).gameManager;
    if (
      gameManager &&
      gameManager.systemManager &&
      gameManager.systemManager.aiSystem
    ) {
      if (!gameManager.systemManager.aiSystem.isNPCActive(this.id)) {
        this.logger.npcBehavior(
          this.name,
          `Ignoring event "${eventType}" - NPC is paused`
        );
        return;
      }
    }

    // Clear current timeout and start a new random one (unless this IS the timeout event)
    if (eventType !== "timeout_prompt") {
      this.startRandomTimeout();
    }

    this.logger.npcBehavior(this.name, `Processing event: ${eventType}`);
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
          content:
            "A player just walked up to you and clicked on you to start a conversation. Greet them appropriately.",
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
        const tool = availableTools.find((t) => t.name === functionName);

        if (tool && tool.handler) {
          await tool.handler(args);
        } else if (functionName === "speak") {
          // Validate speak message
          const speakMessage = args.message || "";
          if (!speakMessage.trim()) {
            console.warn(
              `⚠️ [NPC] ${this.name}: Empty speak message in player interaction - skipping`
            );
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

  /**
   * Get recent messages while respecting tool call boundaries
   */
  private getRecentMessages(maxMessages: number = 10): any[] {
    console.log(`[DEBUG] ${this.name}: getRecentMessages called. Total messages: ${this.messages.length}`);
    
    if (this.messages.length <= maxMessages) {
      console.log(`[DEBUG] ${this.name}: Returning all ${this.messages.length} messages`);
      return this.messages;
    }
    
    // Work backwards to find complete conversation boundaries
    let count = 0;
    
    for (let i = this.messages.length - 1; i >= 0 && count < maxMessages; i--) {
      const msg = this.messages[i];
      count++;
      
      // If we hit a user message, this could be a good starting point
      if (msg.role === "user") {
        // Make sure we don't have orphaned tool results before this
        if (i === 0 || this.messages[i-1].role !== "tool") {
          console.log(`[DEBUG] ${this.name}: Found boundary at index ${i}, returning ${this.messages.length - i} messages`);
          return this.messages.slice(i);
        }
      }
    }
    
    console.log(`[DEBUG] ${this.name}: No clean boundary found, returning all messages`);
    return this.messages; // fallback to all messages if no clean boundary found
  }

  /**
   * Get system prompt as message object
   */
  private getSystemPrompt(): any {
    return {
      role: "system",
      content: this.buildSystemPrompt()
    };
  }

  // Build context based on selected strategy
  /**
   * Builds context messages for AI using different strategies (full_context, system_prompt, etc.)
   */
  private buildContextMessages(
    baseMessages: any[],
    contextDescription: string,
    historyToUse?: any[]
  ): any[] {
    const conversationHistory = historyToUse || this.conversationHistory;
    const recentToolResults = conversationHistory
      .filter((msg) => msg.role === "tool")
      .slice(-this.MAX_CONTEXT_ACTIONS);

    switch (this.CONTEXT_STRATEGY) {
      case "full_context":
        // Include complete conversation with assistant messages, tool calls, and tool results
        const fullMessages = [baseMessages[0]]; // system prompt

        // Add recent conversation history with proper structure
        const recentHistory = conversationHistory.slice(-10); // Last 10 interactions
        for (let i = 0; i < recentHistory.length; i++) {
          const msg = recentHistory[i];
          if (msg.role === "tool") {
            // Add assistant message that would have made the tool call
            fullMessages.push({
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: `tool_${Date.now()}_${Math.random()}`,
                  type: "function",
                  function: {
                    name: msg.toolName || "unknown_tool",
                    arguments: JSON.stringify(msg.toolArgs || {}),
                  },
                },
              ],
            });

            // Add tool result
            fullMessages.push({
              role: "tool",
              tool_call_id: `tool_${Date.now()}_${Math.random()}`,
              content: this.parseToolResult(msg.content),
            });
          }
        }

        fullMessages.push(baseMessages[1]); // user message
        return fullMessages;

      case "conversation_history":
        // Keep recent tool results as conversation messages
        return [
          baseMessages[0], // system prompt
          ...recentToolResults.map((result) => ({
            role: "tool",
            tool_call_id: `tool_${Date.now()}_${Math.random()}`,
            content: this.parseToolResult(result.content),
          })),
          baseMessages[1], // user message
        ];

      case "user_feedback":
        // Add user feedback about repetitive behavior
        const messages = [...baseMessages];
        if (this.isRepetitiveBehavior(recentToolResults)) {
          messages.splice(-1, 0, {
            role: "user",
            content:
              "You've been repeating the same actions. Try something different - speak to nearby characters or use available interaction tools.",
            timestamp: Date.now(),
          });
        }
        return messages;

      case "hybrid":
        // Combine system prompt context + conversation history
        return [
          baseMessages[0], // system prompt (already has RECENT ACTIONS)
          ...recentToolResults.slice(-2).map((result) => ({
            role: "assistant",
            content: `I ${this.parseToolResult(result.content).toLowerCase()}.`,
          })),
          baseMessages[1], // user message
        ];

      case "system_prompt":
      default:
        // Current approach - context in system prompt
        return baseMessages;
    }
  }

  private parseToolResult(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return parsed.message || content;
    } catch (e) {
      return content;
    }
  }

  private isRepetitiveBehavior(recentResults: any[]): boolean {
    if (recentResults.length < 3) return false;

    const actions = recentResults.map((r) => {
      const parsed = this.parseToolResult(r.content);
      return parsed.split(" ")[0]; // Get action verb
    });

    // Check if last 3 actions are the same or similar movement
    const lastThree = actions.slice(-3);
    return lastThree.every(
      (action) => action.includes("moved") || action.includes("move")
    );
  }

  // Build system prompt - can be overridden by subclasses
  /**
   * Builds comprehensive system prompt with spatial awareness and behavioral guidelines
   */
  protected buildSystemPrompt(): string {
    const currentPos = this.getPosition();

    // Get nearby objects for interaction (narrow range)
    const nearbyObjects = this.getNearbyObjects();
    const nearbyObjectNames = nearbyObjects.map(
      (obj) => obj.id || obj.name || "Unknown Object"
    );

    // Get all visible targets for movement (wide range)
    const visibleTargets = this.getVisibleTargets();
    const visibleObjects = visibleTargets.filter((t) => t.type === "object");
    const visibleNPCs = visibleTargets.filter((t) => t.type === "npc");

    // Get map boundaries from BoundarySystem
    const gameManager = (globalThis as any).gameManager;
    let boundsInfo = "MAP BOUNDARIES: 0,0 to 2784,1824 (stay 48px from edges)";
    if (gameManager?.systemManager?.boundarySystem) {
      const bounds = gameManager.systemManager.boundarySystem.getBounds();
      if (bounds) {
        boundsInfo = `MAP BOUNDARIES: 0,0 to ${bounds.width},${bounds.height} (stay 48px from edges)`;
      }
    }

    // Build spatial context with coordinates
    const spatialContext = [];

    // Add current position
    spatialContext.push(`YOUR LOCATION: (${currentPos.x}, ${currentPos.y})`);

    // Add map boundaries
    spatialContext.push(boundsInfo);

    // Add visible NPCs with positions
    if (visibleNPCs.length > 0) {
      spatialContext.push(`PEOPLE NEARBY:`);
      visibleNPCs.forEach((npc) => {
        const distance = Math.round(
          Math.sqrt(
            (npc.position.x - currentPos.x) ** 2 +
              (npc.position.y - currentPos.y) ** 2
          )
        );
        spatialContext.push(
          `- ${npc.id} at (${npc.position.x}, ${npc.position.y}) - ${distance}px away`
        );
      });
    }

    // Add player to spatial awareness
    const player = gameManager?.entityManager?.getPlayer();
    if (player) {
      const playerPos = player.getPosition();
      const distance = Math.round(
        Math.sqrt(
          (playerPos.x - currentPos.x) ** 2 + (playerPos.y - currentPos.y) ** 2
        )
      );

      if (visibleNPCs.length === 0) {
        spatialContext.push(`PEOPLE NEARBY:`);
      }
      spatialContext.push(
        `- ${player.id} at (${playerPos.x}, ${playerPos.y}) - ${distance}px away`
      );
    }

    // Add visible objects with positions and usable IDs
    if (visibleObjects.length > 0) {
      spatialContext.push(`OBJECTS NEARBY:`);
      visibleObjects.forEach((obj) => {
        const distance = Math.round(
          Math.sqrt(
            (obj.position.x - currentPos.x) ** 2 +
              (obj.position.y - currentPos.y) ** 2
          )
        );
        spatialContext.push(
          `- ${obj.id} at (${obj.position.x}, ${obj.position.y}) - ${distance}px away`
        );
      });
    }

    // Add recent actions context from conversation history
    let recentActionsSection = "";
    const recentToolResults = this.conversationHistory
      .filter((msg) => msg.role === "tool")
      .slice(-3); // Last 3 tool results

    if (recentToolResults.length > 0) {
      recentActionsSection = "\n\nRECENT ACTIONS:\n";
      recentToolResults.forEach((result, index) => {
        try {
          const parsed = JSON.parse(result.content);
          recentActionsSection += `- ${parsed.message}\n`;
        } catch (e) {
          // Fallback if parsing fails
          recentActionsSection += `- ${result.content}\n`;
        }
      });
    }

    return `You are ${this.name}, a ${
      this.personality
    } character with background: ${
      this.background
    }. You are currently walking around outdoors in the town center/streets.

SPATIAL AWARENESS:
${spatialContext.join("\n")}

INTERACTION RANGE: Objects within 48px for interaction, 150px for speech${recentActionsSection}

BEHAVIORAL GUIDELINES:
- Be proactive in conversations - don't just wait for others to speak
- Share relevant information about Maya's case when appropriate
- Ask questions to advance the investigation
- Speak to nearby characters frequently to build rapport
- Move purposefully toward Detective Riley when you have information to share
- Stay engaged in the mystery - this is urgent and important
- Avoid repetitive actions - vary your behavior and responses`;
  }

  // Implement BaseActor abstract method
  protected setPosition(x: number, y: number): void {
    this.logger.debug(LogTag.NPC_BEHAVIOR, `setPosition: (${this.position.x}, ${this.position.y}) → (${x}, ${y})`, this.name);
    
    this.position.x = x;
    this.position.y = y;

    if (this.sprite) {
      this.sprite.setPosition(x, y);
    }

    if (this.nameText) {
      this.nameText.setPosition(x, y - 35);
    }

    // Update centralized position tracker
    const positionTracker = (globalThis as any).positionTracker;
    if (positionTracker) {
      positionTracker.updatePosition(this.id, x, y);
    }
  }

  // Implement smooth movement using pathfinding
  protected moveToPosition(x: number, y: number): Promise<void> {
    return new Promise((resolve) => {
      console.log(
        `[NPC_FLOW] ${this.name}: moveToPosition called - sprite: ${!!this
          .sprite}, scene: ${!!this.sprite?.scene}`
      );

      if (!this.sprite || !this.currentScene) {
        console.log(
          `[NPC_FLOW] ${this.name}: No sprite/scene - teleporting to (${x}, ${y})`
        );
        this.setPosition(x, y);
        resolve();
        return;
      }

      // Stop any existing movement and reset animation
      if (this.currentMoveTween) {
        this.currentMoveTween.stop();
        this.currentMoveTween = undefined;
        
        // Reset to idle animation
        const spriteKey = this.config.spriteKey || "adam";
        const idleAnimKey = `${spriteKey}_idle_down`;
        if (this.sprite.anims && this.sprite.scene.anims.exists(idleAnimKey)) {
          this.sprite.play(idleAnimKey, true);
        }
      }

      const currentPos = this.getPosition();
      const distance = Math.sqrt(
        Math.pow(x - currentPos.x, 2) + Math.pow(y - currentPos.y, 2)
      );

      // Use slower, more realistic movement speed like pathfinding system
      const moveSpeed = 150; // pixels per second
      const duration = Math.max(500, (distance / moveSpeed) * 1000); // At least 500ms

      console.log(
        `[NPC_FLOW] ${this.name}: Animating from (${currentPos.x}, ${currentPos.y}) to (${x}, ${y}) over ${duration}ms`
      );

      // Determine direction for animation
      const dx = x - currentPos.x;
      const dy = y - currentPos.y;
      let direction = "down";
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? "right" : "left";
      } else {
        direction = dy > 0 ? "down" : "up";
      }

      // Play walking animation (use NPC's own sprite key)
      const spriteKey = this.config.spriteKey || "adam";
      const animKey = `${spriteKey}_walk_${direction}`;
      if (this.sprite.anims && this.sprite.scene.anims.exists(animKey)) {
        this.sprite.play(animKey, true);
      }

      // Use the same tween approach as pathfinding system
      this.currentMoveTween = this.currentScene.tweens.add({
        targets: [this.sprite, this.nameText],
        x: x,
        y: (target: any) => (target === this.nameText ? y - 35 : y),
        duration: duration,
        ease: "Linear", // Same as pathfinding system
        onUpdate: () => {
          // Keep animation playing during tween (like pathfinding system)
          if (
            this.sprite.anims &&
            this.sprite.anims.currentAnim &&
            this.sprite.anims.currentAnim.key === animKey
          ) {
            // Animation is still playing, good
          } else if (
            this.sprite.anims &&
            this.sprite.scene.anims.exists(animKey)
          ) {
            // Animation stopped, restart it
            this.sprite.play(animKey, true);
          }
        },
        onComplete: () => {
          console.log(
            `[NPC_FLOW] ${this.name}: Animation completed at (${x}, ${y})`
          );
          this.setPosition(x, y);

          // Play idle animation (like pathfinding system)
          const idleAnimKey = `${spriteKey}_idle_${direction}`;
          if (
            this.sprite.anims &&
            this.sprite.scene.anims.exists(idleAnimKey)
          ) {
            this.sprite.play(idleAnimKey, true);
          }

          this.currentMoveTween = undefined;
          resolve();
        },
        onStop: () => {
          // Handle interruption - reset to idle animation
          const idleAnimKey = `${spriteKey}_idle_${direction}`;
          if (
            this.sprite.anims &&
            this.sprite.scene.anims.exists(idleAnimKey)
          ) {
            this.sprite.play(idleAnimKey, true);
          }
          
          this.currentMoveTween = undefined;
          resolve();
        }
      });
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
        name: "speak",
        description: "Speak to nearby characters",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string", description: "What to say" },
          },
          required: ["message"],
        },
        handler: async (params) => this.handleSpeak(params.message),
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
      tools.push(
        ...persistentTools.filter(
          (tool) =>
            !["move_north", "move_south", "move_east", "move_west"].includes(
              tool.name
            )
        )
      );
    } else {
      tools.push(...persistentTools);
    }

    // Add conditional tools
    tools.push(...this.getConditionalTools());

    // Add tools offered by nearby objects
    const nearbyObjects = this.getNearbyObjects();
    nearbyObjects.forEach((obj) => {
      tools.push(...obj.getOfferedTools());
    });

    return tools;
  }

  // Override BaseActor methods - NPCs offer give tools to others
  public getOfferedTools(): Tool[] {
    const toolName = `give_${this.id.toLowerCase().replace(/\s+/g, "_")}`;
    return [
      {
        name: toolName,
        description: `Give an item to ${this.name}`,
        parameters: {
          type: "object",
          properties: {
            item: { type: "string", description: "Item to give" },
            item_name: { type: "string", description: "Name of item to give" },
          },
          required: [],
        },
        handler: async (params) => {
          const itemToGive = params.item || params.item_name;
          return {
            success: true,
            message: `${this.name} received ${itemToGive}`,
          };
        },
      },
    ];
  }

  // Override to add NPC-specific persistent tools
  protected getPersistentTools(): Tool[] {
    const baseTools = super.getPersistentTools();

    // Only add toggle_following tool for assistant NPCs
    if (this.constructor.name === "AssistantNPC") {
      baseTools.push({
        name: "toggle_following",
        description: "Start or stop following the player",
        parameters: {
          type: "object",
          properties: {
            follow: {
              type: "boolean",
              description: "Whether to follow the player",
            },
          },
          required: ["follow"],
        },
        handler: async (params) => this.handleToggleFollowing(params.follow),
      });
    }

    // Add story progression tools for Grace Sirrine
    if (this.name === "Grace Sirrine") {
      baseTools.push({
        name: "give_mayas_photo",
        description: "Give Maya's photo to Detective Riley - crucial evidence for the investigation",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
        handler: async (params) => this.handleGiveMayasPhoto(),
      });

      baseTools.push({
        name: "suggest_location",
        description: "Suggest Detective Riley visit a specific location to continue the investigation",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              enum: ["police_station", "library", "school", "hospital"],
              description: "Location to suggest visiting"
            },
            reason: {
              type: "string", 
              description: "Why this location is important for the investigation"
            }
          },
          required: ["location", "reason"],
        },
        handler: async (params) => this.handleSuggestLocation(params.location, params.reason),
      });
    }

    // Add evidence tools for NPCs in different locations
    if (this.name.includes("Librarian") || this.currentScene?.scene.key === "NewLibraryScene") {
      baseTools.push({
        name: "give_library_clue",
        description: "Give Detective Riley a clue found at the library about Maya",
        parameters: { type: "object", properties: {}, required: [] },
        handler: async (params) => this.handleGiveEvidence("library_clue", "Library Clue", "Maya was seen reading about local history before she disappeared. She seemed particularly interested in old town records.")
      });
    }

    if (this.name.includes("Teacher") || this.currentScene?.scene.key === "SchoolScene") {
      baseTools.push({
        name: "give_school_clue", 
        description: "Give Detective Riley information about Maya from the school",
        parameters: { type: "object", properties: {}, required: [] },
        handler: async (params) => this.handleGiveEvidence("school_clue", "School Clue", "Maya's teacher noticed she was asking questions about missing persons cases. She seemed worried about something.")
      });
    }

    return baseTools;
  }

  // Handle following toggle
  protected async handleToggleFollowing(
    follow: boolean
  ): Promise<{ success: boolean; message: string }> {
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

  // Story progression handlers
  protected async handleGiveMayasPhoto(): Promise<{ success: boolean; message: string }> {
    const inventory = InventorySystem.getInstance();
    const gameManager = (globalThis as any).gameManager;
    
    // Add Maya's photo to Grace's inventory if not present
    const graceInventory = inventory.getInventory(this.name);
    const hasPhoto = graceInventory.some(item => item.id === "mayas_photo" || item.name.includes("Maya"));
    
    if (!hasPhoto) {
      inventory.addItem(this.name, {
        id: "mayas_photo",
        name: "Maya's Photo",
        description: "A recent photo of Maya showing her at the library entrance. This is crucial evidence.",
        category: "Evidence"
      });
    }

    // Give photo to Detective Riley
    const success = inventory.transferItem(this.name, "Detective Riley", "mayas_photo");
    
    if (success) {
      // Trigger story progression and win condition check
      const storyManager = gameManager?.storyProgressManager;
      if (storyManager) {
        storyManager.completePuzzle("received_photo");
      }

      // Add to win condition manager
      const winManager = gameManager?.winConditionManager;
      if (winManager) {
        winManager.addEvidence("mayas_photo");
      }
      
      this.say("Here's Maya's photo, Detective. She was last seen at the library.");
      return { success: true, message: "You gave Maya's photo to Detective Riley. This is crucial evidence for the investigation." };
    } else {
      return { success: false, message: "Could not give Maya's photo - Detective Riley not found nearby." };
    }
  }

  protected async handleGiveEvidence(evidenceId: string, evidenceName: string, description: string): Promise<{ success: boolean; message: string }> {
    const inventory = InventorySystem.getInstance();
    const gameManager = (globalThis as any).gameManager;
    
    // Add evidence to NPC inventory
    inventory.addItem(this.name, {
      id: evidenceId,
      name: evidenceName,
      description: description,
      category: "Evidence"
    });

    // Give to Detective Riley
    const success = inventory.transferItem(this.name, "Detective Riley", evidenceId);
    
    if (success) {
      // Add to win condition manager
      const winManager = gameManager?.winConditionManager;
      if (winManager) {
        winManager.addEvidence(evidenceId);
      }
      
      this.say(`Here's what I found about Maya: ${description}`);
      return { success: true, message: `You received ${evidenceName} from ${this.name}` };
    } else {
      return { success: false, message: `Could not give ${evidenceName} - Detective Riley not found nearby.` };
    }
  }

  protected async handleSuggestLocation(location: string, reason: string): Promise<{ success: boolean; message: string }> {
    const gameManager = (globalThis as any).gameManager;
    
    // Create a portal/transition to the suggested location
    this.say(`Detective, I suggest we go to the ${location}. ${reason}`);
    
    // Emit event for scene transition
    if (gameManager?.eventBus) {
      gameManager.eventBus.emit('location_suggested', {
        location: location,
        reason: reason,
        suggestedBy: this.name
      });
    }
    
    return { success: true, message: `You suggested visiting the ${location}: ${reason}` };
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
      loop: true,
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

    // Get actual player position from PositionTracker
    const positionTracker = (globalThis as any).positionTracker;
    if (!positionTracker) return;

    const playerPos = positionTracker.getPosition("player");
    if (!playerPos) return;

    const gameManager = (globalThis as any).gameManager;

    const currentPos = this.getPosition();
    const distance = Math.sqrt(
      (playerPos.x - currentPos.x) ** 2 + (playerPos.y - currentPos.y) ** 2
    );

    // Only move if player is far enough away (maintain comfortable distance)
    const minDistance = 48; // Minimum comfortable distance
    const maxDistance = this.followDistance; // Maximum follow distance

    if (distance > maxDistance) {
      console.log(
        `[NPC_FOLLOW] ${this.name}: Following player (${Math.round(
          distance
        )}px away)`
      );

      // Calculate direction to player
      const deltaX = playerPos.x - currentPos.x;
      const deltaY = playerPos.y - currentPos.y;
      const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Use pathfinding system for intelligent following
      if (
        gameManager?.systemManager?.pathfindingSystem &&
        !gameManager.systemManager.pathfindingSystem.isPathfindingActive()
      ) {
        // Move to a position that maintains comfortable distance
        const normalizedX = deltaX / magnitude;
        const normalizedY = deltaY / magnitude;
        const targetDistance = (minDistance + maxDistance) / 2; // Target middle distance
        const targetX = playerPos.x - normalizedX * targetDistance;
        const targetY = playerPos.y - normalizedY * targetDistance;

        gameManager.systemManager.pathfindingSystem.movePlayerTo(
          this,
          targetX,
          targetY
        );
      } else {
        // Fallback to direct movement
        const normalizedX = deltaX / magnitude;
        const normalizedY = deltaY / magnitude;

        // Move toward player but maintain minimum distance
        const moveDistance = Math.min(48, distance - minDistance);
        const targetX = currentPos.x + normalizedX * moveDistance;
        const targetY = currentPos.y + normalizedY * moveDistance;

        this.moveToPosition(targetX, targetY);
      }
    } else if (distance < minDistance) {
      // Too close - back away slightly
      console.log(
        `[NPC_FOLLOW] ${this.name}: Too close, backing away (${Math.round(
          distance
        )}px)`
      );
      const deltaX = currentPos.x - playerPos.x;
      const deltaY = currentPos.y - playerPos.y;
      const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (magnitude > 0) {
        const normalizedX = deltaX / magnitude;
        const normalizedY = deltaY / magnitude;
        const backAwayDistance = minDistance - distance + 12;
        const targetX = currentPos.x + normalizedX * backAwayDistance;
        const targetY = currentPos.y + normalizedY * backAwayDistance;

        this.moveToPosition(targetX, targetY);
      }
    }
    // Don't log when at comfortable distance - reduces spam
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

  /**
   * Shows action bubble above NPC for non-speech tool usage
   */
  private showActionBubble(message: string): void {
    if (this.actionBubble && this.sprite) {
      this.actionBubble.show(
        this.sprite.x,
        this.sprite.y - 60,
        message,
        this.sprite
      );
    }
  }

  /**
   * Formats action messages for display in action bubbles based on tool type
   */
  private formatActionMessage(
    toolName: string,
    args: any,
    result: any
  ): string {
    // Format action messages based on tool type
    switch (toolName) {
      case "toggle_following":
        return this.isFollowing
          ? `*${this.name} started following you*`
          : `*${this.name} stopped following you*`;

      case "give_item":
        return `*${this.name} gives you ${args.item_name || "an item"}*`;

      case "move_north":
      case "move_south":
      case "move_east":
      case "move_west":
        const direction = toolName.replace("move_", "");
        return `*${this.name} moved ${direction}*`;

      default:
        // Generic format for other tools
        if (result.message) {
          return `*${this.name} ${result.message.toLowerCase()}*`;
        }
        return `*${this.name} used ${toolName}*`;
    }
  }

  /**
   * Displays speech bubble above NPC (always visible to player)
   */
  public say(message: string): void {
    if (this.speechBubble && this.sprite) {
      this.speechBubble.show(
        this.sprite.x,
        this.sprite.y - 60,
        message,
        this.name,
        true,
        this.sprite
      );
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

    if (this.actionBubble) {
      this.actionBubble.destroy();
    }

    this.currentScene = null;
  }
}
