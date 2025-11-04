export class GameState {
  private flags: Set<string> = new Set()
  private variables: Map<string, any> = new Map()
  private npcRelationships: Map<string, number> = new Map()
  
  // Flag management
  setFlag(flag: string): void {
    this.flags.add(flag)
    this.save()
  }
  
  hasFlag(flag: string): boolean {
    return this.flags.has(flag)
  }
  
  removeFlag(flag: string): void {
    this.flags.delete(flag)
    this.save()
  }
  
  // Variable management
  setVariable(key: string, value: any): void {
    this.variables.set(key, value)
    this.save()
  }
  
  getVariable(key: string, defaultValue?: any): any {
    return this.variables.get(key) ?? defaultValue
  }
  
  // NPC relationship tracking
  updateRelationship(npcId: string, delta: number): void {
    const current = this.npcRelationships.get(npcId) || 0
    this.npcRelationships.set(npcId, current + delta)
    this.save()
  }
  
  getRelationship(npcId: string): number {
    return this.npcRelationships.get(npcId) || 0
  }
  
  // Save/Load
  save(): void {
    const saveData = {
      flags: Array.from(this.flags),
      variables: Object.fromEntries(this.variables),
      relationships: Object.fromEntries(this.npcRelationships),
      timestamp: Date.now()
    }
    
    localStorage.setItem('rpg_game_state', JSON.stringify(saveData))
  }
  
  load(): void {
    try {
      const saveData = localStorage.getItem('rpg_game_state')
      if (!saveData) return
      
      const data = JSON.parse(saveData)
      
      this.flags = new Set(data.flags || [])
      this.variables = new Map(Object.entries(data.variables || {}))
      this.npcRelationships = new Map(Object.entries(data.relationships || {}))
      
    } catch (error) {
      console.error('Error loading game state:', error)
    }
  }
  
  // Debug helpers
  getAllFlags(): string[] {
    return Array.from(this.flags)
  }
  
  reset(): void {
    this.flags.clear()
    this.variables.clear()
    this.npcRelationships.clear()
    localStorage.removeItem('rpg_game_state')
  }
}