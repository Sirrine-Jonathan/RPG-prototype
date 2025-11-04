import { Scene } from 'phaser';
import { BasicNPC } from '../entities/BasicNPC';
import { SpeechBubble } from '../ui/SpeechBubble';
import { NPCIndicator } from '../ui/NPCIndicator';

export class ConversationTestScene extends Scene {
    private npcs: BasicNPC[] = [];
    private indicators: NPCIndicator[] = [];
    private speechBubble!: SpeechBubble;
    private selectedNPC?: BasicNPC;

    constructor() {
        super({ key: 'ConversationTestScene' });
    }

    create() {
        this.add.text(400, 30, 'Conversation System Test', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(400, 60, 'Click NPCs to start conversation', {
            fontSize: '14px',
            color: '#bdc3c7'
        }).setOrigin(0.5);

        this.createNPCs();
        this.speechBubble = new SpeechBubble(this);
    }

    private createNPCs() {
        const npcData = [
            { x: 200, y: 200, name: 'Sheriff', personality: 'stern, protective' },
            { x: 400, y: 200, name: 'Deputy', personality: 'helpful, eager' },
            { x: 600, y: 200, name: 'Doctor', personality: 'professional, worried' }
        ];

        npcData.forEach((data, index) => {
            const npc = new BasicNPC(this, data.x, data.y, data.name, data.personality);
            npc.sprite.setInteractive();
            npc.sprite.on('pointerdown', () => this.selectNPC(npc));
            this.npcs.push(npc);

            const indicator = new NPCIndicator(this, data.x, data.y - 40);
            indicator.setMode(index % 2 === 0 ? 'ai' : 'template');
            this.indicators.push(indicator);
        });
    }

    private selectNPC(npc: BasicNPC) {
        this.selectedNPC = npc;
        
        // Highlight selected NPC
        this.npcs.forEach(n => n.sprite.setStrokeStyle(0));
        npc.sprite.setStrokeStyle(3, 0xffff00);
        
        // Show greeting
        this.speechBubble.show(npc.sprite.x, npc.sprite.y - 60, 
            `Hello! I'm ${npc.name}. What can I help you with?`, npc.name);
    }
}