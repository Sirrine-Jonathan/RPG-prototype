import { Scene } from 'phaser';
import { BasicNPC } from '../entities/BasicNPC';

export class IdleBehaviorTestScene extends Scene {
    private npcs: BasicNPC[] = [];
    private behaviors = ['patrol', 'read', 'organize', 'rest'];

    constructor() {
        super({ key: 'IdleBehaviorTestScene' });
    }

    create() {
        this.add.text(400, 30, 'Idle Behavior Test', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(400, 60, 'NPCs perform autonomous actions when not interacting', {
            fontSize: '14px',
            color: '#bdc3c7'
        }).setOrigin(0.5);

        // Create NPCs
        const npcData = [
            { x: 200, y: 200, name: 'Guard', personality: 'vigilant' },
            { x: 400, y: 200, name: 'Clerk', personality: 'organized' },
            { x: 600, y: 200, name: 'Officer', personality: 'dutiful' }
        ];

        npcData.forEach(data => {
            const npc = new BasicNPC(this, data.x, data.y, data.name, data.personality);
            this.npcs.push(npc);
        });

        // Start idle behaviors
        this.time.addEvent({
            delay: 2000,
            callback: this.triggerIdleBehavior,
            callbackScope: this,
            loop: true
        });
    }

    private triggerIdleBehavior() {
        this.npcs.forEach(npc => {
            const behavior = Phaser.Utils.Array.GetRandom(this.behaviors);
            this.showBehavior(npc, behavior);
        });
    }

    private showBehavior(npc: BasicNPC, behavior: string) {
        const text = this.add.text(npc.sprite.x, npc.sprite.y - 40, behavior, {
            fontSize: '10px',
            color: '#00ff88'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            alpha: 0,
            duration: 1500,
            onComplete: () => text.destroy()
        });
    }
}