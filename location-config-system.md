# Location Configuration System Design

## Overview

A JSON-based configuration system that allows easy authoring of game locations while leveraging our existing sandbox components. Supports state-aware content, conditional logic, and hot reloading for rapid iteration.

## Core Principles

1. **Reuse Sandbox Components**: Leverage Player, NPC, InteractableObject, etc.
2. **State-Driven**: NPCs and objects change based on game progression
3. **Easy Authoring**: Non-programmers can edit locations
4. **Hot Reloadable**: Test changes without rebuilding
5. **Validation**: Catch errors early with schema validation

## Configuration Structure

### Base Schema

```typescript
interface LocationConfig {
  id: string
  name: string
  description: string
  unlockConditions: string[]  // Game flags required to access
  
  environment: EnvironmentConfig
  npcs: NPCConfig[]
  objects: InteractableObjectConfig[]
  puzzles: PuzzleConfig[]
  
  onEnter?: ActionConfig[]     // Actions when player enters
  onExit?: ActionConfig[]      // Actions when player leaves
  
  assets: AssetConfig
  metadata: LocationMetadata
}
```

### Environment Configuration

```typescript
interface EnvironmentConfig {
  background: {
    type: 'color' | 'image' | 'generated'
    value: string  // hex color, image path, or generation prompt
  }
  
  layout: {
    width: number
    height: number
    walkableArea: BoundaryConfig
    walls: BoundaryConfig[]
    areas: AreaConfig[]  // Named areas like "desk_area", "evidence_locker"
  }
  
  atmosphere: {
    lighting: 'bright' | 'dim' | 'dark'
    mood: 'normal' | 'tense' | 'mysterious' | 'safe'
    ambientSound?: string
  }
}
```

### NPC Configuration

```typescript
interface NPCConfig {
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
  
  // State-based overrides
  stateOverrides: {
    [gameFlag: string]: Partial<NPCConfig>
  }
}
```

### Object Configuration

```typescript
interface InteractableObjectConfig {
  id: string
  name: string
  position: { x: number, y: number }
  
  appearance: {
    type: 'evidence_locker' | 'computer' | 'door' | 'desk' | 'custom'
    sprite?: string
    color?: string
    size: { width: number, height: number }
  }
  
  interaction: {
    prompt: string
    range: number
    action: 'examine' | 'use' | 'puzzle' | 'custom'
    result: ActionConfig[]
  }
  
  // State-based visibility and behavior
  conditions: {
    visible: string[]     // Game flags required to show object
    interactive: string[] // Game flags required to interact
  }
  
  states: {
    [stateName: string]: {
      appearance: Partial<InteractableObjectConfig['appearance']>
      interaction: Partial<InteractableObjectConfig['interaction']>
    }
  }
}
```

### Puzzle Configuration

```typescript
interface PuzzleConfig {
  id: string
  type: 'sequence' | 'social' | 'stealth' | 'logic'
  
  trigger: {
    condition: string[]  // Game flags that enable this puzzle
    location?: string    // Specific area or object that triggers it
  }
  
  solution: {
    type: 'code' | 'conversation' | 'item_combination' | 'custom'
    data: any           // Puzzle-specific solution data
  }
  
  rewards: ActionConfig[]  // What happens when solved
  hints: string[]         // Progressive hints for players
}
```

### Action System

```typescript
interface ActionConfig {
  type: 'setFlag' | 'showMessage' | 'unlockLocation' | 'changeNPCMood' | 
        'moveObject' | 'playSound' | 'custom'
  
  parameters: {
    [key: string]: any
  }
  
  conditions?: string[]  // Optional conditions for this action
}
```

## Example: Police Station Configuration

