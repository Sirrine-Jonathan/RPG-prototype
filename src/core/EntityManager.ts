import { PersistentPlayer } from "../entities/PersistentPlayer";
import { PersistentNPC } from "../entities/PersistentNPC";
import { HistorianNPC } from "../entities/HistorianNPC";
import { ScholarNPC } from "../entities/ScholarNPC";
import { CouncilLeaderNPC } from "../entities/CouncilLeaderNPC";
import { AssistantNPC } from "../entities/AssistantNPC";

export class EntityManager {
  private player: PersistentPlayer | null = null;
  private npcs: Map<string, PersistentNPC> = new Map();
  private sceneNPCs: Map<string, string[]> = new Map();

  public getPlayer(): PersistentPlayer | null {
    return this.player;
  }

  public createPlayer(
    scene: Phaser.Scene,
    x: number,
    y: number
  ): PersistentPlayer {
    if (this.player) {
      throw new Error("Player already exists");
    }
    this.player = new PersistentPlayer(scene, x, y);
    
    // Register player with proximity system so NPCs can interact with it
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.proximitySystem) {
      gameManager.proximitySystem.addObject(this.player);
    }
    
    return this.player;
  }

  public getNPC(id: string): PersistentNPC | null {
    return this.npcs.get(id) || null;
  }

  public createNPC(
    id: string,
    scene: Phaser.Scene,
    config: any
  ): PersistentNPC {
    // Create specific NPC types - each is a singleton
    let npc: PersistentNPC;
    if (id === "historian_vera") {
      npc = HistorianNPC.getInstance(scene, config);
    } else if (id === "scholar_marcus") {
      npc = ScholarNPC.getInstance(scene, config);
    } else if (id === "margaret_chen") {
      npc = CouncilLeaderNPC.getInstance(scene, config);
    } else if (id === "assistant") {
      npc = AssistantNPC.getInstance(scene, config);
    } else {
      throw new Error(
        `Unknown NPC type: ${id}, all NPCs should have their own class`
      );
    }

    // Store by the NPC's actual ID
    if (!this.npcs.has(npc.id)) {
      this.npcs.set(npc.id, npc);

      // Register with proximity system
      const gameManager = (globalThis as any).gameManager;
      if (gameManager && gameManager.proximitySystem) {
        gameManager.proximitySystem.addNPC(npc);
      }
    }

    return npc;
  }

  private getTargetNPCId(lookupKey: string): string {
    // Map lookup keys to actual NPC IDs
    switch (lookupKey) {
      case "margaret_chen":
        return "Margaret Chen";
      case "assistant":
        return "Assistant";
      case "historian_vera":
        return "Historian Vera";
      case "scholar_marcus":
        return "Scholar Marcus";
      default:
        return lookupKey;
    }
  }

  public addNPC(npc: PersistentNPC): void {
    this.npcs.set(npc.id, npc);

    // Register with proximity system
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.proximitySystem) {
      gameManager.proximitySystem.addNPC(npc);
    }

    // Register with AI system (scene will be set when addNPCToScene is called)
    if (
      gameManager &&
      gameManager.systemManager &&
      gameManager.systemManager.aiSystem
    ) {
      gameManager.systemManager.aiSystem.startNPC(npc.id);
    }
  }

  public getNPCsForScene(sceneKey: string): PersistentNPC[] {
    const npcIds = this.sceneNPCs.get(sceneKey) || [];
    return npcIds.map((id) => this.npcs.get(id)!).filter(Boolean);
  }

  public addNPCToScene(npcId: string, sceneKey: string): void {
    if (!this.sceneNPCs.has(sceneKey)) {
      this.sceneNPCs.set(sceneKey, []);
    }
    const sceneNPCs = this.sceneNPCs.get(sceneKey)!;
    if (!sceneNPCs.includes(npcId)) {
      sceneNPCs.push(npcId);
    }

    // Update AI system with scene information - use actual NPC ID
    const gameManager = (globalThis as any).gameManager;
    if (
      gameManager &&
      gameManager.systemManager &&
      gameManager.systemManager.aiSystem
    ) {
      // Find the actual NPC ID (since lookup key might differ from NPC ID)
      const npc = Array.from(this.npcs.values()).find((n) => n.id === npcId);
      if (npc) {
        gameManager.systemManager.aiSystem.startNPC(npc.id, sceneKey);
      }
    }
  }

  public clear(): void {
    this.player?.destroy();
    this.player = null;
    this.npcs.forEach((npc) => npc.destroy());
    this.npcs.clear();
    this.sceneNPCs.clear();
  }
}
