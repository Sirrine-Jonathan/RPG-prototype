# Advanced NPC System Design

## Character Classification System

### NPC Types
```typescript
enum NPCType {
  BASIC = 'basic',           // Template responses only
  AI_SIMPLE = 'ai_simple',   // AI without tools
  AI_ADVANCED = 'ai_advanced', // AI with tools and environment interaction
  AI_AUTONOMOUS = 'ai_autonomous' // Full autonomy with NPC-to-NPC interaction
}

interface NPCConfig {
  type: NPCType
  tools?: Tool[]
  idleInterval: number // milliseconds between idle actions
  conversationRadius: number // can talk to NPCs within this range
  environmentAccess: string[] // what they can interact with
}
```

### Character Tool Assignments

**Sheriff Martinez (AI_ADVANCED)**
- Tools: `access_evidence_locker`, `call_backup`, `arrest_player`, `hide_evidence`
- Behavior: Actively works to cover up society activities
- Idle Actions: Reviews case files, makes suspicious phone calls

**Deputy Collins (AI_SIMPLE)**  
- Tools: `access_computer`, `share_information`
- Behavior: Helpful but constrained by Sheriff's presence
- Idle Actions: Patrols, does paperwork

**Dr. Chen (AI_ADVANCED)**
- Tools: `access_medical_records`, `treat_patients`, `call_security`, `destroy_evidence`
- Behavior: Conflicted - wants to help but under coercion
- Idle Actions: Treats patients, nervously checks records

**Mr. Arthur (AI_AUTONOMOUS)**
- Tools: `recruit_members`, `perform_ritual`, `access_basement`, `communicate_with_entity`
- Behavior: Cult leader with supernatural connection
- Idle Actions: Studies ancient texts, performs minor rituals

**Students (AI_SIMPLE)**
- Tools: `hack_systems`, `spread_gossip`, `take_photos`
- Behavior: Information network, some recruited by society
- Idle Actions: Chat with each other, use phones, attend classes

## Tool System Architecture

### Tool Interface
```typescript
interface Tool {
  name: string
  description: string
  cooldown: number
  requiresTarget?: boolean
  environmentalEffect?: EnvironmentalChange
  
  canUse(npc: NPC, context: GameContext): boolean
  execute(npc: NPC, target?: any): Promise<ToolResult>
}

interface ToolResult {
  success: boolean
  message: string
  environmentalChanges?: EnvironmentalChange[]
  triggerEvents?: GameEvent[]
}
```

### Example Tools

**Evidence Manipulation (Sheriff)**
```typescript
class HideEvidenceTool implements Tool {
  async execute(npc: NPC, target: Evidence): Promise<ToolResult> {
    if (npc.name === 'Sheriff Martinez' && target.incriminating) {
      return {
        success: true,
        message: "Sheriff quietly files evidence in a locked drawer",
        environmentalChanges: [{ type: 'hide_object', target: target.id }],
        triggerEvents: [{ type: 'evidence_hidden', evidence: target.id }]
      }
    }
  }
}
```

**Medical Records Access (Dr. Chen)**
```typescript
class AccessMedicalRecordsTool implements Tool {
  async execute(npc: NPC): Promise<ToolResult> {
    const suspiciousActivity = Math.random() < 0.3
    return {
      success: true,
      message: suspiciousActivity 
        ? "Dr. Chen nervously deletes some patient records"
        : "Dr. Chen reviews patient files",
      environmentalChanges: suspiciousActivity 
        ? [{ type: 'modify_computer_screen', content: 'deleting_files' }]
        : []
    }
  }
}
```

## Idle State System

### Autonomous Behavior Engine
```typescript
class IdleBehaviorManager {
  private npcTimers: Map<string, NodeJS.Timeout> = new Map()
  
  startIdleBehavior(npc: NPC): void {
    const interval = npc.config.idleInterval + (Math.random() * 5000) // Add randomness
    
    const timer = setInterval(async () => {
      if (!npc.isInteractingWithPlayer && !npc.isInConversation) {
        await this.performIdleAction(npc)
      }
    }, interval)
    
    this.npcTimers.set(npc.id, timer)
  }
  
  private async performIdleAction(npc: NPC): Promise<void> {
    const context = GameManager.getCurrentContext()
    const nearbyNPCs = this.getNearbyNPCs(npc)
    
    // 40% chance to use a tool, 30% chance to talk to nearby NPC, 30% chance to move/idle
    const action = Math.random()
    
    if (action < 0.4 && npc.tools.length > 0) {
      await this.useRandomTool(npc, context)
    } else if (action < 0.7 && nearbyNPCs.length > 0) {
      await this.initiateNPCConversation(npc, nearbyNPCs)
    } else {
      await this.performIdleMovement(npc)
    }
  }
}
```

### Idle Action Prompts
```typescript
const IDLE_PROMPTS = {
  sheriff_martinez: `You are Sheriff Martinez in the police station. The player is not around. 
    What do you do next to advance the society's agenda or cover up evidence? 
    You have access to: evidence locker, phone, computer files.
    Respond with a single action in 10 words or less.`,
    
  dr_chen: `You are Dr. Chen at the hospital. No one is watching. 
    You're conflicted about the society but fear for your safety.
    What do you do? Available: patient records, medical supplies, phone.
    Single action, 10 words or less.`,
    
  students: `You are a student at school. Classes are in session but you're in the hallway.
    What typical student behavior do you engage in?
    Single action, 10 words or less.`
}
```

