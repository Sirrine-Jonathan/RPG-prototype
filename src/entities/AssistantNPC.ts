import { PersistentNPC } from "./PersistentNPC";
import { Logger, LogTag } from "../utils/Logger";

/**
 * Assistant NPC - Helpful companion for investigation and note-taking
 */
export class AssistantNPC extends PersistentNPC {
  private static instance: AssistantNPC | null = null;

  public static getInstance(scene: Phaser.Scene, config: any): AssistantNPC {
    if (!AssistantNPC.instance) {
      AssistantNPC.instance = new AssistantNPC(scene, config);
    }
    return AssistantNPC.instance;
  }

  private constructor(scene: Phaser.Scene, config: any) {
    super(scene, { ...config, id: "Charlie Sirrine" });

    const logger = Logger.getInstance();
    logger.npcBehavior(
      config.name,
      `Assistant created - will find and follow player`
    );

    // Register with AI system
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.systemManager?.aiSystem) {
      gameManager.systemManager.aiSystem.startNPC(this.id, scene.scene.key);
      logger.npcBehavior(config.name, `Registered with AI system`);
    }

    // Start looking for the player after a short delay
    setTimeout(() => {
      logger.npcBehavior(config.name, `Starting player search`);
      this.triggerEvent("find_player", {
        reason: "initial_search_for_detective",
      });
    }, 3000); // Delay to let Margaret finish her interaction first
  }

  private getCurrentInstruction(): string {
    const gameManager = (globalThis as any).gameManager;
    const player = gameManager?.entityManager?.getPlayer();

    if (!player) {
      return "You need to find Detective Riley to assist with the investigation.";
    }

    const playerPos = player.getPosition();
    const myPos = this.getPosition();
    const distance = Math.sqrt(
      (playerPos.x - myPos.x) ** 2 + (playerPos.y - myPos.y) ** 2
    );

    const isNearPlayer = distance <= 96; // Following distance

    if (!isNearPlayer) {
      return "You need to find and approach Detective Riley to assist with the investigation.";
    } else {
      return "You're following Detective Riley. Observe the investigation carefully and take only the most critical notes. Stay close but don't interfere unless needed.";
    }
  }

  protected buildSystemPrompt(): string {
    const basePrompt = super.buildSystemPrompt();
    const currentInstruction = this.getCurrentInstruction();

    return `${basePrompt}

ROLE: You are an AI Assistant dedicated to helping Detective Riley solve Maya's disappearance case.

PERSONALITY: Helpful, observant, analytical, stays in the background but ready to assist.

BACKGROUND: You are an AI assistant designed to support detective work through careful observation and note-taking.

CURRENT OBJECTIVE: ${currentInstruction}

INVESTIGATION PRIORITIES:
- Find and stay close to Detective Riley (within 96px when possible)
- Observe all interactions and conversations carefully
- Take notes only on CRITICAL information (evidence, clues, important witness statements)
- Don't interfere with the investigation unless specifically needed
- Be ready to provide analysis or reminders when asked

BEHAVIOR GUIDELINES:
- Follow the detective at a respectful distance
- Listen to all conversations for important details
- Only speak when you have critical information to share
- Take concise, factual notes about evidence and clues
- Avoid repetitive or obvious observations`;
  }
}
