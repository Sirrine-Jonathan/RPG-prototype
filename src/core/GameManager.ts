import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { SceneTransitionManager } from './SceneTransitionManager';

export class GameManager {
  private static instance: GameManager;
  
  public entityManager: EntityManager;
  public systemManager: SystemManager;
  public sceneTransitionManager: SceneTransitionManager;
  
  private constructor() {
    this.entityManager = new EntityManager();
    this.systemManager = new SystemManager();
    this.sceneTransitionManager = new SceneTransitionManager(this);
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
