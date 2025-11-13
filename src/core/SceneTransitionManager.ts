import { GameManager } from './GameManager';
import { Logger, LogTag, LogLevel } from '../utils/Logger';

export interface PortalData {
  targetScene: string;
  targetPortalId: string;
  sourceScene: string;
  sourcePortalId: string;
}

export class SceneTransitionManager {
  private gameManager: GameManager;
  private isTransitioning: boolean = false;
  private logger = Logger.getInstance();
  
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
      this.logger.debug(LogTag.SCENE, `Starting scene transition: ${portalData.sourceScene} -> ${portalData.targetScene}`);
      
      // Store player FIRST, before any other operations
      const player = this.gameManager.entityManager.getPlayer();
      if (player) {
        (globalThis as any).tempPlayer = player;
        this.logger.debug(LogTag.SCENE, `Stored player early in transition process`);
      }
      
      // Set portal transition data for the target scene
      currentScene.registry.set('portalTransition', {
        sourcePortalId: portalData.sourcePortalId,
        targetPortalId: portalData.targetPortalId,
        targetScene: portalData.targetScene
      });
      
      // 1. Pause NPCs from the source scene only
      this.gameManager.systemManager.aiSystem.pauseSceneNPCs(portalData.sourceScene);
      
      // 2. Save current scene state
      await this.saveSceneState(portalData.sourceScene);
      
      // 3. Transfer entities
      await this.transferEntities(portalData.sourceScene, portalData.targetScene);
      
      // 4. Switch Phaser scene and pass portal data
      currentScene.scene.start(portalData.targetScene, { 
        portalData,
        portalTransition: {
          sourcePortalId: portalData.sourcePortalId,
          targetPortalId: portalData.targetPortalId,
          targetScene: portalData.targetScene
        }
      });
      
      // Note: Resume happens in the new scene's create method
      
    } catch (error) {
      console.error('Scene transition failed:', error);
      this.gameManager.systemManager.resumeAll();
    } finally {
      this.isTransitioning = false;
    }
  }
  
  public completeTransition(newScene: Phaser.Scene, portalData: PortalData): void {
    // Set portal transition data in the new scene's registry
    newScene.registry.set('portalTransition', {
      sourcePortalId: portalData.sourcePortalId,
      targetPortalId: portalData.targetPortalId,
      targetScene: portalData.targetScene
    });
    
    // 5. Restore state for new scene (including player positioning)
    this.restoreSceneState(portalData.targetScene, newScene);
    
    // 6. Resume NPCs for the target scene only
    this.gameManager.systemManager.aiSystem.resumeSceneNPCs(portalData.targetScene);
    
    this.logger.debug(LogTag.SCENE, `Scene transition completed: ${portalData.targetScene}`);
  }
  
  private async saveSceneState(sceneKey: string): Promise<void> {
    // Save NPC states, positions, etc.
    const npcs = this.gameManager.entityManager.getNPCsForScene(sceneKey);
    npcs.forEach(npc => npc.saveState());
  }
  
  private async transferEntities(fromScene: string, toScene: string): Promise<void> {
    // Save player reference before scene switch
    const player = this.gameManager.entityManager.getPlayer();
    this.logger.debug(LogTag.SCENE, `transferEntities: player found = ${!!player}`);
    if (player) {
      // Store player in a temporary location that survives scene transitions
      (globalThis as any).tempPlayer = player;
      this.logger.debug(LogTag.SCENE, `Stored player in globalThis.tempPlayer`);
    }
    
    // Mark NPCs as needing transfer
    const npcs = this.gameManager.entityManager.getNPCsForScene(fromScene);
    npcs.forEach(npc => npc.prepareForTransfer());
  }
  
  private restoreSceneState(sceneKey: string, scene: Phaser.Scene): void {
    // Restore player from tempPlayer if needed
    let player = this.gameManager.entityManager.getPlayer();
    if (!player && (globalThis as any).tempPlayer) {
      player = (globalThis as any).tempPlayer;
      delete (globalThis as any).tempPlayer;
      this.logger.debug(LogTag.SCENE, `Restored player from tempPlayer in restoreSceneState`);
    }
    
    // Transfer player to new scene
    if (player) {
      player.transferToScene(scene);
      this.logger.debug(LogTag.SCENE, `Player transferred to scene in restoreSceneState`);
      
      // Position player at portal spawn point
      const portalService = (scene as any).portalService;
      if (portalService) {
        const targetSpawn = portalService.getTargetSpawn();
        this.logger.debug(LogTag.SCENE, `Portal service returned spawn in restoreSceneState: ${JSON.stringify(targetSpawn)}`);
        
        if (targetSpawn) {
          this.logger.debug(LogTag.SCENE, `Positioning player at portal spawn ${targetSpawn.id} (${targetSpawn.x}, ${targetSpawn.y})`);
          player.setPosition(targetSpawn.x, targetSpawn.y);
        }
      } else {
        this.logger.log(LogTag.SCENE, `No portal service found on scene ${scene.scene.key}`, undefined, undefined, LogLevel.WARN);
      }
    }
    
    // Transfer NPCs to new scene
    const npcs = this.gameManager.entityManager.getNPCsForScene(sceneKey);
    npcs.forEach(npc => npc.transferToScene(scene));
  }
}
