// @ts-nocheck
import { Scene } from 'phaser';
import { SmartNPC } from '../entities/SmartNPC';
import { InteractiveObject, Desk } from '../entities/InteractiveObject';

export class TiledRoomScene extends Scene {
    private tileSize = 32;
    private roomWidth = 25;
    private roomHeight = 19;
    private npcs: SmartNPC[] = [];
    private objects: InteractiveObject[] = [];
    private player!: Phaser.GameObjects.Image;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Room layout (0 = floor, 1 = wall, 2 = desk, 3 = filing cabinet)
    private roomLayout = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    constructor() {
        super({ key: 'TiledRoomScene' });
    }

    preload() {
        // Create simple colored rectangles as fallback tiles
        // We'll generate these programmatically instead of loading images
    }

    create() {
        this.add.text(400, 20, 'Tiled Police Station - AI NPCs with Procedural Tiles', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Create tile textures programmatically
        this.createTileTextures();

        // Render the room
        this.renderRoom();

        // Create player
        this.player = this.add.rectangle(100, 100, 16, 16, 0x00FF00);
        this.player.setStrokeStyle(2, 0xffffff);

        // Create interactive objects
        this.createObjects();

        // Create smart NPCs
        this.createNPCs();

        // Set up room context for all NPCs
        this.setupRoomContext();

        // Setup controls
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Instructions
        this.add.text(10, 570, 'Arrow keys: Move | NPCs act autonomously with AI | Procedural tiles', {
            fontSize: '12px',
            color: '#bdc3c7'
        });
    }

    private createTileTextures(): void {
        // Create textures programmatically using Phaser's graphics
        const graphics = this.add.graphics();
        
        // Floor stone texture
        graphics.fillStyle(0x808080);
        graphics.fillRect(0, 0, this.tileSize, this.tileSize);
        graphics.generateTexture('floor_stone', this.tileSize, this.tileSize);
        
        // Wall brick texture
        graphics.clear();
        graphics.fillStyle(0x8B4513);
        graphics.fillRect(0, 0, this.tileSize, this.tileSize);
        graphics.generateTexture('wall_brick', this.tileSize, this.tileSize);
        
        // Desk texture
        graphics.clear();
        graphics.fillStyle(0x654321);
        graphics.fillRect(0, 0, this.tileSize, this.tileSize);
        graphics.generateTexture('desk', this.tileSize, this.tileSize);
        
        // Filing cabinet texture
        graphics.clear();
        graphics.fillStyle(0x696969);
        graphics.fillRect(0, 0, this.tileSize, this.tileSize);
        graphics.generateTexture('filing_cabinet', this.tileSize, this.tileSize);
        
        graphics.destroy();
    }

    private renderRoom(): void {
        for (let y = 0; y < this.roomHeight; y++) {
            for (let x = 0; x < this.roomWidth; x++) {
                const tileType = this.roomLayout[y][x];
                const pixelX = x * this.tileSize + 16;
                const pixelY = y * this.tileSize + 80;

                // Always place floor first
                this.add.image(pixelX, pixelY, 'floor_stone');

                // Then place walls/objects on top
                switch (tileType) {
                    case 1: // Wall
                        this.add.image(pixelX, pixelY, 'wall_brick');
                        break;
                    case 2: // Desk
                        this.add.image(pixelX, pixelY, 'desk');
                        break;
                    case 3: // Filing cabinet
                        this.add.image(pixelX, pixelY, 'filing_cabinet');
                        break;
                }
            }
        }
    }

    private createObjects(): void {
        // Find desks in the layout and create interactive objects
        for (let y = 0; y < this.roomHeight; y++) {
            for (let x = 0; x < this.roomWidth; x++) {
                if (this.roomLayout[y][x] === 2) {
                    const pixelX = x * this.tileSize + 16;
                    const pixelY = y * this.tileSize + 80;
                    const desk = new Desk(this, pixelX, pixelY, `desk_${x}_${y}`);
                    this.objects.push(desk);
                }
            }
        }
    }

    private createNPCs(): void {
        const sheriff = new SmartNPC(
            this, 150, 150, 'sheriff', 'Sheriff Martinez',
            'stern, protective, slightly suspicious of outsiders',
            'You are the town sheriff. You know about strange happenings but try to downplay them.',
            'Sheriff Martinez'
        );

        const deputy = new SmartNPC(
            this, 400, 400, 'deputy', 'Deputy Collins',
            'young, eager, helpful',
            'You are a helpful deputy who wants to assist but is constrained by the sheriff.',
            'Deputy Collins'
        );

        const doctor = new SmartNPC(
            this, 300, 200, 'doctor', 'Dr. Chen',
            'professional, worried, conflicted about recent events',
            'You are a doctor who has noticed unusual medical cases but are bound by confidentiality.',
            'Dr. Chen'
        );

        this.npcs.push(sheriff, deputy, doctor);
    }

    private setupRoomContext(): void {
        // Create character list including player
        const playerCharacter = {
            id: 'player',
            name: 'Player',
            getPosition: () => ({ x: this.player.x, y: this.player.y })
        };

        const allCharacters = [playerCharacter, ...this.npcs];

        // Convert layout to grid for line of sight
        const grid = this.roomLayout.map(row => 
            row.map(cell => cell === 1 ? 1 : 0) // 1 = blocked, 0 = walkable
        );

        // Set room context for each NPC
        this.npcs.forEach(npc => {
            const otherCharacters = allCharacters.filter(c => c.id !== npc.id);
            npc.setRoomContext(this.objects, otherCharacters, grid);
        });
    }

    update() {
        // Move player
        const speed = 3;
        if (this.cursors.left.isDown) this.player.x -= speed;
        if (this.cursors.right.isDown) this.player.x += speed;
        if (this.cursors.up.isDown) this.player.y -= speed;
        if (this.cursors.down.isDown) this.player.y += speed;

        // Keep player in bounds and check collisions
        this.player.x = Phaser.Math.Clamp(this.player.x, 50, 750);
        this.player.y = Phaser.Math.Clamp(this.player.y, 100, 550);
    }

    destroy() {
        this.npcs.forEach(npc => npc.destroy());
        this.objects.forEach(obj => obj.destroy());
        super.destroy();
    }
}