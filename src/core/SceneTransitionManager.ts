import { GameManager } from './GameManager';

export interface PortalData {
  targetScene: string;
  targetPortalId: string;
  sourceScene: string;
  sourcePortalId: string;
}

export class SceneTransitionManager {
  private gameManager: GameManager;
  private isTransitioning: boolean = false;
  
  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }
  
  public async switchScene(portalData: PortalData, currentScene: Phaser.Scene): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Scene transition already in progress');
      return;
    }
    
    this.isTransitioning = true;
    
    try {
      console.log(`🔄 Starting scene transition: ${portalData.sourceScene} -> ${portalData.targetScene}`);
      
      // 1. Pause NPCs from the source scene only
      this.gameManager.systemManager.aiSystem.pauseSceneNPCs(portalData.sourceScene);
      
      // 2. Save current scene state
      await this.saveSceneState(portalData.sourceScene);
      
      // 3. Transfer entities
      await this.transferEntities(portalData.sourceScene, portalData.targetScene);
      
      // 4. Switch Phaser scene
      currentScene.scene.start(portalData.targetScene, { portalData });
      
      // Note: Resume happens in the new scene's create method
      
    } catch (error) {
      console.error('Scene transition failed:', error);
      this.gameManager.systemManager.resumeAll();
    } finally {
      this.isTransitioning = false;
    }
  }
  
  public completeTransition(newScene: Phaser.Scene, portalData: PortalData): void {
    // 5. Restore state for new scene
    this.restoreSceneState(portalData.targetScene, newScene);
    
    // 6. Resume NPCs for the target scene only
    this.gameManager.systemManager.aiSystem.resumeSceneNPCs(portalData.targetScene);
    
    console.log(`✅ Scene transition completed: ${portalData.targetScene}`);
  }
  
  private async saveSceneState(sceneKey: string): Promise<void> {
    // Save NPC states, positions, etc.
    const npcs = this.gameManager.entityManager.getNPCsForScene(sceneKey);
    npcs.forEach(npc => npc.saveState());
  }
  
  private async transferEntities(fromScene: string, toScene: string): Promise<void> {
    // Mark NPCs as needing transfer
    const npcs = this.gameManager.entityManager.getNPCsForScene(fromScene);
    npcs.forEach(npc => npc.prepareForTransfer());
  }
  
  private restoreSceneState(sceneKey: string, scene: Phaser.Scene): void {
    // Transfer player to new scene
    const player = this.gameManager.entityManager.getPlayer();
    if (player) {
      player.transferToScene(scene);
    }
    
    // Transfer NPCs to new scene
    const npcs = this.gameManager.entityManager.getNPCsForScene(sceneKey);
    npcs.forEach(npc => npc.transferToScene(scene));
  }
}
