import { Scene } from 'phaser';

export class SpeechBubble {
    private scene: Scene;
    private container?: Phaser.GameObjects.Container;
    private background?: Phaser.GameObjects.Rectangle;
    private speakerText?: Phaser.GameObjects.Text;
    private messageText?: Phaser.GameObjects.Text;
    private closeButton?: Phaser.GameObjects.Text;
    private followTarget?: Phaser.GameObjects.Sprite;
    private updateTimer?: Phaser.Time.TimerEvent;
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    show(x: number, y: number, message: string, speaker: string = 'NPC', autoHide: boolean = false, followTarget?: Phaser.GameObjects.Sprite) {
        if (!message) {
            console.warn(`🎈 SpeechBubble.show: Empty message for ${speaker}, skipping`);
            return;
        }
        console.log(`🎈 SpeechBubble.show called for ${speaker} with message: "${message}" (length: ${message.length})`);
        
        // Clean up existing bubble
        this.hide();
        
        // Store follow target
        this.followTarget = followTarget;
        
        // Create container for the bubble
        this.container = this.scene.add.container(x, y - 60).setDepth(1000);
        
        // Start following if we have a target (set position immediately to avoid jump)
        if (this.followTarget) {
            this.container.setPosition(this.followTarget.x, this.followTarget.y - 60);
            this.startFollowing();
        }
        
        // Create speaker name text (only if not player)
        if (speaker !== 'Player') {
            this.speakerText = this.scene.add.text(0, -15, speaker, {
                fontSize: '12px',
                color: '#666666',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }
        
        // Create message text
        this.messageText = this.scene.add.text(0, 0, message, {
            fontSize: '14px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 12, y: 8 },
            wordWrap: { width: 280 },
            align: 'center',
            stroke: '#cccccc',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Create close button (X)
        this.closeButton = this.scene.add.text(
            this.messageText.width / 2 - 8, 
            -this.messageText.height / 2 + 8, 
            '×', 
            {
                fontSize: '16px',
                color: '#999999',
                backgroundColor: '#ffffff',
                padding: { x: 4, y: 2 }
            }
        ).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.hide())
        .on('pointerover', () => this.closeButton!.setStyle({ color: '#ff0000' }))
        .on('pointerout', () => this.closeButton!.setStyle({ color: '#999999' }));
        
        // Add all elements to container
        const elementsToAdd = [this.messageText, this.closeButton];
        if (this.speakerText) {
            elementsToAdd.unshift(this.speakerText);
        }
        this.container.add(elementsToAdd);
        
        // Auto-hide only if requested
        if (autoHide) {
            this.scene.time.delayedCall(6000, () => this.hide()); // Increased from 3000 to 6000ms
        }
    }
    
    hide() {
        if (this.container) {
            this.container.destroy();
            this.container = undefined;
            this.speakerText = undefined;
            this.messageText = undefined;
            this.closeButton = undefined;
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
            delay: 16, // Update every 16ms (~60fps)
            callback: () => {
                if (this.followTarget && this.container) {
                    // Smooth interpolation instead of direct positioning
                    const targetX = this.followTarget.x;
                    const targetY = this.followTarget.y - 60;
                    const currentX = this.container.x;
                    const currentY = this.container.y;
                    
                    // Lerp to smooth movement
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