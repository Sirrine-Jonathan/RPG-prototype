import { GameplayScene } from "./GameplayScene";
import { SmartNPC } from "../entities/SmartNPC";
import { InteractiveObject } from "../entities/InteractiveObject";

class StudentRecords extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Student Records", 0x8B4513);
  }

  getOfferedTools() {
    return [
      {
        name: "review",
        description: "Review student attendance and behavior records",
        parameters: {}
      }
    ];
  }

  handleInteraction(toolName: string, parameters?: any) {
    if (toolName === "review") {
      return {
        success: true,
        message: "Found records of students reporting nightmares and strange dreams"
      };
    }
    return { success: false, message: "Cannot perform that action" };
  }
}

export class SchoolScene extends GameplayScene {
  public teacher!: SmartNPC;
  public principal!: SmartNPC;
  private schoolObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "SchoolScene" });
  }

  create() {
    super.create();
    
    this.createSchoolLayout();
    this.createPlayer(400, 500);
    this.createSchoolObjects();
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
  protected getReturnPosition() { return { x: 500, y: 1400 }; }

  update() {
    super.update();
    this.checkExitTrigger();
  }

  private createSchoolLayout(): void {
    const width = 800;
    const height = 600;
    
    this.cameras.main.setBounds(0, 0, width, height);
    
    // School floor
    this.add.rectangle(width/2, height/2, width, height, 0xF0F8FF);
    
    // Walls
    this.add.rectangle(width/2, 10, width, 20, 0x8B4513);
    this.add.rectangle(width/2, height-10, width, 20, 0x8B4513);
    this.add.rectangle(10, height/2, 20, height, 0x8B4513);
    this.add.rectangle(width-10, height/2, 20, height, 0x8B4513);
    
    // Classroom
    this.add.rectangle(200, 200, 300, 200, 0xE6E6FA);
    this.add.text(200, 100, 'Classroom', { fontSize: '16px', color: '#000' }).setOrigin(0.5);
    
    // Principal's office
    this.add.rectangle(600, 200, 120, 100, 0xDDDDDD);
    this.add.text(600, 150, "Principal's Office", { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Records room
    this.add.rectangle(150, 450, 100, 80, 0xF5F5DC);
    this.add.text(150, 410, 'Records', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Entrance
    this.add.text(400, 570, 'School Entrance', { fontSize: '16px', color: '#000' }).setOrigin(0.5);
  }

  private createSchoolObjects(): void {
    this.schoolObjects = [
      new StudentRecords(this, 150, 450, "student_records"),
    ];
  }

  private createNPCs(): void {
    this.teacher = new SmartNPC(
      this, 200, 200, "amelia", "Ms. Henderson",
      "Caring teacher concerned about her students' recent behavioral changes.",
      "You are Ms. Henderson, a teacher who has noticed strange changes in student behavior.",
      "civilian"
    );

    this.principal = new SmartNPC(
      this, 600, 200, "bob", "Principal Davis",
      "School principal dealing with increased absences and worried parents.",
      "You are Principal Davis, managing concerns about student welfare and attendance.",
      "civilian"
    );

    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.teacher, this.principal];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(20).fill(null).map(() => Array(15).fill(0));

    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.schoolObjects, otherCharacters, grid);
      this.proximityService.addNPC(npc);
    });
  }
}