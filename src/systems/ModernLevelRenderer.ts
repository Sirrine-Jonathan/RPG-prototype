export class ModernLevelRenderer {
  private scene: Phaser.Scene;
  private tileSize = 16;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createTechStation(mapWidth: number, mapHeight: number): Phaser.Tilemaps.Tilemap {
    // Create a larger, more detailed level using graphics instead of tilesets
    this.createModernBackground(mapWidth * this.tileSize, mapHeight * this.tileSize);
    
    // Return a dummy tilemap for compatibility
    const map = this.scene.make.tilemap({
      tileWidth: this.tileSize,
      tileHeight: this.tileSize,
      width: mapWidth,
      height: mapHeight,
    });

    return map;
  }

  private createModernBackground(width: number, height: number): void {
    // Create a modern tech lab background using graphics
    const graphics = this.scene.add.graphics();
    
    // Dark tech floor
    graphics.fillStyle(0x1a1a2e);
    graphics.fillRect(0, 0, width, height);
    
    // Grid pattern for tech feel
    graphics.lineStyle(1, 0x16213e, 0.3);
    for (let x = 0; x < width; x += 32) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 32) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }
    graphics.strokePath();
    
    // Walls
    graphics.lineStyle(4, 0x0f3460);
    graphics.strokeRect(16, 16, width - 32, height - 32);
    
    // Tech panels along walls
    this.addTechPanels(graphics, width, height);
    
    // Central area highlight
    graphics.fillStyle(0x16213e, 0.5);
    graphics.fillRect(width * 0.3, height * 0.3, width * 0.4, height * 0.4);
    
    graphics.setDepth(-1); // Behind everything else
  }

  private addTechPanels(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    // Top wall panels
    for (let x = 80; x < width - 80; x += 120) {
      graphics.fillStyle(0x0f3460);
      graphics.fillRect(x, 20, 80, 20);
      graphics.fillStyle(0x00ff41, 0.3);
      graphics.fillRect(x + 10, 25, 60, 10);
    }
    
    // Bottom wall panels
    for (let x = 80; x < width - 80; x += 120) {
      graphics.fillStyle(0x0f3460);
      graphics.fillRect(x, height - 40, 80, 20);
      graphics.fillStyle(0x00ff41, 0.3);
      graphics.fillRect(x + 10, height - 35, 60, 10);
    }
    
    // Side panels
    for (let y = 80; y < height - 80; y += 100) {
      // Left side
      graphics.fillStyle(0x0f3460);
      graphics.fillRect(20, y, 20, 60);
      graphics.fillStyle(0x00ff41, 0.3);
      graphics.fillRect(25, y + 10, 10, 40);
      
      // Right side
      graphics.fillStyle(0x0f3460);
      graphics.fillRect(width - 40, y, 20, 60);
      graphics.fillStyle(0x00ff41, 0.3);
      graphics.fillRect(width - 35, y + 10, 10, 40);
    }
  }
}