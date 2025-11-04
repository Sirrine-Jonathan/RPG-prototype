import { Scene } from "phaser";
import { AIService, NPCContext, NPCTool } from "../services/AIService";
import { InteractiveObject } from "./InteractiveObject";
import { SpeechBubble } from "../ui/SpeechBubble";
import {
  CharacterSpriteGenerator,
  CharacterConfig,
} from "../systems/CharacterSpriteGenerator";

const ENGAGEMENT_TIMEOUT = 60000; // 60 seconds (increased from 30s)
const IDLE_INTERVAL_MIN = 1000; // 1 seconds (decreased for more frequent actions)
const IDLE_INTERVAL_MAX = 3000; // 3 seconds (decreased for more frequent actions)
const LINE_OF_SIGHT_RANGE = 150;

export type NPCState = "IDLE" | "ENGAGED" | "APPROACHING";

export interface Character {
  id: string;
  name: string;
  getPosition(): { x: number; y: number };
}

export class SmartNPC implements Character {
  public sprite: Phaser.GameObjects.Image;
  public nameText: Phaser.GameObjects.Text;
  public scene: Scene;
  public id: string;
  public name: string;
  public personality: string;
  public background: string;

  private state: NPCState = "IDLE";
  private aiService: AIService;
  private idleTimer?: Phaser.Time.TimerEvent;
  private engagementTimer?: Phaser.Time.TimerEvent;
  private speechBubble: SpeechBubble;

  // Discovery and awareness
  private discoveredObjects: Set<string> = new Set();
  private discoveredCharacters: Set<string> = new Set();
  private conversationHistory: any[] = [];

  // Room context
  private roomObjects: InteractiveObject[] = [];
  private roomCharacters: Character[] = [];
  private roomGrid: number[][] = []; // Will be populated by room system

  constructor(
    scene: Scene,
    x: number,
    y: number,
    id: string,
    name: string,
    personality: string,
    background: string,
    role: string = "civilian"
  ) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.personality = personality;
    this.background = background;
    this.aiService = AIService.getInstance();
    this.speechBubble = new SpeechBubble(scene);

    // Generate character sprite
    const spriteGenerator = new CharacterSpriteGenerator(scene);
    const config = spriteGenerator.generateFromPersonality(personality, role);
    const textureName = `npc_${id}`;
    spriteGenerator.generateCharacterSprite(config, textureName);

    // Create sprite using generated texture
    this.sprite = scene.add.image(x, y, textureName);

    // Create name text
    this.nameText = scene.add
      .text(x, y - 25, name, {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);

    this.startIdleState();
  }

  // State management
  private startIdleState(): void {
    this.state = "IDLE";
    this.sprite.setTint(0xffffff); // Reset tint for idle
    console.log(`🔵 ${this.name}: Entering IDLE state`);

    // Start idle behavior timer
    const interval = Phaser.Math.Between(IDLE_INTERVAL_MIN, IDLE_INTERVAL_MAX);
    console.log(
      `⏰ ${this.name}: Next action in ${Math.round(interval / 1000)}s`
    );
    this.idleTimer = this.scene.time.delayedCall(interval, () => {
      this.performIdleAction();
    });
  }

  private startEngagedState(engager: Character): void {
    this.state = "ENGAGED";
    this.sprite.setTint(0x88ff88); // Green tint when engaged
    console.log(`🟢 ${this.name}: Entering ENGAGED state with ${engager.name}`);

    // Clear idle timer
    if (this.idleTimer) {
      this.idleTimer.destroy();
      this.idleTimer = undefined;
    }

    // Set engagement timeout - 60 seconds for player to respond
    this.engagementTimer = this.scene.time.delayedCall(
      ENGAGEMENT_TIMEOUT,
      () => {
        console.log(
          `⏰ ${this.name}: Player ignored conversation for 60 seconds, ending engagement`
        );
        this.handleIgnoredConversation(engager);
      }
    );
  }

