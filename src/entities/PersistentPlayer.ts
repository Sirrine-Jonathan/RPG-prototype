import { GameManager } from '../core/GameManager';
import { Tool } from './BaseActor';
import { InventorySystem } from '../systems/InventorySystem';

export class PersistentPlayer {
  public id: string = 'Detective Riley';
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private currentScene: Phaser.Scene | null = null;
  private position: { x: number, y: number };
  private lastDirection: string = 'down';
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.position = { x, y };
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

  public destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    this.currentScene = null;
  }
}