import { PersistentNPC } from "../entities/PersistentNPC";
import { EventBus } from "./EventBus";

interface ProximityObject {
  id: string;
  getPosition(): { x: number; y: number };
  getOfferedTools(): any[];
}

export class ProximitySystem {
  private npcs: Map<string, PersistentNPC> = new Map();
  private objects: Map<string, ProximityObject> = new Map();
  private playerX: number = 0;
  private playerY: number = 0;
  private range: number = 96; // 2 tiles at 48px per tile
  private proximityStates: Map<string, boolean> = new Map();
  private eventBus: EventBus;

  constructor() {
    this.eventBus = EventBus.getInstance();

    // Listen for NPC speech to determine if player can hear it
    this.eventBus.subscribe("npc_speech", (event) => {
      this.handleNPCSpeech(event.data);
    });

    // Listen for player speech to notify nearby NPCs
    this.eventBus.subscribe("player_speech", (event) => {
      this.handlePlayerSpeech(event.data);
    });
  }

  addObject(obj: ProximityObject): void {
    this.objects.set(obj.id, obj);
    const pos = obj.getPosition();
    const tools = obj.getOfferedTools();
    console.log(
      `[Proximity] Added object ${obj.id} at (${pos.x}, ${pos.y}) offering ${tools.length} tools:`,
      tools.map((t) => t.name)
    );
  }

  removeObject(objId: string): void {
    this.objects.delete(objId);
    console.log(`[Proximity] Removed object ${objId} from proximity tracking`);
  }

  getNearbyObjects(npcId: string): ProximityObject[] {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      console.log(
        `[Proximity] getNearbyObjects: NPC ${npcId} not found in proximity system`
      );
      return [];
    }

    const npcPos = npc.getPosition();
    const nearby: ProximityObject[] = [];

    console.log(
      `[Proximity] Checking objects near ${npcId} at (${npcPos.x}, ${npcPos.y})`
    );
    console.log(`[Proximity] Total objects in system: ${this.objects.size}`);

    this.objects.forEach((obj, objId) => {
      const objPos = obj.getPosition();
      const distance = Phaser.Math.Distance.Between(
        npcPos.x,
        npcPos.y,
        objPos.x,
        objPos.y
      );

      console.log(
        `[Proximity] Object ${objId} at (${objPos.x}, ${
          objPos.y
        }) - distance: ${Math.round(distance)}px (range: ${this.range}px)`
      );

      if (distance < this.range) {
        nearby.push(obj);
        const tools = obj.getOfferedTools();
        console.log(
          `[Proximity] Object ${objId} is nearby! Offers ${tools.length} tools:`,
          tools.map((t) => t.name)
        );
      }
    });

    console.log(
      `[Proximity] Found ${nearby.length} nearby objects for ${npcId}`
    );
    return nearby;
  }
  addNPC(npc: PersistentNPC): void {
    if (this.npcs.has(npc.id)) {
      console.log(`[Proximity] NPC ${npc.id} already exists, skipping duplicate`);
      return;
    }
    
    this.npcs.set(npc.id, npc);
    const pos = npc.getPosition();
    console.log(
      `[Proximity] Added NPC ${npc.id} at (${pos.x}, ${pos.y}) to proximity tracking`
    );
  }

  removeNPC(npcId: string): void {
    this.npcs.delete(npcId);
    this.proximityStates.delete(npcId);
    console.log(`[Proximity] Removed NPC ${npcId} from proximity tracking`);
  }

  updatePlayerPosition(x: number, y: number): void {
    this.playerX = x;
    this.playerY = y;
    this.checkProximityChanges();
  }

  private checkProximityChanges(): void {
    this.npcs.forEach((npc, npcId) => {
      const npcPos = npc.getPosition();
      const distance = Phaser.Math.Distance.Between(
        npcPos.x,
        npcPos.y,
        this.playerX,
        this.playerY
      );

      const isNearby = distance < this.range;
      const wasNearby = this.proximityStates.get(npcId) || false;

      if (!wasNearby && isNearby) {
        console.log(
          `[Proximity] Player entered ${npc.name}'s proximity (${Math.round(
            distance
          )}px)`
        );
        this.eventBus.emitProximityEvent(npcId, "enter", Math.round(distance));
        npc.triggerEvent("player_nearby", { distance: Math.round(distance) });
      } else if (wasNearby && !isNearby) {
        console.log(
          `[Proximity] Player left ${npc.name}'s proximity (${Math.round(
            distance
          )}px)`
        );
        this.eventBus.emitProximityEvent(npcId, "exit", Math.round(distance));
        npc.triggerEvent("player_left", { distance: Math.round(distance) });
      }

      this.proximityStates.set(npcId, isNearby);
    });
  }

  private handlePlayerSpeech(data: any): void {
    // Notify all nearby NPCs when player speaks
    this.npcs.forEach((npc) => {
      const npcPos = npc.getPosition();
      const distance = Phaser.Math.Distance.Between(
        this.playerX,
        this.playerY,
        npcPos.x,
        npcPos.y
      );

      // If NPC is within hearing range, notify them of player speech
      if (distance <= 300) {
        // Same hearing range as NPC speech
        npc.triggerEvent("player_speech", {
          message: data.message,
          distance: distance,
        });
      }
    });
  }

  private handleNPCSpeech(data: any): void {
    const distance = Phaser.Math.Distance.Between(
      this.playerX,
      this.playerY,
      data.position.x,
      data.position.y
    );

    // If player is within hearing range, fire player-heard event
    if (distance <= data.hearingRange) {
      this.eventBus.emit("player-heard", {
        speaker: data.speakerName,
        message: data.message,
        distance: distance,
      });
    }
  }

  getNearbyNPCs(): PersistentNPC[] {
    const nearby: PersistentNPC[] = [];

    this.npcs.forEach((npc) => {
      const npcPos = npc.getPosition();
      const distance = Phaser.Math.Distance.Between(
        npcPos.x,
        npcPos.y,
        this.playerX,
        this.playerY
      );

      if (distance < this.range) {
        nearby.push(npc);
      }
    });

    return nearby;
  }

  // Check proximity between any two points
  checkProximity(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    range?: number
  ): boolean {
    const checkRange = range || this.range;
    const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    return distance < checkRange;
  }

  // Check if there are nearby actors (including player) for a specific NPC
  public hasNearbyActors(npcId: string): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;

    const npcPos = npc.getPosition();

    // Check if player is nearby
    const playerDistance = Phaser.Math.Distance.Between(
      npcPos.x,
      npcPos.y,
      this.playerX,
      this.playerY
    );

    if (playerDistance < this.range) {
      return true;
    }

    // Check if other NPCs are nearby
    for (const [otherId, otherNpc] of this.npcs) {
      if (otherId === npcId) continue;

      const otherPos = otherNpc.getPosition();
      const distance = Phaser.Math.Distance.Between(
        npcPos.x,
        npcPos.y,
        otherPos.x,
        otherPos.y
      );

      if (distance < this.range) {
        return true;
      }
    }

    return false;
  }

  clear(): void {
    this.npcs.clear();
    this.proximityStates.clear();
    console.log(`[Proximity] Cleared all NPCs from proximity tracking`);
  }
}
