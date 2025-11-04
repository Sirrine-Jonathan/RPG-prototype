import { Scene } from 'phaser';

export class BasicNPC {
    public sprite: Phaser.GameObjects.Rectangle;
    public nameText: Phaser.GameObjects.Text;
    public scene: Scene;
    public name: string;
    public personality: string;
    
    constructor(scene: Scene, x: number, y: number, name: string, personality: string, color: number = 0x8b4513) {
        this.scene = scene;
        this.name = name;
        this.personality = personality;
        
        // Create NPC sprite
        this.sprite = scene.add.rectangle(x, y, 20, 20, color);
        this.sprite.setStrokeStyle(2, 0xffffff);
        
        // Create name text
        this.nameText = scene.add.text(x, y - 25, name, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
    }
    
    isNearPlayer(playerX: number, playerY: number, range: number = 60): boolean {
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            playerX, playerY
        );
        return distance < range;
    }
    
    interact() {
        console.log(`Talking to ${this.name}...`);
        // This will be handled by the conversation system
        return {
            name: this.name,
            personality: this.personality
        };
    }
    
    destroy() {
        this.sprite.destroy();
        this.nameText.destroy();
    }
}