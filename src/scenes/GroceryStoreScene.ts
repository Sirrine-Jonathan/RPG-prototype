import { GameplayScene } from "./GameplayScene";
import { SmartNPC } from "../entities/SmartNPC";
import { InteractiveObject } from "../entities/InteractiveObject";

class DeliveryLog extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Delivery Log", 0x8B4513);
  }

  getOfferedTools() {
    return [
      {
        name: "check",
        description: "Check delivery schedules and supplier information",
        parameters: {}
      }
    ];
  }

  handleInteraction(toolName: string, parameters?: any) {
    if (toolName === "check") {
      return {
        success: true,
        message: "Found unusual orders for herbs and minerals from outside suppliers"
      };
    }
    return { success: false, message: "Cannot perform that action" };
  }
}

export class GroceryStoreScene extends GameplayScene {
  public storeOwner!: SmartNPC;
  public cashier!: SmartNPC;
  private storeObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "GroceryStoreScene" });
  }

  create() {
    super.create();
    
    this.createStoreLayout();
    this.createPlayer(400, 500);
    this.createStoreObjects();
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
  protected getReturnPosition() { return { x: 1700, y: 1400 }; }

  update() {
    super.update();
    this.checkExitTrigger();
  }

  private createStoreLayout(): void {
    const width = 800;
    const height = 600;
    
    this.cameras.main.setBounds(0, 0, width, height);
    
    // Store floor
    this.add.rectangle(width/2, height/2, width, height, 0xFFFACD);
    
    // Walls
    this.add.rectangle(width/2, 10, width, 20, 0x8B4513);
    this.add.rectangle(width/2, height-10, width, 20, 0x8B4513);
    this.add.rectangle(10, height/2, 20, height, 0x8B4513);
    this.add.rectangle(width-10, height/2, 20, height, 0x8B4513);
    
    // Checkout counter
    this.add.rectangle(200, 150, 200, 60, 0x8B4513);
    this.add.text(200, 110, 'Checkout', { fontSize: '14px', color: '#000' }).setOrigin(0.5);
    
    // Produce section
    this.add.rectangle(500, 200, 150, 100, 0x90EE90);
    this.add.text(500, 150, 'Produce', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Storage room
    this.add.rectangle(650, 400, 100, 120, 0xDDDDDD);
    this.add.text(650, 340, 'Storage', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Office
    this.add.rectangle(150, 400, 100, 80, 0xF5F5DC);
    this.add.text(150, 360, 'Office', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Entrance
    this.add.text(400, 570, 'Store Entrance', { fontSize: '16px', color: '#000' }).setOrigin(0.5);
  }

  private createStoreObjects(): void {
    this.storeObjects = [
      new DeliveryLog(this, 150, 400, "delivery_log"),
    ];
  }

  private createNPCs(): void {
    this.storeOwner = new SmartNPC(
      this, 150, 400, "alex", "Marcus Webb",
      "Store owner who tracks all deliveries and notices unusual purchasing patterns.",
      "You are Marcus Webb, the store owner who has noticed strange purchasing patterns recently.",
      "merchant"
    );

    this.cashier = new SmartNPC(
      this, 200, 150, "amelia", "Jenny",
      "Friendly cashier who chats with all the customers.",
      "You are Jenny, the cashier who knows all the regular customers and their habits.",
      "civilian"
    );

    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.storeOwner, this.cashier];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(20).fill(null).map(() => Array(15).fill(0));

    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.storeObjects, otherCharacters, grid);
      this.proximityService.addNPC(npc);
    });
  }
}