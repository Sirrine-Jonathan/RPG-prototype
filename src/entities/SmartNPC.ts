import { Scene } from "phaser";
import { AIService, NPCContext, NPCTool } from "../services/AIService";
import { InteractiveObject } from "./InteractiveObject";
import { SpeechBubble } from "../ui/SpeechBubble";

const ENGAGEMENT_TIMEOUT = 60000; // 60 seconds (increased from 30s)
const ACTION_DELAY = 1000; // 5 seconds between actions
const LINE_OF_SIGHT_RANGE = 150;

export type NPCState = "IDLE" | "ENGAGED" | "APPROACHING";

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

  private state: NPCState = "IDLE";
  private aiService: AIService;
  private actionTimer?: Phaser.Time.TimerEvent;
  private conversationTimeoutTimer?: Phaser.Time.TimerEvent;
  private speechBubble: SpeechBubble;
  private conversationPartner?: SmartNPC;

  // Visual enhancements
  private glowEffect?: Phaser.GameObjects.Graphics;
  private shadowSprite?: Phaser.GameObjects.Image;
  private breathingTween?: Phaser.Tweens.Tween;

  // Discovery and awareness
  private discoveredObjects: Set<string> = new Set();
  private discoveredCharacters: Set<string> = new Set();
  private conversationHistory: any[] = [];
  private conversationMessages: Array<{
    role: string;
    content?: string;
    tool_calls?: any;
    name?: string;
  }> = [];
  private lastDirection = "down"; // Track last movement direction

  // Room context
  private roomObjects: InteractiveObject[] = [];
  private roomCharacters: Character[] = [];
  private roomGrid: number[][] = []; // Will be populated by room system

  constructor(
    scene: Scene,
    x: number,
    y: number,
    spriteKey: string, // Changed from id to spriteKey
    name: string,
    personality: string,
    background: string,
    role: string = "civilian"
  ) {
    this.scene = scene;
    this.id = spriteKey; // Use spriteKey as id for now
    this.name = name;
    this.personality = personality;
    this.background = background;
    this.aiService = AIService.getInstance();
    this.speechBubble = new SpeechBubble(scene);

    // Listen for speech events directed at this NPC
    this.scene.events.on(`npc-speech-${this.id}`, this.onReceiveSpeech, this);

    // Create sprite using the provided sprite key
    this.sprite = scene.add.sprite(x, y, spriteKey, 0);
    this.sprite.setScale(2); // Scale up the 16x16 sprites to match player
    this.sprite.setInteractive();

    // Play idle animation based on sprite key
    if (spriteKey === "alex") {
      this.sprite.play("alex_idle_down");
    } else if (spriteKey === "amelia") {
      this.sprite.play("amelia_idle_down");
    } else if (spriteKey === "bob") {
      this.sprite.play("bob_idle_down");
    } else {
      // Fallback for old sprites
      this.sprite.setFrame(0);
    }

    // Create name text with better styling
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

    // Add subtle glow effect
    this.createGlowEffect(x, y);

    this.startIdleState();
  }

  private createGlowEffect(x: number, y: number): void {
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setPosition(x, y);
    this.glowEffect.setDepth(-1);

    // Create subtle ambient glow
    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.1, to: 0.3 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // State management
  private startIdleState(): void {
    this.state = "IDLE";
    this.sprite.setTint(0xffffff); // Reset tint for idle
    this.updateGlowColor(0x4488ff, 0.2); // Soft blue glow for idle
    console.log(`🔵 ${this.name}: Entering IDLE state`);

    // Start continuous AI conversation loop
    this.startAIConversationLoop();
  }

  private startAIConversationLoop(): void {
    if (this.state !== "IDLE") return;

    console.log(`🧠 ${this.name}: Starting AI conversation loop`);
    this.performAIAction();
  }

  private startEngagedState(engager: Character): void {
    this.state = "ENGAGED";
    this.sprite.setTint(0x88ff88); // Green tint when engaged
    this.updateGlowColor(0x44ff44, 0.4); // Brighter green glow when engaged
    console.log(`🟢 ${this.name}: Entering ENGAGED state with ${engager.name}`);

    // Clear action timer
    if (this.actionTimer) {
      this.actionTimer.destroy();
      this.actionTimer = undefined;
    }

    // No more automatic action timers - conversations are now event-driven
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

    // Clear conversation partner and timers
    this.conversationPartner = undefined;

    if (this.conversationTimeoutTimer) {
      this.conversationTimeoutTimer.destroy();
      this.conversationTimeoutTimer = undefined;
    }

    this.startIdleState();
  }

  // Remove the entire performEngagedAction method and isStillNearConversationPartner method

  private async performAIAction(): Promise<void> {
    if (this.state !== "IDLE") {
      console.log(`⏸️ ${this.name}: Skipping action - currently ${this.state}`);
      return;
    }

    // Update line of sight and get fresh context
    this.updateLineOfSight();
    const context = this.buildAIContext();

    try {
      const decision = await this.aiService.generateNPCAction(
        context,
        this.conversationMessages
      );

      // Debug the decision to catch undefined actions
      console.log(
        `🤖 ${this.name}: LLM Decision:`,
        JSON.stringify({
          action: decision.action,
          parameters: decision.parameters,
          reasoning: decision.reasoning,
        })
      );

      if (!decision.action) {
        console.error(
          `❌ ${this.name}: LLM returned undefined action!`,
          decision
        );
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

      // Add LLM response to conversation
      this.conversationMessages.push({
        role: "assistant",
        content: `I chose action: ${decision.action}${
          decision.parameters
            ? ` with parameters: ${JSON.stringify(decision.parameters)}`
            : ""
        }. Reasoning: ${decision.reasoning}`,
        tool_calls: decision.tool_calls,
      });

      // Add tool result to conversation
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

      // Continue conversation immediately with realistic delay
      setTimeout(() => {
        if (this.state === "IDLE") {
          this.performAIAction();
        }
      }, ACTION_DELAY);
    } catch (error) {
      console.error(`AI action failed for ${this.name}:`, error);

      // Add error to conversation
      this.conversationMessages.push({
        role: "tool",
        content: `ERROR: ${error}`,
        name: "system_error",
      });

      // Continue even after error
      setTimeout(() => {
        if (this.state === "IDLE") {
          this.performAIAction();
        }
      }, ACTION_DELAY);
    }
  }

  // Line of sight and discovery - always refresh, no caching
  private updateLineOfSight(): void {
    const myPos = this.getPosition();

    // Clear and rebuild discovery sets to ensure fresh proximity
    const previousObjects = new Set(this.discoveredObjects);
    const previousCharacters = new Set(this.discoveredCharacters);
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
        if (!previousObjects.has(obj.id)) {
          console.log(
            `🔍 ${this.name}: Discovered object ${obj.name} (${obj.id}) - can now interact with it`
          );
          if (typeof obj.onDiscovered === "function") {
            obj.onDiscovered();
          }
        }
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
          if (!previousCharacters.has(char.id)) {
            console.log(
              `👥 ${this.name}: Discovered ${char.name} (distance: ${Math.round(
                distance
              )}px)`
            );
          }
        }
      }
    });
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

    // Add conversation context when ENGAGED
    let conversationContext = "";
    if (this.state === "ENGAGED" && this.conversationPartner) {
      conversationContext = `Currently in conversation with ${this.conversationPartner.name}. `;
    }

    console.log(
      `🧠 ${this.name} AI Context:`,
      JSON.stringify(
        {
          visibleCharacters:
            visibleCharacters.length > 0 ? visibleCharacters : "none",
          availableTools: availableTools.map((t) => ({
            name: t.name,
            desc: t.description.substring(0, 50) + "...",
            params: t.parameters,
          })),
          conversationLength: this.conversationMessages.length,
          state: this.state,
        },
        null,
        2
      )
    );

    return {
      name: this.name,
      background:
        this.background +
        (conversationContext ? ` ${conversationContext}` : ""),
      personality: this.personality,
      currentLocation: "current room",
      visibleObjects,
      visibleCharacters,
      availableTools,
      conversationHistory: this.conversationHistory.slice(-5),
    };
  }

  private getAvailableTools(): NPCTool[] {
    const tools: NPCTool[] = [];

    // When ENGAGED, only allow conversation tools
    if (this.state === "ENGAGED") {
      tools.push(
        { name: "speak", description: "Continue the conversation" },
        {
          name: "ignore_conversation",
          description: "Ignore the speaker and end the conversation",
        },
        {
          name: "leave_conversation",
          description:
            "Politely end the conversation and return to normal activities",
        }
      );
      return tools;
    }

    // Normal IDLE tools
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

    console.log(
      `🔍 ${this.name}: Discovered objects:`,
      Array.from(this.discoveredObjects)
    );
    console.log(
      `🔍 ${this.name}: Discovered characters:`,
      Array.from(this.discoveredCharacters)
    );

    // Add interaction tools for discovered objects - let objects define their own tools
    Array.from(this.discoveredObjects).forEach((objId) => {
      const obj = this.roomObjects.find((o) => o.id === objId);
      if (obj && typeof obj.getOfferedTools === "function") {
        const objectTools = obj.getOfferedTools();
        objectTools.forEach((tool) => {
          const dynamicTool = {
            name: `${tool.name}_${obj.id}`,
            description: `${tool.description} (${obj.name})`,
            parameters: { objectId: obj.id, ...tool.parameters },
          };

          if (
            tool.name.includes("search") ||
            tool.description.toLowerCase().includes("search")
          ) {
            tools.unshift(dynamicTool);
          } else {
            tools.push(dynamicTool);
          }
        });
      }
    });

    // Add interaction tools for discovered characters
    Array.from(this.discoveredCharacters).forEach((charId) => {
      const character = this.roomCharacters.find((c) => c.id === charId);
      if (character && character.id !== this.id) {
        tools.push({
          name: `speak_to_${character.id}`,
          description: `Start a conversation with ${character.name}`,
          parameters: { characterId: character.id },
        });

        const distance = Phaser.Math.Distance.Between(
          this.getPosition().x,
          this.getPosition().y,
          character.getPosition().x,
          character.getPosition().y
        );

        if (distance > 100) {
          tools.push({
            name: `move_to_${character.id}`,
            description: `Move closer to ${character.name}`,
            parameters: { characterId: character.id },
          });
        }
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

  // Action execution - now returns results for LLM feedback
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
        console.log(`⏸️ ${this.name}: Waiting and observing...`);
        return { success: true, message: "Observed surroundings" };

      case "move_north":
      case "move_south":
      case "move_east":
      case "move_west":
        const direction = action.split("_")[1];
        console.log(`🧭 ${this.name}: Moving ${direction}`);
        const moved = this.moveInDirection(direction);
        return moved;

      case "move_random":
      case "patrol":
        console.log(`🚶 ${this.name}: Moving randomly/patrolling`);
        this.moveRandomly();
        return { success: true, message: "Moved to new area" };

      case "move_to_character":
        // Prevent movement when ENGAGED - should use speak instead
        if (this.state === "ENGAGED") {
          console.log(
            `❌ ${this.name}: Cannot move while ENGAGED - use 'speak' or 'leave_conversation' instead`
          );
          return;
        }

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
        // Only allow speak_to when IDLE, not when ENGAGED
        if (this.state !== "IDLE") {
          console.log(
            `❌ ${this.name}: Cannot use speak_to while ${this.state} - use 'speak' instead`
          );
          return;
        }

        const target =
          parameters?.target || parameters?.name || parameters?.character;
        if (target) {
          console.log(
            `💬 ${this.name}: Initiating conversation with ${target}`
          );
          this.initiateConversation(target);
        }
        break;

      case "speak":
        console.log(`💬 ${this.name}: Speaking in conversation`);
        await this.generateConversationMessage();
        break;

      case "leave_conversation":
        console.log(`🚪 ${this.name}: Leaving conversation`);
        this.endEngagement();
        break;

      case "ignore_conversation":
        console.log(`🙄 ${this.name}: Ignoring conversation`);
        this.endEngagement();
        break;

      case "search":
        const objectId = parameters?.target || parameters?.object;
        if (objectId) {
          const obj = this.roomObjects.find((o) => o.id === objectId);
          if (obj) {
            console.log(
              `🔍 ${this.name}: SEARCHING ${obj.name} for Energy Core`
            );
            const result = obj.handleInteraction("search", parameters);
            console.log(`📝 ${this.name} -> ${obj.name}: ${result.message}`);

            if (result.success) {
              console.log(
                `🎉 ${this.name}: MISSION COMPLETE! Found Energy Core in ${obj.name}!`
              );
            } else {
              console.log(
                `❌ ${this.name}: No Energy Core in ${obj.name}, continuing search`
              );
            }
          } else {
            console.log(
              `❓ ${this.name}: Could not find object ${objectId} to search`
            );
          }
        } else {
          console.log(`❌ ${this.name}: No target specified for search`);
        }
        break;

      default:
        // Handle dynamic character and object actions using event system
        const actionParts = action.split("_");
        if (actionParts.length >= 2) {
          const baseAction = actionParts[0];
          const targetId = actionParts.slice(1).join("_");

          // Try character actions first
          const character = this.roomCharacters.find((c) => c.id === targetId);
          if (character) {
            console.log(
              `🔧 ${this.name}: Executing ${baseAction} on ${character.name}`
            );

            if (baseAction === "speak_to") {
              this.initiateConversation(character.name);
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
            } else if (character instanceof SmartNPC) {
              const result = character.handleCharacterInteraction(
                baseAction,
                this,
                parameters
              );
              console.log(
                `📝 ${this.name} -> ${character.name}: ${result.message}`
              );
              return result;
            }
          } else {
            // Use event system for object interactions - return a promise
            return new Promise((resolve) => {
              console.log(
                `🔧 ${this.name}: Firing event ${action} for object interaction`
              );

              // Listen for response
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

              // Fire the tool event
              this.scene.events.emit(action, {
                initiator: this,
                parameters: { ...parameters, objectId: targetId },
              });
            });
          }
        }

        return { success: false, message: `Unknown action: ${action}` };
    }
  }

  private moveToCharacter(targetName: string): void {
    // Find target by name first, then fallback to other methods
    let target = this.roomCharacters.find((c) => c.name === targetName);

    // Fallback for player references
    if (
      !target &&
      (targetName === "Player" ||
        targetName === "player" ||
        targetName === "Technician")
    ) {
      target = this.roomCharacters.find((c) => c.id === "player");
    }

    // Fallback for numeric IDs (avoid this path for NPCs)
    if (!target && !isNaN(Number(targetName))) {
      console.log(
        `⚠️ ${this.name}: Avoiding numeric ID ${targetName}, looking for NPCs by name instead`
      );
      // Find first non-player character
      target = this.roomCharacters.find(
        (c) => c.id !== "player" && c.id !== this.id
      );
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

  private moveInDirection(direction: string): {
    success: boolean;
    message: string;
  } {
    const currentPos = this.getPosition();
    const moveDistance = Phaser.Math.Between(60, 120); // Random distance between 60-120px
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

    // Keep within room bounds
    const clampedX = Phaser.Math.Clamp(newX, 80, 720);
    const clampedY = Phaser.Math.Clamp(newY, 120, 520);

    // Check if movement was blocked by boundaries
    if (clampedX === currentPos.x && clampedY === currentPos.y) {
      console.log(
        `🚫 ${this.name}: Cannot move ${direction} - blocked by boundary`
      );
      return {
        success: false,
        message: `Cannot move ${direction} - blocked by boundary`,
      };
    }

    console.log(
      `📍 ${this.name}: Moving ${direction} from (${Math.round(
        currentPos.x
      )}, ${Math.round(currentPos.y)}) to (${Math.round(
        clampedX
      )}, ${Math.round(clampedY)})`
    );

    // Play walking animation during movement
    const spriteKey = this.sprite.texture.key;
    if (spriteKey === "alex") {
      this.sprite.play(`alex_walk_${this.lastDirection}`);
    } else if (spriteKey === "amelia") {
      this.sprite.play(`amelia_walk_${this.lastDirection}`);
    } else if (spriteKey === "bob") {
      this.sprite.play(`bob_walk_${this.lastDirection}`);
    }

    // Animate the movement
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
        // Return to idle animation after movement
        if (spriteKey === "alex") {
          this.sprite.play(`alex_idle_${this.lastDirection}`);
        } else if (spriteKey === "amelia") {
          this.sprite.play(`amelia_idle_${this.lastDirection}`);
        } else if (spriteKey === "bob") {
          this.sprite.play(`bob_idle_${this.lastDirection}`);
        }

        // Update line of sight after movement
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

      // Both NPCs enter ENGAGED state
      this.startEngagedState(target);
      this.conversationPartner = target;

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

    // Track conversation partner for shared context
    if (initiator instanceof SmartNPC) {
      this.conversationPartner = initiator;
      this.generateNPCResponse(initiator);
    }

    console.log(
      `🟢 ${this.name}: Now ENGAGED in conversation with ${initiator.name}`
    );
  }

  private async generateConversationMessage(): Promise<void> {
    try {
      const context = this.buildAIContext();

      // Include shared conversation history
      const sharedHistory = this.getSharedConversationHistory();
      const contextWithHistory =
        sharedHistory.length > 0
          ? `Previous conversation: ${sharedHistory.join(
              " "
            )}. Continue naturally.`
          : "Continue the conversation naturally";

      const response = await this.aiService.generateConversationResponse(
        context,
        contextWithHistory
      );

      // Natural delay based on message length (1-3 seconds)
      const delay = Math.min(3000, Math.max(1000, response.length * 50));

      setTimeout(() => {
        console.log(`💭 ${this.name}: "${response}"`);
        this.showSpeech(response);
        this.addToConversationHistory(this.name, response);

        // Fire speech event to conversation partner
        if (this.conversationPartner) {
          console.log(
            `📡 ${this.name}: Firing speech event to ${this.conversationPartner.name}`
          );
          this.scene.events.emit(`npc-speech-${this.conversationPartner.id}`, {
            speaker: this.name,
            message: response,
            speakerId: this.id,
          });
        } else {
          console.log(
            `⚠️ ${this.name}: No conversation partner to send event to`
          );
        }
      }, delay);
    } catch (error) {
      console.error(
        `❌ ${this.name}: Failed to generate conversation message:`,
        error
      );
    }
  }

  private onReceiveSpeech = (data: {
    speaker: string;
    message: string;
    speakerId: string;
  }) => {
    if (data.speakerId === this.id) return; // Don't respond to own speech

    console.log(
      `👂 ${this.name}: Received speech event from ${data.speaker}: "${data.message}"`
    );

    // Enter ENGAGED state when spoken to
    if (this.state !== "ENGAGED") {
      const speaker = this.roomCharacters.find((c) => c.id === data.speakerId);
      if (speaker instanceof SmartNPC) {
        console.log(
          `🔗 ${this.name}: Setting conversation partner to ${speaker.name}`
        );
        this.conversationPartner = speaker;
        this.startEngagedState(speaker);
      }
    }

    // Clear any existing conversation timeout and set new one
    if (this.conversationTimeoutTimer) {
      this.conversationTimeoutTimer.destroy();
    }

    // Return to IDLE if no speech received for 30 seconds (increased from 10)
    this.conversationTimeoutTimer = this.scene.time.delayedCall(30000, () => {
      console.log(`⏰ ${this.name}: Conversation timeout, returning to IDLE`);
      this.endEngagement();
    });

    // Respond after a natural delay (2-4 seconds) - but only if still engaged
    const responseDelay = Phaser.Math.Between(2000, 4000);
    console.log(
      `⏱️ ${this.name}: Will respond to ${data.speaker} in ${responseDelay}ms`
    );

    setTimeout(() => {
      if (this.state === "ENGAGED") {
        console.log(`🗣️ ${this.name}: Generating response to ${data.speaker}`);

        // Reset timeout when actively responding
        if (this.conversationTimeoutTimer) {
          this.conversationTimeoutTimer.destroy();
          this.conversationTimeoutTimer = this.scene.time.delayedCall(
            30000,
            () => {
              console.log(
                `⏰ ${this.name}: Conversation timeout, returning to IDLE`
              );
              this.endEngagement();
            }
          );
        }

        this.generateConversationMessage();
      } else {
        console.log(`❌ ${this.name}: No longer ENGAGED, skipping response`);
      }
    }, responseDelay);
  };

  private getSharedConversationHistory(): string[] {
    if (!this.conversationPartner) return [];

    // Get last few messages from both NPCs
    const myHistory = this.conversationHistory.slice(-3);
    const partnerHistory =
      this.conversationPartner.conversationHistory.slice(-3);

    // Merge and sort by timestamp (if available) or just alternate
    const combined = [...myHistory, ...partnerHistory]
      .filter((msg) => msg.content)
      .slice(-6); // Last 6 messages total

    return combined.map((msg) => msg.content);
  }

  private addToConversationHistory(speaker: string, message: string): void {
    const entry = {
      role: "assistant",
      content: `${speaker}: ${message}`,
      timestamp: Date.now(),
    };

    this.conversationHistory.push(entry);

    // Also add to partner's history for shared context
    if (this.conversationPartner) {
      this.conversationPartner.conversationHistory.push(entry);
    }
  }

  private async generateNPCResponse(initiator: SmartNPC): Promise<void> {
    try {
      const context = this.buildAIContext();
      const response = await this.aiService.generateConversationResponse(
        context,
        `${initiator.name} wants to talk to me`
      );

      // Natural response delay (1-2 seconds)
      const delay = Phaser.Math.Between(1000, 2000);

      setTimeout(() => {
        console.log(
          `💬 ${this.name}: Responding to ${initiator.name}: "${response}"`
        );
        this.showSpeech(response);
        this.addToConversationHistory(this.name, response);

        // Fire speech event to conversation partner (same as generateConversationMessage)
        if (this.conversationPartner) {
          console.log(
            `📡 ${this.name}: Firing initial speech event to ${this.conversationPartner.name}`
          );
          this.scene.events.emit(`npc-speech-${this.conversationPartner.id}`, {
            speaker: this.name,
            message: response,
            speakerId: this.id,
          });
        } else {
          console.log(
            `⚠️ ${this.name}: No conversation partner for initial response`
          );
        }
      }, delay);
    } catch (error) {
      console.error(`❌ ${this.name}: Failed to generate NPC response:`, error);
      const fallback = "Hello there!";
      this.showSpeech(fallback);
    }
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
        console.log(
          `📨 ${this.name}: Received message from player: "${message}"`
        );
        this.generateResponseToPlayer(message);
      }
    }
  }

  private async generateResponseToPlayer(playerMessage: string): Promise<void> {
    try {
      const context = this.buildAIContext();
      const response = await this.aiService.generateConversationResponse(
        context,
        playerMessage
      );

      console.log(`💬 ${this.name}: Responding to player: "${response}"`);

      // Show speech bubble
      this.showSpeech(response); // Always auto-hide

      // Add response to chat interface
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
            sender: "npc",
            message: fallbackResponse,
            timestamp: Date.now(),
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

  // Define what tools this NPC offers to other characters
  public getOfferedTools(): NPCTool[] {
    const tools: NPCTool[] = [];

    // Basic conversation tool
    tools.push({
      name: "speak_to",
      description: `Start a conversation with ${this.name}`,
    });

    // Character-specific tools based on personality/role
    if (this.name === "THE_ROBOT") {
      tools.push({
        name: "shutdown",
        description: `Emergency shutdown of ${this.name}`,
      });
      tools.push({
        name: "request_scan",
        description: `Ask ${this.name} to scan the area`,
      });
    } else if (this.name === "Dr. Chen") {
      tools.push({
        name: "ask_for_help",
        description: `Ask ${this.name} for scientific assistance`,
      });
      tools.push({
        name: "collaborate",
        description: `Propose collaboration with ${this.name}`,
      });
    }

    return tools;
  }

  // Handle interactions from other characters
  public handleCharacterInteraction(
    action: string,
    initiator: Character,
    parameters?: any
  ): { success: boolean; message: string } {
    console.log(`🎭 ${this.name}: Handling ${action} from ${initiator.name}`);

    switch (action) {
      case "shutdown":
        if (this.name === "THE_ROBOT") {
          console.log(
            `🤖 ${this.name}: Emergency shutdown initiated by ${initiator.name}`
          );
          this.showSpeech("EMERGENCY SHUTDOWN INITIATED. POWERING DOWN...");
          // Could add actual shutdown logic here
          return { success: true, message: "Robot shutdown successful" };
        }
        return { success: false, message: "Cannot shutdown this character" };

      case "request_scan":
        if (this.name === "THE_ROBOT") {
          this.showSpeech("INITIATING AREA SCAN... SCANNING COMPLETE.");
          return { success: true, message: "Area scan completed" };
        }
        return {
          success: false,
          message: "This character cannot perform scans",
        };

      case "ask_for_help":
        if (this.name === "Dr. Chen") {
          this.showSpeech(
            "Of course! I'd be happy to help with the scientific analysis."
          );
          return { success: true, message: "Dr. Chen agrees to help" };
        }
        return {
          success: false,
          message: "This character cannot provide that type of help",
        };

      case "collaborate":
        this.showSpeech(
          `Excellent idea, ${initiator.name}! Let's work together.`
        );
        return { success: true, message: `${this.name} agrees to collaborate` };

      default:
        return {
          success: false,
          message: `${this.name} doesn't understand action: ${action}`,
        };
    }
  }

  private updateGlowColor(color: number, intensity: number): void {
    if (this.glowEffect) {
      this.glowEffect.clear();
      this.glowEffect.fillStyle(color, intensity);
      this.glowEffect.fillCircle(0, 0, 20);
    }
  }

  public destroy(): void {
    // Clean up event listeners
    this.scene.events.off(`npc-speech-${this.id}`, this.onReceiveSpeech, this);

    if (this.actionTimer) this.actionTimer.destroy();
    if (this.conversationTimeoutTimer) this.conversationTimeoutTimer.destroy();
    if (this.breathingTween) this.breathingTween.destroy();
    if (this.glowEffect) this.glowEffect.destroy();
    this.speechBubble.destroy();
    this.sprite.destroy();
    this.nameText.destroy();
  }
}
