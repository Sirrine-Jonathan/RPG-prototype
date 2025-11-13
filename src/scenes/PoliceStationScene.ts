import { Scene } from "phaser";
import { BaseScene } from "./BaseScene";
import { PersistentNPC } from "../entities/PersistentNPC";
import { InteractiveObject } from "../entities/InteractiveObject";
import { Tool } from "../entities/BaseActor";

export class PoliceStationScene extends BaseScene {
  private sheriff?: PersistentNPC;
  private deputy?: PersistentNPC;
  private evidenceLocker?: InteractiveObject;

  constructor() {
    super({ key: "PoliceStationScene" });
  }

  create() {
    super.create();

    // Load the police station level
    this.loadLevel("police_station");

    // Create Sheriff Martinez
    this.sheriff = new PersistentNPC(this, {
      id: "sheriff_martinez",
      name: "Sheriff Martinez",
      x: 300,
      y: 200,
      spriteKey: "alex",
      personality: "Protective, secretive, authority figure",
      background: "The town sheriff who has been hiding evidence related to the mysterious disappearances. Member of the secret society."
    });

    // Create Deputy Collins  
    this.deputy = new PersistentNPC(this, {
      id: "deputy_collins",
      name: "Deputy Collins",
      x: 400,
      y: 250,
      spriteKey: "amelia",
      personality: "Helpful but constrained, wants to do the right thing",
      background: "A deputy who suspects something is wrong but is constrained by the sheriff. Potential ally to the player."
    });

    // Create Evidence Locker (interactive object)
    this.evidenceLocker = new EvidenceLocker(this, 200, 150, "evidence_locker");

    console.log("Police Station scene created with Sheriff Martinez and Deputy Collins");
  }

  private loadLevel(levelName: string) {
    // For now, create a simple room layout
    // Later this can load from the police_station.json config
    this.add.rectangle(400, 300, 800, 600, 0x444444).setStrokeStyle(4, 0x666666);
    this.add.text(400, 50, "Police Station", {
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5);
  }
}

// Evidence Locker implementation
class EvidenceLocker extends InteractiveObject {
  private hasEvidence: boolean = true;
  private isLocked: boolean = true;

  constructor(scene: Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, "Evidence Locker", 0x666666);
  }

  getOfferedTools(): Tool[] {
    const tools: Tool[] = [];

    if (this.isLocked) {
      tools.push({
        name: "examine_locker",
        description: "Examine the locked evidence locker",
        handler: async () => this.handleInteraction("examine_locker")
      });
    } else {
      tools.push({
        name: "search_locker", 
        description: "Search through the evidence locker",
        handler: async () => this.handleInteraction("search_locker")
      });

      if (this.hasEvidence) {
        tools.push({
          name: "hide_evidence",
          description: "Hide evidence in the locker (Sheriff only)",
          handler: async () => this.handleInteraction("hide_evidence")
        });
      }
    }

    return tools;
  }

  handleInteraction(toolName: string, parameters?: any): any {
    switch (toolName) {
      case "examine_locker":
        return {
          success: true,
          message: "The evidence locker is secured with a heavy lock. Only authorized personnel can access it."
        };

      case "search_locker":
        if (this.hasEvidence) {
          return {
            success: true,
            message: "Found case files and evidence bags. Some items seem to be missing from recent cases."
          };
        } else {
          return {
            success: true,
            message: "The locker appears to have been recently reorganized. Some evidence seems to be missing."
          };
        }

      case "hide_evidence":
        if (this.hasEvidence) {
          this.hasEvidence = false;
          this.setState("evidence_hidden");
          return {
            success: true,
            message: "Evidence has been moved to a more secure location",
            stateChange: "evidence_hidden"
          };
        }
        return {
          success: false,
          message: "No evidence to hide"
        };

      default:
        return {
          success: false,
          message: `Cannot ${toolName} with evidence locker`
        };
    }
  }
}
