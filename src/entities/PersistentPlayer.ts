import { GameManager } from '../core/GameManager';
import { Tool } from './BaseActor';
import { InventorySystem } from '../systems/InventorySystem';
import { AIService } from '../services/AIService';
import { Logger } from '../utils/Logger';

export class PersistentPlayer {
  public id: string = 'Detective Riley';
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private currentScene: Phaser.Scene | null = null;
  private position: { x: number, y: number };
  private lastDirection: string = 'down';
  
  // Auto-play mode
  private autoMode: boolean = false;
  private aiService: AIService;
  private timeoutHandle?: Phaser.Time.TimerEvent;
  private readonly MIN_TIMEOUT = 10000; // 10 seconds for player actions
  private readonly MAX_TIMEOUT = 20000; // 20 seconds max
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.position = { x, y };
    this.aiService = AIService.getInstance();
    this.createSprite(scene);
  }
  
  private createSprite(scene: Phaser.Scene): void {
    this.currentScene = scene;
    this.sprite = scene.add.sprite(this.position.x, this.position.y, 'adam', 0);
    this.sprite.setScale(2);
    this.sprite.setOrigin(0.5, 0.5);
    
    // Check if animation exists before playing
    const animKey = `adam_idle_${this.lastDirection}`;
    if (scene.anims.exists(animKey)) {
      try {
        this.sprite.play(animKey);
      } catch (error) {
        console.warn(`Failed to play animation ${animKey}:`, error);
        this.sprite.setFrame(0); // Use default frame
      }
    } else {
      console.warn(`Missing animation: ${animKey}`);
      this.sprite.setFrame(0); // Use default frame
    }
    
    // Start camera following
    scene.cameras.main.startFollow(this.sprite);
    console.log('📷 PersistentPlayer: Camera following player');
  }
  
  public transferToScene(newScene: Phaser.Scene): void {
    // Save current position
    if (this.sprite) {
      this.position.x = this.sprite.x;
      this.position.y = this.sprite.y;
      this.sprite.destroy();
    }
    
    // Create sprite in new scene
    this.createSprite(newScene);
    
    // Set up camera following
    newScene.cameras.main.startFollow(this.sprite!);
    console.log('📷 PersistentPlayer: Camera now following player');
  }
  
  public setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    if (this.sprite) {
      this.sprite.setPosition(x, y);
    }
  }
  
  public moveToPosition(x: number, y: number, duration: number = 500): void {
    if (!this.sprite || !this.currentScene) return;
    
    const distance = Math.sqrt(Math.pow(x - this.sprite.x, 2) + Math.pow(y - this.sprite.y, 2));
    const adjustedDuration = Math.max(200, Math.min(1000, distance * 2)); // Scale duration with distance
    
    this.currentScene.tweens.add({
      targets: this.sprite,
      x: x,
      y: y,
      duration: adjustedDuration,
      ease: 'Power2',
      onComplete: () => {
        this.position.x = x;
        this.position.y = y;
      }
    });
  }
  
  public getPosition(): { x: number, y: number } {
    if (this.sprite) {
      return { x: this.sprite.x, y: this.sprite.y };
    }
    return { ...this.position };
  }
  
  public getSprite(): Phaser.GameObjects.Sprite | null {
    return this.sprite;
  }
  
  public update(): void {
    // Player update logic will be handled by MovementSystem
  }
  
  public getOfferedTools(): Tool[] {
    return [{
      name: 'give_detective_riley',
      description: 'Give an item to Detective Riley',
      parameters: {
        type: 'object',
        properties: {
          item: { type: 'string', description: 'Item to give' },
          item_name: { type: 'string', description: 'Name of item to give' }
        },
        required: []
      },
      handler: async (params) => {
        const itemToGive = params.item || params.item_name;
        const inventory = InventorySystem.getInstance();
        const gameManager = (globalThis as any).gameManager;
        
        if (!gameManager?.proximitySystem) {
          return { success: false, message: `No proximity system available` };
        }
        
        const nearbyNPCs = gameManager.proximitySystem.getNearbyNPCs();
        let sourceNPC = null;
        
        for (const npc of nearbyNPCs) {
          if (inventory.hasItem(npc.id, itemToGive)) {
            sourceNPC = npc;
            break;
          }
        }
        
        if (!sourceNPC) {
          // Provide helpful feedback about available items
          const availableItems = [];
          for (const npc of nearbyNPCs) {
            const npcInventory = inventory.getInventory(npc.id);
            availableItems.push(...npcInventory.map(item => item.id));
          }
          
          return { 
            success: false, 
            message: `Item "${itemToGive}" not found. Available items: ${availableItems.join(', ') || 'none'}` 
          };
        }
        
        // Transfer to actual player ID
        const success = inventory.transferItem(sourceNPC.id, this.id, itemToGive);
        if (success) {
          const item = inventory.getInventory(this.id).find(i => i.id === itemToGive);
          
          if (gameManager?.eventBus) {
            gameManager.eventBus.emit('player-inventory-updated', {
              action: 'received',
              item: item,
              from: sourceNPC.name
            });
          }
          
          // Message from giver's perspective
          return { success: true, message: `You gave ${item?.name || itemToGive} to Detective Riley` };
        }
        
        return { success: false, message: `Failed to give ${itemToGive}` };
      }
    }];
  }

  // Auto-play mode methods
  public enableAutoMode(): void {
    this.autoMode = true;
    console.log("🤖 Detective Riley: Auto-play mode enabled");
    this.startAutoPlayTimeout();
  }

  public disableAutoMode(): void {
    this.autoMode = false;
    if (this.timeoutHandle) {
      this.timeoutHandle.destroy();
      this.timeoutHandle = undefined;
    }
    console.log("🤖 Detective Riley: Auto-play mode disabled");
  }

  private startAutoPlayTimeout(): void {
    if (!this.autoMode || !this.currentScene) return;

    const delay = Math.random() * (this.MAX_TIMEOUT - this.MIN_TIMEOUT) + this.MIN_TIMEOUT;
    
    this.timeoutHandle = this.currentScene.time.addEvent({
      delay: delay,
      callback: () => this.performAutoAction(),
      callbackScope: this
    });
  }

  private async performAutoAction(): Promise<void> {
    if (!this.autoMode) return;

    try {
      const context = this.buildAutoPlayContext();
      const response = await this.aiService.generateResponseWithTools(
        this.buildAutoPlayPrompt(),
        context,
        this.getAutoPlayTools()
      );

      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolCall = response.toolCalls[0];
        await this.executeAutoPlayTool(toolCall.function.name, toolCall.function.arguments);
      }

    } catch (error) {
      console.error("🤖 Detective Riley: Auto-play action failed:", error);
    }

    // Schedule next action
    this.startAutoPlayTimeout();
  }

  private buildAutoPlayContext(): any[] {
    const gameManager = (globalThis as any).gameManager;
    const inventory = InventorySystem.getInstance();
    const playerInventory = inventory.getInventory(this.id);
    
    return [{
      role: 'user',
      content: `You are Detective Riley investigating Maya's disappearance. 
      
Current inventory: ${playerInventory.map(i => i.name).join(', ') || 'empty'}
Current location: ${this.currentScene?.scene.key || 'unknown'}

Your goal is to solve Maya's disappearance by:
1. Gathering evidence and clues from NPCs
2. Visiting different locations (library, school, police station)
3. Asking questions and following leads
4. Piecing together what happened to Maya

Take the next logical investigative action.`
    }];
  }

  private buildAutoPlayPrompt(): string {
    return `You are Detective Riley, a professional investigator hired to find Maya, who disappeared 3 days ago.

INVESTIGATION APPROACH:
- Be methodical and thorough
- Ask NPCs about Maya and gather information
- Visit locations where Maya was last seen
- Follow up on any leads or evidence
- Work toward solving the mystery

AVAILABLE ACTIONS:
- speak_to_npcs: Talk to nearby NPCs about the case
- navigate_to_location: Move to a different area to investigate
- examine_evidence: Review items in your inventory
- ask_questions: Ask specific questions about Maya's disappearance

Choose your next investigative action based on what you know so far.`;
  }

  private getAutoPlayTools(): Tool[] {
    return [
      {
        name: 'speak_to_npcs',
        description: 'Speak to nearby NPCs about Maya\'s case',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'What to say to the NPCs' }
          },
          required: ['message']
        },
        handler: async (params) => this.handleAutoSpeak(params.message)
      },
      {
        name: 'navigate_to_location',
        description: 'Navigate to a different location to investigate',
        parameters: {
          type: 'object',
          properties: {
            location: { 
              type: 'string', 
              enum: ['library', 'school', 'police_station', 'hospital', 'town'],
              description: 'Location to visit'
            },
            reason: { type: 'string', description: 'Why visit this location' }
          },
          required: ['location', 'reason']
        },
        handler: async (params) => this.handleAutoNavigate(params.location, params.reason)
      },
      {
        name: 'examine_evidence',
        description: 'Examine items in inventory for clues',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        },
        handler: async (params) => this.handleAutoExamine()
      }
    ];
  }

  private async handleAutoSpeak(message: string): Promise<{ success: boolean; message: string }> {
    console.log(`🤖 Detective Riley (Auto): "${message}"`);
    
    // Emit speech event for NPCs to hear
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.eventBus) {
      gameManager.eventBus.emit('player_speech', {
        speaker: 'Detective Riley',
        speakerId: this.id,
        message: message,
        position: this.position,
        timestamp: Date.now()
      });
    }

    return { success: true, message: `You said: "${message}"` };
  }

  private async handleAutoNavigate(location: string, reason: string): Promise<{ success: boolean; message: string }> {
    console.log(`🤖 Detective Riley (Auto): Navigating to ${location} - ${reason}`);
    
    // Emit navigation intent
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.eventBus) {
      gameManager.eventBus.emit('player_navigation_request', {
        location: location,
        reason: reason,
        playerId: this.id
      });
    }

    return { success: true, message: `Decided to visit ${location}: ${reason}` };
  }

  private async handleAutoExamine(): Promise<{ success: boolean; message: string }> {
    const inventory = InventorySystem.getInstance();
    const playerInventory = inventory.getInventory(this.id);
    
    if (playerInventory.length === 0) {
      console.log("🤖 Detective Riley (Auto): No evidence to examine yet");
      return { success: true, message: "No evidence in inventory to examine" };
    }

    const evidence = playerInventory.map(item => `${item.name}: ${item.description}`).join('; ');
    console.log(`🤖 Detective Riley (Auto): Examining evidence - ${evidence}`);
    
    return { success: true, message: `Examined evidence: ${evidence}` };
  }

  public destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    this.currentScene = null;
  }
}