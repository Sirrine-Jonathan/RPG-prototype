import { Scene } from 'phaser';
import { PixelArtRenderer, LevelConfig } from './PixelArtRenderer';

export interface LevelTemplate {
    name: string;
    description: string;
    width: number;
    height: number;
    tileSize: number;
    backgroundColor?: number;
    spawnPoints: {
        player: { x: number; y: number };
        npcs: Array<{ x: number; y: number; type: string }>;
    };
    interactables?: Array<{
        x: number;
        y: number;
        type: string;
        action: string;
    }>;
    config: LevelConfig;
}

export class LevelDesigner {
    private scene: Scene;
    private renderer: PixelArtRenderer;

    constructor(scene: Scene) {
        this.scene = scene;
        this.renderer = new PixelArtRenderer(scene);
    }

    /**
     * Create a detailed town scene with proper pixel art tiles
     */
    createTown(): LevelTemplate {
        const width = 80;
        const height = 60;
        
        const ground: number[][] = [];
        const walls: number[][] = [];
        const props: number[][] = [];
        const shadows: number[][] = [];

        // Initialize with grass
        for (let y = 0; y < height; y++) {
            ground[y] = [];
            walls[y] = [];
            props[y] = [];
            shadows[y] = [];
            for (let x = 0; x < width; x++) {
                ground[y][x] = Math.random() < 0.7 ? 1 : 2; // Grass variation
                walls[y][x] = 0;
                props[y][x] = 0;
                shadows[y][x] = 0;
            }
        }

        // Create main stone roads using our stone tiles
        this.createStoneRoad(ground, 15, 25, 65, 25, 128); // Horizontal main street (cobblestone)
        this.createStoneRoad(ground, 40, 10, 40, 50, 133); // Vertical main street (brick)
        
        // Create smaller paths
        this.createStoneRoad(ground, 20, 15, 60, 15, 152); // North road (flagstone)
        this.createStoneRoad(ground, 20, 35, 60, 35, 152); // South road (flagstone)

        // Create town buildings
        this.createTownHouse(walls, props, shadows, 20, 5, 12, 8, 'house');
        this.createTownHouse(walls, props, shadows, 50, 5, 12, 8, 'shop');
        this.createTownHouse(walls, props, shadows, 20, 40, 12, 8, 'inn');
        this.createTownHouse(walls, props, shadows, 50, 40, 12, 8, 'blacksmith');
        
        // Create town square with fountain
        this.createTownSquare(ground, props, shadows, 35, 20, 10, 10);

        // Add decorative elements
        this.addTownTrees(props, shadows, width, height);
        this.addTownDecorations(props, shadows, width, height);

        return {
            name: 'Town',
            description: 'A bustling town with shops, houses, and a central square',
            width,
            height,
            tileSize: 16,
            backgroundColor: 0x87CEEB,
            spawnPoints: {
                player: { x: 640, y: 400 }, // Center of town square
                npcs: [
                    { x: 400, y: 120, type: 'merchant' },
                    { x: 800, y: 120, type: 'shopkeeper' },
                    { x: 400, y: 720, type: 'innkeeper' },
                    { x: 800, y: 720, type: 'blacksmith' },
                    { x: 640, y: 300, type: 'town_guard' }
                ]
            },
            interactables: [
                { x: 400, y: 200, type: 'house', action: 'enter_house' },
                { x: 800, y: 200, type: 'shop', action: 'enter_shop' },
                { x: 400, y: 640, type: 'inn', action: 'enter_inn' },
                { x: 800, y: 640, type: 'blacksmith', action: 'enter_blacksmith' },
                { x: 640, y: 400, type: 'fountain', action: 'examine_fountain' }
            ],
            config: {
                width,
                height,
                tileSize: 16,
                layers: { ground, walls, props, shadows }
            }
        };
    }

    // Helper methods for town creation
    private createStoneRoad(ground: number[][], startX: number, startY: number, endX: number, endY: number, tileType: number): void {
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = startX < endX ? 1 : -1;
        const sy = startY < endY ? 1 : -1;
        let err = dx - dy;

        let x = startX;
        let y = startY;

        while (true) {
            // Set road tile with some width
            for (let py = y - 1; py <= y + 1; py++) {
                for (let px = x - 1; px <= x + 1; px++) {
                    if (px >= 0 && px < ground[0].length && py >= 0 && py < ground.length) {
                        ground[py][px] = tileType;
                    }
                }
            }

            if (x === endX && y === endY) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    private createTownHouse(walls: number[][], props: number[][], shadows: number[][], x: number, y: number, width: number, height: number, type: string): void {
        // House walls
        for (let hy = y; hy < y + height; hy++) {
            for (let hx = x; hx < x + width; hx++) {
                if (hx === x || hx === x + width - 1 || hy === y || hy === y + height - 1) {
                    if (hx < walls[0].length && hy < walls.length) {
                        walls[hy][hx] = 1; // Wall tile
                    }
                }
            }
        }

        // Door
        if (y + height < walls.length) {
            walls[y + height - 1][x + Math.floor(width / 2)] = 0;
        }

        // Add building-specific props
        if (type === 'blacksmith' && x + 2 < props[0].length && y - 1 >= 0) {
            props[y - 1][x + 2] = 5; // Chimney/smoke
        }
    }

    private createTownSquare(ground: number[][], props: number[][], shadows: number[][], centerX: number, centerY: number, width: number, height: number): void {
        // Clear area with stone tiles
        for (let y = centerY - height/2; y < centerY + height/2; y++) {
            for (let x = centerX - width/2; x < centerX + width/2; x++) {
                if (x >= 0 && x < ground[0].length && y >= 0 && y < ground.length) {
                    ground[y][x] = 130; // Smooth stone
                }
            }
        }

        // Add fountain in center
        if (centerX < props[0].length && centerY < props.length) {
            props[centerY][centerX] = 10; // Fountain prop (need to check what prop index this should be)
        }
    }

    private addTownTrees(props: number[][], shadows: number[][], width: number, height: number): void {
        // Add trees along roads and in corners using actual plant tileset indices
        const treePositions = [
            { x: 10, y: 10, type: 49 }, // large_tree_1
            { x: 70, y: 10, type: 50 }, // large_tree_2
            { x: 10, y: 50, type: 1 },  // small_tree_1
            { x: 70, y: 50, type: 2 },  // small_tree_2
            { x: 25, y: 20, type: 3 },  // small_tree_3
            { x: 55, y: 20, type: 49 }  // large_tree_1
        ];

        treePositions.forEach(pos => {
            if (pos.x < width && pos.y < height && props[pos.y][pos.x] === 0) {
                props[pos.y][pos.x] = pos.type;
                if (pos.y + 1 < height) {
                    shadows[pos.y + 1][pos.x] = 1;
                }
            }
        });
    }

    private addTownDecorations(props: number[][], shadows: number[][], width: number, height: number): void {
        // Add decorative elements using actual plant indices
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (Math.random() < 0.02 && props[y][x] === 0) {
                    const decorations = [81, 82, 33, 34, 17, 18]; // rocks, flowers, bushes
                    props[y][x] = decorations[Math.floor(Math.random() * decorations.length)];
                }
            }
        }
    }

    /**
     * Create a tilemap from a level template
     */
    createFromTemplate(template: LevelTemplate): Phaser.Tilemaps.Tilemap {
        return this.renderer.createLevel(template.config);
    }
}