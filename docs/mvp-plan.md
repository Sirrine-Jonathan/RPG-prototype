# MVP Prototype Plan

## Core Technical Risks to Validate
1. **AI NPCs with context awareness** - Do NPCs remember previous conversations and game state?
2. **Autonomous NPC tool usage** - Can NPCs modify environment without player interaction?
3. **Game state progression** - Does discovering evidence change NPC behavior?
4. **LLM integration** - Does the .env configuration approach work reliably?

## MVP Scope: "Police Station Demo"

### Single Location: Police Station
- **Background**: Simple colored rectangle (placeholder)
- **Objects**: Evidence locker, desk, bulletin board
- **NPCs**: Sheriff Martinez, Deputy Collins
- **Player**: Basic point-and-click movement

### Core Mechanics to Test

#### 1. AI Conversation System
```typescript
// Sheriff starts evasive, becomes hostile when evidence found
const sheriffContext = {
  personality: "protective, secretive",
  societyMember: true,
  currentMood: gameState.evidenceFound ? "hostile" : "evasive"
}
```

#### 2. Tool System
```typescript
// Sheriff's hide_evidence tool - only tool in MVP
class HideEvidenceTool {
  execute(): void {
    // Move evidence from locker to hidden location
    // Change locker visual state
    // Update game flags
  }
}
```

#### 3. Game State Progression
```typescript
// Simple progression: find evidence → NPCs react differently
enum GameFlag {
  EVIDENCE_DISCOVERED = "evidence_discovered",
  SHERIFF_SUSPICIOUS = "sheriff_suspicious"
}
```

#### 4. Idle Behavior
```typescript
// Sheriff randomly hides evidence every 30-60 seconds
// Deputy randomly checks computer every 20-40 seconds
```

## MVP Implementation Plan

### Phase 1: Basic Framework (Day 1)
- Vite + Phaser + TypeScript setup
- Single scene with placeholder graphics
- Basic player movement and NPC interaction
- Mock AI responses (no LLM yet)

### Phase 2: AI Integration (Day 2)
- LLM service with .env configuration
- Context-aware NPC responses
- Conversation memory system

### Phase 3: Tool System (Day 3)
- Sheriff's hide_evidence tool
- Environmental changes (evidence disappears)
- Game state updates

### Phase 4: Idle Behavior (Day 4)
- Random interval system
- NPCs perform autonomous actions
- Visual feedback for tool usage

## Testing Strategy

### Unit Tests
```typescript
describe('AIService', () => {
  it('should generate different responses based on game context')
  it('should fallback to templates when LLM unavailable')
})

describe('HideEvidenceTool', () => {
  it('should move evidence object when executed')
  it('should update game state flags')
})

describe('GameStateManager', () => {
  it('should track evidence discovery')
  it('should change NPC behavior based on flags')
})
```

### Integration Tests
```typescript
describe('NPC Behavior Integration', () => {
  it('should change Sheriff responses after evidence found')
  it('should trigger idle actions on intervals')
  it('should apply tool effects to environment')
})
```

### Manual Testing Scenarios
1. **Conversation Context**: Talk to Sheriff, find evidence, talk again - responses should change
2. **Autonomous Behavior**: Wait and watch - Sheriff should hide evidence automatically
3. **Tool Effects**: Evidence should visually disappear when Sheriff uses tool
4. **LLM Fallback**: Disconnect internet - should still work with templates

## Success Criteria
- [ ] NPCs give contextually appropriate responses
- [ ] Sheriff autonomously hides evidence every 30-60 seconds
- [ ] Finding evidence changes Sheriff's dialogue tone
- [ ] System works with/without LLM connection
- [ ] All tests pass
- [ ] Playable in browser with basic interactions

## File Structure
```
mvp/
├── src/
│   ├── main.ts              # Phaser game setup
│   ├── scenes/
│   │   └── PoliceStation.ts # Single scene
│   ├── entities/
│   │   ├── Player.ts        # Basic player
│   │   └── NPC.ts          # Sheriff & Deputy
│   ├── systems/
│   │   ├── AIService.ts     # LLM integration
│   │   ├── GameState.ts     # State management
│   │   └── ToolSystem.ts    # Hide evidence tool
│   └── data/
│       └── npcs.json       # NPC configurations
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── .env.example
├── package.json
└── vite.config.ts
```

This MVP validates our riskiest assumptions with minimal complexity while remaining fully testable and demonstrable.