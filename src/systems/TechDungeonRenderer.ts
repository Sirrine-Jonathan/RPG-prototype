export class TechDungeonRenderer {
  private scene: Phaser.Scene;
  private tileSize = 32; // Correct tile size
  private tilesPerRow = 37; // Actual tileset width

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Tile indices based on the tileset grid (8 tiles per row)
  private getTileIndex(row: number, col: number): number {
    return row * this.tilesPerRow + col;
  }

  createTechRoom(mapWidth: number, mapHeight: number): Phaser.Tilemaps.Tilemap {
    const map = this.scene.make.tilemap({
      tileWidth: this.tileSize,
      tileHeight: this.tileSize,
      width: mapWidth,
      height: mapHeight,
    });

    const tileset = map.addTilesetImage(
      "tileset",
      "tileset",
      this.tileSize,
      this.tileSize
    );
    const floorLayer = map.createBlankLayer("floor", tileset!, 0, 0);

    // Use the correct tile indices
    const floorTile = 71; // Main floor tile

    // Fill floor
    floorLayer!.fill(floorTile, 0, 0, mapWidth, mapHeight);

    return map;
  }
}
