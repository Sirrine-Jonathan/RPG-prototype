import { InventorySystem, InventoryItem } from '../systems/InventorySystem';
import { PositionTracker } from '../systems/PositionTracker';

export interface Tool {
  name: string;
  description: string;
  parameters?: any;
  handler: (params: any) => Promise<{ success: boolean; message: string }>;
}

export abstract class BaseActor {
  public abstract id: string;
  public abstract name: string;
  
  // Abstract methods that must be implemented
  public abstract getPosition(): { x: number, y: number };
  
  // Get tools this actor offers to nearby actors
  public getOfferedTools(): Tool[] {
    return [];
  }
  
  // Get all available tools (persistent + offered by nearby objects)
  public getAvailableTools(): Tool[] {
    const tools: Tool[] = [];
    
    // Add persistent tools
    tools.push(...this.getPersistentTools());
    
    // Add conditional tools
    tools.push(...this.getConditionalTools());
    
    // Add tools offered by nearby objects
    const nearbyObjects = this.getNearbyObjects();
    nearbyObjects.forEach(obj => {
      tools.push(...obj.getOfferedTools());
    });
    
    return tools;
  }
  
  // Get nearby objects that can offer tools (narrow interaction range)
  protected getNearbyObjects(): any[] {
    const gameManager = (globalThis as any).gameManager;
    if (!gameManager || !gameManager.proximitySystem) {
      console.log(`[LLM][Interface][${this.name}] No proximity system available`);
      return [];
    }
    
    const nearbyObjects = gameManager.proximitySystem.getNearbyObjects(this.id);
    console.log(`[LLM][Interface][${this.name}] Found ${nearbyObjects.length} nearby objects at position (${this.getPosition().x}, ${this.getPosition().y})`);
    if (nearbyObjects.length > 0) {
      console.log(`[LLM][Interface][${this.name}] Objects:`, nearbyObjects.map(obj => `${obj.id || obj.name} at (${obj.getPosition().x}, ${obj.getPosition().y})`));
      nearbyObjects.forEach(obj => {
        const offeredTools = obj.getOfferedTools();
        console.log(`[LLM][Interface][${this.name}] ${obj.id || obj.name} offers ${offeredTools.length} tools:`, offeredTools.map(t => t.name));
      });
    }
    
    return nearbyObjects;
  }
  
