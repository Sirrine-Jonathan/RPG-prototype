import { GameplayScene } from "./GameplayScene";
import { SmartNPC } from "../entities/SmartNPC";
import { InteractiveObject } from "../entities/InteractiveObject";

class MedicalRecord extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Medical Records", 0x87CEEB);
  }

  getOfferedTools() {
    return [
      {
        name: "examine",
        description: "Examine patient records for unusual symptoms",
        parameters: {}
      }
    ];
  }

  handleInteraction(toolName: string, parameters?: any) {
    if (toolName === "examine") {
      return {
        success: true,
        message: "Found patterns of memory loss and disorientation in recent patients"
      };
    }
    return { success: false, message: "Cannot perform that action" };
  }
}

class MedicalEquipment extends InteractiveObject {
  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Medical Equipment", 0xC0C0C0);
  }

  getOfferedTools() {
    return [
      {
        name: "use",
        description: "Use medical equipment for analysis",
        parameters: {}
      }
    ];
  }

  handleInteraction(toolName: string, parameters?: any) {
    if (toolName === "use") {
      return {
        success: true,
        message: "Analyzed samples - detected unusual neurological markers"
      };
    }
    return { success: false, message: "Cannot perform that action" };
  }
}

export class HospitalScene extends GameplayScene {
  public doctor!: SmartNPC;
  public nurse!: SmartNPC;
  public receptionist!: SmartNPC;
  private hospitalObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "HospitalScene" });
  }

  create() {
    super.create();
    
    console.log("🏥 HospitalScene create() called");
    
    this.createHospitalLayout();
    this.createPlayer(400, 500); // Moved away from exit trigger at 580
    
    console.log("🏥 Player created at:", this.player?.x, this.player?.y);
    
    this.createHospitalObjects();
    this.createNPCs();
    this.createExitTrigger(400, 580);
  }

  protected getSceneWidth(): number { return 800; }
  protected getSceneHeight(): number { return 600; }
  protected getPlayerBounds() {
    return { minX: 32, maxX: 768, minY: 32, maxY: 590 }; // Extended to allow reaching exit
  }
  protected getExitPosition() { return { x: 400, y: 580 }; }
  protected getReturnScene() { return 'TownOverworldScene'; }
  protected getReturnPosition() { return { x: 1700, y: 520 }; } // Moved away from hospital trigger

  update() {
    super.update();
    this.checkExitTrigger();
  }

  private createHospitalObjects(): void {
    this.hospitalObjects = [
      new MedicalRecord(this, 650, 420, "patient_records"),
      new MedicalRecord(this, 680, 420, "symptom_database"), 
      new MedicalEquipment(this, 580, 150, "diagnostic_equipment"),
      new MedicalEquipment(this, 620, 150, "analysis_machine")
    ];
    
    this.events.on('examine_patient_records', this.handleRecordsExamination, this);
    this.events.on('examine_symptom_database', this.handleDatabaseAccess, this);
  }

  private createNPCs(): void {
    this.doctor = new SmartNPC(
      this, 600, 150, "bob", "Dr. Thompson",
      "Concerned about recent unusual patient symptoms.",
      "You are Dr. Thompson, the hospital's chief physician investigating unusual patient patterns.",
      "medical"
    );

    this.nurse = new SmartNPC(
      this, 150, 100, "amelia", "Nurse Janet",
      "Friendly and helpful, knows all hospital procedures.",
      "You are Nurse Janet, the hospital receptionist with 10 years experience.",
      "medical"
    );

    this.receptionist = new SmartNPC(
      this, 300, 200, "amelia", "Nurse Williams", 
      "Works night shifts, has witnessed unusual patient behaviors.",
      "You are Nurse Williams who works night shifts and has seen strange patient behaviors.",
      "medical"
    );

    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.doctor, this.nurse, this.receptionist];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(20).fill(null).map(() => Array(15).fill(0));

    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.hospitalObjects, otherCharacters, grid);
      
      // Set hospital-specific landmarks for NPCs
      this.setHospitalLandmarks(npc);
      
      this.proximityService.addNPC(npc);
    });
  }

  private setHospitalLandmarks(npc: SmartNPC): void {
    // Clear town landmarks and set hospital-specific ones
    (npc as any).discoveredLocations.clear();
    
    const hospitalLandmarks = [
      { name: "Reception", x: 150, y: 100 },
      { name: "Reception Desk", x: 150, y: 100 },
      { name: "Hospital Reception Desk", x: 150, y: 100 },
      { name: "Doctor's Office", x: 600, y: 150 },
      { name: "Patient Room 1", x: 200, y: 350 },
      { name: "Patient Room 2", x: 400, y: 350 },
      { name: "Records Area", x: 650, y: 400 },
      { name: "Hospital Entrance", x: 400, y: 580 },
      { name: "Center", x: 400, y: 300 }
    ];

    hospitalLandmarks.forEach(landmark => {
      (npc as any).discoveredLocations.set(landmark.name.toLowerCase().replace(/\s+/g, '_'), {
        x: landmark.x,
        y: landmark.y,
        name: landmark.name
      });
    });
  }

  private createExitZone(): void {
    const exitZone = this.add.zone(400, 580, 100, 40);
    exitZone.setData('exit', true);
  }

  private handleRecordsExamination(): void {
    if (this.gameStateManager.getCurrentChapter() === 1) {
      console.log("📋 Medical records puzzle solved!");
    }
  }

  private handleDatabaseAccess(): void {
    console.log("💾 Accessing symptom database");
  }

  private createHospitalLayout(): void {
    const hospitalWidth = 800;
    const hospitalHeight = 600;
    
    // Set world bounds
    this.cameras.main.setBounds(0, 0, hospitalWidth, hospitalHeight);
    
    // Hospital floor
    this.add.rectangle(hospitalWidth/2, hospitalHeight/2, hospitalWidth, hospitalHeight, 0xF0F8FF);
    
    // Walls
    this.add.rectangle(hospitalWidth/2, 10, hospitalWidth, 20, 0x8B4513); // Top
    this.add.rectangle(hospitalWidth/2, hospitalHeight-10, hospitalWidth, 20, 0x8B4513); // Bottom
    this.add.rectangle(10, hospitalHeight/2, 20, hospitalHeight, 0x8B4513); // Left
    this.add.rectangle(hospitalWidth-10, hospitalHeight/2, 20, hospitalHeight, 0x8B4513); // Right
    
    // Reception desk
    this.add.rectangle(150, 100, 120, 60, 0x8B4513);
    this.add.text(150, 70, 'Reception', { fontSize: '14px', color: '#000' }).setOrigin(0.5);
    
    // Doctor's office
    this.add.rectangle(600, 150, 150, 100, 0xDDDDDD);
    this.add.text(600, 100, "Doctor's Office", { fontSize: '14px', color: '#000' }).setOrigin(0.5);
    
    // Patient rooms
    this.add.rectangle(200, 350, 100, 80, 0xE6E6FA);
    this.add.text(200, 310, 'Patient Room 1', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    this.add.rectangle(400, 350, 100, 80, 0xE6E6FA);
    this.add.text(400, 310, 'Patient Room 2', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Medical records area
    this.add.rectangle(650, 400, 120, 80, 0xF5F5DC);
    this.add.text(650, 360, 'Records', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
    
    // Entrance area
    this.add.text(400, 570, 'Hospital Entrance', { fontSize: '16px', color: '#000' }).setOrigin(0.5);
  }
}
