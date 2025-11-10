import { Pathfinding } from '../utils/Pathfinding';

export class PathfindingSystem {
  private pathfinding: Pathfinding | null = null;
  private currentSceneKey: string = '';
  private currentPath: Array<{ x: number, y: number }> = [];
  private pathIndex: number = 0;
  private isMoving: boolean = false;
  private currentPlayer: any = null;
  
  public initialize(): void {
    // Will be initialized per scene
  }
  
  public updateForScene(sceneKey: string, width: number, height: number): void {
    if (this.currentSceneKey !== sceneKey) {
      this.pathfinding = new Pathfinding(30, width, height);
      this.currentSceneKey = sceneKey;
      console.log(`🗺️ PathfindingSystem: Updated for scene ${sceneKey} (${width}x${height})`);
    }
  }
  
  public isPathfindingActive(): boolean {
    return this.isMoving;
  }
  
  public cancelPathfinding(): void {
    if (this.isMoving) {
      console.log('🎯 PathfindingSystem: Pathfinding cancelled by user input');
      
      // Stop any active tweens
      if (this.currentPlayer) {
        const sprite = this.currentPlayer.getSprite();
        if (sprite && sprite.scene) {
          sprite.scene.tweens.killTweensOf(sprite);
        }
      }
      
      this.isMoving = false;
      this.currentPath = [];
      this.pathIndex = 0;
      this.currentPlayer = null;
    }
  }
  
  public movePlayerTo(player: any, targetX: number, targetY: number): void {
    if (!this.pathfinding || this.isMoving) {
      return;
    }
    
    const playerPos = player.getPosition();
    const sprite = player.getSprite();
    
    console.log(`🎯 PathfindingSystem: Click-to-move from (${playerPos.x}, ${playerPos.y}) to (${targetX}, ${targetY})`);
    console.log(`🎯 PathfindingSystem: Player sprite at (${sprite?.x}, ${sprite?.y}), visible: ${sprite?.visible}`);
    
    const path = this.pathfinding.findPath(playerPos.x, playerPos.y, targetX, targetY);
    console.log(`🎯 PathfindingSystem: Found path with ${path.length} steps`);
    
    if (path.length > 1) {
      this.currentPath = path.slice(1); // Skip current position
      this.pathIndex = 0;
      this.isMoving = true;
      this.currentPlayer = player;
      this.followPath();
    }
  }
  
  private followPath(): void {
    if (!this.currentPlayer || this.pathIndex >= this.currentPath.length) {
      // Path completed - play idle animation facing last direction
      const sprite = this.currentPlayer?.getSprite();
      if (sprite && sprite.anims) {
        // Get last direction from current animation or default to down
        let lastDirection = 'down';
        if (sprite.anims.currentAnim) {
          const animName = sprite.anims.currentAnim.key;
          if (animName.includes('_up')) lastDirection = 'up';
          else if (animName.includes('_down')) lastDirection = 'down';
          else if (animName.includes('_left')) lastDirection = 'left';
          else if (animName.includes('_right')) lastDirection = 'right';
        }
        
        const idleAnimKey = `adam_idle_${lastDirection}`;
        if (sprite.scene.anims.exists(idleAnimKey)) {
          sprite.play(idleAnimKey, true);
        }
      }
      
      this.isMoving = false;
      this.currentPath = [];
      this.pathIndex = 0;
      this.currentPlayer = null;
      return;
    }
    
    const target = this.currentPath[this.pathIndex];
    const playerPos = this.currentPlayer.getPosition();
    const distance = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, target.x, target.y);
    
    if (distance < 5) {
      this.pathIndex++;
      this.followPath();
      return;
    }
    
    // Get the scene to create tween
    const sprite = this.currentPlayer.getSprite();
    if (!sprite || !sprite.scene) {
      this.isMoving = false;
      return;
    }
    
    // Determine direction for animation
    const dx = target.x - playerPos.x;
    const dy = target.y - playerPos.y;
    let direction = 'down';
    
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }
    
    // Play walking animation
    const animKey = `adam_walk_${direction}`;
    if (sprite.anims && sprite.scene.anims.exists(animKey)) {
      console.log(`🚶 PathfindingSystem: Playing animation ${animKey} on sprite at (${sprite.x}, ${sprite.y})`);
      sprite.play(animKey, true);
    } else {
      console.warn(`🚶 PathfindingSystem: Animation ${animKey} not found`);
    }
    
    // Move smoothly to next point
    sprite.scene.tweens.add({
      targets: sprite,
      x: target.x,
      y: target.y,
      duration: 300,
      ease: 'Linear',
      onUpdate: () => {
        // Ensure animation keeps playing during tween
        if (sprite.anims && sprite.anims.currentAnim && sprite.anims.currentAnim.key === animKey) {
          // Animation is still playing, good
        } else if (sprite.anims && sprite.scene.anims.exists(animKey)) {
          // Animation stopped, restart it
          sprite.play(animKey, true);
        }
      },
      onComplete: () => {
        // Check if pathfinding was cancelled
        if (!this.currentPlayer) {
          return;
        }
        
        this.currentPlayer.setPosition(target.x, target.y);
        
        // Update proximity system with new player position
        const gameManager = (globalThis as any).gameManager;
        if (gameManager && gameManager.proximitySystem) {
          gameManager.proximitySystem.updatePlayerPosition(target.x, target.y);
        }
        
        // Emit player-moved event for AssistantNPC following
        if (gameManager && gameManager.eventBus) {
          gameManager.eventBus.emit('player-moved', { x: target.x, y: target.y });
        }
        
        this.pathIndex++;
        this.followPath();
      }
    });
  }
  
  public isPlayerMoving(): boolean {
    return this.isMoving;
  }
  
  public cancelPlayerMovement(): void {
    this.isMoving = false;
    this.currentPath = [];
    this.currentPathIndex = 0;
  }
  
  public getPathfinding(): Pathfinding | null {
    return this.pathfinding;
  }
  
  public shutdown(): void {
    this.pathfinding = null;
    this.currentSceneKey = '';
    this.isMoving = false;
    this.currentPath = [];
    this.pathIndex = 0;
    this.currentPlayer = null;
  }
}
