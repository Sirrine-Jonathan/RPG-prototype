import { Scene } from 'phaser';
import { Debug } from '../utils/Debug';

export interface LayerData {
    tileset: string;
    data: number[][];
}

export interface LevelData {
    name: string;
    width: number;
    height: number;
    tileSize: number;
    collision?: number[][];
    objects?: LevelObject[];
    layers: {
        collision?: number[][];
        objects?: LevelObject[];
        [layerName: string]: any;
    };
}

export interface LevelObject {
    id: string;
    type: 'npc' | 'interactive' | 'spawn' | 'portal';
    subtype: string;
    x: number;
    y: number;
    properties?: { [key: string]: any };
}

export class LevelLoader {
    private scene: Scene;
    private levelData: LevelData | null = null;
    private tilemap: Phaser.Tilemaps.Tilemap | null = null;
    private layers: Map<string, Phaser.Tilemaps.TilemapLayer> = new Map();
    private objects: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    async loadLevel(levelId: string): Promise<void> {
        try {
            const response = await fetch(`/levels/${levelId}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load level: ${levelId}`);
            }
            
            this.levelData = await response.json();
            console.log(`🔍 LevelLoader: Raw JSON loaded:`, this.levelData);
            console.log(`🔍 LevelLoader: Objects in JSON:`, this.levelData.objects);
            
            // Load all tilesets
            const tilesetPromises: Promise<void>[] = [];
            const tilesetKeyMap = new Map<string, string>(); // tileset path -> key
            
            Object.entries(this.levelData.layers).forEach(([layerName, layerData]) => {
                if (layerName === 'collision' || layerName === 'objects') return;
                
                const tilesetData = layerData as LayerData;
                let tilesetKey = tilesetKeyMap.get(tilesetData.tileset);
                
                if (!tilesetKey) {
                    // Create new tileset key for this tileset file
                    tilesetKey = `tileset_${levelId}_${layerName}`;
                    tilesetKeyMap.set(tilesetData.tileset, tilesetKey);
                    
                    if (!this.scene.textures.exists(tilesetKey)) {
                        this.scene.load.image(tilesetKey, tilesetData.tileset);
                        tilesetPromises.push(new Promise<void>((resolve) => {
                            this.scene.load.once('complete', () => resolve());
                        }));
                    }
                }
            });
            
            if (tilesetPromises.length > 0) {
                this.scene.load.start();
                await Promise.all(tilesetPromises);
            }
            
            this.createTilemaps(levelId);
            this.renderLayers();
            this.placeObjects();
            
        } catch (error) {
            console.error('Failed to load level:', error);
            throw error;
        }
    }

    private createTilemaps(levelId: string): void {
        if (!this.levelData) return;

        // Create tileset key mapping
        const tilesetKeyMap = new Map<string, string>();
        Object.entries(this.levelData.layers).forEach(([layerName, layerData]) => {
            if (layerName === 'collision' || layerName === 'objects') return;
            const tilesetData = layerData as LayerData;
            if (!tilesetKeyMap.has(tilesetData.tileset)) {
                tilesetKeyMap.set(tilesetData.tileset, `tileset_${levelId}_${layerName}`);
            }
        });

        Object.entries(this.levelData.layers).forEach(([layerName, layerData]) => {
            if (layerName === 'collision' || layerName === 'objects') return;
            
            const tilesetData = layerData as LayerData;
            const tilesetKey = tilesetKeyMap.get(tilesetData.tileset)!;
            
            const tilemap = this.scene.make.tilemap({
                data: tilesetData.data,
                tileWidth: this.levelData!.tileSize,
                tileHeight: this.levelData!.tileSize,
                width: this.levelData!.width,
                height: this.levelData!.height
            });

            const tileset = tilemap.addTilesetImage(tilesetKey, tilesetKey, 
                this.levelData!.tileSize, this.levelData!.tileSize);

            if (tileset) {
                const layer = tilemap.createLayer(0, tileset, 0, 0);
                if (layer) {
                    layer.setDepth(layerName === 'background' ? -1 : 0);
                    this.layers.set(layerName, layer);
                }
            }
        });
    }

    private renderLayers(): void {
        if (!this.levelData) return;

        // Handle collision layer
        const collisionData = this.levelData.layers.collision;
        const backgroundLayer = this.layers.get('background');
        
        if (backgroundLayer && Array.isArray(collisionData)) {
            for (let y = 0; y < collisionData.length; y++) {
                for (let x = 0; x < collisionData[y].length; x++) {
                    const tileValue = collisionData[y][x];
                    if (tileValue === 1) {
                        const tile = backgroundLayer.getTileAt(x, y);
                        if (tile) {
                            tile.setCollision(true);
                        }
                    }
                }
            }
        }
    }

    private placeObjects(): void {
        if (!this.levelData || !this.levelData.layers.objects) return;

        // Clear existing objects
        this.objects.forEach(obj => obj.destroy());
        this.objects = [];

        // Place new objects
        this.levelData.layers.objects.forEach(objData => {
            const worldX = objData.x * this.levelData!.tileSize + this.levelData!.tileSize / 2;
            const worldY = objData.y * this.levelData!.tileSize + this.levelData!.tileSize / 2;

            let gameObject: Phaser.GameObjects.GameObject | null = null;

            switch (objData.type) {
                case 'spawn':
                    if (objData.subtype === 'player') {
                        // Create player spawn marker (visible only in debug mode)
                        gameObject = this.scene.add.circle(worldX, worldY, 8, 0x00ff00, Debug.enabled ? 0.5 : 0);
                        (gameObject as any).objectData = objData;
                    }
                    break;

                case 'npc':
                    // Create simple NPC representation
                    gameObject = this.scene.add.circle(worldX, worldY, 16, 0x0066cc);
                    const npcText = this.scene.add.text(worldX, worldY - 30, 
                        objData.properties?.name || 'NPC', 
                        { fontSize: '12px', color: '#ffffff' }
                    ).setOrigin(0.5);
                    (gameObject as any).objectData = objData;
                    (gameObject as any).nameText = npcText;
                    break;

                case 'interactive':
                    // Create interactive object representation
                    let color = 0xffaa00;
                    let symbol = '?';
                    
                    switch (objData.subtype) {
                        case 'chest': color = 0x8B4513; symbol = '📦'; break;
                        case 'door': color = 0x654321; symbol = '🚪'; break;
                        case 'sign': color = 0x888888; symbol = '📋'; break;
                    }
                    
                    gameObject = this.scene.add.rectangle(worldX, worldY, 24, 24, color);
                    const symbolText = this.scene.add.text(worldX, worldY, symbol, 
                        { fontSize: '16px' }
                    ).setOrigin(0.5);
                    (gameObject as any).objectData = objData;
                    (gameObject as any).symbolText = symbolText;
                    break;

                case 'portal':
                    // Portals are handled by PortalService, no visual representation needed here
                    break;
            }

            if (gameObject) {
                this.objects.push(gameObject);
            }
        });
    }

    getPlayerSpawn(): { x: number, y: number } | null {
        if (!this.levelData || !this.levelData.layers.objects) return null;

        const spawnObject = this.levelData.layers.objects.find(
            obj => obj.type === 'spawn' && obj.subtype === 'player'
        );

        if (spawnObject) {
            return {
                x: spawnObject.x * this.levelData.tileSize + this.levelData.tileSize / 2,
                y: spawnObject.y * this.levelData.tileSize + this.levelData.tileSize / 2
            };
        }

        return null;
    }

    getCollisionLayer(): Phaser.Tilemaps.TilemapLayer | null {
        return this.layers.get('background') || null;
    }

    getLevelData(): LevelData | null {
        return this.levelData;
    }

    destroy(): void {
        this.objects.forEach(obj => obj.destroy());
        this.objects = [];
        
        this.layers.forEach(layer => layer.destroy());
        this.layers.clear();
        
        this.levelData = null;
    }
}
