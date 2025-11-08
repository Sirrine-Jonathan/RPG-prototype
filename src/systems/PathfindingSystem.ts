import { Pathfinding } from '../utils/Pathfinding';

export class PathfindingSystem {
  private pathfinding: Pathfinding | null = null;
  private currentSceneKey: string = '';
  
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
  
  public movePlayerTo(player: any, targetX: number, targetY: number): void {
    if (!this.pathfinding) {
      console.warn('PathfindingSystem: No pathfinding instance available');
      return;
    }
    
    const playerPos = player.getPosition();
    const path = this.pathfinding.findPath(playerPos.x, playerPos.y, targetX, targetY);
    
    console.log(`🎯 PathfindingSystem: Click-to-move from (${playerPos.x}, ${playerPos.y}) to (${targetX}, ${targetY})`);
    console.log(`🎯 PathfindingSystem: Found path with ${path.length} steps`);
    
    if (path.length > 1) {
      // TODO: Implement smooth pathfinding movement
      // For now, just move directly
      player.setPosition(targetX, targetY);
    }
  }
  
  public getPathfinding(): Pathfinding | null {
    return this.pathfinding;
  }
  
  public shutdown(): void {
    this.pathfinding = null;
    this.currentSceneKey = '';
  }
}
