import { BaseScene } from './BaseScene';
import { SmartNPC } from '../entities/SmartNPC';
import { InteractiveObject, Desk } from '../entities/InteractiveObject';
import { ProximityService } from '../services/ProximityService';
import { CharacterSpriteGenerator } from '../systems/CharacterSpriteGenerator';
import { ObjectRenderer } from '../systems/ObjectRenderer';

export class PoliceStationScene extends BaseScene {
    private player!: Phaser.GameObjects.Image;
    private npcs: SmartNPC[] = [];
    private objects: InteractiveObject[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private proximityService!: ProximityService;
    private objectRenderer!: ObjectRenderer;

    constructor() {
        super({ key: 'PoliceStationScene' });
    }

    create() {
        super.create(); // Initialize base scene with camera controls
        
        this.objectRenderer = new ObjectRenderer(this);
        this.setGameAreaSize(800, 600); // Set reasonable game area
        
        // Background - police station interior
        this.add.rectangle(400, 300, 800, 600, 0x2c3e50);
        
        // Title
        this.add.text(400, 30, 'Whispering Stones Police Station', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Back button
        this.add.text(20, 20, '← Town Square', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#16213e',
            padding: { x: 8, y: 4 }
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('TownScene'));

        // Create room layout with better graphics
        this.createRoomLayout();
        
        // Create player
        this.createPlayer();
        
        // Create interactive objects
        this.createObjects();
        
        // Create NPCs
        this.createNPCs();
        
        // Set up room context
        this.setupRoomContext();
        
        // Initialize proximity service
        this.proximityService = new ProximityService();
        this.npcs.forEach(npc => this.proximityService.addNPC(npc));
        
        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Click to move (only left click)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && !this.isDragging) {
                this.movePlayerTo(pointer.worldX, pointer.worldY);
            }
        });
    }

    private createRoomLayout() {
        // Walls
        this.add.rectangle(400, 80, 800, 20, 0x4a4a4a); // Top wall
        this.add.rectangle(400, 590, 800, 20, 0x4a4a4a); // Bottom wall
        this.add.rectangle(10, 300, 20, 600, 0x4a4a4a); // Left wall
        this.add.rectangle(790, 300, 20, 600, 0x4a4a4a); // Right wall
        
        // Reception desk (better graphics)
        const receptionDesk = this.objectRenderer.createDesk(400, 150, 200, 60);
        this.add.text(400, 120, 'RECEPTION', {
            fontSize: '12px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        // Holding cells (back area)
        this.add.rectangle(150, 450, 120, 80, 0x666666);
        this.add.rectangle(150, 450, 116, 76, 0x333333);
        this.add.text(150, 450, 'CELL 1', {
            fontSize: '10px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        this.add.rectangle(650, 450, 120, 80, 0x666666);
        this.add.rectangle(650, 450, 116, 76, 0x333333);
        this.add.text(650, 450, 'CELL 2', {
            fontSize: '10px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        // Evidence room with better graphics
        const evidenceRoom = this.objectRenderer.createEvidenceLocker(700, 250);
        this.add.text(700, 200, 'EVIDENCE', {
            fontSize: '10px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        // Interview room
        this.add.rectangle(100, 250, 80, 100, 0x556b2f);
        this.add.text(100, 200, 'INTERVIEW', {
            fontSize: '10px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }

    private createPlayer() {
        // Generate player sprite
        const spriteGenerator = new CharacterSpriteGenerator(this);
        spriteGenerator.generateCharacterSprite({
            type: 'civilian',
            skinTone: 'medium',
            hairColor: 'brown',
            uniform: 'casual'
        }, 'player_sprite');

        this.player = this.add.image(400, 350, 'player_sprite');
    }

    private createObjects() {
        // Reception desk
        const receptionDesk = new Desk(this, 400, 150, 'reception_desk');
        this.objects.push(receptionDesk);
        
        // Evidence locker
        const evidenceLocker = new InteractiveObject(this, 700, 250, 'evidence_locker', 'Evidence Locker');
        this.objects.push(evidenceLocker);
        
        // Interview table
        const interviewTable = new Desk(this, 100, 280, 'interview_table');
        this.objects.push(interviewTable);
    }

    private createNPCs() {
        // Police Chief - at reception
        const chief = new SmartNPC(
            this, 350, 200, 'chief', 'Chief Rodriguez',
            'authoritative, experienced, concerned about recent strange events',
            'You are the police chief of Whispering Stones. You\'ve been dealing with unusual reports lately - people hearing voices, strange lights, missing persons. You\'re skeptical but worried.',
            'police'
        );

        // Detective - near evidence room
        const detective = new SmartNPC(
            this, 600, 300, 'detective', 'Detective Kim',
            'analytical, methodical, believes there\'s a logical explanation',
            'You are investigating the mysterious events in town. You believe in facts and evidence, but the recent cases don\'t add up. You\'re looking for patterns.',
            'police'
        );

        // Desk Sergeant - behind reception
        const sergeant = new SmartNPC(
            this, 450, 200, 'sergeant', 'Sergeant Murphy',
            'helpful, knows everyone in town, has heard all the rumors',
            'You handle the day-to-day operations and know all the local gossip. People trust you and often come to you with their concerns about the strange happenings.',
            'police'
        );

        this.npcs.push(chief, detective, sergeant);
    }

    private setupRoomContext() {
        // Create character list including player
        const playerCharacter = {
            id: 'player',
            name: 'Player',
            getPosition: () => ({ x: this.player.x, y: this.player.y })
        };

        const allCharacters = [playerCharacter, ...this.npcs];

        // Simple grid for line of sight (mostly open space)
        const grid = Array(19).fill(null).map(() => Array(25).fill(0));
        
        // Add walls and obstacles
        for (let x = 0; x < 25; x++) {
            grid[0][x] = 1; // Top wall
            grid[18][x] = 1; // Bottom wall
        }
        for (let y = 0; y < 19; y++) {
            grid[y][0] = 1; // Left wall
            grid[y][24] = 1; // Right wall
        }

        // Set room context for each NPC
        this.npcs.forEach(npc => {
            const otherCharacters = allCharacters.filter(c => c.id !== npc.id);
            npc.setRoomContext(this.objects, otherCharacters, grid);
        });
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
            this.player.x = Phaser.Math.Clamp(this.player.x, 30, 770);
            this.player.y = Phaser.Math.Clamp(this.player.y, 100, 570);
        }
        
        // Update proximity and chat
        this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
        const nearbyNPCs = this.proximityService.npcs.filter(npc => {
            const distance = Phaser.Math.Distance.Between(
                npc.sprite.x, npc.sprite.y,
                this.player.x, this.player.y
            );
            return distance < 80;
        });
        this.chatInterface.updateNearbyNPCs(nearbyNPCs);
    }

    private movePlayerTo(x: number, y: number) {
        this.tweens.add({
            targets: this.player,
            x: x,
            y: y,
            duration: 500,
            ease: 'Power2'
        });
    }

    destroy() {
        this.npcs.forEach(npc => npc.destroy());
        this.objects.forEach(obj => obj.destroy());
        super.destroy();
    }
}