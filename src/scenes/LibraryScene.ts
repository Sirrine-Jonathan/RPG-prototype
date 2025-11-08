import { GameplayScene } from './GameplayScene';
import { LevelLoader } from '../systems/LevelLoader';
import { SmartNPC } from '../entities/SmartNPC';
import { PortalService } from '../systems/PortalService';
import { Pathfinding } from '../utils/Pathfinding';

export class LibraryScene extends GameplayScene {
    private levelLoader!: LevelLoader;
    private portalService!: PortalService;
    private levelBounds = { width: 800, height: 600 }; // Default size

    constructor() {
        super({ key: 'LibraryScene' });
    }

    async create() {
        super.create();
        
        // Initialize services
        this.levelLoader = new LevelLoader(this);
        this.portalService = new PortalService(this);
        
        try {
            // Try to load library level, fallback to creating basic scene
            await this.loadLibraryLevel();
        } catch (error) {
            console.warn('No library level found, creating basic scene:', error);
            this.createBasicLibrary();
        }
        
        // Set up portals and spawns
        this.setupPortalsAndSpawns();
        
        // Create player at appropriate spawn point
        const spawn = this.portalService.handlePortalEntry();
        console.log(`📚 Library: Creating player at spawn:`, spawn);
        this.createPlayer(spawn?.x || 400, spawn?.y || 500);
        console.log(`📚 Library: Player created at (${this.player?.x}, ${this.player?.y})`);
        console.log(`📚 Library: Player exists:`, !!this.player);
        console.log(`📚 Library: Input enabled:`, this.input?.enabled);
        console.log(`📚 Library: Pathfinding initialized:`, !!this.pathfinding);
        console.log(`📚 Library: Scene dimensions:`, this.getSceneWidth(), 'x', this.getSceneHeight());
        
        // Temporary fix: Create new pathfinding without collision data for library
        console.log(`📚 Creating clean pathfinding for library`);
        this.pathfinding = new Pathfinding(30, this.getSceneWidth(), this.getSceneHeight());
        
        // Create NPCs
        this.createLibraryNPCs();
        
        // Set up room context for NPCs
        this.setupNPCRoomContext();
        
        // Add debug info
        this.add.text(10, 10, 'Library Scene (Portal System)', { 
            fontSize: '18px', 
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(1000);
    }

    private async loadLibraryLevel() {
        console.log('📚 Loading library_interior level...');
        await this.levelLoader.loadLevel('library_interior');
        
        const levelData = this.levelLoader.getLevelData();
        console.log('📚 Level data:', levelData);
        if (levelData) {
            this.levelBounds = {
                width: levelData.width * levelData.tileSize,
                height: levelData.height * levelData.tileSize
            };
            console.log('📚 Setting game area size:', this.levelBounds);
            this.setGameAreaSize(this.levelBounds.width, this.levelBounds.height);
        }
    }

    private createBasicLibrary() {
        // Set up game area size for movement
        this.setGameAreaSize(this.levelBounds.width, this.levelBounds.height);
        
        // Create a simple library background
        this.add.rectangle(400, 300, 800, 600, 0xF5F5DC);
        
        // Bookshelves
        this.add.rectangle(150, 200, 80, 300, 0x8B4513);
        this.add.text(150, 100, 'History Section', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
        
        this.add.rectangle(400, 200, 80, 300, 0x8B4513);
        this.add.text(400, 100, 'Ancient Texts', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
        
        this.add.rectangle(650, 200, 80, 300, 0x8B4513);
        this.add.text(650, 100, 'Local Records', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
        
        // Reading area
        this.add.rectangle(400, 450, 200, 80, 0xDEB887);
        this.add.text(400, 410, 'Reading Area', { fontSize: '14px', color: '#000' }).setOrigin(0.5);
        
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
                        targetPortalId: obj.properties?.targetPortalId || 'library_return'
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
                id: 'library_exit',
                x: 400,
                y: 580,
                targetScene: 'TownScene',
                targetPortalId: 'library_return'
            });
            
            this.portalService.addSpawnPoint({
                id: 'library_town',
                x: 400,
                y: 500,
                isDefault: true
            });
        }

        console.log(`📚 Library portal system initialized with ${this.portalService.getPortals().length} portals and ${this.portalService.getSpawnPoints().length} spawn points`);
    }

    private createLibraryNPCs() {
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
                        obj.properties?.character || 'amelia',
                        obj.properties?.name || 'Librarian',
                        obj.properties?.description || 'A knowledgeable librarian',
                        `You are ${obj.properties?.name || 'a librarian'} in the library.`,
                        obj.subtype
                    );
                    
                    this.proximityService.addNPC(npc);
                }
            });
        } else {
            // Create basic library NPCs for fallback scene
            const librarian = new SmartNPC(
                this, 
                400, 
                450,
                'amelia',
                'Eleanor Sage',
                'The town librarian and historian',
                'You are Eleanor Sage, the librarian who has researched the whispering stones extensively.',
                'scholar'
            );
            
            this.proximityService.addNPC(librarian);
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
        return { x: 200, y: 950 }; 
    }

    update() {
        if (this.player) {
            // Debug: Check if any movement keys are pressed
            const cursors = this.input.keyboard?.createCursorKeys();
            if (cursors && (cursors.left?.isDown || cursors.right?.isDown || cursors.up?.isDown || cursors.down?.isDown)) {
                console.log('📚 Movement key pressed, player at:', this.player.x, this.player.y);
            }
            
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