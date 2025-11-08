import { NewGameplayScene } from "./NewGameplayScene";
import { LevelLoader } from "../systems/LevelLoader";

export class NewTownScene extends NewGameplayScene {
  private levelLoader!: LevelLoader;
  
  constructor() {
    super({ key: 'NewTownScene' });
  }
  
  protected loadSceneContent(): void {
    // Load town level
    this.levelLoader = new LevelLoader(this);
    this.levelLoader.loadLevel("town_overworld").then(() => {
      console.log(`🏘️ NewTownScene: Town level loaded`);
    }).catch(error => {
      console.error("Failed to load town level:", error);
    });
  }
  
  protected createSceneNPCs(): void {
    // Create Margaret Chen
    const margaret = this.gameManager.entityManager.createNPC('margaret_chen', this, {
      id: 'margaret_chen',
      name: 'Margaret Chen',
      spriteKey: 'alex',
      x: 795,
      y: 880,
      personality: 'Authoritative town leader',
      background: 'Head of City Council'
    });
    
    this.gameManager.entityManager.addNPCToScene('margaret_chen', this.scene.key);
    
    // Create Marcus Webb
    const marcus = this.gameManager.entityManager.createNPC('marcus_webb', this, {
      id: 'marcus_webb', 
      name: 'Marcus Webb',
      spriteKey: 'bob',
      x: 1800,
      y: 1224,
      personality: 'Opportunistic businessman',
      background: 'Traveling merchant'
    });
    
    this.gameManager.entityManager.addNPCToScene('marcus_webb', this.scene.key);
    
    console.log(`🏘️ NewTownScene: Created ${this.gameManager.entityManager.getNPCsForScene(this.scene.key).length} NPCs`);
  }
  
  protected getSceneWidth(): number {
    return 2400;
  }
  
  protected getSceneHeight(): number {
    return 1800;
  }
  
  protected getDefaultSpawn(): { x: number, y: number } {
    return { x: 1200, y: 896 };
  }
}
