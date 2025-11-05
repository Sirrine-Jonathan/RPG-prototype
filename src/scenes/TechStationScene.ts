import { BaseScene } from "./BaseScene";
import { SmartNPC } from "../entities/SmartNPC";
import { ProximityService } from "../services/ProximityService";
import { ModernLevelRenderer } from "../systems/ModernLevelRenderer";
import { AssetManager } from "../systems/AssetManager";
import {
  InteractiveObject,
  InteractionResult,
} from "../entities/InteractiveObject";
import { NPCTool } from "../services/AIService";

class SearchableDevice extends InteractiveObject {
  private hasCore: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    name: string,
    hasCore: boolean
  ) {
    super(scene, x, y, id, name, 0x444444);
    this.hasCore = hasCore;
  }

  getOfferedTools(): NPCTool[] {
    return [
      {
        name: "search",
        description: `Search ${this.name} for the Energy Core`,
      },
    ];
  }

  handleInteraction(toolName: string, parameters?: any): InteractionResult {
    if (toolName === "search") {
      if (this.hasCore) {
        console.log(
          `🎉 MISSION SUCCESS! ${this.name} contained the Energy Core!`
        );
        return {
          success: true,
          message: "SUCCESS! Found the Energy Core! The station is saved!",
        };
      } else {
        console.log(
          `🔍 SEARCH RESULT: ${this.name} searched - no Energy Core found`
        );
        return {
          success: false,
          message: `Searched ${this.name} - no Energy Core found here.`,
        };
      }
    }

    return {
      success: false,
      message: `Cannot ${toolName} with ${this.name}`,
    };
  }
}

