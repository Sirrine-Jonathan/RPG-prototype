import { NewGameplayScene } from "./NewGameplayScene";
import { LevelLoader } from "../systems/LevelLoader";
import { PortalService } from "../systems/PortalService";
import { CouncilLeaderNPC } from "../entities/CouncilLeaderNPC";
import { AssistantNPC } from "../entities/AssistantNPC";
import { ChatInterface } from "../ui/ChatInterface";
import { InventorySystem } from "../systems/InventorySystem";

export class NewTownScene extends NewGameplayScene {
  private levelLoader!: LevelLoader;
  private portalService!: PortalService;

  constructor() {
    super({ key: "NewTownScene" });
  }

  protected loadSceneContent(): void {
    // Initialize services
    this.levelLoader = new LevelLoader(this);
    this.portalService = new PortalService(this);

    // Load town level
    this.levelLoader
      .loadLevel("town_overworld")
      .then(() => {
        console.log(`🏘️ NewTownScene: Town level loaded`);
        this.setupPortalsAndSpawns();
        this.createSceneNPCs();

        // Set up auto-save when player gets Maya's photo
        this.setupAutoSave();
      })
      .catch((error) => {
        console.error("Failed to load town level:", error);
      });
  }

  private setupPortalsAndSpawns(): void {
    // Get level data and set up portals
    const levelData = this.levelLoader.getLevelData();
    console.log(`🔍 NewTownScene: Level data:`, levelData);

    // Initialize boundary system with level data
    if (levelData && this.gameManager.systemManager.boundarySystem) {
      this.gameManager.systemManager.boundarySystem.setLevelBounds({
        width: levelData.width,
        height: levelData.height,
        tileSize: levelData.tileSize,
        collision: levelData.collision,
      });
      console.log(
        `🗺️ NewTownScene: Boundary system initialized with ${levelData.width}x${levelData.height} tiles`
      );
    }

    if (
      levelData &&
      levelData.layers.objects &&
      Array.isArray(levelData.layers.objects)
    ) {
      console.log(
        `🔍 NewTownScene: Found ${levelData.layers.objects.length} objects in level`
      );

      levelData.layers.objects.forEach((obj: any, index: number) => {
        console.log(`🔍 NewTownScene: Object ${index}:`, obj);

        if (obj.type === "portal") {
          this.portalService.addPortal({
            id: obj.properties.portalId,
            x: obj.x * levelData.tileSize,
            y: obj.y * levelData.tileSize,
            targetScene: "NewLibraryScene", // Use new architecture scene
            targetPortalId: obj.properties.targetPortalId,
          });
        } else if (obj.type === "spawn") {
          this.portalService.addSpawnPoint({
            id: obj.id || "default",
            x: obj.x * levelData.tileSize,
            y: obj.y * levelData.tileSize,
            isDefault: obj.subtype === "player",
          });
        }
      });
    } else {
      console.warn(
        `🔍 NewTownScene: No objects found in level data or objects is not an array`
      );
      console.log(
        `🔍 NewTownScene: levelData.layers.objects type:`,
        typeof levelData?.layers?.objects
      );
      console.log(
        `🔍 NewTownScene: levelData.layers.objects:`,
        levelData?.layers?.objects
      );
    }

    const portals = this.portalService.getPortals();
    const spawns = this.portalService.getSpawnPoints();
    console.log(
      `🚪 NewTownScene: Portal system initialized with ${portals.length} portals and ${spawns.length} spawn points`
    );
  }

  update() {
    super.update();
  }

  protected createSceneNPCs(): void {
    // Create Margaret Chen as the Guide NPC who hired the player
    const margaret = this.gameManager.entityManager.createNPC(
      "margaret_chen",
      this,
      {
        name: "Margaret Chen",
        spriteKey: "alex",
        x: 795,
        y: 880,
        personality: "Authoritative town leader who hired the detective",
        background:
          "Head of City Council who hired Detective Riley to investigate Maya's disappearance. This is your first in-person meeting.",
        role: "guide",
      }
    );

    // Create Assistant NPC using entityManager
    // const assistant = this.gameManager.entityManager.createNPC(
    //   "assistant",
    //   this,
    //   {
    //     name: "Assistant",
    //     spriteKey: "alex",
    //     x: 200,
    //     y: 200,
    //     personality: "Helpful and observant",
    //     background: "AI assistant dedicated to helping solve mysteries",
    //     goals: [
    //       "Help the player with their investigation",
    //       "Take notes of important observations",
    //     ],
    //   }
    // );

    this.gameManager.entityManager.addNPCToScene(margaret.id, this.scene.key);
    // this.gameManager.entityManager.addNPCToScene(assistant.id, this.scene.key);

    // Initialize ChatInterface for inventory and communication
    ChatInterface.getInstance(this);

    // console.log(
    //   `🏘️ NewTownScene: Created ${margaret.id} and ${assistant.id} NPCs`
    // );
  }

  private setupAutoSave(): void {
    // Listen for inventory changes to detect when player gets Maya's photo
    const inventorySystem = InventorySystem.getInstance();

    // Check periodically if player has Maya's photo (simple approach)
    const checkForPhoto = () => {
      const playerInventory = inventorySystem.getInventory("player");
      const hasPhoto = playerInventory.some((item) => item.id === "Maya's Photo");

      if (hasPhoto) {
        console.log("🏘️ Player received Maya's photo, auto-saving...");
        this.saveGameState();
        return; // Stop checking
      }

      // Check again in 2 seconds
      setTimeout(checkForPhoto, 2000);
    };

    // Start checking after a short delay
    setTimeout(checkForPhoto, 5000);
  }

  private saveGameState(): void {
    const inventorySystem = InventorySystem.getInstance();
    const playerInventory = inventorySystem.getInventory("player");

    const gameState = {
      currentScene: "NewLibraryScene",
      playerPosition: { x: 400, y: 300 }, // Default library position
      playerInventory: playerInventory,
      gameProgress: {
        metMargaret: true,
        hasPhoto: true,
        currentObjective: "investigate_library",
      },
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem("whispering_stones_save", JSON.stringify(gameState));
    console.log("🏘️ Game state saved successfully");
  }

  protected getSceneWidth(): number {
    return 2400;
  }

  protected getSceneHeight(): number {
    return 1800;
  }

  protected getDefaultSpawn(): { x: number; y: number } {
    return { x: 1200, y: 896 };
  }
}
