import { GameplayScene } from './GameplayScene';
import { LevelLoader } from '../systems/LevelLoader';
import { SmartNPC } from '../entities/SmartNPC';
import { PortalService } from '../systems/PortalService';

export class HospitalScene extends GameplayScene {
    private levelLoader!: LevelLoader;
    private portalService!: PortalService;
    private levelBounds = { width: 800, height: 600 }; // Default size

    constructor() {
        super({ key: 'HospitalScene' });
    }

    async create() {
        super.create();
        
        // Initialize services
        this.levelLoader = new LevelLoader(this);
        this.portalService = new PortalService(this);
        
        try {
            // Try to load hospital level, fallback to creating basic scene
            await this.loadHospitalLevel();
            
        } catch (error) {
            console.warn('No hospital level found, creating basic scene:', error);
            this.createBasicHospital();
        }
        
        // Set up portals and spawns
        this.setupPortalsAndSpawns();
        
        // Create player at appropriate spawn point
        const spawn = this.portalService.handlePortalEntry();
        this.createPlayer(spawn?.x || 400, spawn?.y || 500);
        
        // Create NPCs
        this.createHospitalNPCs();
        
        // Set up room context for NPCs
        this.setupNPCRoomContext();
        
        // Add debug info
        this.add.text(10, 10, 'Hospital Scene (Portal System)', { 
            fontSize: '18px', 
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        this.add.text(10, 40, 'Walk to entrance to return to town', { 
            fontSize: '14px', 
            color: '#cccccc',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(1000);
    }

    private async loadHospitalLevel() {
        await this.levelLoader.loadLevel('hospital_interior');
        
        const levelData = this.levelLoader.getLevelData();
        if (levelData) {
            this.levelBounds = {
                width: levelData.width * levelData.tileSize,
                height: levelData.height * levelData.tileSize
            };
            this.setGameAreaSize(this.levelBounds.width, this.levelBounds.height);
        }
    }

    private createBasicHospital() {
        // Create a simple hospital background
        this.add.rectangle(400, 300, 800, 600, 0xf0f0f0);
        
        // Add some basic hospital elements
        this.add.rectangle(100, 100, 150, 80, 0xffffff).setStrokeStyle(2, 0x000000);
        this.add.text(100, 100, 'Reception', { fontSize: '14px', color: '#000000' }).setOrigin(0.5);
        
        this.add.rectangle(600, 200, 120, 60, 0xffffff).setStrokeStyle(2, 0x000000);
        this.add.text(600, 200, 'Room 1', { fontSize: '14px', color: '#000000' }).setOrigin(0.5);
        
        this.add.rectangle(600, 400, 120, 60, 0xffffff).setStrokeStyle(2, 0x000000);
        this.add.text(600, 400, 'Room 2', { fontSize: '14px', color: '#000000' }).setOrigin(0.5);
        
        // Set bounds for basic scene
        this.setGameAreaSize(800, 600);
    }

    private setupPortalsAndSpawns(): void {
        const levelData = this.levelLoader.getLevelData();
        
        if (levelData) {
            // Extract from level data
            levelData.layers.objects.forEach(obj => {
                const worldX = obj.x * levelData.tileSize + levelData.tileSize / 2;
                const worldY = obj.y * levelData.tileSize + levelData.tileSize / 2;
                
                if (obj.type === 'portal') {
                    this.portalService.addPortal({
                        id: obj.properties?.portalId || `portal_${obj.x}_${obj.y}`,
                        x: worldX,
                        y: worldY,
                        targetScene: obj.properties?.targetScene || 'TownScene',
                        targetPortalId: obj.properties?.targetPortalId || 'town_hospital'
                    });
                } else if (obj.type === 'spawn') {
                    this.portalService.addSpawnPoint({
                        id: obj.properties?.spawnId || `spawn_${obj.x}_${obj.y}`,
                        x: worldX,
                        y: worldY,
                        isDefault: obj.properties?.isDefault || obj.subtype === 'player'
                    });
                }
            });
        } else {
            // Create basic portals for fallback scene
            this.portalService.addPortal({
                id: 'hospital_exit',
                x: 400,
                y: 580,
                targetScene: 'TownScene',
                targetPortalId: 'town_hospital'
            });
            
            this.portalService.addSpawnPoint({
                id: 'hospital_entrance',
                x: 400,
                y: 500,
                isDefault: true
            });
        }

        console.log(`🏥 Hospital portal system initialized with ${this.portalService.getPortals().length} portals and ${this.portalService.getSpawnPoints().length} spawn points`);
    }

    private createHospitalNPCs() {
        const levelData = this.levelLoader.getLevelData();
        
        if (levelData) {
            // Create NPCs from level objects
            levelData.layers.objects.forEach(obj => {
                if (obj.type === 'npc') {
                    const worldX = obj.x * levelData.tileSize + levelData.tileSize / 2;
                    const worldY = obj.y * levelData.tileSize + levelData.tileSize / 2;
                    
                    const npc = new SmartNPC(
                        this, 
                        worldX, 
                        worldY,
                        obj.properties?.character || 'alex',
                        obj.properties?.name || 'Hospital Staff',
                        obj.properties?.description || 'A hospital worker',
                        `You are ${obj.properties?.name || 'a hospital worker'} in the hospital.`,
                        obj.subtype
                    );
                    
                    this.proximityService.addNPC(npc);
                }
            });
        } else {
            // Create basic hospital NPCs for fallback scene
            const doctor = new SmartNPC(
                this, 
                150, 
                200,
                'alex',
                'Dr. Smith',
                'The hospital doctor',
                'You are Dr. Smith, a friendly doctor at the hospital. You help patients and provide medical advice.',
                'doctor'
            );
            
            const nurse = new SmartNPC(
                this, 
                100, 
                150,
                'alex',
                'Nurse Johnson',
                'A helpful nurse',
                'You are Nurse Johnson, a caring nurse who assists patients and works with the doctor.',
                'nurse'
            );
            
            this.proximityService.addNPC(doctor);
            this.proximityService.addNPC(nurse);
        }
    }

    // GameplayScene abstract method implementations
    protected getSceneWidth(): number { 
        return this.levelBounds.width; 
    }
    
    protected getSceneHeight(): number { 
        return this.levelBounds.height; 
    }
    
    protected getPlayerBounds() {
        return { 
            minX: 16, 
            maxX: this.levelBounds.width - 16, 
            minY: 16, 
            maxY: this.levelBounds.height - 16 
        };
    }
    
    protected getExitPosition() { 
        return { x: this.levelBounds.width / 2, y: this.levelBounds.height - 50 }; 
    }
    
    protected getReturnScene() { 
        return 'TownScene'; 
    }
    
    protected getReturnPosition() { 
        return { x: 1200, y: 896 }; 
    }

    update() {
        if (this.player) {
            super.update();
            this.portalService.checkPortalTriggers(this.player.x, this.player.y);
        }
    }

    destroy() {
        if (this.levelLoader) {
            this.levelLoader.destroy();
        }
        if (this.portalService) {
            this.portalService.destroy();
        }
        super.destroy();
    }
}