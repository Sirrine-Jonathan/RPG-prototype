import { Scene } from 'phaser';
import { SmartNPC, Character } from '../entities/SmartNPC';
import { InteractiveObject, Desk } from '../entities/InteractiveObject';

export class SmartNPCTestScene extends Scene {
    private npcs: SmartNPC[] = [];
    private objects: InteractiveObject[] = [];
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Simple room grid (0 = walkable, 1 = wall)
    private roomGrid: number[][] = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
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
        super({ key: 'SmartNPCTestScene' });
    }

    create() {
        this.add.text(400, 20, 'Smart NPC AI System Test', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(400, 50, 'NPCs autonomously explore, discover objects, and interact', {
            fontSize: '14px',
            color: '#bdc3c7'
        }).setOrigin(0.5);

        // Draw room grid
        this.drawRoomGrid();

        // Create player
        this.player = this.add.rectangle(100, 100, 16, 16, 0x00ff00);
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
        this.add.text(10, 570, 'Arrow keys: Move player | NPCs act autonomously with AI', {
            fontSize: '12px',
            color: '#bdc3c7'
        });
    }

    private drawRoomGrid(): void {
        const tileSize = 32;
        for (let y = 0; y < this.roomGrid.length; y++) {
            for (let x = 0; x < this.roomGrid[y].length; x++) {
                if (this.roomGrid[y][x] === 1) {
                    // Draw wall
                    this.add.rectangle(x * tileSize + 16, y * tileSize + 80, tileSize, tileSize, 0x666666);
                }
            }
        }
    }

    private createObjects(): void {
        const desk1 = new Desk(this, 200, 200, 'desk1');
        const desk2 = new Desk(this, 500, 300, 'desk2');
        
        this.objects.push(desk1, desk2);
    }

    private createNPCs(): void {
        const sheriff = new SmartNPC(
            this, 150, 150, 'sheriff', 'Sheriff Martinez',
            'stern, protective, slightly suspicious of outsiders',
            'You are the town sheriff. You know about strange happenings but try to downplay them.',
            0x8b4513
        );

        const deputy = new SmartNPC(
            this, 400, 400, 'deputy', 'Deputy Collins',
            'young, eager, helpful',
            'You are a helpful deputy who wants to assist but is constrained by the sheriff.',
            0x4169e1
        );

        const doctor = new SmartNPC(
            this, 600, 250, 'doctor', 'Dr. Chen',
            'professional, worried, conflicted about recent events',
            'You are a doctor who has noticed unusual medical cases but are bound by confidentiality.',
            0x228b22
        );

        this.npcs.push(sheriff, deputy, doctor);
    }

    private setupRoomContext(): void {
        // Create character list including player
        const playerCharacter: Character = {
            id: 'player',
            name: 'Player',
            getPosition: () => ({ x: this.player.x, y: this.player.y })
        };

        const allCharacters: Character[] = [playerCharacter, ...this.npcs];

        // Set room context for each NPC
        this.npcs.forEach(npc => {
            const otherCharacters = allCharacters.filter(c => c.id !== npc.id);
            npc.setRoomContext(this.objects, otherCharacters, this.roomGrid);
        });
    }

    update() {
        // Move player
        const speed = 3;
        if (this.cursors.left.isDown) this.player.x -= speed;
        if (this.cursors.right.isDown) this.player.x += speed;
        if (this.cursors.up.isDown) this.player.y -= speed;
        if (this.cursors.down.isDown) this.player.y += speed;

        // Keep player in bounds
        this.player.x = Phaser.Math.Clamp(this.player.x, 50, 750);
        this.player.y = Phaser.Math.Clamp(this.player.y, 100, 550);
    }

    destroy() {
        this.npcs.forEach(npc => npc.destroy());
        this.objects.forEach(obj => obj.destroy());
        super.destroy();
    }
}