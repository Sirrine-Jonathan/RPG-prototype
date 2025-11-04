import { GameState } from './GameState'

export interface LocationConfig {
  id: string
  name: string
  description: string
  unlockConditions: string[]
  
  environment: EnvironmentConfig
  npcs: NPCConfig[]
  objects: InteractableObjectConfig[]
  puzzles: PuzzleConfig[]
  
  onEnter?: ActionConfig[]
  onExit?: ActionConfig[]
  
  assets: AssetConfig
  metadata: LocationMetadata
}

export interface EnvironmentConfig {
  background: {
    type: 'color' | 'image' | 'generated'
    value: string
  }
  layout: {
    width: number
    height: number
    walkableArea: BoundaryConfig
    walls: BoundaryConfig[]
    areas: AreaConfig[]
  }
  atmosphere: {
    lighting: 'bright' | 'dim' | 'dark'
    mood: 'normal' | 'tense' | 'mysterious' | 'safe'
    ambientSound?: string
  }
}

export interface NPCConfig {
  id: string
  name: string
  position: { x: number, y: number }
  
  appearance: {
    sprite: string
    color: string
    size: { width: number, height: number }
  }
  
  behavior: {
    aiMode: 'template' | 'ai'
    personality: string
    tools: string[]
    idleBehaviors: string[]
    baseInterval: { min: number, max: number }
  }
  
  dialogue: {
    context: string
    mood: 'friendly' | 'neutral' | 'suspicious' | 'hostile'
    templates: { [key: string]: string[] }
  }
  
  stateOverrides?: {
    [gameFlag: string]: Partial<NPCConfig>
  }
}

export interface InteractableObjectConfig {
  id: string
  name: string
  position: { x: number, y: number }
  
  appearance: {
    type: string
    sprite?: string
    color?: string
    size: { width: number, height: number }
  }
  
  interaction: {
    prompt: string
    range: number
    action: string
    result: ActionConfig[]
  }
  
  conditions: {
    visible: string[]
    interactive: string[]
  }
  
  states?: {
    [stateName: string]: {
      appearance?: Partial<InteractableObjectConfig['appearance']>
      interaction?: Partial<InteractableObjectConfig['interaction']>
    }
  }
}

export interface PuzzleConfig {
  id: string
  type: 'sequence' | 'social' | 'stealth' | 'logic'
  
  trigger: {
    condition: string[]
    location?: string
  }
  
  solution: {
    type: string
    data: any
  }
  
  rewards: ActionConfig[]
  hints: string[]
}

export interface ActionConfig {
  type: string
  parameters: { [key: string]: any }
  conditions?: string[]
}

export interface BoundaryConfig {
  x: number
  y: number
  width: number
  height: number
}

export interface AreaConfig {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface AssetConfig {
  sprites: { [key: string]: string }
  sounds: { [key: string]: string }
}

export interface LocationMetadata {
  author: string
  version: string
  lastModified: string
  notes: string
}

export class LocationConfigManager {
  private configs: Map<string, LocationConfig> = new Map()
  private gameState: GameState
  
  constructor(gameState: GameState) {
    this.gameState = gameState
  }
  
  async loadLocation(locationId: string): Promise<LocationConfig> {
    // Check cache first
    if (this.configs.has(locationId)) {
      return this.applyStateOverrides(this.configs.get(locationId)!, this.gameState)
    }
    
    // Load from file
    const config = await this.loadConfigFile(`/configs/locations/${locationId}.json`)
    this.configs.set(locationId, config)
    
    // Apply state-based overrides
    const processedConfig = this.applyStateOverrides(config, this.gameState)
    
    // Validate configuration
    this.validateConfig(processedConfig)
    
    return processedConfig
  }
  
  private async loadConfigFile(path: string): Promise<LocationConfig> {
    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`Error loading location config from ${path}:`, error)
      throw error
    }
  }
  
  private applyStateOverrides(config: LocationConfig, gameState: GameState): LocationConfig {
    // Deep clone to avoid mutating cached config
    const processedConfig = JSON.parse(JSON.stringify(config))
    
    // Apply NPC state overrides
    processedConfig.npcs.forEach((npc: NPCConfig) => {
      if (npc.stateOverrides) {
        Object.keys(npc.stateOverrides).forEach(flag => {
          if (gameState.hasFlag(flag)) {
            // Deep merge the override
            this.deepMerge(npc, npc.stateOverrides![flag])
          }
        })
      }
    })
    
    // Filter objects based on visibility conditions
    processedConfig.objects = processedConfig.objects.filter((obj: InteractableObjectConfig) => 
      obj.conditions.visible.every(flag => gameState.hasFlag(flag))
    )
    
    // Apply object state changes
    processedConfig.objects.forEach((obj: InteractableObjectConfig) => {
      if (obj.states) {
        Object.keys(obj.states).forEach(stateName => {
          if (gameState.hasFlag(`${obj.id}_${stateName}`)) {
            this.deepMerge(obj, obj.states![stateName])
          }
        })
      }
    })
    
    return processedConfig
  }
  
  private deepMerge(target: any, source: any): void {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {}
        this.deepMerge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    })
  }
  
  private validateConfig(config: LocationConfig): void {
    // Basic validation
    if (!config.id || !config.name) {
      throw new Error('Location config must have id and name')
    }
    
    if (!config.environment || !config.environment.layout) {
      throw new Error('Location config must have environment layout')
    }
    
    // Validate NPC references
    config.npcs.forEach(npc => {
      if (!npc.id || !npc.name) {
        throw new Error('NPC must have id and name')
      }
    })
    
    // Validate object references
    config.objects.forEach(obj => {
      if (!obj.id || !obj.name) {
        throw new Error('Object must have id and name')
      }
    })
  }
  
  // Hot reload support for development
  async reloadLocation(locationId: string): Promise<LocationConfig> {
    this.configs.delete(locationId)
    return this.loadLocation(locationId)
  }
  
  // Get all available locations
  getAvailableLocations(gameState: GameState): string[] {
    // This would typically load from a locations index file
    const allLocations = [
      'police_station',
      'hospital', 
      'school',
      'grocery_store',
      'art_museum',
      'stone_cave'
    ]
    
    return allLocations.filter(locationId => {
      const config = this.configs.get(locationId)
      if (!config) return true // Allow loading to check conditions
      
      return config.unlockConditions.every(condition => 
        gameState.hasFlag(condition)
      )
    })
  }
}