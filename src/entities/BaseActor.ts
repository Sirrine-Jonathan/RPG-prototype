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
  
  // Persistent tools available to this actor
  protected getPersistentTools(): Tool[] {
    return [
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
    
    return tools;
  }
  
  // Get nearby objects that can offer tools
  protected getNearbyObjects(): any[] {
    const gameManager = (globalThis as any).gameManager;
    if (!gameManager || !gameManager.proximitySystem) return [];
    
    const nearbyObjects = gameManager.proximitySystem.getNearbyObjects(this.id);
    if (nearbyObjects.length > 0) {
      console.log(`[NPC_FLOW] ${this.name}: Found ${nearbyObjects.length} nearby objects:`, nearbyObjects.map(obj => obj.id));
    }
    return nearbyObjects;
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
    console.log(`[NPC_FLOW] ${this.name}: Speaking - "${message}"`);
    
    // Fire speech event for other NPCs to hear
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.eventBus) {
      const myPos = this.getPosition();
      gameManager.eventBus.emit('npc_speech', {
        speakerId: this.id,
        speakerName: this.name,
        message: message,
        position: myPos,
        hearingRange: 150 // NPCs within 150px can hear
      }, 'SpeechSystem');
    }
    
    return { success: true, message: `${this.name} said: "${message}"` };
  }
}
