import { BaseScene } from "./BaseScene";
import { SmartNPC } from "../entities/SmartNPC";
import { ProximityService } from "../services/ProximityService";
import { AssetManager } from "../systems/AssetManager";
import { WellObject, NoticeBoard, Barrel, Bench } from "../entities/TownObjects";
import { InteractiveObject } from "../entities/InteractiveObject";

export class TownOverworldScene extends BaseScene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private proximityService!: ProximityService;
  private assetManager!: AssetManager;
  private isMoving = false;
  private lastDirection = 'down';
  private buildings: Array<{x: number, y: number, scene: string, name: string}> = [];
  
  // Store NPCs as properties so ChatInterface can find them
  public sheriff!: SmartNPC;
  public townsperson!: SmartNPC;
  public doctor!: SmartNPC;
  public merchant!: SmartNPC;
  public librarian!: SmartNPC;

  // Interactive objects
  private townObjects: InteractiveObject[] = [];

  constructor() {
    super({ key: "TownOverworldScene" });
  }

  preload() {
    this.assetManager = new AssetManager(this);
    this.assetManager.preloadTechDungeonAssets();
    
    // Load exterior tilesets as spritesheets
    this.load.spritesheet("town_tileset", "assets/Modern_Exteriors_RPG_Maker_MV/Tileset_1_MV.png", {
      frameWidth: 48, frameHeight: 48
    });
    this.load.spritesheet("town_floors", "assets/Modern_Exteriors_RPG_Maker_MV/A2_Floors_MV_TILESET.png", {
      frameWidth: 48, frameHeight: 48
    });
  }

  create() {
    super.create();
    
    this.assetManager.createPlayerAnimations();
    
    // Initialize proximity service BEFORE creating NPCs
    this.proximityService = new ProximityService();
    
    this.createTownLayout();
    this.createPlayer();
    this.createBuildings();
    this.createTownObjects();
    this.createNPCs();
    
    // Setup input AFTER everything else is created
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // Click to move
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.isDragging) {
        this.movePlayerTo(pointer.worldX, pointer.worldY);
      }
    });
  }

  private createTownLayout(): void {
    const townWidth = 800;
    const townHeight = 600;
    const tileSize = 48;
    
    // Create grass background using sprites
    for (let x = 0; x < townWidth; x += tileSize) {
      for (let y = 0; y < townHeight; y += tileSize) {
        this.add.sprite(x + tileSize/2, y + tileSize/2, "town_floors", 0); // Grass tile
      }
    }
    
    // Add road sprites (horizontal)
    for (let x = 0; x < townWidth; x += tileSize) {
      this.add.sprite(x + tileSize/2, townHeight/2, "town_floors", 8); // Road tile
      this.add.sprite(x + tileSize/2, townHeight/2 - tileSize, "town_floors", 8);
      this.add.sprite(x + tileSize/2, townHeight/2 + tileSize, "town_floors", 8);
    }
    
    // Add road sprites (vertical)
    for (let y = 0; y < townHeight; y += tileSize) {
      this.add.sprite(townWidth/2, y + tileSize/2, "town_floors", 8); // Road tile
      this.add.sprite(townWidth/2 - tileSize, y + tileSize/2, "town_floors", 8);
      this.add.sprite(townWidth/2 + tileSize, y + tileSize/2, "town_floors", 8);
    }
    
    // Add some trees and decorations
    this.add.sprite(150, 150, "town_tileset", 16); // Tree
    this.add.sprite(650, 150, "town_tileset", 17); // Tree
    this.add.sprite(150, 450, "town_tileset", 18); // Bush
    this.add.sprite(650, 450, "town_tileset", 19); // Bush
  }

  private createPlayer(): void {
    this.player = this.add.sprite(400, 500, "adam", 0);
    this.player.setScale(2); // Match NPC scaling
    this.player.setOrigin(0.5, 0.5);
    this.player.play(`adam_idle_${this.lastDirection}`);
  }

  private createBuildings(): void {
    // Define building locations and their corresponding scenes
    this.buildings = [
      { x: 200, y: 200, scene: "PoliceStationScene", name: "Police Station" },
      { x: 600, y: 200, scene: "HospitalScene", name: "Hospital" },
      { x: 200, y: 400, scene: "SchoolScene", name: "School" },
      { x: 600, y: 400, scene: "GroceryStoreScene", name: "Grocery Store" },
      { x: 400, y: 150, scene: "ArtMuseumScene", name: "Art Museum" }
    ];

    this.buildings.forEach((building, index) => {
      // Use different building sprites from the tileset
      const buildingFrame = 32 + index; // Different building sprites
      const buildingSprite = this.add.sprite(building.x, building.y, "town_tileset", buildingFrame);
      buildingSprite.setScale(1.5); // Make buildings larger
      
      // Add building label
      this.add.text(building.x, building.y + 50, building.name, {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);

      // Make building interactive
      buildingSprite.setInteractive();
      buildingSprite.on('pointerdown', () => {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, building.x, building.y
        );
        
        if (distance < 100) {
          console.log(`Entering ${building.name}`);
          // For now, just log - we'll implement scene transitions later
          if (building.scene === "PoliceStationScene") {
            // Fallback to existing scene for now
            this.scene.start("TechStationScene");
          }
        } else {
          console.log(`Too far from ${building.name}`);
        }
      });
    });
  }

  private createTownObjects(): void {
    // Create interactive objects around the town
    this.townObjects = [
      new WellObject(this, 400, 250, "town_well"),
      new NoticeBoard(this, 150, 300, "notice_board"),
      new Barrel(this, 650, 350, "storage_barrel"),
      new Bench(this, 350, 450, "town_bench")
    ];
  }

  private createNPCs(): void {
    // Enhanced NPCs with better personalities for interaction
    this.sheriff = new SmartNPC(
      this, 180, 180, "alex", "Sheriff Martinez",
      "Authoritative but fair, protective of the town, suspicious of strangers but willing to help those who prove trustworthy. Enjoys discussing local mysteries and town safety. Often approaches others to gather information.",
      "You are the town sheriff investigating strange occurrences around the whispering stones. You have 15 years of experience and know everyone in town. You often seek help from reliable citizens and enjoy collaborating on mysteries.",
      "law_enforcement"
    );

    this.townsperson = new SmartNPC(
      this, 450, 350, "amelia", "Sarah",
      "Curious and talkative, loves gossip and local news. Friendly to newcomers and eager to share what she knows. Often approaches others to start conversations and exchange information.",
      "You are a longtime resident who knows all the town gossip and local legends. You run the general store and love meeting new people. You're always eager to chat about the mysterious happenings and often initiate conversations.",
      "civilian"
    );

    this.doctor = new SmartNPC(
      this, 300, 200, "bob", "Dr. Thompson",
      "Analytical and methodical, concerned about recent strange symptoms in patients. Professional but approachable. Often seeks consultation with others about unusual cases and enjoys collaborative problem-solving.",
      "You are the town doctor who has noticed unusual patterns in recent patients. You believe the whispering stones might have medical significance. You enjoy collaborating with others to solve mysteries and often approach people to discuss your findings.",
      "medical"
    );

    this.merchant = new SmartNPC(
      this, 600, 300, "alex", "Marcus Webb", 
      "Shrewd businessman who notices everything that affects trade. Talkative about economic impacts and always looking for opportunities. Likes to network with everyone and share stories from other towns.",
      "You are a traveling merchant who has seen similar phenomena in other towns. You have valuable information about the stones but want something in return. You're always ready to make a deal, share stories, and approach others for business or information.",
      "merchant"
    );

    this.librarian = new SmartNPC(
      this, 200, 400, "amelia", "Eleanor Sage",
      "Scholarly and reserved but passionate about local history. Becomes animated when discussing ancient lore. Often seeks others to help research mysteries and loves intellectual discussions.",
      "You are the town librarian and historian who has researched the whispering stones extensively. You have ancient texts that might hold answers but need help interpreting them. You love intellectual discussions and often approach others to share your research.",
      "scholar"
    );

    // Set up room context for NPCs to interact with each other and player
    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.sheriff, this.townsperson, this.doctor, this.merchant, this.librarian];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(15).fill(null).map(() => Array(17).fill(0)); // Town grid

    // Give each NPC visibility of all other characters and objects
    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.townObjects, otherCharacters, grid);
      this.proximityService.addNPC(npc);
    });
  }

  private setupInput(): void {
    // This method is no longer needed - moved to create()
  }

  update() {
    const isChatFocused = document.activeElement?.tagName === "TEXTAREA" || 
                         document.activeElement?.tagName === "INPUT";

    if (!isChatFocused && !this.isMoving) {
      const speed = 200;
      let moving = false;

      if (this.cursors.left.isDown) {
        this.player.x -= (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'left';
        moving = true;
      } else if (this.cursors.right.isDown) {
        this.player.x += (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'right';
        moving = true;
      }

      if (this.cursors.up.isDown) {
        this.player.y -= (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'up';
        moving = true;
      } else if (this.cursors.down.isDown) {
        this.player.y += (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'down';
        moving = true;
      }

      // Play appropriate animation
      if (moving) {
        this.player.play(`adam_walk_${this.lastDirection}`, true);
      } else {
        this.player.play(`adam_idle_${this.lastDirection}`, true);
      }

      // Keep player in bounds
      this.player.x = Phaser.Math.Clamp(this.player.x, 32, 768);
      this.player.y = Phaser.Math.Clamp(this.player.y, 32, 568);
    }

    // Update proximity and chat
    this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
    const nearestNPC = this.proximityService.getNearestNPC();
    const nearbyNPCs = nearestNPC ? [nearestNPC] : [];
    this.chatInterface.updateNearbyNPCs(nearbyNPCs);
  }

  movePlayerTo(x: number, y: number) {
    this.isMoving = true;
    this.player.play(`adam_walk_${this.lastDirection}`);

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
}