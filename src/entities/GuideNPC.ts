import { SmartNPC } from './SmartNPC';
import { Scene } from 'phaser';

export class GuideNPC extends SmartNPC {
  private followTarget: Phaser.GameObjects.Sprite | null = null;
  private followDistance = 80;

  constructor(scene: Scene, x: number, y: number, playerName: string = "Detective") {
    const guidePrompt = `You are Margaret Chen, the Head of Millbrook City Council. You hired ${playerName}, a freelance private investigator, to help with strange occurrences in town. You've been waiting for them to arrive and they're running late.

You already greeted them with: "Finally! You're late - I've been waiting. I hired you to investigate strange activities in town. We need to move quickly."

Now continue the conversation naturally, helping them with the investigation. Keep responses brief since you're pressed for time.`;

    super(scene, x, y, 'alex', 'Margaret Chen', 'Head of City Council', guidePrompt, 'guide');
    
    // Give initial greeting after a short delay
    setTimeout(async () => {
      const result = await this.executeAction('speak', {
        message: "Finally! You're late - I've been waiting. I hired you to investigate strange activities in town. We need to move quickly."
      });
      
      // Manually update conversation history to ensure context is available immediately
      (this as any).conversationMessages.push({
        role: "assistant",
        content: `I chose action: speak with parameters: {"message":"Finally! You're late - I've been waiting. I hired you to investigate strange activities in town. We need to move quickly."}. Reasoning: Initial greeting to late detective`,
      });
      
      (this as any).conversationMessages.push({
        role: "tool",
        content: result.success ? `SUCCESS: Said: "Finally! You're late - I've been waiting. I hired you to investigate strange activities in town. We need to move quickly."` : `FAILED: ${result.message}`,
      });
      
      // Keep conversation manageable (same logic as SmartNPC)
      if ((this as any).conversationMessages.length > 20) {
        (this as any).conversationMessages = (this as any).conversationMessages.slice(-10);
      }
    }, 1500);
  }

  setFollowTarget(target: Phaser.GameObjects.Sprite): void {
    this.followTarget = target;
  }
}
