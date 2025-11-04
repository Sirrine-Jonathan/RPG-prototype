import { Scene } from 'phaser';
import { BasicNPC } from '../entities/BasicNPC';

export class ToolSystemTestScene extends Scene {
    private npc!: BasicNPC;
    private tools: string[] = ['Hide Evidence', 'Move Object', 'Create Distraction'];
    private currentTool = 0;

    constructor() {
        super({ key: 'ToolSystemTestScene' });
    }

    create() {
        this.add.text(400, 30, 'Tool System Test', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(400, 60, 'NPC autonomously uses tools to modify environment', {
            fontSize: '14px',
            color: '#bdc3c7'
        }).setOrigin(0.5);

        // Create NPC
        this.npc = new BasicNPC(this, 400, 200, 'Tool NPC', 'autonomous, helpful');
        
        // Create objects to manipulate
        this.add.rectangle(200, 300, 40, 40, 0x8b4513);
        this.add.text(200, 340, 'Evidence', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        
        this.add.rectangle(600, 300, 60, 40, 0x666666);
        this.add.text(600, 340, 'Box', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);

        // Tool demonstration
        this.time.addEvent({
            delay: 3000,
            callback: this.demonstrateTool,
            callbackScope: this,
            loop: true
        });

        this.add.text(10, 450, 'Tools: Hide Evidence, Move Object, Create Distraction', {
            fontSize: '12px',
            color: '#bdc3c7'
        });
    }

    private demonstrateTool() {
        const tool = this.tools[this.currentTool];
        console.log(`NPC using tool: ${tool}`);
        
        // Visual feedback
        this.add.text(this.npc.sprite.x, this.npc.sprite.y - 60, tool, {
            fontSize: '10px',
            color: '#ffff00'
        }).setOrigin(0.5).setAlpha(1);

        this.currentTool = (this.currentTool + 1) % this.tools.length;
    }

    forceTool(toolName: string) {
        console.log(`Forcing tool: ${toolName}`);
    }

    toggleAutoMode() {
        console.log('Toggling auto mode');
    }
}