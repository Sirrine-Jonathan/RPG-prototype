import { NewGameplayScene } from "./NewGameplayScene";
import { LevelLoader } from "../systems/LevelLoader";
import { PortalService } from "../systems/PortalService";
import { GuideNPC } from "../entities/GuideNPC";
import { AssistantNPC } from "../entities/AssistantNPC";

export class NewTownScene extends NewGameplayScene {
  private levelLoader!: LevelLoader;
  private portalService!: PortalService;
  
  constructor() {
    super({ key: 'NewTownScene' });
  }
  
  protected loadSceneContent(): void {
    // Initialize services
    this.levelLoader = new LevelLoader(this);
    this.portalService = new PortalService(this);
    
    // Load town level
    this.levelLoader.loadLevel("town_overworld").then(() => {
      console.log(`🏘️ NewTownScene: Town level loaded`);
      this.setupPortalsAndSpawns();
    }).catch(error => {
      console.error("Failed to load town level:", error);
    });
  }
  
  private setupPortalsAndSpawns(): void {
    // Get level data and set up portals
    const levelData = this.levelLoader.getLevelData();
    console.log(`🔍 NewTownScene: Level data:`, levelData);
    
    if (levelData && levelData.layers.objects && Array.isArray(levelData.layers.objects)) {
      console.log(`🔍 NewTownScene: Found ${levelData.layers.objects.length} objects in level`);
      
      levelData.layers.objects.forEach((obj: any, index: number) => {
        console.log(`🔍 NewTownScene: Object ${index}:`, obj);
        
        if (obj.type === 'portal') {
          this.portalService.addPortal({
            id: obj.properties.portalId,
            x: obj.x * levelData.tileSize,
            y: obj.y * levelData.tileSize,
            targetScene: 'NewLibraryScene', // Use new architecture scene
            targetPortalId: obj.properties.targetPortalId
          });
        } else if (obj.type === 'spawn') {
          this.portalService.addSpawnPoint({
            id: obj.id || 'default',
            x: obj.x * levelData.tileSize,
            y: obj.y * levelData.tileSize,
            isDefault: obj.subtype === 'player'
          });
        }
      });
    } else {
      console.warn(`🔍 NewTownScene: No objects found in level data or objects is not an array`);
      console.log(`🔍 NewTownScene: levelData.layers.objects type:`, typeof levelData?.layers?.objects);
      console.log(`🔍 NewTownScene: levelData.layers.objects:`, levelData?.layers?.objects);
    }
    
    const portals = this.portalService.getPortals();
    const spawns = this.portalService.getSpawnPoints();
    console.log(`🚪 NewTownScene: Portal system initialized with ${portals.length} portals and ${spawns.length} spawn points`);
  }
  
  update() {
    super.update();
  }
  
  protected createSceneNPCs(): void {
    // Create Margaret Chen using specialized GuideNPC class
    const margaret = new GuideNPC(this, 795, 880);
    this.gameManager.entityManager.addNPC(margaret);
    this.gameManager.entityManager.addNPCToScene('margaret_chen', this.scene.key);
    
    // Create Assistant NPC - spawn far away to test pathfinding to player
    const assistant = new AssistantNPC(this, 200, 200);
    this.gameManager.entityManager.addNPC(assistant);
    this.gameManager.entityManager.addNPCToScene('assistant', this.scene.key);
    
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
