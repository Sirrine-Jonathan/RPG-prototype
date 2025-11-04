import { Scene } from 'phaser';

export class NPCIndicator {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private icon: Phaser.GameObjects.Graphics;
    private mode: 'ai' | 'template' = 'ai';

    constructor(scene: Scene, x: number, y: number) {
        this.scene = scene;
        this.container = scene.add.container(x, y);
        
        this.background = scene.add.graphics();
        this.icon = scene.add.graphics();
        
        this.container.add([this.background, this.icon]);
        this.container.setSize(24, 24);
        
        this.updateVisuals();
    }

    setMode(mode: 'ai' | 'template') {
        this.mode = mode;
        this.updateVisuals();
    }

    private updateVisuals() {
        this.background.clear();
        this.icon.clear();

        if (this.mode === 'ai') {
            // AI mode - green brain icon
            this.background.fillStyle(0x00ff88, 0.8);
            this.background.fillCircle(0, 0, 12);
            
            this.icon.lineStyle(2, 0x000000);
            // Simple brain shape
            this.icon.strokeCircle(-3, -2, 4);
            this.icon.strokeCircle(3, -2, 4);
            this.icon.strokePath();
        } else {
            // Template mode - orange document icon
            this.background.fillStyle(0xffa500, 0.8);
            this.background.fillRoundedRect(-8, -10, 16, 20, 2);
            
            this.icon.lineStyle(1, 0x000000);
            // Document lines
            this.icon.strokeRect(-6, -6, 12, 2);
            this.icon.strokeRect(-6, -2, 8, 2);
            this.icon.strokeRect(-6, 2, 10, 2);
        }
    }

    destroy() {
        this.container.destroy();
    }
}