  // Persistent tools available to this actor
  protected getPersistentTools(): Tool[] {
    return [
      {
        name: 'move_to',
        description: 'Move toward a specific object or person in the scene',
        parameters: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'ID of the target to move toward' }
          },
          required: ['target']
        },
        handler: async (params) => this.handleMoveTo(params.target)
      },
      {
        name: 'move_north',
        description: 'Move north',
        handler: async () => this.handleMove('north')
      },
      {
        name: 'move_south', 
        description: 'Move south',
        handler: async () => this.handleMove('south')
      },
      {
        name: 'move_east',
        description: 'Move east', 
        handler: async () => this.handleMove('east')
      },
      {
        name: 'move_west',
        description: 'Move west',
        handler: async () => this.handleMove('west')
      },
      {
        name: 'check_inventory',
        description: 'Check what items you are carrying',
        handler: async () => this.handleCheckInventory()
      }
    ];
  }
  
  // Conditional tools based on current state/proximity
  protected getConditionalTools(): Tool[] {
    const tools: Tool[] = [];
    
    // Add 'speak' tool only if other actors are nearby
    if (this.hasNearbyActors()) {
      console.log(`[LLM][Interface][${this.name}] Adding speak tool - nearby actors detected`);
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
    } else {
      console.log(`[LLM][Interface][${this.name}] No speak tool - no nearby actors`);
    }

    // Add inventory tools if holding items
    const inventory = InventorySystem.getInstance().getInventory(this.id);
    console.log(`[LLM][Interface][${this.name}] Inventory check: ${inventory.length} items found`);
    if (inventory.length > 0) {
      console.log(`[LLM][Interface][${this.name}] Items:`, inventory.map(item => `${item.name} (${item.id})`));
      
      console.log(`[LLM][Interface][${this.name}] No give tool - handled by nearby objects now`);
    } else {
      console.log(`[LLM][Interface][${this.name}] No give tool - no items in inventory`);
    }
    
    // Add take_a_break tool for all NPCs
    tools.push({
      name: 'take_a_break',
      description: 'Stop taking actions for now and wait',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why you are taking a break' }
        }
      },
      handler: async (params) => this.handleTakeBreak(params.reason)
    });
    
    console.log(`[LLM][Interface][${this.name}] Total conditional tools: ${tools.length}`);
    return tools;
  }
  
  // Get all visible objects/actors in scene for move_to tool (wide awareness)
  protected getVisibleTargets(): any[] {
    const gameManager = (globalThis as any).gameManager;
    if (!gameManager) {
      console.log(`[Proximity] ${this.name}: No gameManager available`);
      return [];
    }
    
    const targets: any[] = [];
    
    // Add all objects in the scene (wide awareness)
    if (gameManager.proximitySystem) {
      console.log(`[Proximity] ${this.name}: ProximitySystem available, checking objects...`);
      
      // Access the objects Map directly
      if (gameManager.proximitySystem.objects) {
        console.log(`[Proximity] ${this.name}: Objects Map size: ${gameManager.proximitySystem.objects.size}`);
        gameManager.proximitySystem.objects.forEach((obj: any, objId: string) => {
          const pos = obj.getPosition();
          targets.push({
            id: objId,
            name: obj.name || objId,
            type: 'object',
            position: pos
          });
          console.log(`[Proximity] ${this.name}: Added object ${objId} at (${pos.x}, ${pos.y})`);
        });
      } else {
        console.log(`[Proximity] ${this.name}: No objects Map found in proximitySystem`);
      }
      
      // Add all other NPCs in the scene
      if (gameManager.proximitySystem.npcs) {
        console.log(`[Proximity] ${this.name}: NPCs Map size: ${gameManager.proximitySystem.npcs.size}`);
        gameManager.proximitySystem.npcs.forEach((npc: any, npcId: string) => {
          if (npcId !== this.id) { // Don't include self
            const pos = npc.getPosition();
            targets.push({
              id: npcId,
              name: npc.name,
              type: 'npc',
              position: pos
            });
            console.log(`[Proximity] ${this.name}: Added NPC ${npcId} (${npc.name}) at (${pos.x}, ${pos.y})`);
          }
        });
      } else {
        console.log(`[Proximity] ${this.name}: No NPCs Map found in proximitySystem`);
      }
      
      // Add the player as a valid target (only if not already added as an object)
      const player = gameManager.entityManager.getPlayer();
      if (player && !targets.find(t => t.id === player.id)) {
        const pos = player.getPosition();
        targets.push({
          id: player.id,
          name: player.id,
          type: 'player',
          position: pos
        });
        console.log(`[Proximity] ${this.name}: Added Player ${player.id} at (${pos.x}, ${pos.y})`);
      }
    } else {
      console.log(`[Proximity] ${this.name}: No proximitySystem available`);
    }
    
    console.log(`[Proximity] ${this.name}: Found ${targets.length} visible targets for move_to:`, targets.map(t => t.id));
    return targets;
  }
  
  // Check if there are nearby actors to speak to
  protected hasNearbyActors(): boolean {
    const gameManager = (globalThis as any).gameManager;
    if (!gameManager || !gameManager.proximitySystem) {
      console.log(`[NPC_FLOW] ${this.name}: No gameManager or proximitySystem available for speak tool`);
      return false;
    }
    
    const hasNearby = gameManager.proximitySystem.hasNearbyActors(this.id);
    console.log(`[NPC_FLOW] ${this.name}: hasNearbyActors check: ${hasNearby}`);
    return hasNearby;
  }
  
  // Tool handlers
  protected async handleMoveTo(targetId: string): Promise<{ success: boolean; message: string }> {
    const targets = this.getVisibleTargets();
    const target = targets.find(t => t.id === targetId);
    
    if (!target) {
      return { success: false, message: `Target ${targetId} not found. Available targets: ${targets.map(t => t.id).join(', ')}` };
    }
    
    const currentPos = this.getPosition();
    const targetPos = target.position;
    
    // Calculate distance to target
    const distance = Math.sqrt(
      (targetPos.x - currentPos.x) ** 2 + (targetPos.y - currentPos.y) ** 2
    );
    
    // Stop just inside interaction range (48px)
    const interactionDistance = 45; // Just inside 48px range
    
    if (distance < interactionDistance) {
      return { success: true, message: `Already near ${target.name}` };
    }
    
    // Calculate target position that maintains interaction distance
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    // Move from current position toward target, stopping just short
    const moveDistance = distance - interactionDistance;
    const finalTargetX = currentPos.x + normalizedDx * moveDistance;
    const finalTargetY = currentPos.y + normalizedDy * moveDistance;
    
    // Use pathfinding system for intelligent movement
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.systemManager?.pathfindingSystem) {
      // Create a Promise wrapper around pathfinding system
      await new Promise<void>((resolve) => {
        // Store the resolve function so pathfinding can call it when done
        (this as any)._moveResolve = resolve;
        
        gameManager.systemManager.pathfindingSystem.movePlayerTo(this, finalTargetX, finalTargetY);
        console.log(`[NPC_FLOW] ${this.name}: Using pathfinding to move toward ${target.name} at (${finalTargetX}, ${finalTargetY})`);
        
        // Set up dynamic target tracking if target is the player
        if (target.id === 'player' || target.id === 'Detective Riley') {
          const trackingInterval = setInterval(() => {
            // Re-find the target to get updated position
            const currentTargets = this.getVisibleTargets();
            const currentTarget = currentTargets.find(t => t.id === target.id);
            
            if (!currentTarget) {
              clearInterval(trackingInterval);
              return;
            }
            
            const currentTargetPos = currentTarget.position;
            const myPos = this.getPosition();
            const currentDistance = Math.sqrt(
              (currentTargetPos.x - myPos.x) ** 2 + (currentTargetPos.y - myPos.y) ** 2
            );
            
            // Stop tracking if we're close enough or pathfinding is done
            if (currentDistance <= interactionDistance || !(this as any)._moveResolve) {
              clearInterval(trackingInterval);
              return;
            }
            
            // Recalculate target position
            const newNormalizedDx = (currentTargetPos.x - myPos.x) / currentDistance;
            const newNormalizedDy = (currentTargetPos.y - myPos.y) / currentDistance;
            const newMoveDistance = currentDistance - interactionDistance;
            const newTargetX = myPos.x + newNormalizedDx * newMoveDistance;
            const newTargetY = myPos.y + newNormalizedDy * newMoveDistance;
            
            // Update pathfinding target
            gameManager.systemManager.pathfindingSystem.updateTarget(
              this.id || this.name || 'unknown',
              newTargetX,
              newTargetY
            );
          }, 500); // Update every 500ms
        }
      });
    } else {
      // Fallback to direct movement if pathfinding unavailable
      await this.moveToPosition(finalTargetX, finalTargetY);
      console.log(`[NPC_FLOW] ${this.name}: Moving toward ${target.name} at (${finalTargetX}, ${finalTargetY})`);
    }
    
    return { success: true, message: `You moved toward ${target.name}` };
  }
  
  protected async handleMove(direction: string): Promise<{ success: boolean; message: string }> {
    const currentPos = this.getPosition();
    const moveDistance = 48; // One tile
    let targetX = currentPos.x;
    let targetY = currentPos.y;
    
    switch (direction) {
      case 'north':
        targetY -= moveDistance;
        break;
      case 'south':
        targetY += moveDistance;
        break;
      case 'east':
        targetX += moveDistance;
        break;
      case 'west':
        targetX -= moveDistance;
        break;
    }
    
    // Check boundaries using BoundarySystem
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.systemManager?.boundarySystem) {
      if (!gameManager.systemManager.boundarySystem.isPositionValid(targetX, targetY)) {
        return { success: false, message: `Cannot move ${direction} - would go off map or hit obstacle` };
      }
    } else {
      // Fallback boundary check
      const mapWidth = 2784; // 58 * 48
      const mapHeight = 1824; // 38 * 48  
      const margin = 48;
      
      if (targetX < margin || targetX > mapWidth - margin || 
          targetY < margin || targetY > mapHeight - margin) {
        return { success: false, message: `Cannot move ${direction} - would go off map` };
      }
    }
    
    // Use pathfinding system for smooth movement
    console.log(`[NPC_FLOW] ${this.name}: GameManager available:`, !!gameManager);
    console.log(`[NPC_FLOW] ${this.name}: PathfindingSystem available:`, !!gameManager?.pathfindingSystem);
    
    if (gameManager && gameManager.pathfindingSystem) {
      console.log(`[NPC_FLOW] ${this.name}: Using smooth movement to (${targetX}, ${targetY})`);
      await this.moveToPosition(targetX, targetY);
    } else {
      // Fallback to direct position update
      console.log(`[NPC_FLOW] ${this.name}: Using fallback teleport to (${targetX}, ${targetY})`);
      this.setPosition(targetX, targetY);
    }
    
    console.log(`[NPC_FLOW] ${this.name}: Moved ${direction} to (${targetX}, ${targetY})`);
    return { success: true, message: `You moved ${direction}` };
  }
  
  // Abstract method for setting position (implemented by subclasses)
  protected abstract setPosition(x: number, y: number): void;
  protected abstract moveToPosition(x: number, y: number): Promise<void>;
  
  protected async handleSpeak(message: string): Promise<{ success: boolean; message: string }> {
    // Validate message is not empty
    if (!message || message.trim() === '') {
      console.warn(`⚠️ [NPC_FLOW] ${this.name}: Attempted to speak empty message - skipping speech`);
      return { success: false, message: "Empty message - no speech" };
    }
    
    console.log(`[NPC_FLOW] ${this.name}: Speaking - "${message}"`);
    
    // Fire speech event for other NPCs to hear
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.eventBus) {
      const myPos = this.getPosition();
      
      // Get current scene key - try multiple ways to find it
      let sceneKey = '';
      if ((this as any).currentScene) {
        sceneKey = (this as any).currentScene.scene.key;
      } else if (gameManager.scene && gameManager.scene.scene) {
        sceneKey = gameManager.scene.scene.key;
      }
      
      console.log(`[BaseActor] Emitting npc_speech event for ${this.name}: "${message}"`);
      gameManager.eventBus.emit('npc_speech', {
        speakerId: this.id,
        speakerName: this.name,
        message: message,
        position: myPos,
        hearingRange: 150, // NPCs within 150px can hear
        sceneKey: sceneKey // Add scene isolation
      }, 'SpeechSystem');

      // Calculate who heard this message
      const hearingRange = 150;
      const listeners = [];
      
      // Check if player heard it
      const player = gameManager.entityManager.getPlayer();
      if (player) {
        const playerPos = player.getPosition();
        const playerDistance = Phaser.Math.Distance.Between(myPos.x, myPos.y, playerPos.x, playerPos.y);
        if (playerDistance <= hearingRange) {
          listeners.push(`Player (${Math.round(playerDistance)}px away)`);
          
          // QUICK FIX: Also emit player-heard directly to ensure chat sync
          console.log(`[BaseActor] Player within range (${playerDistance}px), emitting player-heard event`);
          gameManager.eventBus.emit('player-heard', {
            speaker: this.name,
            message: message,
            distance: playerDistance,
          });
        }
      }
      
      // Check nearby NPCs
      const nearbyNPCs = gameManager.proximitySystem.getNearbyNPCs();
      nearbyNPCs.forEach(npc => {
        if (npc.id !== this.id) {
          const npcPos = npc.getPosition();
          const npcDistance = Phaser.Math.Distance.Between(myPos.x, myPos.y, npcPos.x, npcPos.y);
          if (npcDistance <= hearingRange) {
            listeners.push(`${npc.name} (${Math.round(npcDistance)}px away)`);
          }
        }
      });
      
      const hearersReport = listeners.length > 0 
        ? `Heard by: ${listeners.join(', ')}` 
        : 'No one was close enough to hear';
      
      // Add hint to wait for response if player heard the message
      const playerHeard = listeners.some(listener => listener.includes('Player'));
      const waitHint = playerHeard ? ' Wait for their response before taking further action.' : '';
        
      return { success: true, message: `You said: "${message}" - ${hearersReport}${waitHint}` };
    }
    
    return { success: true, message: `You said: "${message}"` };
  }

  protected async handleTakeBreak(reason: string): Promise<{ success: boolean; message: string }> {
    console.log(`[NPC_FLOW] ${this.name}: Taking a break - ${reason || 'no reason given'}`);
    return { success: true, message: `You decided to take a break: ${reason || 'resting'}` };
  }

  protected async handleGive(itemId: string, targetId: string): Promise<{ success: boolean; message: string }> {
    const inventory = InventorySystem.getInstance();
    
    // Check if we have the item
    if (!inventory.hasItem(this.id, itemId)) {
      return { success: false, message: `Don't have item ${itemId}` };
    }

    // Check if target exists and is nearby
    const targets = this.getVisibleTargets();
    const target = targets.find(t => t.id === targetId);
    if (!target) {
      return { success: false, message: `Target ${targetId} not found nearby` };
    }

    // Transfer the item
    const success = inventory.transferItem(this.id, targetId, itemId);
    if (success) {
      const item = inventory.getInventory(targetId).find(i => i.id === itemId);
      
      // Emit event for UI updates if transferring to player
      if (targetId === 'player') {
        const gameManager = (globalThis as any).gameManager;
        if (gameManager && gameManager.eventBus) {
          gameManager.eventBus.emit('player-inventory-updated', {
            action: 'received',
            item: item,
            from: this.name
          });
        }
      }
      
      return { success: true, message: `You gave ${item?.name || itemId} to ${target.name}` };
    }

    return { success: false, message: `Failed to give ${itemId}` };
  }

  protected async handleCheckInventory(): Promise<{ success: boolean; message: string }> {
    const inventory = InventorySystem.getInstance().getInventory(this.id);
    if (inventory.length === 0) {
      return { success: true, message: "Not carrying any items" };
    }

    const itemList = inventory.map(item => item.name).join(', ');
    return { success: true, message: `You are carrying: ${itemList}` };
  }
}