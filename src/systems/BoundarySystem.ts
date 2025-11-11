export interface LevelBounds {
  width: number;
  height: number;
  tileSize: number;
  collision?: number[][];
}

export class BoundarySystem {
  private static instance: BoundarySystem;
  private currentLevelBounds: LevelBounds | null = null;

  static getInstance(): BoundarySystem {
    if (!BoundarySystem.instance) {
      BoundarySystem.instance = new BoundarySystem();
    }
    return BoundarySystem.instance;
  }

  setLevelBounds(bounds: LevelBounds): void {
    this.currentLevelBounds = bounds;
  }

  isPositionValid(x: number, y: number, margin: number = 48): boolean {
    if (!this.currentLevelBounds) {
      // Fallback to hardcoded bounds if no level data
      return x >= margin && x <= 2400 - margin && y >= margin && y <= 1800 - margin;
    }

    const { width, height, tileSize } = this.currentLevelBounds;
    const maxX = width * tileSize;
    const maxY = height * tileSize;

    // Check basic bounds
    if (x < margin || x > maxX - margin || y < margin || y > maxY - margin) {
      return false;
    }

    // TODO: Check collision layer if available
    // if (this.currentLevelBounds.collision) {
    //   const tileX = Math.floor(x / tileSize);
    //   const tileY = Math.floor(y / tileSize);
    //   if (this.currentLevelBounds.collision[tileY]?.[tileX] === 1) {
    //     return false;
    //   }
    // }

    return true;
  }

  getBounds(): { width: number; height: number } | null {
    if (!this.currentLevelBounds) return null;
    
    return {
      width: this.currentLevelBounds.width * this.currentLevelBounds.tileSize,
      height: this.currentLevelBounds.height * this.currentLevelBounds.tileSize
    };
  }
}