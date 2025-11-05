import { Scene } from 'phaser';
import { BasicNPC } from '../entities/BasicNPC';

export class PoliceStationTestScene extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private npcs: BasicNPC[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super({ key: 'PoliceStationTestScene' });
    }

    create() {
        // Background
        this.add.rectangle(400, 300, 800, 600, 0x34495e);
        
        // Title
        this.add.text(400, 30, 'Police Station Environment', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Create player
        this.player = this.add.rectangle(100, 300, 16, 16, 0x00ff00);
        this.player.setStrokeStyle(2, 0xffffff);

        // Create NPCs
        const sheriff = new BasicNPC(this, 300, 200, 'Sheriff Martinez', 'stern, protective');
        const deputy = new BasicNPC(this, 500, 350, 'Deputy Collins', 'helpful, eager');
        this.npcs.push(sheriff, deputy);

        // Create environment objects
        this.add.rectangle(200, 150, 80, 60, 0x8b4513); // Desk
        this.add.text(200, 120, 'Desk', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        
        this.add.rectangle(600, 150, 60, 100, 0x666666); // Filing cabinet
        this.add.text(600, 100, 'Files', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);

        // Setup controls
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Add exit door
        const exitDoor = this.add.rectangle(50, 300, 20, 60, 0x8b4513);
        exitDoor.setInteractive();
        exitDoor.on('pointerdown', () => this.exitBuilding());
        
        this.add.text(10, 550, 'Use arrow keys to move, click door to exit', {
            fontSize: '14px',
            color: '#bdc3c7'
        });
    }

    update() {
        const speed = 3;
        if (this.cursors.left.isDown) this.player.x -= speed;
        if (this.cursors.right.isDown) this.player.x += speed;
        if (this.cursors.up.isDown) this.player.y -= speed;
        if (this.cursors.down.isDown) this.player.y += speed;

        // Keep player in bounds
        this.player.x = Phaser.Math.Clamp(this.player.x, 8, 792);
        this.player.y = Phaser.Math.Clamp(this.player.y, 8, 592);
    }
    
    private exitBuilding(): void {
        const returnScene = this.registry.get('returnScene') || 'TownOverworldScene';
        const returnPosition = this.registry.get('returnPosition') || { x: 1200, y: 900 };
        
        this.scene.start(returnScene, { playerPosition: returnPosition });
    }
}