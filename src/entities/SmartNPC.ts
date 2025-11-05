import { Scene } from "phaser";
import { AIService, NPCContext, NPCTool } from "../services/AIService";
import { InteractiveObject } from "./InteractiveObject";
import { SpeechBubble } from "../ui/SpeechBubble";

const ACTION_DELAY = 5000; // 5 seconds between actions
const LINE_OF_SIGHT_RANGE = 150;

export interface Character {
  id: string;
  name: string;
  getPosition(): { x: number; y: number };
}

export class SmartNPC implements Character {
  public sprite: Phaser.GameObjects.Sprite;
  public nameText: Phaser.GameObjects.Text;
  public scene: Scene;
  public id: string;
  public name: string;
  public personality: string;
  public background: string;

  private aiService: AIService;
  private actionTimer?: Phaser.Time.TimerEvent;
  private speechBubble: SpeechBubble;
  private isInPlayerConversation: boolean = false;
  private isCurrentlySpeaking: boolean = false;

  // LLM request tracking
  private lastLLMRequest: number = 0;
  private llmRequestCount: number = 0;
  private activityTimer?: Phaser.Time.TimerEvent;

  // Discovery and awareness
  private discoveredObjects: Set<string> = new Set();
  private discoveredCharacters: Set<string> = new Set();
  private conversationMessages: Array<{
    role: string;
    content?: string;
    tool_calls?: any;
    name?: string;
  }> = [];
  private lastDirection = "down";

  // Room context
  private roomObjects: InteractiveObject[] = [];
  private roomCharacters: Character[] = [];
  private roomGrid: number[][] = [];

