import { SmartNPC } from '../entities/SmartNPC';

export class ProximityService {
    private npcs: SmartNPC[] = [];
    private playerX: number = 0;
    private playerY: number = 0;
    private range: number = 60;

    addNPC(npc: SmartNPC) {
        this.npcs.push(npc);
    }

    removeNPC(npc: SmartNPC) {
        const index = this.npcs.indexOf(npc);
        if (index > -1) {
            this.npcs.splice(index, 1);
        }
    }

    updatePlayerPosition(x: number, y: number) {
        this.playerX = x;
        this.playerY = y;
    }

    getNearestNPC(): SmartNPC | null {
        let nearest: SmartNPC | null = null;
        let shortestDistance = Infinity;

        for (const npc of this.npcs) {
            const distance = Phaser.Math.Distance.Between(
                npc.sprite.x, npc.sprite.y,
                this.playerX, this.playerY
            );
            
            if (distance < this.range && distance < shortestDistance) {
                shortestDistance = distance;
                nearest = npc;
            }
        }

        return nearest;
    }

    setRange(range: number) {
        this.range = range;
    }
}