## NPC-to-NPC Conversations

### Conversation System
```typescript
class NPCConversationManager {
  private activeConversations: Map<string, NPCConversation> = new Map()
  
  async initiateConversation(npc1: NPC, npc2: NPC): Promise<void> {
    const conversationId = `${npc1.id}_${npc2.id}`
    
    const conversation = new NPCConversation(npc1, npc2, {
      topic: this.determineConversationTopic(npc1, npc2),
      maxExchanges: 3,
      isPlayerVisible: this.isPlayerNearby(npc1, npc2)
    })
    
    this.activeConversations.set(conversationId, conversation)
    await conversation.start()
  }
  
  private determineConversationTopic(npc1: NPC, npc2: NPC): string {
    const context = GameManager.getCurrentContext()
    
    // Society members discuss secret activities
    if (npc1.societyMember && npc2.societyMember) {
      return 'society_business'
    }
    
    // Recent events in town
    if (context.recentEvents.length > 0) {
      return 'recent_events'
    }
    
    // Default small talk
    return 'small_talk'
  }
}
```

### Conversation Topics & Prompts
```typescript
const CONVERSATION_PROMPTS = {
  society_business: {
    initiator: "Quietly discuss society plans. Keep it vague but ominous. 15 words max.",
    responder: "Respond as fellow society member. Show concern or agreement. 15 words max."
  },
  
  recent_events: {
    initiator: "Comment on recent strange happenings in town. Show appropriate concern. 15 words max.",
    responder: "Respond with your perspective on the events. 15 words max."
  },
  
  small_talk: {
    initiator: "Make casual small talk appropriate for your location and relationship. 15 words max.",
    responder: "Respond naturally to the comment. 15 words max."
  }
}
```

## Visual Conversation System

### Speech Bubble Implementation
```typescript
class ConversationVisualizer {
  showNPCConversation(npc1: NPC, npc2: NPC, message: string, isPlayerVisible: boolean): void {
    if (!isPlayerVisible) {
      // Player can't see/hear - no visual indication
      return
    }
    
    const distance = this.getPlayerDistance(npc1)
    
    if (distance < 100) {
      // Close enough to read - show full text
      this.createSpeechBubble(npc1, message, 'readable')
    } else if (distance < 200) {
      // Can see they're talking but can't make out words
      this.createSpeechBubble(npc1, '...', 'mumbled')
    } else {
      // Too far - just show talking animation
      this.showTalkingAnimation(npc1, npc2)
    }
  }
  
  private createSpeechBubble(npc: NPC, text: string, style: 'readable' | 'mumbled'): void {
    const bubble = this.scene.add.container(npc.x, npc.y - 50)
    
    const background = this.scene.add.graphics()
    background.fillStyle(style === 'readable' ? 0xffffff : 0xcccccc)
    background.fillRoundedRect(0, 0, text.length * 8, 30, 5)
    
    const textObj = this.scene.add.text(5, 5, text, {
      fontSize: style === 'readable' ? '12px' : '8px',
      color: style === 'readable' ? '#000000' : '#666666'
    })
    
    bubble.add([background, textObj])
    
    // Auto-remove after 3 seconds
    this.scene.time.delayedCall(3000, () => bubble.destroy())
  }
}
```

## Environmental Effects System

### Dynamic Environment Changes
```typescript
interface EnvironmentalChange {
  type: 'move_object' | 'hide_object' | 'modify_screen' | 'change_lighting' | 'add_sound'
  target: string
  newState: any
  duration?: number
}

class EnvironmentManager {
  applyChange(change: EnvironmentalChange): void {
    switch (change.type) {
      case 'hide_object':
        this.hideObject(change.target)
        break
      case 'modify_screen':
        this.updateComputerScreen(change.target, change.newState)
        break
      case 'change_lighting':
        this.adjustLighting(change.target, change.newState)
        break
    }
  }
  
  private hideObject(objectId: string): void {
    const obj = this.scene.getObjectById(objectId)
    if (obj) {
      obj.setVisible(false)
      // Add to hidden objects list for player discovery
      GameManager.addHiddenEvidence(objectId)
    }
  }
}
```

## Character Behavior Profiles

### Sheriff Martinez (Antagonist)
- **Idle Frequency:** Every 15-30 seconds
- **Tools:** Evidence manipulation, communication with society
- **Conversations:** Coordinates with other society members
- **Environmental Impact:** Hides evidence, makes suspicious calls

### Dr. Chen (Conflicted Ally)
- **Idle Frequency:** Every 20-40 seconds  
- **Tools:** Medical records access, patient treatment
- **Conversations:** Nervous exchanges with staff, reluctant society discussions
- **Environmental Impact:** Deletes records under pressure, treats affected patients

### Students (Information Network)
- **Idle Frequency:** Every 10-20 seconds
- **Tools:** Social media, photography, hacking
- **Conversations:** Gossip network, share observations
- **Environmental Impact:** Spread information, document suspicious activities

This system creates a living world where NPCs have agency, affect their environment, and interact with each other in meaningful ways that advance the story even when the player isn't directly involved.