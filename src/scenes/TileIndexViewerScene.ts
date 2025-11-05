import { BaseScene } from './BaseScene';
import { AssetManager } from '../systems/AssetManager';

export class TileIndexViewerScene extends BaseScene {
    private assetManager!: AssetManager;

    constructor() {
        super({ key: 'TileIndexViewerScene' });
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preloadTechDungeonAssets();
    }

    create() {
        super.create(); // Initialize base scene with camera controls

        // Dark background
        this.add.rectangle(0, 0, 2000, 1000, 0x000000).setOrigin(0, 0);

        // Title
        this.add.text(400, 20, 'TILESET INDEX VIEWER - Use mouse to zoom/pan', {
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

        // Tileset is 37 tiles wide, 23 tiles tall
        const tilesPerRow = 37;
        const startX = 50;
        const startY = 80;
        const tileSpacing = 50; // More space for labels
        const actualTileSize = 32;

        for (let i = 0; i < 300; i++) { // Show first 300 tiles
            const row = Math.floor(i / tilesPerRow);
            const col = i % tilesPerRow;
            const x = startX + col * tileSpacing;
            const y = startY + row * tileSpacing;

            // Create tilemap for this single tile
            const map = this.make.tilemap({ 
                tileWidth: actualTileSize, 
                tileHeight: actualTileSize, 
                width: 1, 
                height: 1 
            });
            
            const tileset = map.addTilesetImage('tileset_viewer_' + i, 'tileset', actualTileSize, actualTileSize);
            const layer = map.createBlankLayer('tile_' + i, tileset!, x, y);
            
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

        // Set a larger game area for panning
        this.setGameAreaSize(2000, 1000);
    }
}
