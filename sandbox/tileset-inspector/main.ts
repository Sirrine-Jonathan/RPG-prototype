class TilesetInspectorScene extends Phaser.Scene {
    private currentTileset: string = 'grass';
    private tilesetImage!: Phaser.GameObjects.Image;
    private tileSize: number = 16;
    private tilesPerRow: number = 0;
    private totalTiles: number = 0;
    private isDragging: boolean = false;
    private dragStart: { x: number; y: number } = { x: 0, y: 0 };
    private selectionRect!: Phaser.GameObjects.Rectangle;

    constructor() {
        super({ key: 'TilesetInspectorScene' });
    }

    preload() {
        // Load all pixel art tilesets
        this.load.image('grass_tileset', '../../assets/Pixel Art Top Down - Basic v1.2.2/Texture/TX Tileset Grass.png');
        this.load.image('stone_tileset', '../../assets/Pixel Art Top Down - Basic v1.2.2/Texture/TX Tileset Stone Ground.png');
        this.load.image('wall_tileset', '../../assets/Pixel Art Top Down - Basic v1.2.2/Texture/TX Tileset Wall.png');
        this.load.image('props_tileset', '../../assets/Pixel Art Top Down - Basic v1.2.2/Texture/TX Props.png');
        this.load.image('shadow_tileset', '../../assets/Pixel Art Top Down - Basic v1.2.2/Texture/TX Shadow.png');
        this.load.image('plant_tileset', '../../assets/Pixel Art Top Down - Basic v1.2.2/Texture/TX Plant.png');
        this.load.image('struct_tileset', '../../assets/Pixel Art Top Down - Basic v1.2.2/Texture/TX Struct.png');
    }

    create() {
        this.add.text(10, 10, 'Tileset Inspector - Drag to select multiple tiles', {
            fontSize: '20px',
            color: '#ffffff'
        });

        this.loadTileset(this.currentTileset);

        // Listen for tileset changes
        const select = document.getElementById('tilesetSelect') as HTMLSelectElement;
        select.addEventListener('change', (e) => {
            this.currentTileset = (e.target as HTMLSelectElement).value;
            this.loadTileset(this.currentTileset);
        });

        // Add mouse events for drag selection
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
    }

    loadTileset(tilesetName: string) {
        // Clear existing tileset
        if (this.tilesetImage) {
            this.tilesetImage.destroy();
        }
        if (this.selectionRect) {
            this.selectionRect.destroy();
        }
        this.children.removeAll();

        // Add title
        this.add.text(10, 10, `Tileset Inspector - ${tilesetName.toUpperCase()} - Drag to select`, {
            fontSize: '20px',
            color: '#ffffff'
        });

        // Load the tileset image
        const textureKey = `${tilesetName}_tileset`;
        this.tilesetImage = this.add.image(10, 50, textureKey);
        this.tilesetImage.setOrigin(0, 0);
        this.tilesetImage.setScale(3);

        // Calculate grid dimensions
        const texture = this.textures.get(textureKey);
        const imageWidth = texture.source[0].width;
        const imageHeight = texture.source[0].height;
        
        this.tilesPerRow = Math.floor(imageWidth / this.tileSize);
        const tilesPerColumn = Math.floor(imageHeight / this.tileSize);
        this.totalTiles = this.tilesPerRow * tilesPerColumn;

        // Add grid lines for visual reference
        this.drawGrid(imageWidth, imageHeight);

        // Update info
        this.updateInfo(`Tileset: ${tilesetName} | Size: ${imageWidth}x${imageHeight} | Tiles: ${this.tilesPerRow}x${tilesPerColumn} (${this.totalTiles} total)`);
    }

    onPointerDown(pointer: Phaser.Input.Pointer) {
        const startX = 10;
        const startY = 50;
        
        // Check if click is within tileset bounds
        if (pointer.x >= startX && pointer.y >= startY) {
            this.isDragging = true;
            this.dragStart = { x: pointer.x, y: pointer.y };
            
            // Create selection rectangle
            this.selectionRect = this.add.rectangle(pointer.x, pointer.y, 0, 0, 0x00ff00, 0.3);
            this.selectionRect.setStrokeStyle(2, 0x00ff00);
            this.selectionRect.setOrigin(0, 0);
        }
    }

    onPointerMove(pointer: Phaser.Input.Pointer) {
        if (this.isDragging && this.selectionRect && this.selectionRect.active) {
            const width = pointer.x - this.dragStart.x;
            const height = pointer.y - this.dragStart.y;
            
            this.selectionRect.setSize(Math.abs(width), Math.abs(height));
            this.selectionRect.setPosition(
                width < 0 ? pointer.x : this.dragStart.x,
                height < 0 ? pointer.y : this.dragStart.y
            );
        }
    }

    onPointerUp(pointer: Phaser.Input.Pointer) {
        if (this.isDragging) {
            this.isDragging = false;
            this.processSelection();
        }
    }

    processSelection() {
        if (!this.selectionRect) return;

        const startX = 10;
        const startY = 50;
        const scaledTileSize = this.tileSize * 3;

        // Convert selection bounds to tile coordinates
        const selectionBounds = this.selectionRect.getBounds();
        
        const startTileX = Math.floor((selectionBounds.x - startX) / scaledTileSize);
        const startTileY = Math.floor((selectionBounds.y - startY) / scaledTileSize);
        const endTileX = Math.floor((selectionBounds.right - startX) / scaledTileSize);
        const endTileY = Math.floor((selectionBounds.bottom - startY) / scaledTileSize);

        // Clamp to valid tile bounds
        const minX = Math.max(0, Math.min(startTileX, endTileX));
        const minY = Math.max(0, Math.min(startTileY, endTileY));
        const maxX = Math.min(this.tilesPerRow - 1, Math.max(startTileX, endTileX));
        const maxY = Math.min(Math.floor(this.totalTiles / this.tilesPerRow) - 1, Math.max(startTileY, endTileY));

        // Generate tile info
        const selectedTiles = [];
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const index = y * this.tilesPerRow + x;
                selectedTiles.push({
                    index,
                    x,
                    y,
                    tileset: this.currentTileset
                });
            }
        }

        // Log to console
        console.group(`Selected Tiles - ${this.currentTileset} tileset`);
        console.log(`Selection: (${minX},${minY}) to (${maxX},${maxY})`);
        console.log(`Total tiles selected: ${selectedTiles.length}`);
        console.table(selectedTiles);
        console.groupEnd();

        // Update info panel
        const info = `Selected ${selectedTiles.length} tiles from (${minX},${minY}) to (${maxX},${maxY}) - Check console for details`;
        this.updateInfo(info);

        // Remove selection rectangle after a delay
        this.time.delayedCall(2000, () => {
            if (this.selectionRect) {
                this.selectionRect.destroy();
            }
        });
    }

    drawGrid(imageWidth: number, imageHeight: number) {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x555555, 0.5);

        const scaledTileSize = this.tileSize * 3;
        const startX = 10;
        const startY = 50;
        const scaledWidth = imageWidth * 3;
        const scaledHeight = imageHeight * 3;

        // Vertical lines
        for (let x = 0; x <= imageWidth; x += this.tileSize) {
            graphics.moveTo(startX + x * 3, startY);
            graphics.lineTo(startX + x * 3, startY + scaledHeight);
        }

        // Horizontal lines
        for (let y = 0; y <= imageHeight; y += this.tileSize) {
            graphics.moveTo(startX, startY + y * 3);
            graphics.lineTo(startX + scaledWidth, startY + y * 3);
        }

        graphics.strokePath();
    }

    updateInfo(text: string) {
        const infoElement = document.getElementById('tileInfo');
        if (infoElement) {
            infoElement.textContent = text;
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game-container',
    backgroundColor: '#2a2a2a',
    scene: TilesetInspectorScene
};

const game = new Phaser.Game(config);
