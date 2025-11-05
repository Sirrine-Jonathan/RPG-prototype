import { GameplayScene } from "./GameplayScene";
import { SmartNPC } from "../entities/SmartNPC";
import { InteractiveObject } from "../entities/InteractiveObject";

class TavernTable extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Tavern Table", 0x8B4513);
  }

  getOfferedTools() {
    return [
      {
        name: "listen",
        description: "Listen to conversations and gather rumors",
        parameters: {}
      }
    ];
  }

  handleInteraction(toolName: string, parameters?: any) {
    if (toolName === "listen") {
      return {
        success: true,
        message: "Overheard talk about strange lights near the old stones"
      };
    }
    return { success: false, message: "Cannot perform that action" };
  }
}

export class TavernScene extends GameplayScene {
  public bartender!: SmartNPC;
  public patron!: SmartNPC;
  private tavernObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "TavernScene" });
  }

  create() {
    super.create();
    
    this.createTavernLayout();
    this.createPlayer(400, 500);
    this.createTavernObjects();
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
  protected getReturnPosition() { return { x: 2000, y: 950 }; }

  update() {
    super.update();
    this.checkExitTrigger();
  }

  private createTavernLayout(): void {
    const width = 800;
    const height = 600;
    
    this.cameras.main.setBounds(0, 0, width, height);
    
    // Tavern floor
    this.add.rectangle(width/2, height/2, width, height, 0x8B4513);
    
    // Walls
    this.add.rectangle(width/2, 10, width, 20, 0x654321);
    this.add.rectangle(width/2, height-10, width, 20, 0x654321);
    this.add.rectangle(10, height/2, 20, height, 0x654321);
    this.add.rectangle(width-10, height/2, 20, height, 0x654321);
    
    // Bar counter
    this.add.rectangle(200, 200, 300, 60, 0x654321);
    this.add.text(200, 160, 'Bar', { fontSize: '16px', color: '#FFF' }).setOrigin(0.5);
    
    // Tables
    this.add.rectangle(500, 350, 80, 80, 0x8B4513);
    this.add.rectangle(300, 450, 80, 80, 0x8B4513);
    this.add.rectangle(600, 450, 80, 80, 0x8B4513);
    
    // Fireplace
    this.add.rectangle(650, 150, 100, 80, 0xFF4500);
    this.add.text(650, 110, 'Fireplace', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    
    // Entrance
    this.add.text(400, 570, 'Tavern Entrance', { fontSize: '16px', color: '#FFF' }).setOrigin(0.5);
  }

  private createTavernObjects(): void {
    this.tavernObjects = [
      new TavernTable(this, 500, 350, "corner_table"),
      new TavernTable(this, 300, 450, "main_table"),
      new TavernTable(this, 600, 450, "side_table"),
    ];
  }

  private createNPCs(): void {
    this.bartender = new SmartNPC(
      this, 200, 200, "bob", "Barkeep Tom",
      "Friendly tavern owner who hears all the local gossip.",
      "You are Tom the barkeeper, who knows everyone's business and all the local rumors.",
      "civilian"
    );

    this.patron = new SmartNPC(
      this, 500, 350, "alex", "Old Pete",
      "Regular patron with stories about the old days.",
      "You are Old Pete, a longtime resident with tales of the town's mysterious past.",
      "civilian"
    );

    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.bartender, this.patron];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(20).fill(null).map(() => Array(15).fill(0));

    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.tavernObjects, otherCharacters, grid);
      this.proximityService.addNPC(npc);
    });
  }
}