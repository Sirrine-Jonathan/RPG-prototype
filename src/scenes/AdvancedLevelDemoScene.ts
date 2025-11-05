import { BaseScene } from './BaseScene';
import { SmartNPC } from '../entities/SmartNPC';
import { ProximityService } from '../services/ProximityService';
import { LevelDesigner, LevelTemplate } from '../systems/LevelDesigner';
import { AssetManager } from '../systems/AssetManager';

export class AdvancedLevelDemoScene extends BaseScene {
    private player!: Phaser.GameObjects.Sprite;
    private npcs: SmartNPC[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private proximityService!: ProximityService;
    private levelDesigner!: LevelDesigner;
    private assetManager!: AssetManager;
    private isMoving = false;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private currentLevelIndex = 0;
    private levelTemplates: LevelTemplate[] = [];
    private camera!: Phaser.Cameras.Scene2D.Camera;
    
    constructor() {
        super({ key: 'AdvancedLevelDemoScene' });
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preloadPixelArtAssets();
    }

    create() {
        super.create();
        
        this.levelDesigner = new LevelDesigner(this);
        this.assetManager.createPlayerAnimations();
        
        // Create level templates
        this.levelTemplates = [
            this.levelDesigner.createTown(),
            this.levelDesigner.createForestClearing(),
            this.levelDesigner.createDungeonEntrance()
        ];
        
        // Set up camera reference
        this.camera = this.cameras.main;
        
        // Create initial level
        this.createLevel();
        
        // UI Elements
        this.createUI();
        
        // Create player
        this.createPlayer();
        
        // Create NPCs for current level
        this.createNPCs();
        
        // Set up room context
        this.setupRoomContext();
        
        // Initialize proximity service
        this.proximityService = new ProximityService();
        this.npcs.forEach(npc => this.proximityService.addNPC(npc));
        
        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Level switching
        this.input.keyboard!.on('keydown-SPACE', () => this.changeLevel());
        this.input.keyboard!.on('keydown-C', () => this.toggleCameraFollow());
        
        // Click to move
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && !this.isDragging) {
                this.movePlayerTo(pointer.worldX, pointer.worldY);
            }
        });
        
        // Start with camera following player
        this.camera.startFollow(this.player, true, 0.05, 0.05);
    }

    private createUI(): void {
        const template = this.getCurrentTemplate();
        
        // Fixed UI elements (don't scroll with camera)
        const uiContainer = this.add.container(0, 0).setScrollFactor(0);
        
        // Title
        const title = this.add.text(400, 30, `LEVEL: ${template.name.toUpperCase()}`, {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Description
        const description = this.add.text(400, 60, template.description, {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0.5);
        
        // Controls
        const controls = this.add.text(20, 100, 
            'WASD/Arrows: Move | SPACE: Next Level | C: Toggle Camera | ESC: Menu', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 1
        });
        
        // Level indicator
        const levelIndicator = this.add.text(20, 120, 
            `Level ${this.currentLevelIndex + 1}/${this.levelTemplates.length}`, {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 1
        }).setName('levelIndicator');
        
        // Back button
        const backBtn = this.add.text(20, 20, '← MAIN MENU', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 },
            fontFamily: 'Arial, sans-serif'
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('MainMenuScene'));
        
        uiContainer.add([title, description, controls, levelIndicator, backBtn]);
    }

    private createLevel(): void {
        // Clear existing tilemap and NPCs
        if (this.tilemap) {
            this.tilemap.destroy();
        }
        this.clearNPCs();

        const template = this.getCurrentTemplate();
        
        // Set background color
        if (template.backgroundColor) {
            this.cameras.main.setBackgroundColor(template.backgroundColor);
        }
        
        // Create tilemap
        this.tilemap = this.levelDesigner.createFromTemplate(template);
        
        // Update game area size
        this.setGameAreaSize(template.width * template.tileSize, template.height * template.tileSize);
        
        // Update camera bounds if camera is initialized
        if (this.camera) {
            this.camera.setBounds(0, 0, template.width * template.tileSize, template.height * template.tileSize);
        }
    }

    private createPlayer(): void {
        const template = this.getCurrentTemplate();
        const spawnPoint = template.spawnPoints.player;
        
        this.player = this.add.sprite(spawnPoint.x, spawnPoint.y, 'pixel_player', 0);
        this.player.setScale(1);
        this.player.play('pixel_player_idle');
        this.player.setDepth(100); // Ensure player is above other objects
    }

    private createNPCs(): void {
        const template = this.getCurrentTemplate();
        
        template.spawnPoints.npcs.forEach((npcSpawn, index) => {
            let npcName = 'Character';
            let npcPersonality = 'friendly and helpful';
            let npcPrompt = 'You are a helpful character.';
            
            // Customize NPCs based on type and level
            switch (npcSpawn.type) {
                case 'merchant':
                    npcName = 'Traveling Merchant';
                    npcPersonality = 'shrewd but fair trader with goods from distant lands';
                    npcPrompt = 'You are a traveling merchant. You have interesting goods and stories from your travels.';
                    break;
                case 'shopkeeper':
                    npcName = 'Shop Owner';
                    npcPersonality = 'friendly local shopkeeper who knows everyone in town';
                    npcPrompt = 'You are the local shop owner. You know all the townspeople and their needs.';
                    break;
                case 'innkeeper':
                    npcName = 'Inn Keeper';
                    npcPersonality = 'welcoming host who provides food, drink, and local gossip';
                    npcPrompt = 'You are the innkeeper. You welcome travelers and know all the local news and gossip.';
                    break;
                case 'blacksmith':
                    npcName = 'Master Smith';
                    npcPersonality = 'skilled craftsman who works with metal and knows about weapons and tools';
                    npcPrompt = 'You are the town blacksmith. You craft weapons, tools, and know about metalwork.';
                    break;
                case 'town_guard':
                    npcName = 'Town Guard';
                    npcPersonality = 'dutiful protector who keeps the peace and knows about local security';
                    npcPrompt = 'You are a town guard. You protect the citizens and maintain order in the town.';
                    break;
                case 'villager':
                    npcName = 'Village Elder';
                    npcPersonality = 'wise village elder who knows local history and customs';
                    npcPrompt = 'You are the village elder. You know the history of this place and care about the villagers.';
                    break;
                case 'farmer':
                    npcName = 'Local Farmer';
                    npcPersonality = 'hardworking farmer who knows about crops and weather';
                    npcPrompt = 'You are a local farmer. You work hard and know about agriculture and the local area.';
                    break;
                case 'forest_spirit':
                    npcName = 'Forest Spirit';
                    npcPersonality = 'mystical guardian of the forest, speaks in riddles';
                    npcPrompt = 'You are a forest spirit. You protect nature and speak in mystical, poetic language.';
                    break;
                case 'woodland_creature':
                    npcName = 'Woodland Guide';
                    npcPersonality = 'nature-loving guide who knows forest paths and wildlife';
                    npcPrompt = 'You are a woodland guide. You love nature and help travelers navigate the forest safely.';
                    break;
                case 'guardian':
                    npcName = 'Ancient Guardian';
                    npcPersonality = 'stoic protector of ancient secrets, speaks formally';
                    npcPrompt = 'You are an ancient guardian. You protect this sacred place and speak with ancient wisdom.';
                    break;
                case 'archaeologist':
                    npcName = 'Dr. Stone';
                    npcPersonality = 'curious scholar studying ancient ruins and artifacts';
                    npcPrompt = 'You are an archaeologist studying these ruins. You are excited about historical discoveries.';
                    break;
            }
            
            const npc = new SmartNPC(
                this,
                npcSpawn.x,
                npcSpawn.y,
                'pixel_player',
                npcName,
                npcPersonality,
                npcPrompt,
                npcSpawn.type
            );
            
            npc.sprite.setDepth(99); // Set depth on the sprite, not the NPC object
            this.npcs.push(npc);
        });
    }

    private clearNPCs(): void {
        this.npcs.forEach(npc => npc.destroy());
        this.npcs = [];
        if (this.proximityService) {
            this.proximityService = new ProximityService(); // Reset proximity service
        }
    }

    private getCurrentTemplate(): LevelTemplate {
        return this.levelTemplates[this.currentLevelIndex];
    }

    private changeLevel(): void {
        this.currentLevelIndex = (this.currentLevelIndex + 1) % this.levelTemplates.length;
        
        // Update UI
        const levelIndicator = this.children.getByName('levelIndicator') as Phaser.GameObjects.Text;
        if (levelIndicator) {
            levelIndicator.setText(`Level ${this.currentLevelIndex + 1}/${this.levelTemplates.length}`);
        }
        
        // Recreate level
        this.createLevel();
        
        // Reset player position
        const template = this.getCurrentTemplate();
        this.player.setPosition(template.spawnPoints.player.x, template.spawnPoints.player.y);
        
        // Recreate NPCs
        this.createNPCs();
        this.setupRoomContext();
        
        // Update proximity service
        this.proximityService = new ProximityService();
        this.npcs.forEach(npc => this.proximityService.addNPC(npc));
        
        // Update UI title and description
        const titleText = this.children.list.find(child => 
            child instanceof Phaser.GameObjects.Text && 
            child.text.includes('LEVEL:')
        ) as Phaser.GameObjects.Text;
        
        if (titleText) {
            titleText.setText(`LEVEL: ${template.name.toUpperCase()}`);
        }
        
        const descText = this.children.list.find(child => 
            child instanceof Phaser.GameObjects.Text && 
            child.text === this.levelTemplates[(this.currentLevelIndex - 1 + this.levelTemplates.length) % this.levelTemplates.length].description
        ) as Phaser.GameObjects.Text;
        
        if (descText) {
            descText.setText(template.description);
        }
    }

    private toggleCameraFollow(): void {
        if (this.camera.followTarget) {
            this.camera.stopFollow();
        } else {
            this.camera.startFollow(this.player, true, 0.05, 0.05);
        }
    }

    private setupRoomContext(): void {
        const playerCharacter = {
            id: 'player',
            name: 'Explorer',
            getPosition: () => ({ x: this.player.x, y: this.player.y })
        };

        const template = this.getCurrentTemplate();
        const grid = Array(template.height).fill(null).map(() => Array(template.width).fill(0));

        this.npcs.forEach(npc => {
            npc.setRoomContext([], [playerCharacter], grid);
        });
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
            const template = this.getCurrentTemplate();
            this.player.x = Phaser.Math.Clamp(this.player.x, 16, template.width * 16 - 16);
            this.player.y = Phaser.Math.Clamp(this.player.y, 16, template.height * 16 - 16);
        }
        
        // Update proximity and chat
        if (this.proximityService) {
            this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
            const nearestNPC = this.proximityService.getNearestNPC();
            const nearbyNPCs = nearestNPC ? [nearestNPC] : [];
            this.chatInterface.updateNearbyNPCs(nearbyNPCs);
        }
    }
    
    movePlayerTo(x: number, y: number) {
        const template = this.getCurrentTemplate();
        
        // Clamp target position to bounds
        x = Phaser.Math.Clamp(x, 16, template.width * 16 - 16);
        y = Phaser.Math.Clamp(y, 16, template.height * 16 - 16);
        
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
        this.clearNPCs();
        super.destroy();
    }
}
