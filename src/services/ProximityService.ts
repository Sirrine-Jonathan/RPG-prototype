import { PersistentNPC } from '../entities/PersistentNPC';
import { Logger } from '../utils/Logger';

export class ProximityService {
    private npcs: PersistentNPC[] = [];
    private playerX: number = 0;
    private playerY: number = 0;
    private range: number = 96; // 2 tiles at 48px per tile
    private scene: Phaser.Scene;
    private proximityStates: Map<string, boolean> = new Map();
    private logger = Logger.getInstance();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    addNPC(npc: PersistentNPC) {
        this.npcs.push(npc);
    }

    removeNPC(npc: PersistentNPC) {
        const index = this.npcs.indexOf(npc);
        if (index > -1) {
            this.npcs.splice(index, 1);
        }
    }

    updatePlayerPosition(x: number, y: number) {
        this.playerX = x;
        this.playerY = y;
        this.checkProximityChanges();
    }

    private checkProximityChanges() {
        this.npcs.forEach(npc => {
            const distance = Phaser.Math.Distance.Between(
                npc.sprite.x, npc.sprite.y,
                this.playerX, this.playerY
            );
            
            const isNearby = distance < this.range;
            const wasNearby = this.proximityStates.get(npc.id) || false;
            
            if (!wasNearby && isNearby) {
                console.log(`[PROMPT] [EVENT] ${npc.name}: Player entered proximity`);
                this.scene.events.emit('npc-proximity-enter', {
                    npc: npc,
                    distance: Math.round(distance)
                });
            } else if (wasNearby && !isNearby) {
                this.scene.events.emit('npc-proximity-exit', {
                    npc: npc,
                    distance: Math.round(distance)
                });
            }
            
            this.proximityStates.set(npc.id, isNearby);
        });
    }

    getNearbyNPCs(): PersistentNPC[] {
        const nearby: PersistentNPC[] = [];

        for (const npc of this.npcs) {
            const distance = Phaser.Math.Distance.Between(
                npc.sprite.x, npc.sprite.y,
                this.playerX, this.playerY
            );
            
            if (distance < this.range) {
                nearby.push(npc);
            }
        }

        return nearby;
    }

    getNearbyCharacters(x: number, y: number, range?: number): PersistentNPC[] {
        const checkRange = range || this.range;
        const nearby: PersistentNPC[] = [];

        for (const npc of this.npcs) {
            const distance = Phaser.Math.Distance.Between(
                npc.sprite.x, npc.sprite.y,
                x, y
            );
            
            if (distance < checkRange) {
                nearby.push(npc);
            }
        }

        return nearby;
    }

    getNearestNPC(): PersistentNPC | null {
        const nearby = this.getNearbyNPCs();
        if (nearby.length === 0) return null;

        let nearest: PersistentNPC | null = null;
        let shortestDistance = Infinity;

        for (const npc of nearby) {
            const distance = Phaser.Math.Distance.Between(
                npc.sprite.x, npc.sprite.y,
                this.playerX, this.playerY
            );
            
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearest = npc;
            }
        }

        return nearest;
    }

    setRange(range: number) {
        this.range = range;
    }

    getRange(): number {
        return this.range;
    }

    getAllNPCs(): PersistentNPC[] {
        return this.npcs;
    }
}