  private handleIgnoredConversation(engager: Character): void {
    if (engager.id === "player") {
      // Show a reaction to being ignored
      const ignoredResponses = [
        "Well, I guess you're busy...",
        "Maybe we can talk later.",
        "I'll let you get back to what you were doing.",
        "No worries, catch you around.",
      ];
      const response = Phaser.Utils.Array.GetRandom(ignoredResponses);
      console.log(`😔 ${this.name}: Reacting to being ignored: "${response}"`);
      this.showSpeech(response); // Always auto-hide
    }

    this.endEngagement();
  }

  private endEngagement(): void {
    console.log(`🔴 ${this.name}: Ending engagement, returning to IDLE`);
    if (this.engagementTimer) {
      this.engagementTimer.destroy();
      this.engagementTimer = undefined;
    }
    this.startIdleState();
  }

  // Core AI behavior
  private async performIdleAction(): Promise<void> {
    if (this.state !== "IDLE") {
      console.log(`⏸️ ${this.name}: Skipping action - currently ${this.state}`);
      return; // Don't act when engaged or approaching
    }

    // Update line of sight
    this.updateLineOfSight();

    // Build context for AI
    const context = this.buildAIContext();

    try {
      const decision = await this.aiService.generateNPCAction(context);
      await this.executeAction(decision.action, decision.parameters);

      console.log(`${this.name}: ${decision.action} - ${decision.reasoning}`);
    } catch (error) {
      console.error(`AI action failed for ${this.name}:`, error);
    }

    // Schedule next action only if still idle
    if (this.state === "IDLE") {
      const interval = Phaser.Math.Between(
        IDLE_INTERVAL_MIN,
        IDLE_INTERVAL_MAX
      );
      this.idleTimer = this.scene.time.delayedCall(interval, () => {
        this.performIdleAction();
      });
    }
  }

  // Line of sight and discovery
  private updateLineOfSight(): void {
    const myPos = this.getPosition();

    // Check objects in line of sight
    this.roomObjects.forEach((obj) => {
      if (this.isInLineOfSight(myPos, obj.getPosition())) {
        if (!this.discoveredObjects.has(obj.id)) {
          this.discoveredObjects.add(obj.id);
          console.log(`🔍 ${this.name}: Discovered object ${obj.id}`);
          if (typeof obj.onDiscovered === "function") {
            obj.onDiscovered();
          }
        }
      }
    });

    // Check characters in line of sight - be more generous with discovery
    this.roomCharacters.forEach((char) => {
      if (char.id !== this.id) {
        const distance = Phaser.Math.Distance.Between(
          myPos.x,
          myPos.y,
          char.getPosition().x,
          char.getPosition().y
        );

        // Discover characters within a reasonable range, even if not in perfect line of sight
        if (distance < LINE_OF_SIGHT_RANGE * 1.5) {
          if (!this.discoveredCharacters.has(char.id)) {
            console.log(
              `👥 ${this.name}: Discovered ${char.name} (distance: ${Math.round(
                distance
              )}px)`
            );
          }
          this.discoveredCharacters.add(char.id);
        }
      }
    });
  }

  private isInLineOfSight(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): boolean {
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    if (distance > LINE_OF_SIGHT_RANGE) return false;

    // Simple 2D raycasting - check for obstacles
    const steps = Math.ceil(distance / 10);
    const dx = (to.x - from.x) / steps;
    const dy = (to.y - from.y) / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = Math.floor((from.x + dx * i) / 32); // Assuming 32px tiles
      const checkY = Math.floor((from.y + dy * i) / 32);

      // Check if this grid position is blocked (1 = wall, 0 = walkable)
      if (this.roomGrid[checkY] && this.roomGrid[checkY][checkX] === 1) {
        return false;
      }
    }

