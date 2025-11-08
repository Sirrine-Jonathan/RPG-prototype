import { GameplayScene } from "./GameplayScene";
import { LevelLoader } from "../systems/LevelLoader";
import { SmartNPC } from "../entities/SmartNPC";
import { GuideNPC } from "../entities/GuideNPC";
import { PortalService } from "../systems/PortalService";
import { Pathfinding } from "../utils/Pathfinding";

export class TownScene extends GameplayScene {
  private levelLoader!: LevelLoader;
  private portalService!: PortalService;
  private guideNPC!: GuideNPC;
  private levelBounds = { width: 2400, height: 1824 }; // 50x38 * 48px

  constructor() {
    super({ key: "TownScene" });
  }

  async create() {
    super.create();

    // Initialize services
    this.levelLoader = new LevelLoader(this);
    this.portalService = new PortalService(this);

    try {
      // Load the town level
      await this.levelLoader.loadLevel("town_overworld");

      // Get level data to set proper bounds
      const levelData = this.levelLoader.getLevelData();
      if (levelData) {
        this.levelBounds = {
          width: levelData.width * levelData.tileSize,
          height: levelData.height * levelData.tileSize,
        };
        this.setGameAreaSize(this.levelBounds.width, this.levelBounds.height);
      }

      // Set up portals and spawns from level data
      this.setupPortalsAndSpawns();

      // Reinitialize pathfinding for town scene BEFORE creating player
      console.log(`🏘️ Reinitializing pathfinding for town scene`);
      this.pathfinding = new Pathfinding(30, this.getSceneWidth(), this.getSceneHeight());

      // Create player at appropriate spawn point  
      const portalSpawn = this.portalService.handlePortalEntry();
      const defaultSpawn = this.levelLoader.getPlayerSpawn();
      const spawn = portalSpawn || defaultSpawn;
      this.createPlayer(spawn?.x || 1200, spawn?.y || 896);

      // Create guide NPC 5 tiles in front of player
      this.createGuideNPC();

      // Create NPCs from level objects
      this.createNPCsFromLevel();

      // Set up room context for NPCs (now handled by base class)
      this.setupNPCRoomContext();
    } catch (error) {
      console.error("Failed to load town level:", error);
      this.add
        .text(400, 300, `Failed to load town level: ${error.message}`, {
          fontSize: "18px",
          color: "#ff0000",
        })
        .setOrigin(0.5);

      // Create a basic fallback player
      this.createPlayer(400, 300);
    }
  }

  private createGuideNPC(): void {
    if (!this.player) return;

    // Spawn 5 tiles (240px) in front of player
    const guideX = this.player.x;
    const guideY = this.player.y - 240; // 5 tiles up

    this.guideNPC = new GuideNPC(this, guideX, guideY, "alex");
    this.guideNPC.setFollowTarget(this.player);
    this.proximityService.addNPC(this.guideNPC);
  }

  private createNPCsFromLevel() {
    const levelData = this.levelLoader.getLevelData();
    if (!levelData) return;

    // Create NPCs based on level objects
    levelData.layers.objects.forEach((obj) => {
      if (obj.type === "npc") {
        const worldX = obj.x * levelData.tileSize + levelData.tileSize / 2;
        const worldY = obj.y * levelData.tileSize + levelData.tileSize / 2;

        const npc = new SmartNPC(
          this,
          worldX,
          worldY,
          obj.properties?.character || "alex",
          obj.properties?.name || "NPC",
          obj.properties?.description || "A townsperson",
          `You are ${obj.properties?.name || "an NPC"} in the town.`,
          obj.subtype
        );

        this.proximityService.addNPC(npc);
      }
    });
  }

  // GameplayScene abstract method implementations
  protected getSceneWidth(): number {
    return this.levelBounds.width;
  }

  protected getSceneHeight(): number {
    return this.levelBounds.height;
  }

  protected getPlayerBounds() {
    return {
      minX: 16,
      maxX: this.levelBounds.width - 16,
      minY: 16,
      maxY: this.levelBounds.height - 16,
    };
  }

  protected getExitPosition() {
    return { x: this.levelBounds.width / 2, y: this.levelBounds.height - 50 };
  }

  protected getReturnScene() {
    return "MainMenuScene";
  }

  protected getReturnPosition() {
    return { x: 400, y: 300 };
  }

  private setupPortalsAndSpawns(): void {
    const levelData = this.levelLoader.getLevelData();
    if (!levelData) return;

    // Extract portals and spawn points from level objects
    levelData.layers.objects.forEach((obj) => {
      const worldX = obj.x * levelData.tileSize + levelData.tileSize / 2;
      const worldY = obj.y * levelData.tileSize + levelData.tileSize / 2;

      if (obj.type === "portal") {
        this.portalService.addPortal({
          id: obj.properties?.portalId || `portal_${obj.x}_${obj.y}`,
          x: worldX,
          y: worldY,
          targetScene: obj.properties?.targetScene || "HospitalScene",
          targetPortalId: obj.properties?.targetPortalId || "hospital_entrance",
        });
      } else if (obj.type === "spawn") {
        this.portalService.addSpawnPoint({
          id: obj.properties?.spawnId || `spawn_${obj.x}_${obj.y}`,
          x: worldX,
          y: worldY,
          isDefault: obj.properties?.isDefault || obj.subtype === "player",
        });
      }
    });

    console.log(
      `🚪 Portal system initialized with ${
        this.portalService.getPortals().length
      } portals and ${this.portalService.getSpawnPoints().length} spawn points`
    );
  }

  update() {
    if (this.player) {
      super.update();
      this.portalService.checkPortalTriggers(this.player.x, this.player.y);
      
      // Update guide NPC
      if (this.guideNPC) {
        this.guideNPC.update();
      }
    }
  }

  destroy() {
    if (this.levelLoader) {
      this.levelLoader.destroy();
    }
    if (this.portalService) {
      this.portalService.destroy();
    }
    super.destroy();
  }
}
