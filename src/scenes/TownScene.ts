import { BaseScene } from './BaseScene';
import { SmartNPC } from '../entities/SmartNPC';
import { CharacterSpriteGenerator } from '../systems/CharacterSpriteGenerator';
import { ProximityService } from '../services/ProximityService';
import { ObjectRenderer } from '../systems/ObjectRenderer';

export class TownScene extends BaseScene {
    private player!: Phaser.GameObjects.Image;
    private buildings: Phaser.GameObjects.Group;
    private npc!: SmartNPC;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private proximityService!: ProximityService;
    private objectRenderer!: ObjectRenderer;
    
    constructor() {
        super({ key: 'TownScene' });
    }

    create() {
        super.create(); // Initialize base scene with camera controls
        
        this.objectRenderer = new ObjectRenderer(this);
        this.setGameAreaSize(800, 600); // Set reasonable game area
        
        // Background - grass/town ground
        this.add.rectangle(400, 300, 800, 600, 0x4a5d23);
        
        // Title
        this.add.text(400, 30, 'Town Square', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Back to menu button
        this.add.text(20, 20, '← Menu', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#16213e',
            padding: { x: 8, y: 4 }
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('MainMenuScene'));
        
        // Create buildings group
        this.buildings = this.add.group();
        
        // Create better looking buildings
        const policeStation = this.objectRenderer.createBuilding(150, 150, 120, 80, 'police');
        policeStation.setData('scene', 'PoliceStationScene');
        this.buildings.add(policeStation);
        
        const museum = this.objectRenderer.createBuilding(650, 150, 120, 80, 'museum');
        museum.setData('scene', 'MuseumScene');
        this.buildings.add(museum);
        
        const library = this.objectRenderer.createBuilding(150, 450, 120, 80, 'library');
        library.setData('scene', 'LibraryScene');
        this.buildings.add(library);
        
        const park = this.objectRenderer.createBuilding(650, 450, 120, 80, 'park');
        park.setData('scene', 'ParkScene');
        this.buildings.add(park);
        
        // Create single NPC - Hobo
        this.npc = new SmartNPC(
            this, 
            500, 
            350, 
            'hobo', 
            'Old Pete',
            'weathered, homeless, knows the streets and their secrets',
            'You are a homeless man who has lived on the streets of this town for years. You see and hear things others miss.',
            'hobo'
        );
        
        // Create player with generated sprite
        this.createPlayer();
        
        // Set up room context
        this.setupRoomContext();
        
        // Initialize proximity service
        this.proximityService = new ProximityService();
        this.proximityService.addNPC(this.npc);
        
        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Click to move (only left click)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && !this.isDragging) {
                this.movePlayerTo(pointer.worldX, pointer.worldY);
            }
        });
    }

    private createPlayer(): void {
        // Generate player sprite
        const spriteGenerator = new CharacterSpriteGenerator(this);
        spriteGenerator.generateCharacterSprite({
            type: 'civilian',
            skinTone: 'medium',
            hairColor: 'brown',
            uniform: 'casual'
        }, 'player_sprite');

        this.player = this.add.image(400, 300, 'player_sprite');
    }

    private setupRoomContext(): void {
        const playerCharacter = {
            id: 'player',
            name: 'Player',
            getPosition: () => ({ x: this.player.x, y: this.player.y })
        };

        const allCharacters = [playerCharacter, this.npc];
        const grid = Array(19).fill(null).map(() => Array(25).fill(0)); // Simple open area

        this.npc.setRoomContext([], [playerCharacter], grid);
    }
    
    update() {
        // Don't handle keyboard movement if chat input is focused
        const isChatFocused = document.activeElement?.tagName === 'TEXTAREA' || 
                             document.activeElement?.tagName === 'INPUT';
        
        if (!isChatFocused) {
            // Keyboard movement
            const speed = 200;
            
            if (this.cursors.left.isDown) {
                this.player.x -= speed * this.game.loop.delta / 1000;
            } else if (this.cursors.right.isDown) {
                this.player.x += speed * this.game.loop.delta / 1000;
            }
            
            if (this.cursors.up.isDown) {
                this.player.y -= speed * this.game.loop.delta / 1000;
            } else if (this.cursors.down.isDown) {
                this.player.y += speed * this.game.loop.delta / 1000;
            }
            
            // Keep player in bounds
            this.player.x = Phaser.Math.Clamp(this.player.x, 10, 790);
            this.player.y = Phaser.Math.Clamp(this.player.y, 60, 590);
        }
        
        // Update proximity and chat
        this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
        const nearestNPC = this.proximityService.getNearestNPC();
        const nearbyNPCs = nearestNPC ? [nearestNPC] : [];
        this.chatInterface.updateNearbyNPCs(nearbyNPCs);
        
        // Check building interactions
        this.checkBuildingInteractions();
    }
    
    movePlayerTo(x: number, y: number) {
        this.tweens.add({
            targets: this.player,
            x: x,
            y: y,
            duration: 500,
            ease: 'Power2'
        });
    }
    
    checkBuildingInteractions() {
        this.buildings.children.entries.forEach((building: any) => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                building.x, building.y
            );
            
            if (distance < 80) {
                // Show interaction hint
                if (!building.getData('hintShown')) {
                    building.setAlpha(0.8);
                    building.setData('hintShown', true);
                }
                
                // Auto-enter on close proximity
                if (distance < 50) {
                    this.enterBuilding(building.getData('scene'));
                }
            } else {
                building.setAlpha(1);
                building.setData('hintShown', false);
            }
        });
    }
    
    enterBuilding(sceneKey: string) {
        console.log(`Entering ${sceneKey}...`);
        this.registry.set('returnScene', 'TownScene');
        this.scene.start(sceneKey);
    }

    destroy() {
        this.npc.destroy();
        super.destroy();
    }
}