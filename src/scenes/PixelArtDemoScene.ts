import { BaseScene } from './BaseScene';
import { SmartNPC } from '../entities/SmartNPC';
import { ProximityService } from '../services/ProximityService';
import { PixelArtRenderer } from '../systems/PixelArtRenderer';
import { AssetManager } from '../systems/AssetManager';

export class PixelArtDemoScene extends BaseScene {
    private player!: Phaser.GameObjects.Sprite;
    private npc!: SmartNPC;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private proximityService!: ProximityService;
    private pixelRenderer!: PixelArtRenderer;
    private assetManager!: AssetManager;
    private isMoving = false;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private currentLevelType = 0;
    private levelTypes = ['grass_field', 'stone_courtyard', 'room', 'natural_scene'];
    
    constructor() {
        super({ key: 'PixelArtDemoScene' });
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preloadPixelArtAssets();
    }

    create() {
        super.create();
        
        this.pixelRenderer = new PixelArtRenderer(this);
        this.assetManager.createPlayerAnimations();
        
        // Create initial level
        this.createLevel();
        
        // Title
        this.add.text(400, 30, 'PIXEL ART LEVEL DEMO', {
            fontSize: '24px',
            color: '#4a4a4a',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Controls info
        this.add.text(20, 60, 'ARROW KEYS: Move | SPACE: Change Level | ESC: Menu', {
            fontSize: '14px',
            color: '#666666',
            fontFamily: 'Arial, sans-serif'
        });
        
        // Level type indicator
        this.add.text(20, 80, `Level: ${this.levelTypes[this.currentLevelType]}`, {
            fontSize: '14px',
            color: '#666666',
            fontFamily: 'Arial, sans-serif'
        }).setName('levelIndicator');
        
        // Back to menu button
        this.add.text(20, 20, '← MAIN', {
            fontSize: '16px',
            color: '#4a4a4a',
            backgroundColor: '#e0e0e0',
            padding: { x: 8, y: 4 },
            fontFamily: 'Arial, sans-serif'
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('MainMenuScene'));
        
        // Create NPC
        this.npc = new SmartNPC(
            this, 
            300, 
            200, 
            'pixel_player', 
            'Forest Guide',
            'friendly nature guide who knows about the local flora and fauna',
            'You are a helpful forest guide. You love nature and enjoy sharing knowledge about plants and animals.',
            'guide'
        );
        
        // Create player with pixel art sprite
        this.createPlayer();
        
        // Set up room context
        this.setupRoomContext();
        
        // Initialize proximity service
        this.proximityService = new ProximityService();
        this.proximityService.addNPC(this.npc);
        
        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Space key to change levels
        this.input.keyboard!.on('keydown-SPACE', () => {
            this.changeLevel();
        });
        
        // Click to move
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && !this.isDragging) {
                this.movePlayerTo(pointer.worldX, pointer.worldY);
            }
        });
    }

    private createLevel(): void {
        // Clear existing tilemap
        if (this.tilemap) {
            this.tilemap.destroy();
        }

        const levelType = this.levelTypes[this.currentLevelType];
        let config;

        switch (levelType) {
            case 'grass_field':
                config = this.pixelRenderer.createGrassField(50, 38);
                break;
            case 'stone_courtyard':
                config = this.pixelRenderer.createStoneCourtyard(50, 38);
                break;
            case 'room':
                config = this.pixelRenderer.createRoom(50, 38);
                break;
            case 'natural_scene':
                config = this.pixelRenderer.createNaturalScene(50, 38);
                break;
            default:
                config = this.pixelRenderer.createGrassField(50, 38);
        }

        this.tilemap = this.pixelRenderer.createLevel(config);
        this.setGameAreaSize(800, 608); // 50 * 16, 38 * 16
    }

    private changeLevel(): void {
        this.currentLevelType = (this.currentLevelType + 1) % this.levelTypes.length;
        
        // Update level indicator
        const indicator = this.children.getByName('levelIndicator') as Phaser.GameObjects.Text;
        if (indicator) {
            indicator.setText(`Level: ${this.levelTypes[this.currentLevelType]}`);
        }
        
        this.createLevel();
        
        // Reset player position
        this.player.setPosition(400, 300);
        this.npc.setPosition(300, 200);
    }

    private createPlayer(): void {
        this.player = this.add.sprite(400, 300, 'pixel_player', 0);
        this.player.setScale(1); // Pixel art looks good at 1:1 scale
        this.player.play('pixel_player_idle');
    }

    private setupRoomContext(): void {
        const playerCharacter = {
            id: 'player',
            name: 'Explorer',
            getPosition: () => ({ x: this.player.x, y: this.player.y })
        };

        const allCharacters = [playerCharacter, this.npc];
        const grid = Array(38).fill(null).map(() => Array(50).fill(0));

        this.npc.setRoomContext([], [playerCharacter], grid);
    }
    
    update() {
        const isChatFocused = document.activeElement?.tagName === 'TEXTAREA' || 
                             document.activeElement?.tagName === 'INPUT';
        
        if (!isChatFocused && !this.isMoving) {
            const speed = 150;
            let moving = false;
            
            if (this.cursors.left.isDown) {
                this.player.x -= speed * this.game.loop.delta / 1000;
                moving = true;
            } else if (this.cursors.right.isDown) {
                this.player.x += speed * this.game.loop.delta / 1000;
                moving = true;
            }
            
            if (this.cursors.up.isDown) {
                this.player.y -= speed * this.game.loop.delta / 1000;
                moving = true;
            } else if (this.cursors.down.isDown) {
                this.player.y += speed * this.game.loop.delta / 1000;
                moving = true;
            }
            
            // Play appropriate animation
            if (moving) {
                if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'pixel_player_walk') {
                    this.player.play('pixel_player_walk');
                }
            } else {
                if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'pixel_player_idle') {
                    this.player.play('pixel_player_idle');
                }
            }
            
            // Keep player in bounds
            this.player.x = Phaser.Math.Clamp(this.player.x, 16, 784);
            this.player.y = Phaser.Math.Clamp(this.player.y, 100, 580);
        }
        
        // Update proximity and chat
        this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
        const nearestNPC = this.proximityService.getNearestNPC();
        const nearbyNPCs = nearestNPC ? [nearestNPC] : [];
        this.chatInterface.updateNearbyNPCs(nearbyNPCs);
    }
    
    movePlayerTo(x: number, y: number) {
        // Clamp target position to bounds
        x = Phaser.Math.Clamp(x, 16, 784);
        y = Phaser.Math.Clamp(y, 100, 580);
        
        this.isMoving = true;
        this.player.play('pixel_player_run');
        
        this.tweens.add({
            targets: this.player,
            x: x,
            y: y,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.isMoving = false;
                this.player.play('pixel_player_idle');
            }
        });
    }

    destroy() {
        this.npc.destroy();
        super.destroy();
    }
}
