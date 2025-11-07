import { GameplayScene } from './GameplayScene';
import { LevelLoader } from '../systems/LevelLoader';

export class LevelTestScene extends GameplayScene {
    private levelLoader!: LevelLoader;
    private currentLevel = 'test_room';
    private levelBounds = { width: 800, height: 600 };

    constructor() {
        super({ key: 'LevelTestScene' });
    }

    async create() {
        super.create();
        
        // Initialize level loader
        this.levelLoader = new LevelLoader(this);
        
        try {
            console.log('Loading level:', this.currentLevel);
            
            // Load the test level
            await this.levelLoader.loadLevel(this.currentLevel);
            
            console.log('Level loaded successfully');
            
            // Get level data to set proper bounds
            const levelData = this.levelLoader.getLevelData();
            if (levelData) {
                console.log('Level data:', levelData.width, 'x', levelData.height);
                this.levelBounds = {
                    width: levelData.width * levelData.tileSize,
                    height: levelData.height * levelData.tileSize
                };
                this.setGameAreaSize(this.levelBounds.width, this.levelBounds.height);
            }
            
            // Create player at spawn point or default position
            const spawn = this.levelLoader.getPlayerSpawn();
            console.log('Player spawn:', spawn);
            this.createPlayer(spawn?.x || 200, spawn?.y || 200);
            
            // Add level switching controls
            this.addLevelControls();
            
            // Add instructions
            this.add.text(10, 10, 'Level Test Scene', { 
                fontSize: '24px', 
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }).setScrollFactor(0).setDepth(1000);
            
            this.add.text(10, 50, 'Controls: WASD/Arrows to move, Click to pathfind', { 
                fontSize: '14px', 
                color: '#cccccc',
                backgroundColor: '#000000',
                padding: { x: 5, y: 3 }
            }).setScrollFactor(0).setDepth(1000);
            
            this.add.text(10, 75, 'Mouse wheel: Zoom, Right-click drag: Pan', { 
                fontSize: '14px', 
                color: '#cccccc',
                backgroundColor: '#000000',
                padding: { x: 5, y: 3 }
            }).setScrollFactor(0).setDepth(1000);
            
            this.add.text(10, 100, 'Press 1: test_room, 2: town_square, ESC: Main Menu', { 
                fontSize: '14px', 
                color: '#cccccc',
                backgroundColor: '#000000',
                padding: { x: 5, y: 3 }
            }).setScrollFactor(0).setDepth(1000);
            
        } catch (error) {
            console.error('Failed to load level:', error);
            this.add.text(400, 300, `Failed to load level: ${error.message}`, { 
                fontSize: '18px', 
                color: '#ff0000' 
            }).setOrigin(0.5);
            
            // Create a basic fallback player
            this.createPlayer(400, 300);
        }
    }

    private addLevelControls() {
        // Level switching
        this.input.keyboard!.on('keydown-ONE', () => this.switchLevel('test_room'));
        this.input.keyboard!.on('keydown-TWO', () => this.switchLevel('town_square'));
        
        // Add escape to main menu
        this.input.keyboard!.on('keydown-ESC', () => {
            this.scene.start('MainMenuScene');
        });
    }

    private async switchLevel(levelId: string) {
        try {
            this.currentLevel = levelId;
            
            // Destroy current level
            this.levelLoader.destroy();
            
            // Load new level
            await this.levelLoader.loadLevel(levelId);
            
            // Update bounds
            const levelData = this.levelLoader.getLevelData();
            if (levelData) {
                this.levelBounds = {
                    width: levelData.width * levelData.tileSize,
                    height: levelData.height * levelData.tileSize
                };
                this.setGameAreaSize(this.levelBounds.width, this.levelBounds.height);
            }
            
            // Reposition player at spawn point
            const spawn = this.levelLoader.getPlayerSpawn();
            if (spawn && this.player) {
                this.player.setPosition(spawn.x, spawn.y);
                this.cameras.main.centerOn(spawn.x, spawn.y);
            }
            
        } catch (error) {
            console.error('Failed to switch level:', error);
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
        return 'MainMenuScene'; 
    }
    
    protected getReturnPosition() { 
        return { x: 400, y: 300 }; 
    }

    update() {
        if (this.player) {
            super.update();
        }
        // Level-specific updates can go here
    }

    destroy() {
        if (this.levelLoader) {
            this.levelLoader.destroy();
        }
        super.destroy();
    }
}
