import { BaseScene } from "./BaseScene";
import { GameManager } from "../core/GameManager";
import { PortalData } from "../core/SceneTransitionManager";
import { AssetManager } from "../systems/AssetManager";
import { QuickSpeechUI } from "../ui/QuickSpeechUI";

export abstract class NewGameplayScene extends BaseScene {
  protected gameManager: GameManager;
  protected assetManager: AssetManager;
  protected quickSpeechUI!: QuickSpeechUI;
  
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
    if (!player) {
      const spawn = this.getDefaultSpawn();
      player = this.gameManager.entityManager.createPlayer(this, spawn.x, spawn.y);
    } else {
      player.transferToScene(this);
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
