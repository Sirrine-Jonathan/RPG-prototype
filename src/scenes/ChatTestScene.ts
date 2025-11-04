import { Scene } from 'phaser';
import { BasicNPC } from '../entities/BasicNPC';
import { ChatInterface } from '../ui/ChatInterface';
import { ProximityService } from '../services/ProximityService';

export class ChatTestScene extends Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private npcs: BasicNPC[] = [];
    private chatInterface!: ChatInterface;
    private proximityService!: ProximityService;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super({ key: 'ChatTestScene' });
    }

    create() {
        // Create player
        this.player = this.add.rectangle(400, 300, 16, 16, 0x00ff00);
        this.player.setStrokeStyle(2, 0xffffff);

        // Create NPCs
        const npc1 = new BasicNPC(this, 200, 200, 'Merchant', 'friendly', 0x8b4513);
        const npc2 = new BasicNPC(this, 600, 400, 'Guard', 'stern', 0x666666);
        this.npcs.push(npc1, npc2);

        // Initialize services
        this.proximityService = new ProximityService();
        this.npcs.forEach(npc => this.proximityService.addNPC(npc));

        // Create chat interface
        this.chatInterface = new ChatInterface(this);

        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Instructions
        this.add.text(10, 10, 'Use arrow keys to move. Get close to NPCs to chat.', {
            fontSize: '14px',
            color: '#ffffff'
        });
    }

    update() {
        // Move player
        const speed = 3;
        if (this.cursors.left.isDown) this.player.x -= speed;
        if (this.cursors.right.isDown) this.player.x += speed;
        if (this.cursors.up.isDown) this.player.y -= speed;
        if (this.cursors.down.isDown) this.player.y += speed;

        // Update proximity service
        this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
        const nearestNPC = this.proximityService.getNearestNPC();
        this.chatInterface.updateNearbyNPC(nearestNPC);
    }

    destroy() {
        this.chatInterface.destroy();
        super.destroy();
    }
}