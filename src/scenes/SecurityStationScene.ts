import { BaseScene } from './BaseScene';
import { SmartNPC } from '../entities/SmartNPC';
import { TechDungeonRenderer } from '../systems/TechDungeonRenderer';
import { AssetManager } from '../systems/AssetManager';

export class SecurityStationScene extends BaseScene {
    private player!: Phaser.GameObjects.Sprite;
    private npc!: SmartNPC;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private techRenderer!: TechDungeonRenderer;
    private assetManager!: AssetManager;

    constructor() {
        super({ key: 'SecurityStationScene' });
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preloadTechDungeonAssets();
    }

    create() {
        super.create();
        
        this.techRenderer = new TechDungeonRenderer(this);
        this.assetManager.createPlayerAnimations();
        
        // Create smaller security room
        this.tilemap = this.techRenderer.createTechRoom(30, 20);
        this.setGameAreaSize(480, 320);

        // Title
        this.add.text(240, 20, 'SECURITY STATION', {
            fontSize: '18px',
            color: '#ff0000',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Back button
        this.add.text(20, 20, '← BACK', {
            fontSize: '14px',
            color: '#ff0000',
            backgroundColor: '#330000',
            padding: { x: 6, y: 3 },
            fontFamily: 'monospace'
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('TechStationScene'));

        // Security Officer NPC
        this.npc = new SmartNPC(
            this, 
            240, 
            160, 
            'security_officer', 
            'Officer Kane',
            'stern security officer, vigilant, protective of station personnel',
            'You are the head of station security. You monitor threats and ensure safety.',
            'security'
        );

        // Player
        this.player = this.add.sprite(120, 160, 'player_blue');
        this.player.setScale(2);
        this.player.play('player_idle');
    }
}
