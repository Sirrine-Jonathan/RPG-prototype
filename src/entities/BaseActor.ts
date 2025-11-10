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
      console.log(`[Proximity] ${this.name}: No proximity system available`);
      return [];
    }
    
    const nearbyObjects = gameManager.proximitySystem.getNearbyObjects(this.id);
    console.log(`[Proximity] ${this.name}: Found ${nearbyObjects.length} nearby objects at position (${this.getPosition().x}, ${this.getPosition().y})`);
    if (nearbyObjects.length > 0) {
      console.log(`[Proximity] ${this.name}: Objects:`, nearbyObjects.map(obj => `${obj.id || obj.name} at (${obj.getPosition().x}, ${obj.getPosition().y})`));
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
      }
    ];
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
      
      // Add the player as a valid target
      const player = gameManager.entityManager.getPlayer();
      if (player) {
        const pos = player.getPosition();
        targets.push({
          id: 'player',
          name: 'Player',
          type: 'player',
          position: pos
        });
        console.log(`[Proximity] ${this.name}: Added Player at (${pos.x}, ${pos.y})`);
      }
    } else {
      console.log(`[Proximity] ${this.name}: No proximitySystem available`);
    }
    
    console.log(`[Proximity] ${this.name}: Found ${targets.length} visible targets for move_to:`, targets.map(t => `${t.id} (${t.type})`));
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
      return { success: false, message: `Target ${targetId} not found` };
    }
    
    const currentPos = this.getPosition();
    const targetPos = target.position;
    
    // Calculate distance to target
    const distance = Math.sqrt(
      (targetPos.x - currentPos.x) ** 2 + (targetPos.y - currentPos.y) ** 2
    );
    
    if (distance < 48) {
      return { success: true, message: `Already near ${target.name}` };
    }
    
    // Use pathfinding system for intelligent movement
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.systemManager?.pathfindingSystem) {
      gameManager.systemManager.pathfindingSystem.movePlayerTo(this, targetPos.x, targetPos.y);
      console.log(`[NPC_FLOW] ${this.name}: Using pathfinding to move toward ${target.name} at (${targetPos.x}, ${targetPos.y})`);
      return { success: true, message: `${this.name} moved toward ${target.name}` };
    } else {
      // Fallback to direct movement if pathfinding unavailable
      const dx = targetPos.x - currentPos.x;
      const dy = targetPos.y - currentPos.y;
      const moveDistance = 48;
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      const newX = currentPos.x + (normalizedDx * moveDistance);
      const newY = currentPos.y + (normalizedDy * moveDistance);
      
      this.moveToPosition(newX, newY);
      console.log(`[NPC_FLOW] ${this.name}: Moving toward ${target.name} at (${targetPos.x}, ${targetPos.y})`);
      return { success: true, message: `${this.name} moved toward ${target.name}` };
    }
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
    
    // Use pathfinding system for smooth movement
    const gameManager = (globalThis as any).gameManager;
    console.log(`[NPC_FLOW] ${this.name}: GameManager available:`, !!gameManager);
    console.log(`[NPC_FLOW] ${this.name}: PathfindingSystem available:`, !!gameManager?.pathfindingSystem);
    
    if (gameManager && gameManager.pathfindingSystem) {
      console.log(`[NPC_FLOW] ${this.name}: Using smooth movement to (${targetX}, ${targetY})`);
      this.moveToPosition(targetX, targetY);
    } else {
      // Fallback to direct position update
      console.log(`[NPC_FLOW] ${this.name}: Using fallback teleport to (${targetX}, ${targetY})`);
      this.setPosition(targetX, targetY);
    }
    
    console.log(`[NPC_FLOW] ${this.name}: Moved ${direction} to (${targetX}, ${targetY})`);
    return { success: true, message: `${this.name} moved ${direction}` };
  }
  
  // Abstract method for setting position (implemented by subclasses)
  protected abstract setPosition(x: number, y: number): void;
  protected abstract moveToPosition(x: number, y: number): void;
  
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
      
      gameManager.eventBus.emit('npc_speech', {
        speakerId: this.id,
        speakerName: this.name,
        message: message,
        position: myPos,
        hearingRange: 150, // NPCs within 150px can hear
        sceneKey: sceneKey // Add scene isolation
      }, 'SpeechSystem');
    }
    
    return { success: true, message: `${this.name} said: "${message}"` };
  }

  protected async handleTakeBreak(reason: string): Promise<{ success: boolean; message: string }> {
    console.log(`[NPC_FLOW] ${this.name}: Taking a break - ${reason || 'no reason given'}`);
    return { success: true, message: `${this.name} decided to take a break: ${reason || 'resting'}` };
  }
}