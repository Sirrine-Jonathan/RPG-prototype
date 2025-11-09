import { NewGameplayScene } from "./NewGameplayScene";
import { LevelLoader } from "../systems/LevelLoader";
import { PortalService } from "../systems/PortalService";
import { Bookshelf } from "../entities/Bookshelf";

export class NewLibraryScene extends NewGameplayScene {
  private levelLoader!: LevelLoader;
  private portalService!: PortalService;
  private bookshelves: Map<string, Bookshelf> = new Map();
  
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
      // Always create NPCs after level loads
      this.createSceneNPCs();
    }).catch(error => {
      console.error("Failed to load library level:", error);
    });
  }
  
  private setupPortalsAndSpawns(): void {
    const levelData = this.levelLoader.getLevelData();
    console.log(`🔍 NewLibraryScene: Level data:`, levelData);
    console.log(`🔍 NewLibraryScene: Found ${levelData?.layers?.objects?.length || 0} objects in level`);
    
    if (levelData?.layers?.objects) {
      levelData.layers.objects.forEach((obj: any, index: number) => {
        console.log(`🔍 NewLibraryScene: Object ${index}:`, obj);
        
        if (obj.type === 'portal') {
          this.portalService.addPortal({
            id: obj.id,
            x: obj.x * levelData.tileSize,
            y: obj.y * levelData.tileSize,
            targetScene: 'NewTownScene',
            targetPortalId: 'town_library'
          });
        } else if (obj.type === 'spawn') {
          this.portalService.addSpawnPoint({
            id: obj.id,
            x: obj.x * levelData.tileSize,
            y: obj.y * levelData.tileSize,
            isDefault: obj.subtype === 'portal' || obj.id === 'library_entrance_spawn'
          });
        }
      });
    }
    
    // Create bookshelves
    this.createBookshelves();
    
    const portals = this.portalService.getPortals();
    const spawns = this.portalService.getSpawnPoints();
    console.log(`🚪 NewLibraryScene: Portal system initialized with ${portals.length} portals and ${spawns.length} spawn points`);
  }
  
  update() {
    super.update();
  }
  
  protected createSceneNPCs(): void {
    console.log(`📚 NewLibraryScene: Creating library NPCs...`);
    
    // Create book-seeking NPCs (no custom tools - they get tools from nearby objects)
    const scholar = this.gameManager.entityManager.createNPC('scholar_marcus', this, {
      id: 'scholar_marcus',
      name: 'Marcus Reed',
      spriteKey: 'amelia',
      x: 240,
      y: 200,
      personality: 'Determined scholar',
      background: 'Researcher seeking ancient texts',
      goals: ['Find the "Chronicle of Shadows" book']
    });
    
    const historian = this.gameManager.entityManager.createNPC('historian_vera', this, {
      id: 'historian_vera',
      name: 'Vera Stone',
      spriteKey: 'amelia',
      x: 600,
      y: 300,
      personality: 'Meticulous historian',
      background: 'Local historian researching town records',
      goals: ['Find the "Millbrook Town Records" book']
    });
    
    this.gameManager.entityManager.addNPCToScene('scholar_marcus', this.scene.key);
    this.gameManager.entityManager.addNPCToScene('historian_vera', this.scene.key);
    
    console.log(`📚 NewLibraryScene: Created ${this.gameManager.entityManager.getNPCsForScene(this.scene.key).length} NPCs`);
    console.log(`📚 NewLibraryScene: Scholar at (${scholar.getPosition().x}, ${scholar.getPosition().y})`);
    console.log(`📚 NewLibraryScene: Historian at (${historian.getPosition().x}, ${historian.getPosition().y})`);
  }
  
  private createBookshelves(): void {
    const bookshelfData = [
      { id: 'bookshelf_north', x: 144, y: 144, books: ['Ancient Mysteries', 'Chronicle of Shadows', 'Lost Legends'] },
      { id: 'bookshelf_east', x: 816, y: 240, books: ['Town Records', 'Millbrook Town Records', 'Local History'] },
      { id: 'bookshelf_south', x: 480, y: 576, books: ['Reference Guide', 'Library Catalog', 'Reading List'] }
    ];
    
    bookshelfData.forEach(data => {
      const bookshelf = new Bookshelf({
        id: data.id,
        name: 'Bookshelf',
        x: data.x,
        y: data.y,
        inventory: data.books
      });
      
      this.bookshelves.set(data.id, bookshelf);
      
      // Register with proximity system
      if (this.gameManager.proximitySystem) {
        this.gameManager.proximitySystem.addObject(bookshelf);
        console.log(`📚 NewLibraryScene: Registered bookshelf ${data.id} at (${data.x}, ${data.y}) with proximity system`);
      } else {
        console.error(`📚 NewLibraryScene: No proximity system available!`);
      }
      
      // Create visual representation
      const rect = this.add.rectangle(data.x, data.y, 48, 96, 0x8B4513);
      rect.setInteractive();
      rect.setData('bookshelf', bookshelf);
    });
    
    console.log(`📚 NewLibraryScene: Created ${this.bookshelves.size} bookshelves`);
  }
  
  getBookshelf(id: string): Bookshelf | undefined {
    return this.bookshelves.get(id);
  }
  
  protected getSceneWidth(): number {
    return 960;
  }
  
  protected getSceneHeight(): number {
    return 720;
  }
  
  protected getDefaultSpawn(): { x: number, y: number } {
    // Spawn near the library entrance (bottom center)
    return { x: 480, y: 576 };
  }
}
