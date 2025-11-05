import { BaseScene } from './BaseScene';
import { AssetManager } from '../systems/AssetManager';

export class PropsViewerScene extends BaseScene {
    private assetManager!: AssetManager;

    constructor() {
        super({ key: 'PropsViewerScene' });
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preloadTechDungeonAssets();
    }

    create() {
        super.create();

        // Dark background
        this.add.rectangle(0, 0, 2000, 1000, 0x000000).setOrigin(0, 0);

        // Title
        this.add.text(400, 20, 'PROPS VIEWER - Use mouse to zoom/pan', {
            fontSize: '16px',
            color: '#00ff00',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Back button
        this.add.text(20, 20, '← BACK', {
            fontSize: '14px',
            color: '#00ff00',
            backgroundColor: '#003300',
            padding: { x: 6, y: 3 },
            fontFamily: 'monospace'
        }).setInteractive()
        .on('pointerdown', () => this.scene.start('MainMenuScene'));

        // First, let's check the dimensions and create a grid
        // Assuming 32x32 tiles, we'll need to figure out the grid size
        const startX = 50;
        const startY = 80;
        const tileSpacing = 50;
        const actualTileSize = 32;
        const tilesPerRow = 20; // Estimate, will adjust based on what we see

        for (let i = 0; i < 200; i++) { // Show first 200 tiles
            const row = Math.floor(i / tilesPerRow);
            const col = i % tilesPerRow;
            const x = startX + col * tileSpacing;
            const y = startY + row * tileSpacing;

            // Create tilemap for this single tile from props
            const map = this.make.tilemap({ 
                tileWidth: actualTileSize, 
                tileHeight: actualTileSize, 
                width: 1, 
                height: 1 
            });
            
            const tileset = map.addTilesetImage('props_viewer_' + i, 'props', actualTileSize, actualTileSize);
            const layer = map.createBlankLayer('prop_' + i, tileset!, x, y);
            
            if (layer) {
                layer.putTileAt(i, 0, 0);
            }

            // Add index label
            this.add.text(x + actualTileSize/2, y + actualTileSize + 5, i.toString(), {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'monospace'
            }).setOrigin(0.5);
        }

        this.setGameAreaSize(2000, 1000);
    }
}
