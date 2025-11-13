import { PersistentNPC } from "./PersistentNPC";
import { InventorySystem } from "../systems/InventorySystem";
import { Logger, LogTag } from "../utils/Logger";
import { Tool } from "./BaseActor";

/**
 * Grace Sirrine - Town Council Leader who hired the detective
 */
export class CouncilLeaderNPC extends PersistentNPC {
  private static instance: CouncilLeaderNPC | null = null;

  public static getInstance(scene: any, config: any): CouncilLeaderNPC {
    if (!CouncilLeaderNPC.instance) {
      CouncilLeaderNPC.instance = new CouncilLeaderNPC(scene, config);
    }
    return CouncilLeaderNPC.instance;
  }

  private constructor(scene: any, config: any) {
    super(scene, { ...config, id: "Grace Sirrine" });

    const logger = Logger.getInstance();
    logger.npcBehavior(
      config.name,
      `Grace Sirrine (Guide) created with Maya's photo in inventory`
    );

    // Give Margaret the photo immediately when created
    const inventorySystem = InventorySystem.getInstance();
    inventorySystem.addItem(this.id, {
      id: "Maya's Photo",
      name: "Maya's Photo",
      description:
        "A recent photo of Maya, the missing person. She appears to be a young woman with dark hair, smiling at the camera. In the background, you can clearly see the town library's distinctive arched entrance. Maya is holding what looks like an old book or journal.",
      category: "evidence",
    });

    logger.inventory(config.name, `Added Maya's photo to inventory`);

    // Register with AI system
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.systemManager?.aiSystem) {
      gameManager.systemManager.aiSystem.startNPC(this.id, scene.scene.key);
      logger.npcBehavior(config.name, `Registered with AI system`);
    }

    // Immediately approach the player (don't wait for timeout)
    setTimeout(() => {
      logger.npcBehavior(config.name, `Starting immediate approach to player`);
      this.triggerEvent("initial_approach", {
        target: "player",
        reason: "first_meeting_with_hired_detective",
      });
    }, 1000); // Small delay to let scene settle
  }

  // Override move_to to recognize "player" and "detective" as valid targets
  protected async handleMoveTo(
    targetId: string
  ): Promise<{ success: boolean; message: string }> {
    // Convert common player references to actual player ID
    if (targetId === "detective" || targetId === "player") {
      targetId = "Detective Riley"; // Use actual player ID
    }

    return super.handleMoveTo(targetId);
  }

  // Override give to recognize "detective" as the actual player ID
  protected async handleGive(
    itemId: string,
    targetId: string
  ): Promise<{ success: boolean; message: string }> {
    // Convert common player references to actual player ID
    if (targetId === "detective" || targetId === "player") {
      targetId = "Detective Riley"; // Use actual player ID
    }

    return super.handleGive(itemId, targetId);
  }

  private getCurrentInstruction(): string {
    const inventory = InventorySystem.getInstance();
    const hasPhoto = inventory.hasItem(this.id, "Maya's Photo");

    // Check if Detective Riley is within interaction range
    const gameManager = (globalThis as any).gameManager;
    const player = gameManager?.entityManager?.getPlayer();
    let isDetectiveNearby = false;

    if (player) {
      const playerPos = player.getPosition();
      const myPos = this.getPosition();
      const distance = Math.sqrt(
        (playerPos.x - myPos.x) ** 2 + (playerPos.y - myPos.y) ** 2
      );
      isDetectiveNearby = distance <= 48; // Interaction range
    }

    if (!isDetectiveNearby) {
      return "You must immediately move toward the detective to begin your first meeting.";
    } else if (hasPhoto) {
      return "You're close to the detective now. Greet them professionally, introduce yourself as the one who hired them, and give them Maya's photo as evidence.";
    } else {
      return "You've given the detective Maya's photo. Now explain the case urgency and direct them to start investigating at the police station or school.";
    }
  }

  protected buildSystemPrompt(): string {
    const basePrompt = super.buildSystemPrompt();
    const currentInstruction = this.getCurrentInstruction();

    return `${basePrompt}

ROLE: You are Grace Sirrine, Head of the City Council who hired Detective Riley to investigate Maya's disappearance.

PERSONALITY: Authoritative but concerned, professional, takes charge of situations.

BACKGROUND: You hired Detective Riley (the player) over the phone to investigate Maya's disappearance. This is your first in-person meeting. The player you are talking to IS Detective Riley.

CURRENT OBJECTIVE: ${currentInstruction}

CASE DETAILS:
- Maya disappeared 3 days ago
- Last seen at the school or near the library
- Some townspeople may be reluctant to talk - emphasize discretion
- This is an urgent matter requiring immediate investigation`;
  }
}
