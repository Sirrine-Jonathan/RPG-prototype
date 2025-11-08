export class AISystem {
  private activeNPCs: Set<string> = new Set();
  private pausedNPCs: Set<string> = new Set();
  
  public initialize(): void {
    console.log('🤖 AISystem: Initialized');
  }
  
  public startNPC(npcId: string): void {
    this.activeNPCs.add(npcId);
    this.pausedNPCs.delete(npcId);
    console.log(`🤖 AISystem: Started NPC ${npcId}`);
  }
  
  public stopNPC(npcId: string): void {
    this.activeNPCs.delete(npcId);
    this.pausedNPCs.delete(npcId);
    console.log(`🤖 AISystem: Stopped NPC ${npcId}`);
  }
  
  public pauseNPC(npcId: string): void {
    if (this.activeNPCs.has(npcId)) {
      this.pausedNPCs.add(npcId);
      console.log(`🤖 AISystem: Paused NPC ${npcId}`);
    }
  }
  
  public resumeNPC(npcId: string): void {
    this.pausedNPCs.delete(npcId);
    console.log(`🤖 AISystem: Resumed NPC ${npcId}`);
  }
  
  public pauseAll(): void {
    this.activeNPCs.forEach(npcId => this.pausedNPCs.add(npcId));
    console.log(`🤖 AISystem: Paused all NPCs (${this.activeNPCs.size})`);
  }
  
  public resumeAll(): void {
    this.pausedNPCs.clear();
    console.log(`🤖 AISystem: Resumed all NPCs`);
  }
  
  public resumeSceneNPCs(sceneId: string): void {
    // TODO: Implement scene-specific NPC management
    this.resumeAll();
  }
  
  public isNPCActive(npcId: string): boolean {
    return this.activeNPCs.has(npcId) && !this.pausedNPCs.has(npcId);
  }
  
  public shutdown(): void {
    this.activeNPCs.clear();
    this.pausedNPCs.clear();
    console.log('🤖 AISystem: Shutdown');
  }
}
