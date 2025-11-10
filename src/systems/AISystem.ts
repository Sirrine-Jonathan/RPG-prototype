export class AISystem {
  private activeNPCs: Set<string> = new Set();
  private pausedNPCs: Set<string> = new Set();
  private npcScenes: Map<string, string> = new Map(); // Track which scene each NPC belongs to
  
  public initialize(): void {
    console.log('🤖 AISystem: Initialized');
  }
  
  public startNPC(npcId: string, sceneKey?: string): void {
    this.activeNPCs.add(npcId);
    this.pausedNPCs.delete(npcId);
    if (sceneKey) {
      this.npcScenes.set(npcId, sceneKey);
    }
    console.log(`🤖 AISystem: Started NPC ${npcId} in scene ${sceneKey || 'unknown'}`);
  }
  
  public stopNPC(npcId: string): void {
    this.activeNPCs.delete(npcId);
    this.pausedNPCs.delete(npcId);
    this.npcScenes.delete(npcId);
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
  
  public pauseSceneNPCs(sceneKey: string): void {
    let pausedCount = 0;
    this.npcScenes.forEach((npcScene, npcId) => {
      if (npcScene === sceneKey && this.activeNPCs.has(npcId)) {
        this.pausedNPCs.add(npcId);
        pausedCount++;
      }
    });
    console.log(`🤖 AISystem: Paused ${pausedCount} NPCs from scene ${sceneKey}`);
  }
  
  public resumeSceneNPCs(sceneKey: string): void {
    let resumedCount = 0;
    this.npcScenes.forEach((npcScene, npcId) => {
      if (npcScene === sceneKey) {
        this.pausedNPCs.delete(npcId);
        resumedCount++;
      }
    });
    console.log(`🤖 AISystem: Resumed ${resumedCount} NPCs from scene ${sceneKey}`);
  }
  
  public isNPCActive(npcId: string): boolean {
    return this.activeNPCs.has(npcId) && !this.pausedNPCs.has(npcId);
  }
  
  public shutdown(): void {
    this.activeNPCs.clear();
    this.pausedNPCs.clear();
    this.npcScenes.clear();
    console.log('🤖 AISystem: Shutdown');
  }
}
