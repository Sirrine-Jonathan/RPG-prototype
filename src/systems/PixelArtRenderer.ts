import { Scene } from 'phaser';

export interface LevelConfig {
    width: number;
    height: number;
    tileSize: number;
    layers: {
        ground?: number[][];
        walls?: number[][];
        props?: number[][];
        shadows?: number[][];
    };
}

export class PixelArtRenderer {
    private scene: Scene;
    private tileSize: number = 16;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Create a tilemap using the pixel art assets
     */
    createLevel(config: LevelConfig): Phaser.Tilemaps.Tilemap {
        const { width, height, tileSize, layers } = config;
        this.tileSize = tileSize;

        // Create blank tilemap
        const map = this.scene.make.tilemap({
            width: width,
            height: height,
            tileWidth: tileSize,
            tileHeight: tileSize
        });

        // Add tilesets
        const grassTileset = map.addTilesetImage('grass', 'grass_tileset');
        const stoneTileset = map.addTilesetImage('stone', 'stone_tileset');
        const wallTileset = map.addTilesetImage('walls', 'wall_tileset');
        const propsTileset = map.addTilesetImage('props', 'props_tileset');
        const shadowTileset = map.addTilesetImage('shadows', 'shadow_tileset');

        // Create layers in proper order (back to front)
        if (layers.ground) {
            const groundLayer = map.createBlankLayer('ground', [grassTileset!, stoneTileset!]);
            this.fillLayer(groundLayer!, layers.ground);
        }

        if (layers.shadows) {
            const shadowLayer = map.createBlankLayer('shadows', shadowTileset!);
            this.fillLayer(shadowLayer!, layers.shadows);
        }

        if (layers.walls) {
            const wallLayer = map.createBlankLayer('walls', wallTileset!);
            this.fillLayer(wallLayer!, layers.walls);
            wallLayer?.setCollisionByExclusion([0]); // Make walls collidable
        }

        if (layers.props) {
            const propsLayer = map.createBlankLayer('props', propsTileset!);
            this.fillLayer(propsLayer!, layers.props);
        }

        return map;
    }

    /**
     * Fill a layer with tile data
     */
    private fillLayer(layer: Phaser.Tilemaps.TilemapLayer, data: number[][]) {
        for (let y = 0; y < data.length; y++) {
            for (let x = 0; x < data[y].length; x++) {
                if (data[y][x] > 0) {
                    layer.putTileAt(data[y][x], x, y);
                }
            }
        }
    }

    /**
     * Create a simple grass field with some variation
     */
    createGrassField(width: number, height: number): LevelConfig {
        const ground: number[][] = [];
        
        for (let y = 0; y < height; y++) {
            ground[y] = [];
            for (let x = 0; x < width; x++) {
                // Use different grass tiles for variation (assuming tiles 1-4 are grass variants)
                ground[y][x] = Math.random() < 0.8 ? 1 : (Math.random() < 0.5 ? 2 : 3);
            }
        }

        return {
            width,
            height,
            tileSize: 16,
            layers: { ground }
        };
    }

    /**
     * Create a stone courtyard with grass borders
     */
    createStoneCourtyard(width: number, height: number): LevelConfig {
        const ground: number[][] = [];
        
        for (let y = 0; y < height; y++) {
            ground[y] = [];
            for (let x = 0; x < width; x++) {
                // Border of grass, center of stone
                if (x < 3 || x >= width - 3 || y < 3 || y >= height - 3) {
                    ground[y][x] = 1; // Grass
                } else {
                    ground[y][x] = 10; // Stone (assuming stone tiles start at index 10)
                }
            }
        }

        return {
            width,
            height,
            tileSize: 16,
            layers: { ground }
        };
    }

    /**
     * Create a room with walls
     */
    createRoom(width: number, height: number): LevelConfig {
        const ground: number[][] = [];
        const walls: number[][] = [];
        
        for (let y = 0; y < height; y++) {
            ground[y] = [];
            walls[y] = [];
            for (let x = 0; x < width; x++) {
                // Floor
                ground[y][x] = 10; // Stone floor
                
                // Walls around perimeter
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    walls[y][x] = 1; // Wall tile
                } else {
                    walls[y][x] = 0; // No wall
                }
            }
        }

        // Add doorways
        const midX = Math.floor(width / 2);
        const midY = Math.floor(height / 2);
        walls[0][midX] = 0; // Top door
        walls[height - 1][midX] = 0; // Bottom door
        walls[midY][0] = 0; // Left door
        walls[midY][width - 1] = 0; // Right door

        return {
            width,
            height,
            tileSize: 16,
            layers: { ground, walls }
        };
    }

    /**
     * Create a natural outdoor scene with trees and rocks using proper tile indices
     */
    createNaturalScene(width: number, height: number): LevelConfig {
        const ground: number[][] = [];
        const props: number[][] = [];
        const shadows: number[][] = [];
        
        for (let y = 0; y < height; y++) {
            ground[y] = [];
            props[y] = [];
            shadows[y] = [];
            for (let x = 0; x < width; x++) {
                // Use actual grass tile indices for variation
                const grassTypes = [0, 1, 2, 3, 4, 5, 6, 7]; // Basic grass variations
                ground[y][x] = grassTypes[Math.floor(Math.random() * grassTypes.length)];
                props[y][x] = 0;
                shadows[y][x] = 0;
            }
        }

        // Add 2x2 features using proper tile patterns
        this.add2x2Features(props, width, height, [
            { pattern: [[8, 9], [24, 25]], density: 0.02 },    // Flower patches
            { pattern: [[32, 33], [48, 49]], density: 0.01 },  // Tree bases  
            { pattern: [[38, 39], [54, 55]], density: 0.015 }, // Rock clusters
            { pattern: [[40, 41], [56, 57]], density: 0.02 },  // Bushes
            { pattern: [[66, 67], [82, 83]], density: 0.005 }, // Small ponds
            { pattern: [[74, 75], [90, 91]], density: 0.008 }  // Large trees
        ]);

        return {
            width,
            height,
            tileSize: 16,
            layers: { ground, props, shadows }
        };
    }

    /**
     * Add 2x2 tile features to the props layer
     */
    private add2x2Features(props: number[][], width: number, height: number, features: Array<{pattern: number[][], density: number}>) {
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                for (const feature of features) {
                    if (Math.random() < feature.density && this.canPlace2x2(props, x, y)) {
                        // Place 2x2 pattern
                        props[y][x] = feature.pattern[0][0];
                        props[y][x + 1] = feature.pattern[0][1];
                        props[y + 1][x] = feature.pattern[1][0];
                        props[y + 1][x + 1] = feature.pattern[1][1];
                        break; // Only place one feature per location
                    }
                }
            }
        }
    }

    /**
     * Check if a 2x2 area is clear for placement
     */
    private canPlace2x2(props: number[][], x: number, y: number): boolean {
        return props[y][x] === 0 && 
               props[y][x + 1] === 0 && 
               props[y + 1][x] === 0 && 
               props[y + 1][x + 1] === 0;
    }
}
