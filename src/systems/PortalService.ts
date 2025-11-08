export interface Portal {
    id: string;
    x: number;
    y: number;
    targetScene: string;
    targetPortalId: string;
}

export interface SpawnPoint {
    id: string;
    x: number;
    y: number;
    isDefault?: boolean;
}

export class PortalService {
    private scene: Phaser.Scene;
    private portals: Portal[] = [];
    private spawnPoints: SpawnPoint[] = [];
    private lastTriggeredPortal: string = "";
    private triggerCooldown: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    addPortal(portal: Portal): void {
        this.portals.push(portal);
        console.log(`🚪 Added portal: ${portal.id} -> ${portal.targetScene}:${portal.targetPortalId}`);
    }

    addSpawnPoint(spawn: SpawnPoint): void {
        this.spawnPoints.push(spawn);
        console.log(`📍 Added spawn point: ${spawn.id} ${spawn.isDefault ? '(default)' : ''}`);
    }

    getPortals(): Portal[] {
        return [...this.portals];
    }

    getSpawnPoints(): SpawnPoint[] {
        return [...this.spawnPoints];
    }

    getSpawnPoint(id: string): SpawnPoint | null {
        return this.spawnPoints.find(spawn => spawn.id === id) || null;
    }

    getDefaultSpawn(): SpawnPoint | null {
        return this.spawnPoints.find(spawn => spawn.isDefault) || this.spawnPoints[0] || null;
    }

    checkPortalTriggers(playerX: number, playerY: number): void {
        if (this.triggerCooldown > 0) {
            this.triggerCooldown -= this.scene.game.loop.delta;
            return;
        }

        for (const portal of this.portals) {
            const distance = Phaser.Math.Distance.Between(playerX, playerY, portal.x, portal.y);
            
            if (distance < 48 && this.lastTriggeredPortal !== portal.id) {
                console.log(`🚪 PORTAL TRIGGER: ${portal.id} -> ${portal.targetScene}:${portal.targetPortalId}`);
                this.lastTriggeredPortal = portal.id;
                this.triggerCooldown = 2000; // 2 second cooldown
                this.enterPortal(portal).catch(console.error);
                return;
            }
        }

        // Reset trigger if player moves away from all portals
        const nearAnyPortal = this.portals.some(portal => {
            const distance = Phaser.Math.Distance.Between(playerX, playerY, portal.x, portal.y);
            return distance < 60;
        });

        if (!nearAnyPortal) {
            this.lastTriggeredPortal = "";
        }
    }

    private async enterPortal(portal: Portal): Promise<void> {
        console.log(`Entering portal ${portal.id} -> ${portal.targetScene}`);
        
        // Store portal transition data
        this.scene.registry.set('portalTransition', {
            targetScene: portal.targetScene,
            targetPortalId: portal.targetPortalId,
            sourceScene: this.scene.scene.key,
            sourcePortalId: portal.id
        });
        
        // Properly shutdown the current scene before starting new one
        if (this.scene.shutdown) {
            this.scene.shutdown();
        }
        
        // Small delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 50));
        
        this.scene.scene.start(portal.targetScene);
    }

    handlePortalEntry(): SpawnPoint | null {
        const transition = this.scene.registry.get('portalTransition');
        if (!transition) {
            return this.getDefaultSpawn();
        }

        // Clear the transition data
        this.scene.registry.remove('portalTransition');

        // Find the target spawn point
        const targetSpawn = this.getSpawnPoint(transition.targetPortalId);
        if (targetSpawn) {
            console.log(`📍 Spawning at portal spawn: ${targetSpawn.id}`);
            return targetSpawn;
        }

        console.warn(`⚠️ Target spawn point not found: ${transition.targetPortalId}, using default`);
        return this.getDefaultSpawn();
    }

    clear(): void {
        this.portals = [];
        this.spawnPoints = [];
        this.lastTriggeredPortal = "";
        this.triggerCooldown = 0;
    }

    destroy(): void {
        this.clear();
    }
}