import { Pathfinding } from '../utils/Pathfinding';

export class PathfindingSystem {
  private pathfinding: Pathfinding | null = null;
  private currentSceneKey: string = '';
  private activeMovements: Map<string, {
    path: Array<{ x: number, y: number }>,
    pathIndex: number,
    player: any,
    isPlayer: boolean
  }> = new Map();
  
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
    return this.activeMovements.size > 0;
  }
  
  public cancelPathfinding(): void {
    // Only cancel player pathfinding
    const playerMovement = Array.from(this.activeMovements.entries())
      .find(([_, movement]) => movement.isPlayer);
    
    if (playerMovement) {
      const [playerId, movement] = playerMovement;
      console.log('🎯 PathfindingSystem: Player pathfinding cancelled by user input');
      
      // Stop player's tweens and reset animation
      const sprite = movement.player.getSprite();
      if (sprite && sprite.scene) {
        sprite.scene.tweens.killTweensOf(sprite);
        
        // Reset to idle animation
        if (sprite.anims && sprite.anims.currentAnim) {
          const currentAnim = sprite.anims.currentAnim.key;
          if (currentAnim.includes('_walk_')) {
            const spriteKey = currentAnim.split('_walk_')[0];
            const direction = currentAnim.split('_walk_')[1];
            const idleAnimKey = `${spriteKey}_idle_${direction}`;
            
            if (sprite.scene.anims.exists(idleAnimKey)) {
              sprite.play(idleAnimKey, true);
            }
          }
        }
      }
      
      this.activeMovements.delete(playerId);
    }
  }
  
  public movePlayerTo(player: any, targetX: number, targetY: number, isActualPlayer: boolean = false): void {
    if (!this.pathfinding) {
      return;
    }
    
    const playerId = player.id || player.name || 'unknown';
    
    // Cancel existing movement for this entity
    if (this.activeMovements.has(playerId)) {
      const sprite = player.getSprite();
      if (sprite && sprite.scene) {
        sprite.scene.tweens.killTweensOf(sprite);
      }
      this.activeMovements.delete(playerId);
    }
    
    const playerPos = player.getPosition();
    const sprite = player.getSprite();
    
    console.log(`🎯 PathfindingSystem: Click-to-move from (${playerPos.x}, ${playerPos.y}) to (${targetX}, ${targetY})`);
    console.log(`🎯 PathfindingSystem: Player sprite at (${sprite?.x}, ${sprite?.y}), visible: ${sprite?.visible}`);
    
    const path = this.pathfinding.findPath(playerPos.x, playerPos.y, targetX, targetY);
    console.log(`🎯 PathfindingSystem: Found path with ${path.length} steps`);
    
    if (path.length > 1) {
      this.activeMovements.set(playerId, {
        path: path.slice(1), // Skip current position
        pathIndex: 0,
        player: player,
        isPlayer: isActualPlayer
      });
      this.followPath(playerId);
    }
  }
  
  private followPath(playerId: string): void {
    const movement = this.activeMovements.get(playerId);
    if (!movement || movement.pathIndex >= movement.path.length) {
      // Path completed - play idle animation facing last direction
      const sprite = movement?.player?.getSprite();
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
        
        const spriteKey = movement.player.config?.spriteKey || 'adam';
        const idleAnimKey = `${spriteKey}_idle_${lastDirection}`;
        if (sprite.scene.anims.exists(idleAnimKey)) {
          sprite.play(idleAnimKey, true);
        }
      }
      
      // Call resolve function if this is an NPC waiting for movement completion
      if (movement?.player._moveResolve) {
        movement.player._moveResolve();
        delete movement.player._moveResolve;
      }
      
      this.activeMovements.delete(playerId);
      return;
    }
    
    const target = movement.path[movement.pathIndex];
    const playerPos = movement.player.getPosition();
    const distance = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, target.x, target.y);
    
    if (distance < 5) {
      movement.pathIndex++;
      this.followPath(playerId);
      return;
    }
    
    // Get the scene to create tween
    const sprite = movement.player.getSprite();
    if (!sprite || !sprite.scene) {
      this.activeMovements.delete(playerId);
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
    const spriteKey = movement.player.config?.spriteKey || 'adam';
    const animKey = `${spriteKey}_walk_${direction}`;
    if (sprite.anims && sprite.scene.anims.exists(animKey)) {
      console.log(`🚶 PathfindingSystem: Playing animation ${animKey} on sprite at (${sprite.x}, ${sprite.y})`);
      sprite.play(animKey, true);
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
        const currentMovement = this.activeMovements.get(playerId);
        if (!currentMovement) {
          return;
        }
        
        currentMovement.player.setPosition(target.x, target.y);
        
        // Only update proximity system if this is the actual player, not an NPC
        const gameManager = (globalThis as any).gameManager;
        const actualPlayer = gameManager?.entityManager?.getPlayer();
        if (currentMovement.player === actualPlayer) {
          // Update proximity system with new player position
          if (gameManager && gameManager.proximitySystem) {
            gameManager.proximitySystem.updatePlayerPosition(target.x, target.y);
          }
          
          // Emit player-moved event for AssistantNPC following
          if (gameManager && gameManager.eventBus) {
            gameManager.eventBus.emit('player-moved', { x: target.x, y: target.y });
          }
        }
        
        currentMovement.pathIndex++;
        this.followPath(playerId);
      }
    });
  }
  
  public isPlayerMoving(): boolean {
    return Array.from(this.activeMovements.values()).some(movement => movement.isPlayer);
  }
  
  public cancelPlayerMovement(): void {
    // Find and cancel only player movement
    const playerMovement = Array.from(this.activeMovements.entries())
      .find(([_, movement]) => movement.isPlayer);
    
    if (playerMovement) {
      const [playerId] = playerMovement;
      this.activeMovements.delete(playerId);
    }
  }
  
  public updateTarget(playerId: string, newTargetX: number, newTargetY: number): void {
    const movement = this.activeMovements.get(playerId);
    if (!movement || !this.pathfinding) {
      return;
    }
    
    const playerPos = movement.player.getPosition();
    const newPath = this.pathfinding.findPath(playerPos.x, playerPos.y, newTargetX, newTargetY);
    
    if (newPath.length > 1) {
      // Update the path and reset to start
      movement.path = newPath.slice(1); // Skip current position
      movement.pathIndex = 0;
      
      // Cancel current tween and restart pathfinding
      const sprite = movement.player.getSprite();
      if (sprite && sprite.scene) {
        sprite.scene.tweens.killTweensOf(sprite);
      }
      
      this.followPath(playerId);
    }
  }
  public getPathfinding(): Pathfinding | null {
    return this.pathfinding;
  }
  
  public shutdown(): void {
    this.pathfinding = null;
    this.currentSceneKey = '';
    this.activeMovements.clear();
  }
}
