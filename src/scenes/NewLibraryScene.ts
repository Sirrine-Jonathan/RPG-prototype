import { NewGameplayScene } from "./NewGameplayScene";
import { LevelLoader } from "../systems/LevelLoader";
import { PortalService } from "../systems/PortalService";

export class NewLibraryScene extends NewGameplayScene {
  private levelLoader!: LevelLoader;
  private portalService!: PortalService;
  
  constructor() {
    super({ key: 'NewLibraryScene' });
  }
  
  protected loadSceneContent(): void {
    // Initialize services
    this.levelLoader = new LevelLoader(this);
    this.portalService = new PortalService(this);
    
    // Load library level
    this.levelLoader.loadLevel("library_interior").then(() => {
      console.log(`📚 NewLibraryScene: Library level loaded`);
      this.setupPortalsAndSpawns();
    }).catch(error => {
      console.error("Failed to load library level:", error);
    });
  }
  
  private setupPortalsAndSpawns(): void {
    // Get level data and set up portals
    const levelData = this.levelLoader.getLevelData();
    
    if (levelData && levelData.layers.objects && Array.isArray(levelData.layers.objects)) {
      levelData.layers.objects.forEach((obj: any) => {
        if (obj.type === 'portal') {
          this.portalService.addPortal({
            id: obj.properties.portalId,
            x: obj.x * levelData.tileSize,
            y: obj.y * levelData.tileSize,
            targetScene: 'NewTownScene',
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
      // Fallback: create manual portal if no objects in level data
      this.portalService.addPortal({
        id: 'library_exit',
        x: 477,
        y: 687,
        targetScene: 'NewTownScene',
        targetPortalId: 'town_library'
      });
    }
    
    const portals = this.portalService.getPortals();
    const spawns = this.portalService.getSpawnPoints();
    console.log(`🚪 NewLibraryScene: Portal system initialized with ${portals.length} portals and ${spawns.length} spawn points`);
  }
  
  update() {
    super.update();
  }
  
  protected createSceneNPCs(): void {
    // Create Eleanor Sage
    const eleanor = this.gameManager.entityManager.createNPC('eleanor_sage', this, {
      id: 'eleanor_sage',
      name: 'Eleanor Sage',
      spriteKey: 'amelia',
      x: 480,
      y: 300,
      personality: 'Wise librarian and scholar',
      background: 'Keeper of ancient knowledge'
    });
    
    this.gameManager.entityManager.addNPCToScene('eleanor_sage', this.scene.key);
    
    console.log(`📚 NewLibraryScene: Created ${this.gameManager.entityManager.getNPCsForScene(this.scene.key).length} NPCs`);
  }
  
  protected getSceneWidth(): number {
    return 960;
  }
  
  protected getSceneHeight(): number {
    return 720;
  }
  
  protected getDefaultSpawn(): { x: number, y: number } {
    return { x: 504, y: 600 };
  }
}
