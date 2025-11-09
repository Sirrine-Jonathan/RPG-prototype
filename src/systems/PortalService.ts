import { Debug } from "../utils/Debug";

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
    private debugGraphics: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        
        // Create debug graphics if debug is enabled
        if (Debug.enabled) {
            this.debugGraphics = scene.add.graphics();
            this.debugGraphics.setDepth(1000); // Show on top
        }
    }

    addPortal(portal: Portal): void {
        this.portals.push(portal);
        console.log(`🚪 Added portal: ${portal.id} -> ${portal.targetScene}:${portal.targetPortalId} at (${portal.x}, ${portal.y})`);
        
        // Add debug visualization
        if (this.debugGraphics) {
            this.debugGraphics.lineStyle(3, 0x00ff00, 0.8);
            this.debugGraphics.strokeRect(portal.x - 24, portal.y - 24, 48, 48);
            this.debugGraphics.fillStyle(0x00ff00, 0.3);
            this.debugGraphics.fillRect(portal.x - 24, portal.y - 24, 48, 48);
            
            // Add portal ID text
            this.scene.add.text(portal.x, portal.y - 40, portal.id, {
                fontSize: '12px',
                color: '#00ff00',
                backgroundColor: '#000000aa',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(1001);
        }
    }

    addSpawnPoint(spawn: SpawnPoint): void {
        this.spawnPoints.push(spawn);
        console.log(`📍 Added spawn point: ${spawn.id} at (${spawn.x}, ${spawn.y}) ${spawn.isDefault ? '(default)' : ''}`);
        
        // Add debug visualization for spawn points
        if (this.debugGraphics) {
            this.debugGraphics.lineStyle(3, 0x0088ff, 0.8);
            this.debugGraphics.strokeCircle(spawn.x, spawn.y, 20);
            this.debugGraphics.fillStyle(0x0088ff, 0.3);
            this.debugGraphics.fillCircle(spawn.x, spawn.y, 20);
            
            // Add spawn ID text
            this.scene.add.text(spawn.x, spawn.y + 30, spawn.id, {
                fontSize: '10px',
                color: '#0088ff',
                backgroundColor: '#000000aa',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(1001);
        }
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
        
        // Check if we're using new architecture
        const gameManager = (globalThis as any).gameManager;
        if (gameManager) {
            // Use new architecture scene transition
            await gameManager.sceneTransitionManager.switchScene({
                sourceScene: this.scene.scene.key,
                targetScene: portal.targetScene,
                sourcePortalId: portal.id,
                targetPortalId: portal.targetPortalId
            }, this.scene);
        } else {
            // Fallback to old system
            this.scene.registry.set('portalTransition', {
                targetScene: portal.targetScene,
                targetPortalId: portal.targetPortalId,
                sourceScene: this.scene.scene.key,
                sourcePortalId: portal.id
            });
            
            if (this.scene.shutdown) {
                this.scene.shutdown();
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            this.scene.scene.start(portal.targetScene);
        }
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