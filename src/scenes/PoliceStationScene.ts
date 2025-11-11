import { Scene } from "phaser";
import { BaseScene } from "./BaseScene";
import { SmartNPC } from "../entities/SmartNPC";
import { InteractiveObject } from "../entities/InteractiveObject";
import { NPCTool } from "../services/AIService";

export class PoliceStationScene extends BaseScene {
  private sheriff?: SmartNPC;
  private deputy?: SmartNPC;
  private evidenceLocker?: InteractiveObject;

  constructor() {
    super({ key: "PoliceStationScene" });
  }

  create() {
    super.create();

    // Load the police station level
    this.loadLevel("police_station");

    // Create Sheriff Martinez
    this.sheriff = new SmartNPC(
      this,
      300, 200,
      "alex", // Using existing sprite
      "Sheriff Martinez",
      "Protective, secretive, authority figure",
      "The town sheriff who has been hiding evidence related to the mysterious disappearances. Member of the secret society.",
      "law_enforcement"
    );

    // Create Deputy Collins  
    this.deputy = new SmartNPC(
      this,
      400, 250,
      "amelia", // Using existing sprite
      "Deputy Collins",
      "Helpful but constrained, wants to do the right thing",
      "A deputy who suspects something is wrong but is constrained by the sheriff. Potential ally to the player.",
      "law_enforcement"
    );

    // Create Evidence Locker (interactive object)
    this.evidenceLocker = new EvidenceLocker(this, 200, 150, "evidence_locker");

    // Set up room context for NPCs
    const objects = [this.evidenceLocker];
    const characters = [this.sheriff, this.deputy];
    
    this.sheriff.setRoomContext(objects, characters, []);
    this.deputy.setRoomContext(objects, characters, []);

    // Set story-specific goals
    this.sheriff.setGoals([
      "Maintain control over the investigation",
      "Hide evidence that could expose the secret society", 
      "Deflect suspicion from myself and other society members",
      "Keep the deputy from discovering too much"
    ]);

    this.deputy.setGoals([
      "Help solve the mystery of the disappearances",
      "Gather evidence despite the sheriff's interference",
      "Assist the player when possible",
      "Uncover what the sheriff is hiding"
    ]);

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

  getOfferedTools(): NPCTool[] {
    const tools: NPCTool[] = [];

    if (this.isLocked) {
      tools.push({
        name: "examine_locker",
        description: "Examine the locked evidence locker"
      });
    } else {
      tools.push({
        name: "search_locker", 
        description: "Search through the evidence locker"
      });

      if (this.hasEvidence) {
        tools.push({
          name: "hide_evidence",
          description: "Hide evidence in the locker (Sheriff only)"
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