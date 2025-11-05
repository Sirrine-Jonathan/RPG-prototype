import { GameplayScene } from "./GameplayScene";
import { SmartNPC } from "../entities/SmartNPC";
import { InteractiveObject } from "../entities/InteractiveObject";

class EvidenceBoard extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Evidence Board", 0x8B4513);
  }

  getOfferedTools() {
    return [
      {
        name: "examine",
        description: "Examine evidence and case files",
        parameters: {}
      }
    ];
  }

  handleInteraction(toolName: string, parameters?: any) {
    if (toolName === "examine") {
      return {
        success: true,
        message: "Found reports of missing persons and strange behavior patterns"
      };
    }
    return { success: false, message: "Cannot perform that action" };
  }
}

export class PoliceStationScene extends GameplayScene {
  public sheriff!: SmartNPC;
  public deputy!: SmartNPC;
  private stationObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "PoliceStationScene" });
  }

  create() {
    super.create();
    
    this.createStationLayout();
    this.createPlayer(400, 500);
    this.createStationObjects();
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
  protected getReturnPosition() { return { x: 500, y: 520 }; }

  update() {
    super.update();
    this.checkExitTrigger();
  }

  private createStationLayout(): void {
    const width = 800;
    const height = 600;
    
    this.cameras.main.setBounds(0, 0, width, height);
    
    // Police station floor
    this.add.rectangle(width/2, height/2, width, height, 0xE6E6FA);
    
    // Walls
    this.add.rectangle(width/2, 10, width, 20, 0x8B4513);
    this.add.rectangle(width/2, height-10, width, 20, 0x8B4513);
    this.add.rectangle(10, height/2, 20, height, 0x8B4513);
    this.add.rectangle(width-10, height/2, 20, height, 0x8B4513);
    
    // Sheriff's desk
    this.add.rectangle(200, 200, 120, 80, 0x8B4513);
    this.add.text(200, 160, "Sheriff's Desk", { fontSize: '14px', color: '#000' }).setOrigin(0.5);
    
    // Evidence room
    this.add.rectangle(600, 300, 150, 120, 0xDDDDDD);
    this.add.text(600, 240, 'Evidence Room', { fontSize: '14px', color: '#000' }).setOrigin(0.5);
    
    // Holding cells
    this.add.rectangle(150, 450, 100, 80, 0xC0C0C0);
    this.add.text(150, 410, 'Holding Cell', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Entrance
    this.add.text(400, 570, 'Police Station Entrance', { fontSize: '16px', color: '#000' }).setOrigin(0.5);
  }

  private createStationObjects(): void {
    this.stationObjects = [
      new EvidenceBoard(this, 600, 300, "evidence_board"),
    ];
  }

  private createNPCs(): void {
    this.sheriff = new SmartNPC(
      this, 200, 200, "alex", "Sheriff Martinez",
      "The town sheriff, investigating recent disappearances and strange occurrences.",
      "You are Sheriff Martinez, investigating Maya's disappearance and other strange events in town.",
      "law_enforcement"
    );

    this.deputy = new SmartNPC(
      this, 500, 400, "bob", "Deputy Johnson",
      "Young deputy, eager to help with investigations.",
      "You are Deputy Johnson, assisting the sheriff with local investigations.",
      "law_enforcement"
    );

    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.sheriff, this.deputy];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(20).fill(null).map(() => Array(15).fill(0));

    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.stationObjects, otherCharacters, grid);
      this.proximityService.addNPC(npc);
    });
  }
}