```json
{
  "id": "police_station",
  "name": "Police Station",
  "description": "The town's police headquarters. Sheriff Martinez runs a tight ship here.",
  "unlockConditions": [],
  
  "environment": {
    "background": {
      "type": "color",
      "value": "#8B7355"
    },
    "layout": {
      "width": 800,
      "height": 600,
      "walkableArea": {
        "x": 70, "y": 120, "width": 660, "height": 330
      },
      "walls": [
        { "x": 50, "y": 100, "width": 700, "height": 20 },
        { "x": 50, "y": 450, "width": 700, "height": 20 }
      ],
      "areas": [
        { "id": "reception", "x": 300, "y": 100, "width": 200, "height": 80 },
        { "id": "evidence_area", "x": 100, "y": 150, "width": 100, "height": 100 }
      ]
    },
    "atmosphere": {
      "lighting": "bright",
      "mood": "normal"
    }
  },
  
  "npcs": [
    {
      "id": "sheriff_martinez",
      "name": "Sheriff Martinez",
      "position": { "x": 550, "y": 350 },
      "appearance": {
        "sprite": "npc_sheriff",
        "color": "#8b4513",
        "size": { "width": 40, "height": 60 }
      },
      "behavior": {
        "aiMode": "ai",
        "personality": "protective, secretive, slightly suspicious of outsiders",
        "tools": ["hide_evidence", "access_computer"],
        "idleBehaviors": ["patrol", "check_evidence", "make_calls"],
        "baseInterval": { "min": 15, "max": 30 }
      },
      "dialogue": {
        "context": "You are the town sheriff. You know about strange happenings but try to downplay them.",
        "mood": "neutral",
        "templates": {
          "greeting": ["Everything's under control here.", "What can I do for you?"],
          "suspicious": ["I'd prefer if you didn't go poking around.", "Nothing unusual happening."]
        }
      },
      "stateOverrides": {
        "evidence_discovered": {
          "dialogue": {
            "mood": "hostile",
            "context": "You are angry that someone is investigating. Be defensive and try to end conversations quickly."
          }
        }
      }
    },
    {
      "id": "deputy_collins",
      "name": "Deputy Collins",
      "position": { "x": 250, "y": 300 },
      "appearance": {
        "sprite": "npc_deputy",
        "color": "#4169e1",
        "size": { "width": 40, "height": 60 }
      },
      "behavior": {
        "aiMode": "template",
        "personality": "young, eager, helpful",
        "tools": ["access_computer"],
        "idleBehaviors": ["patrol", "file_reports"],
        "baseInterval": { "min": 10, "max": 25 }
      },
      "dialogue": {
        "context": "You are a helpful deputy who wants to assist but is constrained by the sheriff.",
        "mood": "friendly",
        "templates": {
          "greeting": ["I wish I could help more, but...", "The Sheriff knows best, I suppose."],
          "helpful": ["There have been some odd reports lately.", "I'm still learning the ropes here."]
        }
      }
    }
  ],
  
  "objects": [
    {
      "id": "evidence_locker",
      "name": "Evidence Locker",
      "position": { "x": 150, "y": 200 },
      "appearance": {
        "type": "evidence_locker",
        "size": { "width": 60, "height": 80 }
      },
      "interaction": {
        "prompt": "🔍 Evidence Locker",
        "range": 50,
        "action": "examine",
        "result": [
          {
            "type": "showMessage",
            "parameters": {
              "message": "A secure metal locker containing case files and evidence."
            }
          }
        ]
      },
      "conditions": {
        "visible": [],
        "interactive": []
      },
      "states": {
        "hidden": {
          "appearance": { "color": "#666666" },
          "interaction": {
            "prompt": "🔍 Empty Locker",
            "result": [
              {
                "type": "showMessage",
                "parameters": {
                  "message": "The locker appears to be empty. Someone has been here recently."
                }
              }
            ]
          }
        }
      }
    }
  ],
  
  "puzzles": [
    {
      "id": "evidence_discovery",
      "type": "social",
      "trigger": {
        "condition": [],
        "location": "evidence_locker"
      },
      "solution": {
        "type": "conversation",
        "data": {
          "npc": "deputy_collins",
          "requiredTopics": ["strange_reports", "missing_evidence"]
        }
      },
      "rewards": [
        {
          "type": "setFlag",
          "parameters": { "flag": "evidence_discovered" }
        },
        {
          "type": "unlockLocation",
          "parameters": { "location": "hospital" }
        }
      ],
      "hints": [
        "The deputy seems more talkative than the sheriff.",
        "Ask about recent reports or unusual cases."
      ]
    }
  ],
  
  "assets": {
    "sprites": {
      "npc_sheriff": "/assets/sprites/sheriff.png",
      "npc_deputy": "/assets/sprites/deputy.png"
    },
    "sounds": {
      "ambient": "/assets/audio/police_station_ambient.mp3"
    }
  },
  
  "metadata": {
    "author": "Game Designer",
    "version": "1.0",
    "lastModified": "2025-11-03",
    "notes": "Central hub for investigation. Sheriff becomes hostile after evidence discovery."
  }
}
```

## Configuration Manager

```typescript
class LocationConfigManager {
  private configs: Map<string, LocationConfig> = new Map()
  private gameState: GameState
  
  async loadLocation(locationId: string): Promise<LocationConfig> {
    const config = await this.loadConfigFile(`/configs/locations/${locationId}.json`)
    
    // Apply state-based overrides
    const processedConfig = this.applyStateOverrides(config, this.gameState)
    
    // Validate configuration
    this.validateConfig(processedConfig)
    
    return processedConfig
  }
  
  private applyStateOverrides(config: LocationConfig, gameState: GameState): LocationConfig {
    // Apply NPC state overrides
    config.npcs.forEach(npc => {
      Object.keys(npc.stateOverrides || {}).forEach(flag => {
        if (gameState.hasFlag(flag)) {
          Object.assign(npc, npc.stateOverrides[flag])
        }
      })
    })
    
    // Filter objects based on conditions
    config.objects = config.objects.filter(obj => 
      obj.conditions.visible.every(flag => gameState.hasFlag(flag))
    )
    
    return config
  }
}
```

## Benefits

1. **Easy Authoring**: Designers can create locations without coding
2. **State-Aware**: Content changes based on player progress
3. **Reusable**: Leverages existing sandbox components
4. **Testable**: Each location can be tested in isolation
5. **Maintainable**: Clear separation of data and logic
6. **Extensible**: Easy to add new object types, NPC behaviors, etc.
7. **Hot Reloadable**: Changes can be tested immediately

## Integration with Sandbox

The configuration system uses our existing sandbox entities:
- `Player` from sandbox/entities/Player.ts
- `NPC` types (TestNPC, ToolNPC, IdleNPC) 
- `InteractableObject` from sandbox/entities/InteractableObject.ts
- `NPCIndicator` for AI/template visualization

This ensures consistency and allows rapid prototyping of new locations using proven components.