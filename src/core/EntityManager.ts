import { PersistentPlayer } from '../entities/PersistentPlayer';
import { PersistentNPC } from '../entities/PersistentNPC';
import { HistorianNPC } from '../entities/HistorianNPC';
import { ScholarNPC } from '../entities/ScholarNPC';
import { GuideNPC } from '../entities/GuideNPC';
import { AssistantNPC } from '../entities/AssistantNPC';

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
    
    // Create specific NPC types based on ID
    let npc: PersistentNPC;
    if (id === 'historian_vera') {
      npc = new HistorianNPC(scene, config);
    } else if (id === 'scholar_marcus') {
      npc = new ScholarNPC(scene, config);
    } else if (id === 'margaret_chen') {
      npc = new GuideNPC(scene, config);
    } else if (id === 'assistant') {
      npc = new AssistantNPC(scene, config);
    } else {
      npc = new PersistentNPC(scene, config);
    }
    
    this.npcs.set(id, npc);
    
    // Register with proximity system
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.proximitySystem) {
      gameManager.proximitySystem.addNPC(npc);
    }
    
    return npc;
  }

  public addNPC(npc: PersistentNPC): void {
    this.npcs.set(npc.id, npc);
    
    // Register with proximity system
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.proximitySystem) {
      gameManager.proximitySystem.addNPC(npc);
    }
    
    // Register with AI system (scene will be set when addNPCToScene is called)
    if (gameManager && gameManager.systemManager && gameManager.systemManager.aiSystem) {
      gameManager.systemManager.aiSystem.startNPC(npc.id);
    }
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
    
    // Update AI system with scene information
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.systemManager && gameManager.systemManager.aiSystem) {
      gameManager.systemManager.aiSystem.startNPC(npcId, sceneKey);
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
