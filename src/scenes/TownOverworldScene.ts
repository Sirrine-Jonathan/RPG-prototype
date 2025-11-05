import { BaseScene } from "./BaseScene";
import { SmartNPC } from "../entities/SmartNPC";
import { ProximityService } from "../services/ProximityService";
import { AssetManager } from "../systems/AssetManager";
import { WellObject, NoticeBoard, Barrel, Bench } from "../entities/TownObjects";
import { InteractiveObject } from "../entities/InteractiveObject";
import { GameStateManager } from "../systems/GameStateManager";
import { SceneManager } from "../systems/SceneManager";
import { Pathfinding } from "../utils/Pathfinding";

export class TownOverworldScene extends BaseScene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  private proximityService!: ProximityService;
  private assetManager!: AssetManager;
  private gameStateManager!: GameStateManager;
  private storyManager!: SceneManager;
  private isMoving = false;
  private lastDirection = 'down';
  private buildings: Array<{x: number, y: number, scene: string, name: string}> = [];
  private proximityCircle!: Phaser.GameObjects.Graphics;
  private pathfinding!: Pathfinding;
  private currentPath: Array<{x: number, y: number}> = [];
  private pathIndex: number = 0;
  
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
    
    // Initialize story systems
    this.gameStateManager = GameStateManager.getInstance();
    this.storyManager = SceneManager.getInstance();
    
    // Show current story guidance
    const guidance = this.storyManager.getStoryGuidance();
    if (guidance) {
      console.log(`📖 Story Guidance: ${guidance}`);
    }
    
    this.assetManager.createPlayerAnimations();
    
    // Initialize proximity service BEFORE creating NPCs
    this.proximityService = new ProximityService();
    
    // Initialize pathfinding
    this.pathfinding = new Pathfinding(30, 2400, 1800);
    
    this.createTownLayout();
    this.createPlayer();
    this.createBuildings();
    this.createTownObjects();
    this.createNPCs();
    
    // Setup input AFTER everything else is created
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // Add WASD keys but don't capture them globally
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D', false); // false = don't prevent default
    
    // Add click-to-move for player
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isMoving) {
        this.movePlayerTo(pointer.worldX, pointer.worldY);
      }
    });
  }

  private createTownLayout(): void {
    const townWidth = 2400;  // 3x larger
    const townHeight = 1800; // 3x larger
    const tileSize = 48;
    
    // Set world bounds for camera
    this.cameras.main.setBounds(0, 0, townWidth, townHeight);
    
    // Create grass background using sprites
    for (let x = 0; x < townWidth; x += tileSize) {
      for (let y = 0; y < townHeight; y += tileSize) {
        this.add.sprite(x + tileSize/2, y + tileSize/2, "town_floors", 0); // Grass tile
      }
    }
    
    // Add main roads (horizontal)
    for (let x = 0; x < townWidth; x += tileSize) {
      // Main horizontal road
      this.add.sprite(x + tileSize/2, townHeight/2, "town_floors", 8);
      this.add.sprite(x + tileSize/2, townHeight/2 - tileSize, "town_floors", 8);
      this.add.sprite(x + tileSize/2, townHeight/2 + tileSize, "town_floors", 8);
      
      // Secondary horizontal roads
      this.add.sprite(x + tileSize/2, townHeight/4, "town_floors", 8);
      this.add.sprite(x + tileSize/2, (townHeight * 3)/4, "town_floors", 8);
    }
    
    // Add main roads (vertical)
    for (let y = 0; y < townHeight; y += tileSize) {
      // Main vertical road
      this.add.sprite(townWidth/2, y + tileSize/2, "town_floors", 8);
      this.add.sprite(townWidth/2 - tileSize, y + tileSize/2, "town_floors", 8);
      this.add.sprite(townWidth/2 + tileSize, y + tileSize/2, "town_floors", 8);
      
      // Secondary vertical roads
      this.add.sprite(townWidth/4, y + tileSize/2, "town_floors", 8);
      this.add.sprite((townWidth * 3)/4, y + tileSize/2, "town_floors", 8);
    }
    
    // Add trees and decorations scattered around
    const decorations = [
      { x: 300, y: 300, frame: 16 },
      { x: 2100, y: 300, frame: 17 },
      { x: 300, y: 1500, frame: 18 },
      { x: 2100, y: 1500, frame: 19 },
      { x: 600, y: 600, frame: 16 },
      { x: 1800, y: 600, frame: 17 },
      { x: 600, y: 1200, frame: 18 },
      { x: 1800, y: 1200, frame: 19 },
    ];
    
    decorations.forEach(dec => {
      this.add.sprite(dec.x, dec.y, "town_tileset", dec.frame);
    });
  }

  private createPlayer(): void {
    this.player = this.add.sprite(1200, 900, "adam", 0); // Center of larger map
    this.player.setScale(2);
    this.player.setOrigin(0.5, 0.5);
    this.player.play(`adam_idle_${this.lastDirection}`);
    
    // Create proximity visualization circle
    this.proximityCircle = this.add.graphics();
    this.proximityCircle.setAlpha(0.2);
    this.updateProximityCircle();
    
    // Make camera follow player
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setLerp(0.1, 0.1); // Smooth following
  }
  
  private updateProximityCircle(): void {
    this.proximityCircle.clear();
    this.proximityCircle.lineStyle(2, 0x00ff00, 0.5);
    this.proximityCircle.fillStyle(0x00ff00, 0.1);
    this.proximityCircle.strokeCircle(this.player.x, this.player.y, 200); // HEARING_RANGE from SmartNPC
    this.proximityCircle.fillCircle(this.player.x, this.player.y, 200);
  }

  private createBuildings(): void {
    // Spread buildings across the larger map
    this.buildings = [
      { x: 600, y: 450, scene: "PoliceStationScene", name: "Police Station" },
      { x: 1800, y: 450, scene: "HospitalScene", name: "Hospital" },
      { x: 600, y: 1350, scene: "SchoolScene", name: "School" },
      { x: 1800, y: 1350, scene: "GroceryStoreScene", name: "Grocery Store" },
      { x: 1200, y: 300, scene: "ArtMuseumScene", name: "Art Museum" },
      { x: 300, y: 900, scene: "LibraryScene", name: "Library" },
      { x: 2100, y: 900, scene: "TavernScene", name: "Tavern" }
    ];

    this.buildings.forEach((building, index) => {
      const buildingFrame = 32 + index;
      const buildingSprite = this.add.sprite(building.x, building.y, "town_tileset", buildingFrame);
      buildingSprite.setScale(1.5);
      
      // Add building label
      this.add.text(building.x, building.y + 50, building.name, {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);

      buildingSprite.setInteractive();
      buildingSprite.on('pointerdown', () => {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, building.x, building.y
        );
        
        if (distance < 100) {
          console.log(`Entering ${building.name}`);
          if (building.scene === "PoliceStationScene") {
            this.scene.start("TechStationScene");
          }
        } else {
          console.log(`Too far from ${building.name}`);
        }
      });
    });
  }

  private createTownObjects(): void {
    // Spread interactive objects across the larger map
    this.townObjects = [
      new WellObject(this, 1200, 600, "town_well"),
      new NoticeBoard(this, 450, 750, "notice_board"),
      new Barrel(this, 1950, 1050, "storage_barrel"),
      new Bench(this, 1050, 1200, "town_bench"),
      new WellObject(this, 600, 1200, "north_well"),
      new NoticeBoard(this, 1800, 750, "east_notice"),
      new Barrel(this, 450, 1050, "west_barrel"),
      new Bench(this, 1350, 450, "south_bench")
    ];
    
    // Listen for story events on the scene instead
    this.events.on('interact', (objectId: string, action: string) => {
      this.handleStoryInteraction(objectId, action);
    });
  }
  
  private handleStoryInteraction(objectId: string, action: string): void {
    // Trigger story events based on object interactions
    if (objectId === 'notice_board' && action === 'read') {
      if (this.gameStateManager.getCurrentChapter() === 1) {
        this.storyManager.triggerStoryEvent('medical_records_found');
      }
    }
    
    if (objectId === 'storage_barrel' && action === 'search') {
      if (this.gameStateManager.getCurrentChapter() === 2) {
        this.storyManager.triggerStoryEvent('secret_passphrase_learned');
      }
    }
  }

  private createNPCs(): void {
    const currentChapter = this.gameStateManager.getCurrentChapter();
    
    // Spread NPCs across the larger map for better proximity mechanics
    this.sheriff = new SmartNPC(
      this, 540, 540, "alex", "Sheriff Martinez",
      "Authoritative but fair, protective of the town, suspicious of strangers but willing to help those who prove trustworthy. Enjoys discussing local mysteries and town safety. Often approaches others to gather information.",
      "You are the town sheriff investigating strange occurrences around the whispering stones. You have 15 years of experience and know everyone in town. You often seek help from reliable citizens and enjoy collaborating on mysteries.",
      "law_enforcement"
    );
    
    this.townsperson = new SmartNPC(
      this, 1350, 1050, "amelia", "Sarah",
      "Curious and talkative, loves gossip and local news. Friendly to newcomers and eager to share what she knows. Often approaches others to start conversations and exchange information.",
      "You are a longtime resident who knows all the town gossip and local legends. You run the general store and love meeting new people. You're always eager to chat about the mysterious happenings and often initiate conversations.",
      "civilian"
    );

    this.doctor = new SmartNPC(
      this, 1650, 600, "bob", "Dr. Thompson",
      "Analytical and methodical, concerned about recent strange symptoms in patients. Professional but approachable. Often seeks consultation with others about unusual cases and enjoys collaborative problem-solving.",
      "You are the town doctor who has noticed unusual patterns in recent patients. You believe the whispering stones might have medical significance. You enjoy collaborating with others to solve mysteries and often approach people to discuss your findings.",
      "medical"
    );

    this.merchant = new SmartNPC(
      this, 1800, 1200, "alex", "Marcus Webb", 
      "Shrewd businessman who notices everything that affects trade. Talkative about economic impacts and always looking for opportunities. Likes to network with everyone and share stories from other towns.",
      "You are a traveling merchant who has seen similar phenomena in other towns. You have valuable information about the stones but want something in return. You're always ready to make a deal, share stories, and approach others for business or information.",
      "merchant"
    );

    this.librarian = new SmartNPC(
      this, 450, 1200, "amelia", "Eleanor Sage",
      "Scholarly and reserved but passionate about local history. Becomes animated when discussing ancient lore. Often seeks others to help research mysteries and loves intellectual discussions.",
      "You are the town librarian and historian who has researched the whispering stones extensively. You have ancient texts that might hold answers but need help interpreting them. You love intellectual discussions and often approach others to share your research.",
      "scholar"
    );
    
    // Set chapter-specific goals
    if (currentChapter === 1) {
      this.sheriff.setGoals([
        "Investigate Maya's disappearance",
        "Question townspeople about recent strange events",
        "Maintain order while gathering information"
      ]);
    } else if (currentChapter >= 2) {
      this.sheriff.setGoals([
        "Hide evidence of the secret society",
        "Mislead the investigation away from the truth",
        "Protect society members from exposure"
      ]);
    }
    
    this.townsperson.setGoals([
      "Share local gossip and rumors",
      "Learn about the visitor's purpose in town",
      "Discuss the strange happenings around town"
    ]);
    
    if (currentChapter >= 4) {
      this.doctor.setGoals([
        "Reveal the truth about being coerced by the society",
        "Help the investigation by sharing medical evidence",
        "Protect patients from further harm"
      ]);
    } else {
      this.doctor.setGoals([
        "Investigate unusual patient symptoms",
        "Research possible connections to the whispering stones",
        "Seek collaboration on medical mysteries"
      ]);
    }
    
    this.merchant.setGoals([
      "Share stories from other towns with similar phenomena",
      "Negotiate information trades with visitors",
      "Maintain profitable relationships with townspeople"
    ]);
    
    this.librarian.setGoals([
      "Research ancient texts about the whispering stones",
      "Share historical knowledge with serious investigators",
      "Seek help interpreting mysterious symbols and texts"
    ]);

    // Set up room context
    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.sheriff, this.townsperson, this.doctor, this.merchant, this.librarian];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(50).fill(null).map(() => Array(37).fill(0)); // Larger grid for bigger map

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
                         document.activeElement?.tagName === "INPUT" ||
                         document.querySelector('.chat-interface')?.contains(document.activeElement);

    if (!isChatFocused && !this.isMoving) {
      const speed = 200;
      let moving = false;

      // Arrow keys
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

      // WASD keys - only when chat is not focused
      if (this.wasd.A.isDown) {
        this.player.x -= (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'left';
        moving = true;
      } else if (this.wasd.D.isDown) {
        this.player.x += (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'right';
        moving = true;
      }

      if (this.wasd.W.isDown) {
        this.player.y -= (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'up';
        moving = true;
      } else if (this.wasd.S.isDown) {
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

      // Keep player in bounds of larger map
      this.player.x = Phaser.Math.Clamp(this.player.x, 32, 2368);
      this.player.y = Phaser.Math.Clamp(this.player.y, 32, 1768);
      
      // Update proximity circle when player moves
      if (moving) {
        this.updateProximityCircle();
      }
    }

    // Check for nearby interactive objects
    this.checkNearbyObjects();

    // Update proximity and chat
    this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
    const nearestNPC = this.proximityService.getNearestNPC();
    const nearbyNPCs = nearestNPC ? [nearestNPC] : [];
    this.chatInterface.updateNearbyNPCs(nearbyNPCs);
  }
  
  private checkNearbyObjects(): void {
    this.townObjects.forEach(obj => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, 
        obj.sprite.x, obj.sprite.y
      );
      
      if (distance < 50) {
        // Highlight nearby objects
        obj.sprite.setStrokeStyle(4, 0xffff00);
        obj.nameText.setStyle({ backgroundColor: '#ffff00' });
      } else {
        // Remove highlight
        obj.sprite.setStrokeStyle(2, 0xffffff);
        obj.nameText.setStyle({ backgroundColor: '#000000' });
      }
    });
  }

  // Add pathfinding movement for player
  private movePlayerTo(targetX: number, targetY: number): void {
    const path = this.pathfinding.findPath(this.player.x, this.player.y, targetX, targetY);
    
    if (path.length > 1) {
      this.currentPath = path.slice(1); // Skip first point (current position)
      this.pathIndex = 0;
      this.isMoving = true;
      this.followPath();
    }
  }

  private followPath(): void {
    if (this.pathIndex >= this.currentPath.length) {
      this.isMoving = false;
      this.player.play(`adam_idle_${this.lastDirection}`, true);
      return;
    }

    const target = this.currentPath[this.pathIndex];
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    
    if (distance < 5) {
      this.pathIndex++;
      this.followPath();
      return;
    }

    // Determine direction for animation
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      this.lastDirection = dx > 0 ? 'right' : 'left';
    } else {
      this.lastDirection = dy > 0 ? 'down' : 'up';
    }
    
    this.player.play(`adam_walk_${this.lastDirection}`, true);

    // Move towards target
    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.pathIndex++;
        this.followPath();
      }
    });
  }

  // Removed movePlayerTo - players use keyboard controls only
}