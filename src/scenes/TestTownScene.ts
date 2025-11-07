import { GameplayScene } from './GameplayScene';
import { LevelLoader } from '../systems/LevelLoader';
import { SmartNPC } from '../entities/SmartNPC';

export class TestTownScene extends GameplayScene {
    private levelLoader!: LevelLoader;
    private levelBounds = { width: 2400, height: 1824 }; // 50x38 * 48px

    constructor() {
        super({ key: 'TestTownScene' });
    }

    async create() {
        super.create();
        
        // Initialize level loader
        this.levelLoader = new LevelLoader(this);
        
        try {
            // Load the town level
            await this.levelLoader.loadLevel('town_overworld');
            
            // Get level data to set proper bounds
            const levelData = this.levelLoader.getLevelData();
            if (levelData) {
                this.levelBounds = {
                    width: levelData.width * levelData.tileSize,
                    height: levelData.height * levelData.tileSize
                };
                this.setGameAreaSize(this.levelBounds.width, this.levelBounds.height);
            }
            
            // Create player at spawn point
            const spawn = this.levelLoader.getPlayerSpawn();
            this.createPlayer(spawn?.x || 1200, spawn?.y || 896);
            
            // Create NPCs from level objects
            this.createNPCsFromLevel();
            
            // Set up room context for NPCs (now handled by base class)
            this.setupNPCRoomContext();
            
            // Add debug info
            this.add.text(10, 10, 'Test Town Scene (Level Editor)', { 
                fontSize: '18px', 
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }).setScrollFactor(0).setDepth(1000);
            
            this.add.text(10, 40, 'Press ESC: Main Menu, T: Switch to Original Town', { 
                fontSize: '14px', 
                color: '#cccccc',
                backgroundColor: '#000000',
                padding: { x: 5, y: 3 }
            }).setScrollFactor(0).setDepth(1000);
            
            // Add scene switching
            this.input.keyboard!.on('keydown-ESC', () => {
                this.scene.start('MainMenuScene');
            });
            
            this.input.keyboard!.on('keydown-T', () => {
                this.scene.start('TownOverworldScene');
            });
            
        } catch (error) {
            console.error('Failed to load town level:', error);
            this.add.text(400, 300, `Failed to load town level: ${error.message}`, { 
                fontSize: '18px', 
                color: '#ff0000' 
            }).setOrigin(0.5);
            
            // Create a basic fallback player
            this.createPlayer(400, 300);
        }
    }

    private createNPCsFromLevel() {
        const levelData = this.levelLoader.getLevelData();
        if (!levelData) return;

        // Create NPCs based on level objects
        levelData.layers.objects.forEach(obj => {
            if (obj.type === 'npc') {
                const worldX = obj.x * levelData.tileSize + levelData.tileSize / 2;
                const worldY = obj.y * levelData.tileSize + levelData.tileSize / 2;
                
                const npc = new SmartNPC(
                    this, 
                    worldX, 
                    worldY,
                    obj.properties?.character || 'alex',
                    obj.properties?.name || 'NPC',
                    obj.properties?.description || 'A townsperson',
                    `You are ${obj.properties?.name || 'an NPC'} in the town.`,
                    obj.subtype
                );
                
                this.proximityService.addNPC(npc);
            }
        });
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
        return 'MainMenuScene'; 
    }
    
    protected getReturnPosition() { 
        return { x: 400, y: 300 }; 
    }

    update() {
        if (this.player) {
            super.update();
        }
    }

    destroy() {
        if (this.levelLoader) {
            this.levelLoader.destroy();
        }
        super.destroy();
    }
}