  constructor(
    scene: Scene,
    x: number,
    y: number,
    spriteKey: string,
    name: string,
    personality: string,
    background: string,
    role: string = "civilian"
  ) {
    this.scene = scene;
    this.id = `${spriteKey}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`; // Unique ID
    this.name = name;
    this.personality = personality;
    this.background = background;
    this.aiService = AIService.getInstance();
    this.speechBubble = new SpeechBubble(scene);

    // Listen for global town speech events
    this.scene.events.on("town-speech", this.onTownSpeech, this);

    // Create sprite
    this.sprite = scene.add.sprite(x, y, spriteKey, 0);
    this.sprite.setScale(2);
    this.sprite.setInteractive();

    // Play idle animation
    if (spriteKey === "alex") {
      this.sprite.play("alex_idle_down");
    } else if (spriteKey === "amelia") {
      this.sprite.play("amelia_idle_down");
    } else if (spriteKey === "bob") {
      this.sprite.play("bob_idle_down");
    } else {
      this.sprite.setFrame(0);
    }

    // Create name text
    this.nameText = scene.add
      .text(x, y - 35, name, {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 6, y: 3 },
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setAlpha(0.9);

    this.startAILoop();

    // Start activity monitoring
    this.activityTimer = this.scene.time.addEvent({
      delay: 30000, // Every 30 seconds
      callback: this.logActivity,
      callbackScope: this,
      loop: true,
    });
  }

  private logActivity(): void {
    const avgRequestInterval =
      this.llmRequestCount > 1
        ? (Date.now() -
            (this.lastLLMRequest - (this.llmRequestCount - 1) * 1000)) /
          this.llmRequestCount
        : 0;

    console.log(
      `📊 ${this.name}: Activity Summary - ${
        this.llmRequestCount
      } LLM requests, avg interval: ${Math.round(
        avgRequestInterval
      )}ms, in conversation: ${this.isInPlayerConversation}`
    );
  }

  private startAILoop(): void {
    console.log(`🧠 ${this.name}: Starting AI loop`);
    // Stagger NPC startup to prevent simultaneous LLM requests
    const delay = Math.random() * 3000; // 0-3 second random delay
    setTimeout(() => {
      this.performAIAction();
    }, delay);
  }

  private async performAIAction(): Promise<void> {
    // Skip AI actions if in player conversation
    if (this.isInPlayerConversation) {
      console.log(`⏸️ ${this.name}: Skipping AI action - in player conversation`);
      return;
    }

    // Update line of sight and check proximity
    this.updateLineOfSight();

    // Check if player moved away during conversation
    if (this.isInPlayerConversation && !this.isPlayerNearby()) {
      console.log(`🚶 ${this.name}: Player moved away, ending conversation`);
      this.isInPlayerConversation = false;
    }

    const context = this.buildAIContext();

    try {
      // Track LLM request frequency
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastLLMRequest;
      this.lastLLMRequest = now;
      this.llmRequestCount++;

      console.log(
        `🕐 ${this.name}: LLM Request #${this.llmRequestCount} (${timeSinceLastRequest}ms since last request)`
      );

      const decision = await this.aiService.generateNPCAction(
        context,
        this.conversationMessages
      );

      console.log(`🤖 ${this.name}: LLM Decision:`, {
        action: decision.action,
        parameters: decision.parameters,
        reasoning: decision.reasoning,
      });

      if (!decision.action) {
        throw new Error("LLM returned undefined action");
      }

      const result = await this.executeAction(
        decision.action,
        decision.parameters
      );

      console.log(
        `📝 ${this.name}: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}: ${
          result.message
        }`
      );

      // Add to conversation history
      this.conversationMessages.push({
        role: "assistant",
        content: `I chose action: ${decision.action}${
          decision.parameters
            ? ` with parameters: ${JSON.stringify(decision.parameters)}`
            : ""
        }. Reasoning: ${decision.reasoning}`,
        tool_calls: decision.tool_calls,
      });

      this.conversationMessages.push({
        role: "tool",
        content: result.success
          ? `SUCCESS: ${result.message}`
          : `FAILED: ${result.message}`,
        name: decision.action,
      });

      // Keep conversation manageable
      if (this.conversationMessages.length > 20) {
        this.conversationMessages = this.conversationMessages.slice(-10);
      }

      // Continue AI loop
      setTimeout(() => {
        if (!this.isInPlayerConversation) {
          this.performAIAction();
        }
      }, ACTION_DELAY);
    } catch (error) {
      console.error(`AI action failed for ${this.name}:`, error);
      setTimeout(() => {
        if (!this.isInPlayerConversation) {
          this.performAIAction();
        }
      }, ACTION_DELAY);
    }
  }

  private updateLineOfSight(): void {
    const myPos = this.getPosition();
    this.discoveredObjects.clear();
    this.discoveredCharacters.clear();

    // Check objects within proximity range
    this.roomObjects.forEach((obj) => {
      const distance = Phaser.Math.Distance.Between(
        myPos.x,
        myPos.y,
        obj.getPosition().x,
        obj.getPosition().y
      );
      if (distance < LINE_OF_SIGHT_RANGE) {
        this.discoveredObjects.add(obj.id);
      }
    });

    // Check characters within proximity range
    this.roomCharacters.forEach((char) => {
      if (char.id !== this.id) {
        const distance = Phaser.Math.Distance.Between(
          myPos.x,
          myPos.y,
          char.getPosition().x,
          char.getPosition().y
        );
        if (distance < LINE_OF_SIGHT_RANGE * 1.5) {
          this.discoveredCharacters.add(char.id);
        }
      }
    });
  }

  private buildAIContext(): NPCContext {
    const visibleObjects = Array.from(this.discoveredObjects)
      .map((id) => this.roomObjects.find((obj) => obj.id === id))
      .filter((obj) => obj)
      .map((obj) => obj!.getStateDescription());

    const visibleCharacters = Array.from(this.discoveredCharacters)
      .map((id) => this.roomCharacters.find((char) => char.id === id))
      .filter((char) => char)
      .map((char) => char!.name);

    const availableTools = this.getAvailableTools();
    const contextHistory = this.conversationMessages.slice(-5);

    // Add specific goals and motivations based on character
    const goals = this.getCharacterGoals();

    return {
      name: this.name,
      background: this.background,
      personality: this.personality,
      currentLocation: "current room",
      visibleObjects,
      visibleCharacters,
      availableTools,
      conversationHistory: contextHistory,
      currentGoals: goals,
    };
  }

  private getCharacterGoals(): string[] {
    const name = this.name.toLowerCase();
    
    if (name.includes('doctor') || name.includes('thompson')) {
      return [
        "Investigate the mysterious illness affecting townspeople",
        "Gather symptoms and medical information from residents", 
        "Find the source of the strange ailments",
        "Document unusual patient behaviors and patterns"
      ];
    }
    
    if (name.includes('sheriff') || name.includes('martinez')) {
      return [
        "Maintain law and order in the town",
        "Investigate reports of strange occurrences", 
        "Question strangers and newcomers",
        "Protect townspeople from potential threats",
        "Gather information about the Whispering Stones incidents"
      ];
    }
    
    if (name.includes('sage') || name.includes('eleanor')) {
      return [
        "Research the ancient history of the Whispering Stones",
        "Decode old texts and manuscripts about the town's past",
        "Share knowledge with those who seek understanding",
        "Uncover the truth behind the mystical events",
        "Preserve important historical information"
      ];
    }
    
    if (name.includes('sarah')) {
      return [
        "Gather gossip and information from townspeople and visitors",
        "Help newcomers feel welcome while protecting town secrets",
        "Keep track of who's coming and going",
        "Share local knowledge and rumors",
        "Maintain her position as the town's information hub"
      ];
    }
    
    if (name.includes('marcus') || name.includes('webb')) {
      return [
        "Identify profitable business opportunities in town",
        "Investigate the commercial potential of recent strange events",
        "Build relationships with key townspeople",
        "Gather information about valuable resources or artifacts",
        "Establish trade connections and partnerships"
      ];
    }
    
    // Default goals for other NPCs
    return [
      "Interact with townspeople and visitors",
      "Share information about local events",
      "Maintain daily routines and responsibilities"
    ];
  }

  private getAvailableTools(): NPCTool[] {
    const tools: NPCTool[] = [];

    // When in player conversation, only allow conversation tools
    if (this.isInPlayerConversation) {
      tools.push(
        { name: "speak", description: "Continue the conversation" },
        { name: "leave_conversation", description: "End the conversation" }
      );
      return tools;
    }

    // Normal tools
    tools.push(
      { name: "wait", description: "Do nothing and observe the surroundings" },
      {
        name: "move_north",
        description: "Move north (up) to explore that area",
      },
      {
        name: "move_south",
        description: "Move south (down) to explore that area",
      },
      {
        name: "move_east",
        description: "Move east (right) to explore that area",
      },
      {
        name: "move_west",
        description: "Move west (left) to explore that area",
      }
    );

    // Always add movement tools (removed player proximity restriction)
    tools.push(
      {
        name: "move_random",
        description: "Walk to a different area of the room",
      },
      { name: "patrol", description: "Move around the room to patrol the area" }
    );

    // Add interaction tools for discovered objects
    console.log(
      `🔍 ${this.name}: Discovered objects:`,
      Array.from(this.discoveredObjects)
    );
    Array.from(this.discoveredObjects).forEach((objId) => {
      const obj = this.roomObjects.find((o) => o.id === objId);
      if (obj && typeof obj.getOfferedTools === "function") {
        const objectTools = obj.getOfferedTools();
        objectTools.forEach((tool) => {
          tools.push({
            name: `${tool.name}_${obj.id}`,
            description: `${tool.description} (${obj.name})`,
            parameters: { objectId: obj.id, ...tool.parameters },
          });
        });
      }
    });

    // Add interaction tools for discovered characters
    console.log(
      `🔍 ${this.name}: Discovered characters:`,
      Array.from(this.discoveredCharacters)
    );
    Array.from(this.discoveredCharacters).forEach((charId) => {
      const character = this.roomCharacters.find((c) => c.id === charId);
      if (character && character.id !== this.id) {
        // Only add speak tools if not currently speaking
        if (!this.isCurrentlySpeaking) {
          // Add speak_to tool for player
          if (character.id === "player") {
            tools.push({
              name: "speak_to_player",
              description: `Start a conversation with the visitor`,
              parameters: { characterId: "player" },
            });
          } else {
            // Add speak_to tool for other NPCs
            tools.push({
              name: `speak_to_${character.id}`,
              description: `Start a conversation with ${character.name}`,
              parameters: { characterId: character.id },
            });
          }
        }

        const distance = Phaser.Math.Distance.Between(
          this.getPosition().x,
          this.getPosition().y,
          character.getPosition().x,
          character.getPosition().y
        );

        if (distance > 100 && character.id !== "player") {
          tools.push({
            name: `move_to_${character.id}`,
            description: `Move closer to ${character.name}`,
            parameters: { characterId: character.id },
          });
        }
      }
    });

    console.log(
      `🔧 ${this.name}: Available tools:`,
      tools.map((t) => t.name)
    );
    return tools;
  }

  private isPlayerNearby(): boolean {
    const player = this.roomCharacters.find((c) => c.id === "player");
    if (!player) return false;

    const distance = Phaser.Math.Distance.Between(
      this.getPosition().x,
      this.getPosition().y,
      player.getPosition().x,
      player.getPosition().y
    );

    return distance < 80;
  }

  private async executeAction(
    action: string,
    parameters?: any
  ): Promise<{ success: boolean; message: string }> {
    const pos = this.getPosition();
    console.log(
      `⚡ ${this.name} @(${Math.round(pos.x)},${Math.round(
        pos.y
      )}): Executing action '${action}'${
        parameters ? ` with params: ${JSON.stringify(parameters)}` : ""
      }`
    );

    switch (action) {
      case "wait":
        return { success: true, message: "Observed surroundings" };

      case "move_north":
      case "move_south":
      case "move_east":
      case "move_west":
        const direction = action.split("_")[1];
        return this.moveInDirection(direction);

      case "move_random":
      case "patrol":
        this.moveRandomly();
        return { success: true, message: "Moved to new area" };

      case "leave_conversation":
        console.log(`🚪 ${this.name}: Ending player conversation`);
        this.isInPlayerConversation = false;
        return { success: true, message: "Ended conversation" };

      case "speak_to_player":
        const player = this.roomCharacters.find((c) => c.id === "player");
        if (player) {
          console.log(`🗣️ ${this.name}: Speaking to player`);
          await this.speakToTown(); // Let AI generate contextual response
          return { success: true, message: "Started conversation with player" };
        }
        return { success: false, message: "Player not found" };

      default:
        // Handle dynamic character and object actions
        const actionParts = action.split("_");
        if (actionParts.length >= 2) {
          let baseAction: string;
          let targetId: string;

          // Handle speak_to_X actions specially
          if (action.startsWith("speak_to_")) {
            baseAction = "speak_to";
            targetId = action.substring(9); // Remove "speak_to_" prefix
          } else if (action.startsWith("move_to_")) {
            baseAction = "move_to";
            targetId = action.substring(8); // Remove "move_to_" prefix
          } else {
            baseAction = actionParts[0];
            targetId = actionParts.slice(1).join("_");
          }

          // Handle character actions
          console.log(
            `🔍 ${this.name}: Looking for character with ID: "${targetId}"`
          );
          console.log(
            `🔍 ${this.name}: Available characters:`,
            this.roomCharacters.map((c) => `${c.name} (id: ${c.id})`)
          );

          const character = this.roomCharacters.find((c) => c.id === targetId);
          if (character) {
            console.log(`✅ ${this.name}: Found character: ${character.name}`);
            if (baseAction === "speak_to") {
              await this.speakToTown(); // Let AI generate contextual response
              return {
                success: true,
                message: `Started conversation with ${character.name}`,
              };
            } else if (baseAction === "move_to") {
              this.moveToCharacter(character.name);
              return {
                success: true,
                message: `Moving toward ${character.name}`,
              };
            }
          }

          // Also try finding character by name (alex -> Sheriff Martinez)
          const characterByName = this.roomCharacters.find(
            (c) =>
              c.name.toLowerCase().includes(targetId.toLowerCase()) ||
              c.id.toLowerCase() === targetId.toLowerCase()
          );
          if (characterByName) {
            console.log(
              `✅ ${this.name}: Found character by name: ${characterByName.name}`
            );
            if (baseAction === "speak_to") {
              await this.speakToTown(); // Let AI generate contextual response
              return {
                success: true,
                message: `Started conversation with ${characterByName.name}`,
              };
            } else if (baseAction === "move_to") {
              this.moveToCharacter(characterByName.name);
              return {
                success: true,
                message: `Moving toward ${characterByName.name}`,
              };
            }
          }

          console.log(
            `❌ ${this.name}: Could not find character "${targetId}" for action "${baseAction}"`
          );

          // Handle object actions using event system
          const obj = this.roomObjects.find((o) => o.id === targetId);
          if (obj) {
            // Emit action to town chat
            this.scene.events.emit('town-action', {
              actor: this.name,
              action: `interacts with ${obj.name}`,
              timestamp: Date.now()
            });
            
            return new Promise((resolve) => {
              console.log(
                `🔧 ${this.name}: Firing event ${action} for object interaction`
              );

              const responseEvent = `tool-response-${action}`;
              this.scene.events.once(
                responseEvent,
                (result: {
                  success: boolean;
                  message: string;
                  target: string;
                }) => {
                  console.log(
                    `📝 ${this.name} -> ${result.target}: ${result.message}`
                  );
                  resolve(result);
                }
              );

              this.scene.events.emit(action, {
                initiator: this,
                parameters: { objectId: targetId },
              });
            });
          }
        }

        return { success: false, message: `Unknown action: ${action}` };
    }
  }

  private moveInDirection(direction: string): {
    success: boolean;
    message: string;
  } {
    const currentPos = this.getPosition();
    const moveDistance = Phaser.Math.Between(60, 120);
    let newX = currentPos.x;
    let newY = currentPos.y;

    switch (direction) {
      case "north":
        newY -= moveDistance;
        this.lastDirection = "up";
        break;
      case "south":
        newY += moveDistance;
        this.lastDirection = "down";
        break;
      case "east":
        newX += moveDistance;
        this.lastDirection = "right";
        break;
      case "west":
        newX -= moveDistance;
        this.lastDirection = "left";
        break;
    }

    const clampedX = Phaser.Math.Clamp(newX, 80, 720);
    const clampedY = Phaser.Math.Clamp(newY, 120, 520);

    if (clampedX === currentPos.x && clampedY === currentPos.y) {
      return {
        success: false,
        message: `Cannot move ${direction} - blocked by boundary`,
      };
    }

    // Animate movement
    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      x: clampedX,
      duration: 800,
      ease: "Power2",
    });

