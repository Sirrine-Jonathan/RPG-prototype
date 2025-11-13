import { BaseScene } from "./BaseScene";
import { GameManager } from "../core/GameManager";
import { PortalData } from "../core/SceneTransitionManager";
import { AssetManager } from "../systems/AssetManager";
import { QuickSpeechUI } from "../ui/QuickSpeechUI";
import { Logger, LogTag } from "../utils/Logger";

export abstract class NewGameplayScene extends BaseScene {
  protected gameManager: GameManager;
  protected assetManager: AssetManager;
  protected quickSpeechUI!: QuickSpeechUI;
  protected logger = Logger.getInstance();
  
  constructor(config: Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    this.gameManager = GameManager.getInstance();
  }

  preload() {
    this.assetManager = new AssetManager(this);
    this.assetManager.preloadTechDungeonAssets();
  }

  create(data?: { portalData?: PortalData }) {
    super.create();
    
    // Create player animations
    this.assetManager.createPlayerAnimations();
    
    // Setup QuickSpeechUI
    console.log('🎯 NewGameplayScene: Setting up QuickSpeechUI for scene:', this.scene.key);
    this.quickSpeechUI = new QuickSpeechUI(this);
    
    console.log(`🎬 ${this.scene.key}: Creating scene with new architecture`);
    
    // Initialize pathfinding for this scene
    this.gameManager.systemManager.pathfindingSystem.updateForScene(
      this.scene.key,
      this.getSceneWidth(),
      this.getSceneHeight()
    );
    
    // Set up movement system for this scene
    this.gameManager.systemManager.movementSystem.setupInput(this);
    
    // Set up camera system for this scene
    this.gameManager.systemManager.cameraSystem.setupForScene(this);
    
    // Handle scene transition completion
    if (data?.portalData) {
      this.gameManager.sceneTransitionManager.completeTransition(this, data.portalData);
    } else {
      // First time creating player
      this.createInitialEntities();
    }
    
    // Load scene-specific content
    this.loadSceneContent();
  }
  
  private createInitialEntities(): void {
    // Create player if it doesn't exist
    let player = this.gameManager.entityManager.getPlayer();
    
    // Check for temporarily stored player from scene transition
    this.logger.debug(LogTag.SCENE, `Checking tempPlayer: ${!!(globalThis as any).tempPlayer}`);
    if (!player && (globalThis as any).tempPlayer) {
      player = (globalThis as any).tempPlayer;
      delete (globalThis as any).tempPlayer;
      this.logger.debug(LogTag.SCENE, `Restored player from scene transition`);
    }
    
    this.logger.debug(LogTag.SCENE, `EntityManager.getPlayer() returned: ${player ? 'existing player' : 'null'}`);
    
    if (!player) {
      const spawn = this.getDefaultSpawn();
      this.logger.debug(LogTag.SCENE, `Creating new player at default spawn: ${JSON.stringify(spawn)}`);
      player = this.gameManager.entityManager.createPlayer(this, spawn.x, spawn.y);
    } else {
      this.logger.debug(LogTag.SCENE, `Transferring existing player to scene: ${this.scene.key}`);
      player.transferToScene(this);
      
      // Check if this is a portal transition and position player at correct spawn
      const portalService = (this as any).portalService;
      if (portalService) {
        const targetSpawn = portalService.getTargetSpawn();
        this.logger.debug(LogTag.SCENE, `Portal service returned spawn: ${JSON.stringify(targetSpawn)}`);
        
        if (targetSpawn) {
          this.logger.debug(LogTag.SCENE, `Portal transition: positioning player at spawn ${targetSpawn.id} (${targetSpawn.x}, ${targetSpawn.y})`);
          player.setPosition(targetSpawn.x, targetSpawn.y);
        } else {
          this.logger.debug(LogTag.SCENE, `No target spawn found, player remains at current position`);
        }
      } else {
        this.logger.debug(LogTag.SCENE, `No portal service available on scene during createInitialEntities`);
      }
    }
    
    // Create scene NPCs
    this.createSceneNPCs();
  }
  
  protected createSceneNPCs(): void {
    // Override in subclasses to create scene-specific NPCs
  }
  
  protected loadSceneContent(): void {
    // Override in subclasses to load levels, set up portals, etc.
  }
  
  update() {
    // Update systems
    this.gameManager.systemManager.movementSystem.update();
  }
  
  // Abstract methods for scene configuration
  protected abstract getSceneWidth(): number;
  protected abstract getSceneHeight(): number;
  protected abstract getDefaultSpawn(): { x: number, y: number };
}
