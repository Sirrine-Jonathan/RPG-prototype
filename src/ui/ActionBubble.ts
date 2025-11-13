import { Scene } from 'phaser';

export class ActionBubble {
    private scene: Scene;
    private container?: Phaser.GameObjects.Container;
    private messageText?: Phaser.GameObjects.Text;
    private followTarget?: Phaser.GameObjects.Sprite;
    private updateTimer?: Phaser.Time.TimerEvent;
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    show(x: number, y: number, message: string, followTarget?: Phaser.GameObjects.Sprite) {
        if (!message) return;
        
        // Clean up existing bubble
        this.hide();
        
        // Store follow target
        this.followTarget = followTarget;
        
        // Create container for the bubble
        this.container = this.scene.add.container(x, y - 60).setDepth(1000);
        
        // Start following if we have a target
        if (this.followTarget) {
            this.container.setPosition(this.followTarget.x, this.followTarget.y - 60);
            this.startFollowing();
        }
        
        // Create message text with yellow background and square corners
        this.messageText = this.scene.add.text(0, 0, message, {
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#ffffcc',
            padding: { x: 8, y: 6 },
            wordWrap: { width: 250 },
            align: 'center'
        }).setOrigin(0.5);
        
        this.container.add([this.messageText]);
        
        // Auto-hide after 3 seconds
        this.scene.time.delayedCall(3000, () => this.hide());
    }
    
    hide() {
        if (this.container) {
            this.container.destroy();
            this.container = undefined;
            this.messageText = undefined;
        }
        
        if (this.updateTimer) {
            this.updateTimer.destroy();
            this.updateTimer = undefined;
        }
        
        this.followTarget = undefined;
    }

    private startFollowing() {
        if (!this.followTarget || !this.container) return;
        
        this.updateTimer = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                if (this.followTarget && this.container) {
                    const targetX = this.followTarget.x;
                    const targetY = this.followTarget.y - 60;
                    const currentX = this.container.x;
                    const currentY = this.container.y;
                    
                    const lerpFactor = 0.3;
                    const newX = currentX + (targetX - currentX) * lerpFactor;
                    const newY = currentY + (targetY - currentY) * lerpFactor;
                    
                    this.container.setPosition(newX, newY);
                }
            },
            callbackScope: this,
            loop: true
        });
    }
    
    destroy() {
        this.hide();
    }
}