    this.scene.tweens.add({
      targets: this.nameText,
      y: clampedY - 25,
      duration: 800,
      ease: "Power2",
    });

    this.scene.tweens.add({
      targets: this.sprite,
      y: clampedY,
      duration: 800,
      ease: "Power2",
      onComplete: () => {
        this.updateLineOfSight();
      },
    });

    return { success: true, message: `Moved ${direction}` };
  }

  private moveRandomly(): void {
    const currentPos = this.getPosition();
    const moveDistance = 60;
    const newX =
      currentPos.x + Phaser.Math.Between(-moveDistance, moveDistance);
    const newY =
      currentPos.y + Phaser.Math.Between(-moveDistance, moveDistance);

    const clampedX = Phaser.Math.Clamp(newX, 80, 720);
    const clampedY = Phaser.Math.Clamp(newY, 120, 520);

    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      x: clampedX,
      duration: 1000,
      ease: "Power2",
    });

    this.scene.tweens.add({
      targets: this.nameText,
      y: clampedY - 25,
      duration: 1000,
      ease: "Power2",
    });

    this.scene.tweens.add({
      targets: this.sprite,
      y: clampedY,
      duration: 1000,
      ease: "Power2",
      onComplete: () => {
        this.updateLineOfSight();
      },
    });
  }

  private moveToCharacter(targetName: string): void {
    let target = this.roomCharacters.find((c) => c.name === targetName);

    if (!target && (targetName === "Player" || targetName === "player")) {
      target = this.roomCharacters.find((c) => c.id === "player");
    }

    if (target) {
      const targetPos = target.getPosition();
      const myPos = this.getPosition();

      const angle = Phaser.Math.Angle.Between(
        myPos.x,
        myPos.y,
        targetPos.x,
        targetPos.y
      );
      const distance = 70;
      const newX = targetPos.x - Math.cos(angle) * distance;
      const newY = targetPos.y - Math.sin(angle) * distance;

      const clampedX = Phaser.Math.Clamp(newX, 80, 720);
      const clampedY = Phaser.Math.Clamp(newY, 120, 520);

      this.scene.tweens.add({
        targets: [this.sprite, this.nameText],
        x: clampedX,
        duration: 800,
        ease: "Power2",
      });

      this.scene.tweens.add({
        targets: this.nameText,
        y: clampedY - 25,
        duration: 800,
        ease: "Power2",
      });

      this.scene.tweens.add({
        targets: this.sprite,
        y: clampedY,
        duration: 800,
        ease: "Power2",
        onComplete: () => {
          setTimeout(async () => {
            await this.speakToTown(); // Let AI generate contextual response
          }, 200);
        },
      });
    }
  }

  private async speakToTown(message?: string): Promise<void> {
    // Prevent spam by setting speaking state
    if (this.isCurrentlySpeaking) return;
    
    this.isCurrentlySpeaking = true;
    
    let finalMessage = message;
    
    // If no message provided, generate one based on context
    if (!finalMessage) {
      try {
        const context = this.buildAIContext();
        finalMessage = await this.aiService.generateConversationResponse(
          context,
          "Generate a natural greeting or conversation starter based on the current situation."
        );
      } catch (error) {
        console.error(`❌ ${this.name}: Failed to generate speech:`, error);
        finalMessage = this.generateGreeting();
      }
    }
    
    console.log(`💭 CONVO ${this.name} says: "${finalMessage}"`);
    this.showSpeech(finalMessage);
    
    // Emit global town speech event
    this.scene.events.emit("town-speech", {
      speaker: this.name,
      speakerId: this.id,
      message: finalMessage,
      position: this.getPosition(),
      timestamp: Date.now(),
    });
    
    // Reset speaking state after a delay
    setTimeout(() => {
      this.isCurrentlySpeaking = false;
    }, 2000);
  }

  private onTownSpeech = (data: {
    speaker: string;
    speakerId: string;
    message: string;
    position: { x: number; y: number };
    timestamp: number;
  }) => {
    // Don't respond to own speech
    if (data.speakerId === this.id) return;

    // Check proximity - only respond if nearby
    const distance = Phaser.Math.Distance.Between(
      this.getPosition().x,
      this.getPosition().y,
      data.position.x,
      data.position.y
    );

    const HEARING_RANGE = 200; // Slightly larger than line of sight
    if (distance > HEARING_RANGE) return;

    console.log(`👂 CONVO ${this.name}: Heard ${data.speaker} nearby"`);

    // Add to global conversation memory
    this.conversationMessages.push({
      role: "user",
      content: data.message,
      name: data.speakerId,
    });

    // Respond after a delay if not currently speaking and should engage
    if (!this.isCurrentlySpeaking && this.shouldEngageWithSpeech(data)) {
      this.isCurrentlySpeaking = true;
      setTimeout(async () => {
        try {
          const context = this.buildAIContext();
          const response = await this.aiService.generateConversationResponse(
            context,
            data.message
          );
          console.log(`💬 CONVO ${this.name} responds: "${response}"`);
          this.showSpeech(response);

          // Add response to global memory
          this.conversationMessages.push({
            role: "assistant",
            content: response,
            name: this.id,
          });

          // Emit response as town speech
          this.scene.events.emit("town-speech", {
            speaker: this.name,
            speakerId: this.id,
            message: response,
            position: this.getPosition(),
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error(
            `❌ CONVO ${this.name}: Failed to generate response:`,
            error
          );
          const fallback = this.generateGreeting();
          console.log(
            `💬 CONVO ${this.name} responds (fallback): "${fallback}"`
          );
          this.showSpeech(fallback);
        } finally {
          this.isCurrentlySpeaking = false;
        }
      }, Phaser.Math.Between(500, 1000)); // Faster response for better conversation flow
    }
  };

  private shouldEngageWithSpeech(data: {
    speaker: string;
    speakerId: string;
    message: string;
  }): boolean {
    // Don't respond if already in player conversation
    if (this.isInPlayerConversation) return false;

    // Always respond to player messages (higher engagement)
    if (data.speakerId === 'player') {
      return Math.random() < 0.8; // 80% chance to respond to player
    }

    // For NPC-to-NPC, use more selective filtering
    if (Math.random() > 0.33) return false;

    // More likely to respond if message mentions keywords relevant to personality
    const message = data.message.toLowerCase();
    const keywords = this.getPersonalityKeywords();
    const isRelevant = keywords.some((keyword) => message.includes(keyword));

    return isRelevant || Math.random() < 0.1; // 10% chance even if not relevant
  }

  private getPersonalityKeywords(): string[] {
    const name = this.name.toLowerCase();
    if (name.includes("doctor") || name.includes("thompson")) {
      return [
        "symptoms",
        "patients",
        "medical",
        "health",
        "strange",
        "illness",
      ];
    }
    if (name.includes("sheriff") || name.includes("martinez")) {
      return ["trouble", "law", "investigate", "reports", "crime", "safety"];
    }
    if (name.includes("sage") || name.includes("eleanor")) {
      return ["books", "history", "ancient", "texts", "knowledge", "stones"];
    }
    if (name.includes("sarah")) {
      return ["town", "folks", "rumors", "gossip", "community"];
    }
    return ["help", "talk", "discuss"];
  }

  private generateGreeting(): string {
    const greetings = [
      "Hello there, how are things?",
      "Excuse me, I wanted to speak with you.",
      "Good day, do you have a moment?",
      "Hey there, I need to discuss something.",
    ];
    return Phaser.Utils.Array.GetRandom(greetings);
  }

  private async generatePlayerConversation(): Promise<void> {
    try {
      const context = this.buildAIContext();

      const response = await this.aiService.generateConversation({
        npcName: this.name,
        npcPersonality: this.personality,
        npcBackground: this.background,
        context: context,
        conversationType: "greeting",
      });

      console.log(`💭 ${this.name} says to visitor: "${response}"`);
      this.showSpeech(response);

      // Update chat interface
      const chatInterface = (this.scene as any).chatInterface;
      if (chatInterface) {
        chatInterface.updateNearbyNPCs([this]);
        const conversation = chatInterface.conversations.get(this.id);
        if (conversation) {
          conversation.messages.push({
            sender: "npc",
            message: response,
            timestamp: Date.now(),
          });
          conversation.lastMessageTime = Date.now();
          chatInterface.updateConversationList();
        }
      }
    } catch (error) {
      console.error(
        `❌ ${this.name}: Failed to generate player conversation:`,
        error
      );
      const fallback = "Hello there!";
      this.showSpeech(fallback);
    }
  }

  public showSpeech(message: string): void {
    console.log(`🗨️ ${this.name}: Showing speech bubble: "${message}" at (${this.sprite.x}, ${this.sprite.y})`);
    this.speechBubble.show(
      this.sprite.x,
      this.sprite.y - 40,
      message,
      this.name,
      true // Auto-hide with longer timeout
    );
  }

  public receiveConversationAttempt(initiator: Character): void {
    console.log(
      `📞 ${this.name}: Received conversation attempt from ${initiator.name}`
    );

    if (initiator.id === "player") {
      this.isInPlayerConversation = true;
      console.log(`🟢 ${this.name}: Now in player conversation`);
    }
  }

  public sendMessage(message: string, sender: Character): void {
    console.log(
      `📨 ${this.name}: Received message from ${sender.name}: "${message}"`
    );

    if (sender.id === "player") {
      this.conversationMessages.push({
        role: "user",
        content: message,
        name: "player",
      });

      // Generate response immediately - no delays
      this.generateResponseToPlayer(message);
    }
  }

  private async generateResponseToPlayer(playerMessage: string): Promise<void> {
    try {
      const context = this.buildAIContext();

      // Single LLM call for response
      const response = await this.aiService.generateConversationResponse(
        context,
        playerMessage
      );

      console.log(`💬 ${this.name}: "${response}"`);
      this.showSpeech(response);

      // Add to conversation history
      this.conversationMessages.push({
        role: "assistant",
        content: response,
        name: this.id,
      });

      // Update chat interface
      const chatInterface = (this.scene as any).chatInterface;
      if (chatInterface) {
        const conversation = chatInterface.conversations.get(this.id);
        if (conversation) {
          conversation.messages.push({
            sender: "npc",
            message: response,
            timestamp: Date.now(),
          });
          conversation.lastMessageTime = Date.now();
          if (chatInterface.activeConversation === this.id) {
            chatInterface.updateMessageArea();
          }
        }
      }
    } catch (error) {
      console.error(`❌ ${this.name}: Failed to generate response:`, error);
      const fallback = "I'm not sure how to respond to that.";
      this.showSpeech(fallback);
    }
  }

  public setRoomContext(
    objects: InteractiveObject[],
    characters: Character[],
    grid: number[][]
  ): void {
    this.roomObjects = objects;
    this.roomCharacters = characters;
    this.roomGrid = grid;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  public getState(): string {
    return this.isInPlayerConversation ? "ENGAGED" : "IDLE";
  }

  public destroy(): void {
    // Clean up event listeners
    this.scene.events.off("town-speech", this.onTownSpeech, this);

    if (this.actionTimer) this.actionTimer.destroy();
    if (this.activityTimer) this.activityTimer.destroy();
    this.speechBubble.destroy();
    this.sprite.destroy();
    this.nameText.destroy();
  }
}
