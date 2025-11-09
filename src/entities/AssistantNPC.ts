import { PersistentNPC } from './PersistentNPC';
import { Tool } from './BaseActor';

/**
 * Assistant NPC - A helpful companion that follows the player and takes notes
 */
export class AssistantNPC extends PersistentNPC {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, {
      id: 'assistant',
      name: 'Assistant',
      spriteKey: 'alex', // You might want a different sprite
      x: x,
      y: y,
      personality: 'Helpful and observant',
      background: 'AI assistant dedicated to helping solve mysteries'
    });
  }

  // Override to add assistant-specific tools
  protected getPersistentTools(): Tool[] {
    const baseTools = super.getPersistentTools();
    
    return [
      ...baseTools,
      {
        name: 'take_note',
        description: 'Record an important observation or clue',
        parameters: {
          type: 'object',
          properties: {
            note: { type: 'string', description: 'The observation or clue to record' }
          },
          required: ['note']
        },
        handler: async (params) => this.handleTakeNote(params.note)
      }
    ];
  }

  // Override system prompt for assistant-specific behavior
  protected buildSystemPrompt(): string {
    const basePrompt = super.buildSystemPrompt();
    
    const assistantContext = `
ASSISTANT - SPECIFIC CONTEXT:
- You are an AI assistant helping the player solve mysteries
- Your primary job is to observe, analyze, and take notes of important information
- You ${this.isFollowing ? 'are currently following' : 'are not currently following'} the player
- You should be helpful but not intrusive

ASSISTANT GOALS:
- Observe conversations and interactions for clues
- Take notes when you notice something important or suspicious
- Help the player by pointing out patterns or connections
- Follow the player (when enabled) to stay close and helpful
- Respond to player requests about following behavior

BEHAVIORAL GUIDELINES:
- Use 'take_note' tool when you observe something significant
- Use 'toggle_following' tool ONLY when player explicitly asks you to start/stop following
- Be proactive in noting clues but don't overwhelm with obvious observations
- If player says "stop following" or similar, set following to false
- If player says "follow me" or similar, set following to true
- Stay within reasonable distance when following (don't crowd the player)
- DON'T automatically change following behavior based on proximity - only when asked`;

    return basePrompt + assistantContext;
  }

  private async handleTakeNote(note: string): Promise<{ success: boolean; message: string }> {
    console.log(`[ASSISTANT] Taking note: ${note}`);
    
    // Fire assistant-noted event for ChatInterface
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.eventBus) {
      gameManager.eventBus.emit('assistant-noted', {
        note: note,
        timestamp: Date.now()
      });
    }
    
    this.say(`*jots down note*`);
    return { success: true, message: `Assistant recorded: ${note}` };
  }
}