    return true;
  }

  // AI context building
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

    console.log(`🧠 ${this.name} AI Context:`, {
      visibleCharacters:
        visibleCharacters.length > 0 ? visibleCharacters : "none",
      availableTools: availableTools.map((t) => t.name),
      state: this.state,
    });

    return {
      name: this.name,
      background: this.background,
      personality: this.personality,
      currentLocation: "current room", // TODO: Get from room system
      visibleObjects,
      visibleCharacters,
      availableTools,
      conversationHistory: this.conversationHistory.slice(-5), // Last 5 messages
    };
  }

  private getAvailableTools(): NPCTool[] {
    const tools: NPCTool[] = [
      { name: "wait", description: "Do nothing and observe the surroundings" },
      { name: "look_north", description: "Look towards the north" },
      { name: "look_east", description: "Look towards the east" },
      { name: "look_south", description: "Look towards the south" },
      { name: "look_west", description: "Look towards the west" },
    ];

    // Only add movement tools if player is not nearby
    const playerNearby = this.isPlayerNearby();
    if (!playerNearby) {
      tools.push(
        {
          name: "move_random",
          description: "Walk to a different area of the room",
        },
        {
          name: "patrol",
          description: "Move around the room to patrol the area",
        }
      );
    }

    // Add speak tools for discovered characters (prioritize this)
    Array.from(this.discoveredCharacters).forEach((charId) => {
      const character = this.roomCharacters.find((c) => c.id === charId);
      if (character) {
        tools.push({
          name: "speak_to",
          description: `Start a conversation with ${character.name}`,
          parameters: { target: character.name },
        });

        // Add move-to-character tool if they're not nearby
        const distance = Phaser.Math.Distance.Between(
          this.getPosition().x,
          this.getPosition().y,
          character.getPosition().x,
          character.getPosition().y
        );

        if (distance > 100) {
          tools.push({
            name: "move_to_character",
            description: `Move closer to ${character.name} to talk`,
            parameters: { target: character.name },
          });
        }
      }
    });

    // Add interaction tools for discovered objects
    Array.from(this.discoveredObjects).forEach((objId) => {
      const obj = this.roomObjects.find((o) => o.id === objId);
      if (obj && typeof obj.getAvailableTools === "function") {
        obj.getAvailableTools().forEach((tool) => {
          tools.push({
            name: tool.name,
            description: `${tool.description} (${obj.name})`,
            parameters: { target: obj.id, ...tool.parameters },
          });
        });
      }
    });

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

    return distance < 80; // Same range as proximity service
  }

  // Action execution
  private async executeAction(action: string, parameters?: any): Promise<void> {
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
        console.log(`⏸️ ${this.name}: Waiting and observing...`);
        break;

      case "look_north":
      case "look_east":
      case "look_south":
      case "look_west":
        const direction = action.split("_")[1];
        console.log(`👀 ${this.name}: Looking ${direction}`);
        this.updateLineOfSight(); // Refresh line of sight
        break;

      case "move_random":
      case "patrol":
        console.log(`🚶 ${this.name}: Moving randomly/patrolling`);
        this.moveRandomly();
        break;

      case "move_to_character":
        // Handle different parameter names from AI
        const moveTarget =
          parameters?.target ||
          parameters?.character ||
          parameters?.character_name ||
          parameters?.character_id;
        if (moveTarget) {
          console.log(`🎯 ${this.name}: Moving toward ${moveTarget}`);
          this.state = "APPROACHING"; // Set state to prevent distractions
          this.sprite.setTint(0xffff88); // Yellow tint when approaching
          this.moveToCharacter(moveTarget);
        } else {
          console.log(
            `❌ ${this.name}: No target specified for move_to_character`
          );
        }
        break;

      case "speak_to":
        // Handle different parameter names from AI
        const target =
          parameters?.target || parameters?.name || parameters?.character;
        if (target) {
          console.log(
            `💬 ${this.name}: Initiating conversation with ${target}`
          );
          this.initiateConversation(target);
        }
        break;

      default:
        // Handle object interactions
        if (parameters?.target) {
          const obj = this.roomObjects.find((o) => o.id === parameters.target);
          if (obj) {
            console.log(
              `🔧 ${this.name}: Interacting with ${obj.name} (${action})`
            );
            const result = obj.handleInteraction(action, parameters);
            console.log(`📝 ${this.name} -> ${obj.name}: ${result.message}`);
          }
        } else {
          console.log(`❓ ${this.name}: Unknown action '${action}'`);
        }
        break;
    }
  }

  private moveToCharacter(targetName: string): void {
    // Handle "Player" target by finding the actual player character
    let target;
    if (
      targetName === "Player" ||
      targetName === "player" ||
      targetName === 1
    ) {
      target = this.roomCharacters.find((c) => c.id === "player");
    } else {
      target = this.roomCharacters.find((c) => c.name === targetName);
    }

    if (target) {
      const targetPos = target.getPosition();
      const myPos = this.getPosition();
      const currentDistance = Phaser.Math.Distance.Between(
        myPos.x,
        myPos.y,
        targetPos.x,
        targetPos.y
      );

      console.log(
        `🏃 ${this.name} @(${Math.round(myPos.x)},${Math.round(
          myPos.y
        )}): Moving toward ${target.name || targetName} @(${Math.round(
          targetPos.x
        )},${Math.round(targetPos.y)}) - distance: ${Math.round(
          currentDistance
        )}px`
      );

      // Move closer to the target (within conversation range)
      const angle = Phaser.Math.Angle.Between(
        myPos.x,
        myPos.y,
        targetPos.x,
        targetPos.y
      );
      const distance = 70; // Stop 70 pixels away (within 80px conversation range)
      const newX = targetPos.x - Math.cos(angle) * distance;
      const newY = targetPos.y - Math.sin(angle) * distance;

      // Keep within bounds
      const clampedX = Phaser.Math.Clamp(newX, 80, 720);
      const clampedY = Phaser.Math.Clamp(newY, 120, 520);

      console.log(
        `📍 ${this.name}: Moving from (${Math.round(myPos.x)}, ${Math.round(
          myPos.y
        )}) to (${Math.round(clampedX)}, ${Math.round(clampedY)})`
      );

      // Faster, more direct movement
      this.scene.tweens.add({
        targets: [this.sprite, this.nameText],
        x: clampedX,
        duration: 800, // Faster movement (was 1500ms)
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
          // Try to start conversation immediately after reaching target
          console.log(
            `🎯 ${this.name}: Reached ${
              target.name || targetName
            }, attempting conversation`
          );
          setTimeout(() => {
            if (this.canInitiateConversation(target.name || "Player")) {
              this.initiateConversation(target.name || "Player");
            } else {
              // Return to idle if conversation failed
              console.log(
                `🔄 ${this.name}: Conversation failed, returning to IDLE`
              );
              this.startIdleState();
            }
          }, 200); // Small delay to ensure position is updated
        },
      });
    } else {
      console.log(
        `❌ ${this.name}: Could not find target ${targetName} to move toward`
      );
      // Return to idle if target not found
      this.startIdleState();
    }
  }

  private moveRandomly(): void {
    const currentPos = this.getPosition();
    const moveDistance = 60; // Larger movement distance
    const newX =
      currentPos.x + Phaser.Math.Between(-moveDistance, moveDistance);
    const newY =
      currentPos.y + Phaser.Math.Between(-moveDistance, moveDistance);

    // Keep within bounds (room boundaries)
    const clampedX = Phaser.Math.Clamp(newX, 80, 720);
    const clampedY = Phaser.Math.Clamp(newY, 120, 520);

    // Animate the movement
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
    });
  }

  private canInitiateConversation(targetName: string): boolean {
    const target = this.roomCharacters.find((c) => c.name === targetName);
    if (!target) return false;

    const myPos = this.getPosition();
    const targetPos = target.getPosition();
    const distance = Phaser.Math.Distance.Between(
      myPos.x,
      myPos.y,
      targetPos.x,
      targetPos.y
    );

    // Must be within proximity range (80px)
    if (distance > 80) {
      console.log(
        `❌ ${this.name}: ${targetName} too far away (${Math.round(
          distance
        )}px) to start conversation`
      );
      return false;
    }

    // Check if target has other characters nearby (exclusive conversation rule)
    const otherNearbyCharacters = this.roomCharacters.filter((char) => {
      if (char.id === this.id || char.id === target.id) return false;

      const charDistance = Phaser.Math.Distance.Between(
        targetPos.x,
        targetPos.y,
        char.getPosition().x,
        char.getPosition().y
      );
      return charDistance <= 80;
    });

    if (otherNearbyCharacters.length > 0) {
      console.log(
        `❌ ${this.name}: ${targetName} has other characters nearby, cannot start exclusive conversation`
      );
      return false;
    }

    console.log(
      `✅ ${
        this.name
      }: Can start conversation with ${targetName} (distance: ${Math.round(
        distance
      )}px, exclusive)`
    );
    return true;
  }

  private initiateConversation(targetName: string): void {
    // Check proximity and exclusivity before starting conversation
    if (!this.canInitiateConversation(targetName)) {
      console.log(
        `🚫 ${this.name}: Cannot initiate conversation with ${targetName} - proximity/exclusivity check failed`
      );
      return;
    }

    const target = this.roomCharacters.find((c) => c.name === targetName);

    if (target && target.id === "player") {
      console.log(`🗣️ ${this.name}: Starting conversation with Player`);
      this.generatePlayerConversation();
    } else if (target && target instanceof SmartNPC) {
      console.log(`🗣️ ${this.name}: Starting conversation with ${targetName}`);

      // Show speech bubble for NPC-to-NPC conversation
      const greeting = this.generateGreeting(target);
      console.log(`💭 ${this.name} says: "${greeting}"`);
      this.showSpeech(greeting); // Always auto-hide

      // Engage the target NPC
      target.receiveConversationAttempt(this);
    } else if (target) {
      console.log(
        `🤖 ${this.name}: Trying to talk to ${targetName} (not an NPC)`
      );
    } else {
      console.log(`❌ ${this.name}: Could not find ${targetName} to talk to`);
    }
  }

  private async generatePlayerConversation(): Promise<void> {
    try {
      // Build context for AI conversation
      const context = this.buildAIContext();

      // Generate AI response for talking to player
      const response = await this.aiService.generateConversation({
        npcName: this.name,
        npcPersonality: this.personality,
        npcBackground: this.background,
        context: context,
        conversationType: "greeting",
      });

      console.log(`💭 ${this.name} says to visitor: "${response}"`);

      // Show speech bubble
      this.showSpeech(response); // Always auto-hide

      // Get ChatInterface and add this NPC to conversations
      const chatInterface = (this.scene as any).chatInterface;
      if (chatInterface) {
        // Make sure this NPC is in the nearby list so conversation appears
        chatInterface.updateNearbyNPCs([this]);

        // Add the greeting as the first message in the conversation
        const conversation = chatInterface.conversations.get(this.id);
        if (conversation) {
          conversation.messages.push({
            sender: "npc",
            message: response,
            timestamp: Date.now(),
          });
          conversation.lastMessageTime = Date.now();

          // Update the conversation list to show the new message
          chatInterface.updateConversationList();
        }
      } else {
        console.error(`❌ ${this.name}: No ChatInterface found in scene`);
      }
    } catch (error) {
      console.error(
        `❌ ${this.name}: Failed to generate player conversation:`,
        error
      );

      // Fallback to simple greeting
      const fallbackGreeting = this.generateGreeting({
        name: "visitor",
      } as Character);
      this.showSpeech(fallbackGreeting); // Always auto-hide

      const chatInterface = (this.scene as any).chatInterface;
      if (chatInterface) {
        chatInterface.updateNearbyNPCs([this]);
        const conversation = chatInterface.conversations.get(this.id);
        if (conversation) {
          conversation.messages.push({
            sender: "npc",
            message: fallbackGreeting,
            timestamp: Date.now(),
          });
          conversation.lastMessageTime = Date.now();
          chatInterface.updateConversationList();
        }
      }
    }
  }

  private generateGreeting(target: Character): string {
    const greetings = [
      `Hello there, how are things?`,
      `Excuse me, I wanted to speak with you.`,
      `Good day, do you have a moment?`,
      `Hey there, I need to discuss something.`,
    ];
    return Phaser.Utils.Array.GetRandom(greetings);
  }

  // Public method for showing speech - always auto-hide
  public showSpeech(message: string): void {
    this.speechBubble.show(
      this.sprite.x,
      this.sprite.y - 40,
      message,
      this.name,
      true // Always auto-hide
    );
  }

  // Public interface
  public receiveConversationAttempt(initiator: Character): void {
    console.log(
      `📞 ${this.name}: Received conversation attempt from ${initiator.name}`
    );
    this.startEngagedState(initiator);
    console.log(
      `🟢 ${this.name}: Now ENGAGED in conversation with ${initiator.name}`
    );
  }

  public sendMessage(message: string, sender: Character): void {
    if (this.state === "ENGAGED") {
      this.conversationHistory.push({
        role: "user",
        content: `${sender.name}: ${message}`,
      });

      // Reset engagement timer
      if (this.engagementTimer) {
        this.engagementTimer.destroy();
        this.engagementTimer = this.scene.time.delayedCall(
          ENGAGEMENT_TIMEOUT,
          () => {
            this.handleIgnoredConversation(sender);
          }
        );
      }

      // Generate AI response to the player's message
      if (sender.id === "player") {
        console.log(`📨 ${this.name}: Received message from player: "${message}"`);
        this.generateResponseToPlayer(message);
      }
    }
  }

  private async generateResponseToPlayer(playerMessage: string): Promise<void> {
    try {
      const context = this.buildAIContext();
      const response = await this.aiService.generateConversationResponse(context, playerMessage);
      
      console.log(`💬 ${this.name}: Responding to player: "${response}"`);
      
      // Show speech bubble
      this.showSpeech(response); // Always auto-hide
      
      // Add response to chat interface
      const chatInterface = (this.scene as any).chatInterface;
      if (chatInterface) {
        const conversation = chatInterface.conversations.get(this.id);
        if (conversation) {
          conversation.messages.push({
            sender: 'npc',
            message: response,
            timestamp: Date.now()
          });
          conversation.lastMessageTime = Date.now();
          
          // Update the conversation view if it's currently open
          if (chatInterface.activeConversation === this.id) {
            chatInterface.updateMessageArea();
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ ${this.name}: Failed to generate response:`, error);
      
      const fallbackResponse = "I'm not sure how to respond to that.";
      this.showSpeech(fallbackResponse); // Always auto-hide
      
      const chatInterface = (this.scene as any).chatInterface;
      if (chatInterface) {
        const conversation = chatInterface.conversations.get(this.id);
        if (conversation) {
          conversation.messages.push({
            sender: 'npc',
            message: fallbackResponse,
            timestamp: Date.now()
          });
          conversation.lastMessageTime = Date.now();
          
          if (chatInterface.activeConversation === this.id) {
            chatInterface.updateMessageArea();
          }
        }
      }
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

  public getState(): NPCState {
    return this.state;
  }

  public destroy(): void {
    if (this.idleTimer) this.idleTimer.destroy();
    if (this.engagementTimer) this.engagementTimer.destroy();
    this.speechBubble.destroy();
    this.sprite.destroy();
    this.nameText.destroy();
  }
}