export class TechStationScene extends BaseScene {
  private player!: Phaser.GameObjects.Sprite;
  private robot!: SmartNPC;
  private drChen!: SmartNPC;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private proximityService!: ProximityService;
  private levelRenderer!: ModernLevelRenderer;
  private assetManager!: AssetManager;
  private isMoving = false;
  private lastDirection = "down"; // Track last movement direction
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private searchableObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "TechStationScene" });
  }

  preload() {
    this.assetManager = new AssetManager(this);
    this.assetManager.preloadTechDungeonAssets();
  }

  create() {
    super.create();

    this.levelRenderer = new ModernLevelRenderer(this);
    this.assetManager.createPlayerAnimations();

    this.tilemap = this.levelRenderer.createTechStation(50, 38);

    this.setGameAreaSize(800, 608); // 50*16 = 800, 38*16 = 608

    // Title with tech styling
    this.add
      .text(400, 30, "TECH STATION ALPHA", {
        fontSize: "24px",
        color: "#00ff00",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Back to menu button
    this.add
      .text(20, 20, "← MAIN", {
        fontSize: "16px",
        color: "#00ff00",
        backgroundColor: "#001100",
        padding: { x: 8, y: 4 },
        fontFamily: "monospace",
      })
      .setInteractive()
      .on("pointerdown", () => this.scene.start("MainMenuScene"));

    // Create tech NPCs with shared objective - ACTION FOCUSED
    this.robot = new SmartNPC(
      this,
      300,
      150,
      "alex", // Use Alex sprite for the robot character
      "THE_ROBOT",
      "methodical AI system, prioritizes immediate action over discussion",
      "You are the station AI. URGENT MISSION: Find the Energy Core NOW by searching every device in this room. SEARCH objects immediately when you discover them. Don't waste time talking - ACT FIRST, then briefly coordinate with Dr. Chen only if needed.",
      "ai"
    );

    this.drChen = new SmartNPC(
      this,
      500,
      150,
      "amelia", // Use Amelia sprite for Dr. Chen
      "Dr. Chen",
      "action-oriented scientist, believes in systematic searching over theorizing",
      "You are the lead researcher. URGENT MISSION: Find the Energy Core NOW by searching every device in this room. SEARCH objects immediately when you discover them. Don't waste time on long discussions - ACT FIRST, then briefly coordinate with THE_ROBOT only if needed.",
      "scientist"
    );

    // Create player with sprite animation
    this.createPlayer();

    // Add searchable objects for the NPCs to find
    this.createSearchableObjects();

    // Set up room context
    this.setupRoomContext();

    // Initialize proximity service
    this.proximityService = new ProximityService();
    this.proximityService.addNPC(this.robot);
    this.proximityService.addNPC(this.drChen);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Click to move
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.isDragging) {
        this.movePlayerTo(pointer.worldX, pointer.worldY);
      }
    });
  }

  private createPlayer(): void {
    this.player = this.add.sprite(400, 300, "adam", 0);
    this.player.setScale(2); // Scale up the 16x16 sprite
    this.player.setOrigin(0.5, 0.5); // Center the sprite
    this.player.play(`adam_idle_${this.lastDirection}`);
  }

  private createSearchableObjects(): void {
    // Create interactive objects that NPCs can search for the Energy Core
    const objectData = [
      {
        x: 80,
        y: 80,
        id: "console_1",
        name: "Control Console",
        hasCore: false,
        frame: 45,
      },
      {
        x: 720,
        y: 80,
        id: "scanner_1",
        name: "Data Scanner",
        hasCore: false,
        frame: 47,
      },
      {
        x: 120,
        y: 520,
        id: "storage_1",
        name: "Storage Unit",
        hasCore: true,
        frame: 49,
      },
      {
        x: 680,
        y: 520,
        id: "terminal_1",
        name: "Research Terminal",
        hasCore: false,
        frame: 51,
      },
      {
        x: 400,
        y: 200,
        id: "mainframe_1",
        name: "Central Mainframe",
        hasCore: false,
        frame: 53,
      },
      {
        x: 200,
        y: 300,
        id: "server_1",
        name: "Server Rack",
        hasCore: false,
        frame: 55,
      },
      {
        x: 600,
        y: 300,
        id: "analyzer_1",
        name: "Data Analyzer",
        hasCore: false,
        frame: 57,
      },
    ];

    objectData.forEach((data) => {
      // Create sprite from modern interiors tileset
      const sprite = this.add.sprite(
        data.x,
        data.y,
        "modern_interiors",
        data.frame
      );
      sprite.setScale(2); // Scale up for visibility

      // Add glowing effect for the core location
      if (data.hasCore) {
        sprite.setTint(0x00ff88);
        this.tweens.add({
          targets: sprite,
          alpha: { from: 0.8, to: 1.0 },
          duration: 1000,
          yoyo: true,
          repeat: -1,
        });
      }

      // Add label
      this.add
        .text(data.x, data.y + 25, data.name, {
          fontSize: "10px",
          color: "#ffffff",
          backgroundColor: "#000000cc",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);

      // Create searchable device
      const searchableDevice = new SearchableDevice(
        this,
        data.x,
        data.y,
        data.id,
        data.name,
        data.hasCore
      );

      console.log(
        `🏗️ Created searchable object: ${data.name} at (${data.x}, ${
          data.y
        }) - ${data.hasCore ? "HAS ENERGY CORE" : "empty"}`
      );
      this.searchableObjects.push(searchableDevice);
    });
  }

  private setupRoomContext(): void {
    const playerCharacter = {
      id: "player",
      name: "Technician",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allCharacters = [playerCharacter, this.robot, this.drChen];
    const grid = Array(19)
      .fill(null)
      .map(() => Array(25).fill(0));

    console.log(
      `🎯 MISSION SETUP: Both NPCs must find the Energy Core hidden in the Storage Unit`
    );
    console.log(`📍 TARGET LOCATION: Storage Unit at (180, 450)`);
    console.log(`🤖 NPCs: THE_ROBOT and Dr. Chen both have the same objective`);

    // Give each NPC visibility of all other characters AND the searchable objects
    this.robot.setRoomContext(
      this.searchableObjects,
      [playerCharacter, this.drChen],
      grid
    );
    this.drChen.setRoomContext(
      this.searchableObjects,
      [playerCharacter, this.robot],
      grid
    );
  }

  update() {
    const isChatFocused =
      document.activeElement?.tagName === "TEXTAREA" ||
      document.activeElement?.tagName === "INPUT";

    if (!isChatFocused && !this.isMoving) {
      const speed = 200;
      let moving = false;

      if (this.cursors.left.isDown) {
        this.player.x -= (speed * this.game.loop.delta) / 1000;
        moving = true;
      } else if (this.cursors.right.isDown) {
        this.player.x += (speed * this.game.loop.delta) / 1000;
        moving = true;
      }

      if (this.cursors.up.isDown) {
        this.player.y -= (speed * this.game.loop.delta) / 1000;
        moving = true;
      } else if (this.cursors.down.isDown) {
        this.player.y += (speed * this.game.loop.delta) / 1000;
        moving = true;
      }

      // Play appropriate animation
      if (moving) {
        if (this.cursors.left.isDown) {
          this.player.play("adam_walk_left", true);
          this.lastDirection = "left";
        } else if (this.cursors.right.isDown) {
          this.player.play("adam_walk_right", true);
          this.lastDirection = "right";
        } else if (this.cursors.up.isDown) {
          this.player.play("adam_walk_up", true);
          this.lastDirection = "up";
        } else if (this.cursors.down.isDown) {
          this.player.play("adam_walk_down", true);
          this.lastDirection = "down";
        }
      } else {
        this.player.play(`adam_idle_${this.lastDirection}`, true);
      }

      // Keep player in bounds
      this.player.x = Phaser.Math.Clamp(this.player.x, 32, 768);
      this.player.y = Phaser.Math.Clamp(this.player.y, 32, 576);
    }

    // Update proximity and chat
    this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
    const nearestNPC = this.proximityService.getNearestNPC();
    const nearbyNPCs = nearestNPC ? [nearestNPC] : [];
    this.chatInterface.updateNearbyNPCs(nearbyNPCs);

    // Check building interactions
    // this.checkBuildingInteractions();
  }

  movePlayerTo(x: number, y: number) {
    this.isMoving = true;
    this.player.play("adam_walk_down");

    this.tweens.add({
      targets: this.player,
      x: x,
      y: y,
      duration: 500,
      ease: "Power2",
      onComplete: () => {
        this.isMoving = false;
        this.player.play(`adam_idle_${this.lastDirection}`);
      },
    });
  }

  checkBuildingInteractions() {
    const buildings = [
      { x: 176, y: 160, scene: "SecurityStationScene" }, // Security (top-left)
      { x: 624, y: 160, scene: "ResearchLabScene" }, // Research (top-right)
      { x: 176, y: 432, scene: "MedicalBayScene" }, // Medical (bottom-left)
      { x: 624, y: 432, scene: "EngineeringBayScene" }, // Engineering (bottom-right)
    ];

    buildings.forEach((building) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        building.x,
        building.y
      );

      if (distance < 60) {
        this.scene.start(building.scene);
      }
    });
  }

  destroy() {
    this.robot.destroy();
    this.drChen.destroy();
    super.destroy();
  }
}
