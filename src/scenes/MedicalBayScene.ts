import { BaseScene } from './BaseScene';
import { SmartNPC } from '../entities/SmartNPC';
import { TechDungeonRenderer } from '../systems/TechDungeonRenderer';
import { AssetManager } from '../systems/AssetManager';

export class MedicalBayScene extends BaseScene {
    private player!: Phaser.GameObjects.Sprite;
    private npc!: SmartNPC;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private techRenderer!: TechDungeonRenderer;
    private assetManager!: AssetManager;

    constructor() {
        super({ key: 'MedicalBayScene' });
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

        this.add.text(240, 20, 'MEDICAL BAY', {
            fontSize: '18px',
            color: '#00ff00',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(20, 20, '← BACK', {
            fontSize: '14px',
            color: '#00ff00',
            backgroundColor: '#003300',
            padding: { x: 6, y: 3 },
            fontFamily: 'monospace'
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('TechStationScene'));

        this.npc = new SmartNPC(
            this, 
            240, 
            160, 
            'medic', 
            'Dr. Hayes',
            'caring medical officer, knowledgeable, dedicated to crew health',
            'You are the chief medical officer responsible for crew health and safety.',
            'medical'
        );

        this.player = this.add.sprite(120, 160, 'player_blue');
        this.player.setScale(2);
        this.player.play('player_idle');
    }
}
