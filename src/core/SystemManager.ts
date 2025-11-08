import { MovementSystem } from '../systems/MovementSystem';
import { AISystem } from '../systems/AISystem';
import { PathfindingSystem } from '../systems/PathfindingSystem';

export class SystemManager {
  public movementSystem: MovementSystem;
  public aiSystem: AISystem;
  public pathfindingSystem: PathfindingSystem;
  
  private game: Phaser.Game | null = null;
  
  constructor() {
    this.movementSystem = new MovementSystem();
    this.aiSystem = new AISystem();
    this.pathfindingSystem = new PathfindingSystem();
  }
  
  public initialize(game: Phaser.Game): void {
    this.game = game;
    this.movementSystem.initialize();
    this.aiSystem.initialize();
    this.pathfindingSystem.initialize();
  }
  
  public pauseAll(): void {
    this.movementSystem.pause();
    this.aiSystem.pauseAll();
  }
  
  public resumeAll(): void {
    this.movementSystem.resume();
    this.aiSystem.resumeAll();
  }
  
  public shutdown(): void {
    this.movementSystem.shutdown();
    this.aiSystem.shutdown();
    this.pathfindingSystem.shutdown();
  }
}
