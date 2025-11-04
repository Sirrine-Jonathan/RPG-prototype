import { Scene } from 'phaser';
import { BasicNPC } from '../entities/BasicNPC';

export class PlayerMechanicsTestScene extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private npcs: BasicNPC[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactionRange = 50;

    constructor() {
        super({ key: 'PlayerMechanicsTestScene' });
    }

    create() {
        this.add.text(400, 30, 'Player Mechanics Test', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Create player
        this.player = this.add.rectangle(100, 300, 16, 16, 0x00ff00);
        this.player.setStrokeStyle(2, 0xffffff);

        // Create NPCs
        const npc1 = new BasicNPC(this, 300, 200, 'Merchant', 'friendly');
        const npc2 = new BasicNPC(this, 500, 350, 'Guard', 'stern');
        this.npcs.push(npc1, npc2);

        // Create objects
        this.add.rectangle(200, 400, 40, 40, 0x8b4513);
        this.add.text(200, 440, 'Crate', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);

        // Setup controls
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        this.add.text(10, 550, 'Arrow keys: Move | Space: Interact', {
            fontSize: '14px',
            color: '#bdc3c7'
        });

        // Interaction key
        this.input.keyboard!.on('keydown-SPACE', this.handleInteraction, this);
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

        // Update NPC interaction highlights
        this.updateInteractionHighlights();
    }

    private updateInteractionHighlights() {
        this.npcs.forEach(npc => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                npc.sprite.x, npc.sprite.y
            );
            
            if (distance < this.interactionRange) {
                npc.sprite.setTint(0xffff88);
            } else {
                npc.sprite.clearTint();
            }
        });
    }

    private handleInteraction() {
        const nearbyNPC = this.npcs.find(npc => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                npc.sprite.x, npc.sprite.y
            );
            return distance < this.interactionRange;
        });

        if (nearbyNPC) {
            console.log(`Interacting with ${nearbyNPC.name}`);
            // Show interaction feedback
            this.add.text(nearbyNPC.sprite.x, nearbyNPC.sprite.y - 40, 'Hello!', {
                fontSize: '12px',
                color: '#ffff00'
            }).setOrigin(0.5);
        }
    }
}