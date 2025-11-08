import { PersistentPlayer } from '../entities/PersistentPlayer';
import { PersistentNPC } from '../entities/PersistentNPC';

export class EntityManager {
  private player: PersistentPlayer | null = null;
  private npcs: Map<string, PersistentNPC> = new Map();
  private sceneNPCs: Map<string, string[]> = new Map();
  
  public getPlayer(): PersistentPlayer | null {
    return this.player;
  }
  
  public createPlayer(scene: Phaser.Scene, x: number, y: number): PersistentPlayer {
    if (this.player) {
      throw new Error('Player already exists');
    }
    this.player = new PersistentPlayer(scene, x, y);
    return this.player;
  }
  
  public getNPC(id: string): PersistentNPC | null {
    return this.npcs.get(id) || null;
  }
  
  public createNPC(id: string, scene: Phaser.Scene, config: any): PersistentNPC {
    if (this.npcs.has(id)) {
      return this.npcs.get(id)!;
    }
    
    const npc = new PersistentNPC(scene, config);
    this.npcs.set(id, npc);
    return npc;
  }
  
  public getNPCsForScene(sceneKey: string): PersistentNPC[] {
    const npcIds = this.sceneNPCs.get(sceneKey) || [];
    return npcIds.map(id => this.npcs.get(id)!).filter(Boolean);
  }
  
  public addNPCToScene(npcId: string, sceneKey: string): void {
    if (!this.sceneNPCs.has(sceneKey)) {
      this.sceneNPCs.set(sceneKey, []);
    }
    const sceneNPCs = this.sceneNPCs.get(sceneKey)!;
    if (!sceneNPCs.includes(npcId)) {
      sceneNPCs.push(npcId);
    }
  }
  
  public clear(): void {
    this.player?.destroy();
    this.player = null;
    this.npcs.forEach(npc => npc.destroy());
    this.npcs.clear();
    this.sceneNPCs.clear();
  }
}
