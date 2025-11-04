import { Scene } from 'phaser';

export class SpeechBubble {
    private scene: Scene;
    private background?: Phaser.GameObjects.Rectangle;
    private text?: Phaser.GameObjects.Text;
    private hideTimer?: Phaser.Time.TimerEvent;
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    show(x: number, y: number, message: string, speaker: string = 'NPC', autoHide: boolean = true) {
        // Clean up existing bubble
        this.hide();
        
        // Create text
        this.text = this.scene.add.text(x, y - 40, message, {
            fontSize: '14px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 8, y: 6 },
            wordWrap: { width: 250 },
            align: 'center'
        }).setOrigin(0.5).setDepth(1000);
        
        // Auto-hide after 3 seconds
        if (autoHide) {
            this.hideTimer = this.scene.time.delayedCall(3000, () => {
                this.hide();
            });
        }
    }
    
    hide() {
        if (this.text) {
            this.text.destroy();
            this.text = undefined;
        }
        if (this.background) {
            this.background.destroy();
            this.background = undefined;
        }
        if (this.hideTimer) {
            this.hideTimer.destroy();
            this.hideTimer = undefined;
        }
    }
    
    destroy() {
        this.hide();
    }
}