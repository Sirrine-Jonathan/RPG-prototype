export class AssetManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preloadPixelArtAssets(): void {
    // Load Pixel Art Top Down tilesets for tilemap usage
    this.scene.load.image(
      "grass_tileset",
      "assets/OLD_ASSETS/Pixel Art Top Down - Basic v1.2.2/Texture/TX Tileset Grass.png"
    );
    this.scene.load.image(
      "stone_tileset",
      "assets/OLD_ASSETS/Pixel Art Top Down - Basic v1.2.2/Texture/TX Tileset Stone Ground.png"
    );
    this.scene.load.image(
      "wall_tileset",
      "assets/OLD_ASSETS/Pixel Art Top Down - Basic v1.2.2/Texture/TX Tileset Wall.png"
    );
    this.scene.load.image(
      "props_tileset",
      "assets/OLD_ASSETS/Pixel Art Top Down - Basic v1.2.2/Texture/TX Props.png"
    );
    this.scene.load.image(
      "shadow_tileset",
      "assets/OLD_ASSETS/Pixel Art Top Down - Basic v1.2.2/Texture/TX Shadow.png"
    );
    this.scene.load.image(
      "plant_tileset",
      "assets/OLD_ASSETS/Pixel Art Top Down - Basic v1.2.2/Texture/TX Plant.png"
    );
    this.scene.load.image(
      "struct_tileset",
      "assets/OLD_ASSETS/Pixel Art Top Down - Basic v1.2.2/Texture/TX Struct.png"
    );

    // Modern interior and exterior tilesets
    this.scene.load.spritesheet(
      "modern_interiors",
      "assets/Modern tiles_Free/Interiors_free/16x16/Interiors_free_16x16.png",
      { frameWidth: 16, frameHeight: 16 }
    );
    this.scene.load.spritesheet(
      "room_builder",
      "assets/Modern tiles_Free/Interiors_free/16x16/Room_Builder_free_16x16.png",
      { frameWidth: 16, frameHeight: 16 }
    );

    // Modern character assets - with spacing between frames
    this.scene.load.spritesheet(
      "adam",
      "assets/Modern tiles_Free/Characters_free/Adam_16x16.png",
      {
        frameWidth: 16,
        frameHeight: 32,
        margin: 0,
      }
    );
    this.scene.load.spritesheet(
      "alex",
      "assets/Modern tiles_Free/Characters_free/Alex_16x16.png",
      {
        frameWidth: 16,
        frameHeight: 32,
        margin: 0,
      }
    );
    this.scene.load.spritesheet(
      "amelia",
      "assets/Modern tiles_Free/Characters_free/Amelia_16x16.png",
      {
        frameWidth: 16,
        frameHeight: 32,
        margin: 0,
      }
    );
    this.scene.load.spritesheet(
      "bob",
      "assets/Modern tiles_Free/Characters_free/Bob_16x16.png",
      {
        frameWidth: 16,
        frameHeight: 32,
        margin: 0,
      }
    );

    // Keep old assets for backward compatibility
    this.scene.load.spritesheet(
      "player_blue",
      "assets/OLD_ASSETS/Tech Dungeon Roguelite - Asset Pack (DEMO)/Players/players blue x1.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.scene.load.image(
      "tileset",
      "assets/OLD_ASSETS/Tech Dungeon Roguelite - Asset Pack (DEMO)/tileset x1.png"
    );
  }

  preloadTechDungeonAssets(): void {
    // Backward compatibility method
    this.preloadPixelArtAssets();
  }

  createPlayerAnimations(): void {
    // Check if animations already exist to prevent warnings
    if (this.scene.anims.exists('adam_idle')) {
      return;
    }
    // Modern character animations - 24 frames per row
    // Row 0 (frames 0-23): Down-facing walk
    // Row 1 (frames 24-47): Left-facing walk
    // Row 2 (frames 48-71): Right-facing walk
    // Row 3 (frames 72-95): Up-facing walk

    this.scene.anims.create({
      key: "adam_idle",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 0,
        end: 0,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_idle_right",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 24,
        end: 29,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_idle_up",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 30,
        end: 35,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_idle_left",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 36,
        end: 41,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_idle_down",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 42,
        end: 47,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_walk_right",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 48,
        end: 53,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_walk_up",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 54,
        end: 59,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_walk_left",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 60,
        end: 65,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "adam_walk_down",
      frames: this.scene.anims.generateFrameNumbers("adam", {
        start: 66,
        end: 69,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Alex animations (for NPCs) - same layout as Adam
    this.scene.anims.create({
      key: "alex_idle_down",
      frames: this.scene.anims.generateFrameNumbers("alex", { start: 42, end: 47 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "alex_idle_left",
      frames: this.scene.anims.generateFrameNumbers("alex", { start: 36, end: 41 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "alex_idle_right",
      frames: this.scene.anims.generateFrameNumbers("alex", { start: 24, end: 29 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "alex_idle_up",
      frames: this.scene.anims.generateFrameNumbers("alex", { start: 30, end: 35 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "alex_walk_down",
      frames: this.scene.anims.generateFrameNumbers("alex", {
        start: 66,
        end: 69,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "alex_walk_left",
      frames: this.scene.anims.generateFrameNumbers("alex", {
        start: 60,
        end: 65,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "alex_walk_right",
      frames: this.scene.anims.generateFrameNumbers("alex", {
        start: 48,
        end: 53,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "alex_walk_up",
      frames: this.scene.anims.generateFrameNumbers("alex", {
        start: 54,
        end: 59,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Amelia animations (for NPCs) - same layout as Adam
    this.scene.anims.create({
      key: "amelia_idle_down",
      frames: this.scene.anims.generateFrameNumbers("amelia", { start: 42, end: 47 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "amelia_idle_left",
      frames: this.scene.anims.generateFrameNumbers("amelia", { start: 36, end: 41 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "amelia_idle_right",
      frames: this.scene.anims.generateFrameNumbers("amelia", { start: 24, end: 29 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "amelia_idle_up",
      frames: this.scene.anims.generateFrameNumbers("amelia", { start: 30, end: 35 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "amelia_walk_down",
      frames: this.scene.anims.generateFrameNumbers("amelia", {
        start: 66,
        end: 69,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "amelia_walk_left",
      frames: this.scene.anims.generateFrameNumbers("amelia", {
        start: 60,
        end: 65,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "amelia_walk_right",
      frames: this.scene.anims.generateFrameNumbers("amelia", {
        start: 48,
        end: 53,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "amelia_walk_up",
      frames: this.scene.anims.generateFrameNumbers("amelia", {
        start: 54,
        end: 59,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Bob animations (for NPCs) - same layout as Adam
    this.scene.anims.create({
      key: "bob_idle_down",
      frames: this.scene.anims.generateFrameNumbers("bob", { start: 42, end: 47 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "bob_idle_left",
      frames: this.scene.anims.generateFrameNumbers("bob", { start: 36, end: 41 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "bob_idle_right",
      frames: this.scene.anims.generateFrameNumbers("bob", { start: 24, end: 29 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "bob_idle_up",
      frames: this.scene.anims.generateFrameNumbers("bob", { start: 30, end: 35 }),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "bob_walk_down",
      frames: this.scene.anims.generateFrameNumbers("bob", {
        start: 66,
        end: 69,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "bob_walk_left",
      frames: this.scene.anims.generateFrameNumbers("bob", {
        start: 60,
        end: 65,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "bob_walk_right",
      frames: this.scene.anims.generateFrameNumbers("bob", {
        start: 48,
        end: 53,
      }),
      frameRate: 8,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "bob_walk_up",
      frames: this.scene.anims.generateFrameNumbers("bob", {
        start: 54,
        end: 59,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Old tech dungeon player animations (keep for compatibility)
    this.scene.anims.create({
      key: "player_idle",
      frames: this.scene.anims.generateFrameNumbers("player_blue", {
        start: 0,
        end: 0,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "player_walk",
      frames: this.scene.anims.generateFrameNumbers("player_blue", {
        start: 24,
        end: 27,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: "player_run",
      frames: this.scene.anims.generateFrameNumbers("player_blue", {
        start: 24,
        end: 27,
      }),
      frameRate: 12,
      repeat: -1,
    });
  }

  // Tileset mapping for easy reference
  getTileIndex(tileType: string): number {
    const tileMap: { [key: string]: number } = {
      // Based on the tileset image, approximate positions
      floor: 0,
      wall_top: 8,
      wall_side: 16,
      wall_corner: 24,
      door: 32,
      tech_panel: 40,
      computer: 48,
    };
    return tileMap[tileType] || 0;
  }
}
