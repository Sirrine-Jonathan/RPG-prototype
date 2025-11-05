import { BaseScene } from './BaseScene';
import { SmartNPC } from '../entities/SmartNPC';
import { TechDungeonRenderer } from '../systems/TechDungeonRenderer';
import { AssetManager } from '../systems/AssetManager';

export class ResearchLabScene extends BaseScene {
    private player!: Phaser.GameObjects.Sprite;
    private npc!: SmartNPC;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private techRenderer!: TechDungeonRenderer;
    private assetManager!: AssetManager;

    constructor() {
        super({ key: 'ResearchLabScene' });
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preloadTechDungeonAssets();
    }

    create() {
        super.create();
        
        this.techRenderer = new TechDungeonRenderer(this);
        this.assetManager.createPlayerAnimations();
        
        this.tilemap = this.techRenderer.createTechRoom(30, 20);
        this.setGameAreaSize(480, 320);

        this.add.text(240, 20, 'RESEARCH LAB', {
            fontSize: '18px',
            color: '#0066ff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(20, 20, '← BACK', {
            fontSize: '14px',
            color: '#0066ff',
            backgroundColor: '#000033',
            padding: { x: 6, y: 3 },
            fontFamily: 'monospace'
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('TechStationScene'));

        this.npc = new SmartNPC(
            this, 
            240, 
            160, 
            'researcher', 
            'Dr. Chen',
            'brilliant scientist, curious, focused on breakthrough discoveries',
            'You are the lead researcher studying advanced technologies and anomalies.',
            'scientist'
        );

        this.player = this.add.sprite(120, 160, 'player_blue');
        this.player.setScale(2);
        this.player.play('player_idle');
    }
}
