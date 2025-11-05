import { GameplayScene } from "./GameplayScene";
import { SmartNPC } from "../entities/SmartNPC";
import { InteractiveObject } from "../entities/InteractiveObject";

class BookShelf extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Ancient Books", 0x8B4513);
  }

  getOfferedTools() {
    return [
      {
        name: "research",
        description: "Research ancient texts and local history",
        parameters: {}
      }
    ];
  }

  handleInteraction(toolName: string, parameters?: any) {
    if (toolName === "research") {
      return {
        success: true,
        message: "Found references to ancient stones with mysterious properties"
      };
    }
    return { success: false, message: "Cannot perform that action" };
  }
}

export class LibraryScene extends GameplayScene {
  public librarian!: SmartNPC;
  private libraryObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "LibraryScene" });
  }

  create() {
    super.create();
    
    this.createLibraryLayout();
    this.createPlayer(400, 500);
    this.createLibraryObjects();
    this.createNPCs();
    this.createExitTrigger(400, 580);
  }

  protected getSceneWidth(): number { return 800; }
  protected getSceneHeight(): number { return 600; }
  protected getPlayerBounds() {
    return { minX: 32, maxX: 768, minY: 32, maxY: 590 };
  }
  protected getExitPosition() { return { x: 400, y: 580 }; }
  protected getReturnScene() { return 'TownOverworldScene'; }
  protected getReturnPosition() { return { x: 200, y: 950 }; }

  update() {
    super.update();
    this.checkExitTrigger();
  }

  private createLibraryLayout(): void {
    const width = 800;
    const height = 600;
    
    this.cameras.main.setBounds(0, 0, width, height);
    
    // Library floor
    this.add.rectangle(width/2, height/2, width, height, 0xF5F5DC);
    
    // Walls
    this.add.rectangle(width/2, 10, width, 20, 0x8B4513);
    this.add.rectangle(width/2, height-10, width, 20, 0x8B4513);
    this.add.rectangle(10, height/2, 20, height, 0x8B4513);
    this.add.rectangle(width-10, height/2, 20, height, 0x8B4513);
    
    // Bookshelves
    this.add.rectangle(150, 200, 80, 300, 0x8B4513);
    this.add.text(150, 100, 'History Section', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    this.add.rectangle(400, 200, 80, 300, 0x8B4513);
    this.add.text(400, 100, 'Ancient Texts', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    this.add.rectangle(650, 200, 80, 300, 0x8B4513);
    this.add.text(650, 100, 'Local Records', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Reading area
    this.add.rectangle(400, 450, 200, 80, 0xDEB887);
    this.add.text(400, 410, 'Reading Area', { fontSize: '14px', color: '#000' }).setOrigin(0.5);
    
    // Entrance
    this.add.text(400, 570, 'Library Entrance', { fontSize: '16px', color: '#000' }).setOrigin(0.5);
  }

  private createLibraryObjects(): void {
    this.libraryObjects = [
      new BookShelf(this, 150, 200, "history_books"),
      new BookShelf(this, 400, 200, "ancient_texts"),
      new BookShelf(this, 650, 200, "local_records"),
    ];
  }

  private createNPCs(): void {
    this.librarian = new SmartNPC(
      this, 400, 450, "amelia", "Eleanor Sage",
      "The town librarian and historian, keeper of ancient knowledge.",
      "You are Eleanor Sage, the librarian who has researched the whispering stones extensively.",
      "scholar"
    );

    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.librarian];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(20).fill(null).map(() => Array(15).fill(0));

    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.libraryObjects, otherCharacters, grid);
      this.proximityService.addNPC(npc);
    });
  }
}