import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { SceneTransitionManager } from './SceneTransitionManager';
import { ProximitySystem } from '../systems/ProximitySystem';
import { EventBus } from '../systems/EventBus';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { WinConditionManager } from '../systems/WinConditionManager';

export class GameManager {
  private static instance: GameManager;
  
  public entityManager: EntityManager;
  public systemManager: SystemManager;
  public sceneTransitionManager: SceneTransitionManager;
  public proximitySystem: ProximitySystem;
  public eventBus: EventBus;
  public pathfindingSystem: PathfindingSystem;
  public winConditionManager: WinConditionManager;
  
  private constructor() {
    this.entityManager = new EntityManager();
    this.systemManager = new SystemManager();
    this.sceneTransitionManager = new SceneTransitionManager(this);
    this.proximitySystem = new ProximitySystem();
    this.eventBus = EventBus.getInstance();
    this.pathfindingSystem = new PathfindingSystem();
    this.winConditionManager = WinConditionManager.getInstance();
    
    console.log('🎮 GameManager: Initialized with all systems');
  }
  
  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }
  
  public initialize(game: Phaser.Game): void {
    this.systemManager.initialize(game);
  }
  
  public shutdown(): void {
    this.systemManager.shutdown();
    this.entityManager.clear();
  }
}
