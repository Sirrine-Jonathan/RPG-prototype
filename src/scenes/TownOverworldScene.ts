// @ts-nocheck
import { GameplayScene } from "./GameplayScene";
import { SmartNPC } from "../entities/SmartNPC";
import { WellObject, NoticeBoard, Barrel, Bench } from "../entities/TownObjects";
import { InteractiveObject } from "../entities/InteractiveObject";
import { GameStateManager } from "../systems/GameStateManager";
import { SceneManager } from "../systems/SceneManager";

export class TownOverworldScene extends GameplayScene {
  private storyManager!: SceneManager;
  private buildings: Array<{x: number, y: number, scene: string, name: string}> = [];
  private proximityCircle!: Phaser.GameObjects.Graphics;
  
  // Store NPCs as properties so ChatInterface can find them
  public sheriff!: SmartNPC;
  public townsperson!: SmartNPC;
  public doctor!: SmartNPC;
  public merchant!: SmartNPC;
  public librarian!: SmartNPC;
  public assistant!: SmartNPC; // Story guide and note-taker

  // Interactive objects
  private townObjects: InteractiveObject[] = [];
  private playerNotes: Array<{
    id: string;
    content: string;
    category: string;
    timestamp: string;
    location: string;
  }> = [];

  constructor() {
    super({ key: "TownOverworldScene" });
  }

  init(data?: { playerPosition?: { x: number, y: number } }): void {
    // Reset movement state when returning to scene
    this.isMoving = false;
    this.currentPath = [];
    this.pathIndex = 0;
    this.lastTriggeredBuilding = "";
    this.triggerCooldown = 0;
    
    // Store return position if provided
    if (data?.playerPosition) {
      this.registry.set('playerReturnPosition', data.playerPosition);
    }
  }

  preload() {
    super.preload();
    
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
    this.storyManager = SceneManager.getInstance();
    
    // Show current story guidance
    const guidance = this.storyManager.getStoryGuidance();
    if (guidance) {
      console.log(`📖 Story Guidance: ${guidance}`);
    }
    
    this.createTownLayout();
    this.createPlayer();
    this.createBuildings();
    this.createTownObjects();
    this.createNPCs();
  }

  protected setupInput(): void {
    // Call parent first to set up cursors and wasd
    super.setupInput();
    
    // Override the default click behavior to only handle left clicks
    this.input.off('pointerdown'); // Remove the default handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.isMoving) {
        this.movePlayerTo(pointer.worldX, pointer.worldY);
      }
    });
  }

  private createPlayer(): void {
    // Check for return position
    const returnPosition = this.registry.get('playerReturnPosition');
    const startX = returnPosition?.x || 1200;
    const startY = returnPosition?.y || 900;
    
    super.createPlayer(startX, startY);
    
    // Clear return position
    this.registry.remove('playerReturnPosition');
    
    // Create proximity visualization circle
    this.proximityCircle = this.add.graphics();
    this.proximityCircle.setAlpha(0.2);
    this.updateProximityCircle();
  }
  
  private updateProximityCircle(): void {
    this.proximityCircle.clear();
    this.proximityCircle.lineStyle(2, 0x00ff00, 0.5);
    this.proximityCircle.fillStyle(0x00ff00, 0.1);
    this.proximityCircle.strokeCircle(this.player.x, this.player.y, 200); // HEARING_RANGE from SmartNPC
    this.proximityCircle.fillCircle(this.player.x, this.player.y, 200);
  }

  private createTownLayout(): void {
    const townWidth = 2400;  // 3x larger
    const townHeight = 1800; // 3x larger
    const tileSize = 48;
    
    // Set world bounds for camera
    this.cameras.main.setBounds(0, 0, townWidth, townHeight);
    this.setGameAreaSize(townWidth, townHeight);
    
    console.log('=== TOWN LAYOUT SPRITE DATA ===');
    console.log(`Town dimensions: ${townWidth}x${townHeight} pixels`);
    console.log(`Tile size: ${tileSize}px`);
    console.log(`Grid size: ${townWidth/tileSize}x${townHeight/tileSize} tiles`);
    
    const backgroundTiles = [];
    
    // Create grass background using sprites
    for (let x = 0; x < townWidth; x += tileSize) {
      for (let y = 0; y < townHeight; y += tileSize) {
        const tileX = x / tileSize;
        const tileY = y / tileSize;
        this.add.sprite(x + tileSize/2, y + tileSize/2, "town_floors", 0); // Grass tile
        backgroundTiles.push({ x: tileX, y: tileY, frame: 0, sprite: 'town_floors' });
      }
    }
    
    const roadTiles = [];
    
    // Add main roads (horizontal)
    for (let x = 0; x < townWidth; x += tileSize) {
      const tileX = x / tileSize;
      // Main horizontal road
      const roadY1 = Math.floor(townHeight/2 / tileSize);
      const roadY2 = Math.floor((townHeight/2 - tileSize) / tileSize);
      const roadY3 = Math.floor((townHeight/2 + tileSize) / tileSize);
      
      this.add.sprite(x + tileSize/2, townHeight/2, "town_floors", 8);
      this.add.sprite(x + tileSize/2, townHeight/2 - tileSize, "town_floors", 8);
      this.add.sprite(x + tileSize/2, townHeight/2 + tileSize, "town_floors", 8);
      
      roadTiles.push({ x: tileX, y: roadY1, frame: 8, sprite: 'town_floors' });
      roadTiles.push({ x: tileX, y: roadY2, frame: 8, sprite: 'town_floors' });
      roadTiles.push({ x: tileX, y: roadY3, frame: 8, sprite: 'town_floors' });
      
      // Secondary horizontal roads
      const secRoadY1 = Math.floor(townHeight/4 / tileSize);
      const secRoadY2 = Math.floor((townHeight * 3)/4 / tileSize);
      
      this.add.sprite(x + tileSize/2, townHeight/4, "town_floors", 8);
      this.add.sprite(x + tileSize/2, (townHeight * 3)/4, "town_floors", 8);
      
      roadTiles.push({ x: tileX, y: secRoadY1, frame: 8, sprite: 'town_floors' });
      roadTiles.push({ x: tileX, y: secRoadY2, frame: 8, sprite: 'town_floors' });
    }
    
    // Add main roads (vertical)
    for (let y = 0; y < townHeight; y += tileSize) {
      const tileY = y / tileSize;
      // Main vertical road
      const roadX1 = Math.floor(townWidth/2 / tileSize);
      const roadX2 = Math.floor((townWidth/2 - tileSize) / tileSize);
      const roadX3 = Math.floor((townWidth/2 + tileSize) / tileSize);
      
      this.add.sprite(townWidth/2, y + tileSize/2, "town_floors", 8);
      this.add.sprite(townWidth/2 - tileSize, y + tileSize/2, "town_floors", 8);
      this.add.sprite(townWidth/2 + tileSize, y + tileSize/2, "town_floors", 8);
      
      roadTiles.push({ x: roadX1, y: tileY, frame: 8, sprite: 'town_floors' });
      roadTiles.push({ x: roadX2, y: tileY, frame: 8, sprite: 'town_floors' });
      roadTiles.push({ x: roadX3, y: tileY, frame: 8, sprite: 'town_floors' });
      
      // Secondary vertical roads
      const secRoadX1 = Math.floor(townWidth/4 / tileSize);
      const secRoadX2 = Math.floor((townWidth * 3)/4 / tileSize);
      
      this.add.sprite(townWidth/4, y + tileSize/2, "town_floors", 8);
      this.add.sprite((townWidth * 3)/4, y + tileSize/2, "town_floors", 8);
      
      roadTiles.push({ x: secRoadX1, y: tileY, frame: 8, sprite: 'town_floors' });
      roadTiles.push({ x: secRoadX2, y: tileY, frame: 8, sprite: 'town_floors' });
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
    
    const decorationTiles = [];
    decorations.forEach(dec => {
      const tileX = Math.floor(dec.x / tileSize);
      const tileY = Math.floor(dec.y / tileSize);
      this.add.sprite(dec.x, dec.y, "town_tileset", dec.frame);
      decorationTiles.push({ x: tileX, y: tileY, frame: dec.frame, sprite: 'town_tileset' });
    });
    
    console.log('BACKGROUND TILES (town_floors, frame 0):');
    console.log(`Total grass tiles: ${backgroundTiles.length}`);
    
    console.log('ROAD TILES (town_floors, frame 8):');
    console.log('Road tiles:', JSON.stringify(roadTiles, null, 2));
    
    console.log('DECORATION TILES (town_tileset):');
    console.log('Decoration tiles:', JSON.stringify(decorationTiles, null, 2));
    
    console.log('=== END SPRITE DATA ===');
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

    console.log('=== BUILDING DATA ===');
    this.buildings.forEach((building, index) => {
      const tileX = Math.floor(building.x / 48);
      const tileY = Math.floor(building.y / 48);
      console.log(`${building.name}: pixel(${building.x}, ${building.y}) = tile(${tileX}, ${tileY}) -> ${building.scene}`);
    });
    console.log('=== END BUILDING DATA ===');

    // Add museum basement entrance if unlocked
    if (this.gameStateManager.isLocationUnlocked('museum_basement')) {
      this.buildings.push({
        x: 1200, y: 350, scene: "MuseumBasementScene", name: "Museum Basement"
      });
    }

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

      // Create invisible trigger zone around building entrance
      const triggerZone = this.add.zone(building.x, building.y + 40, 80, 60);
      triggerZone.setData('building', building);
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

    // Listen for notes from the assistant NPC
    this.events.on('note-taken', (noteEntry: any) => {
      this.playerNotes.push(noteEntry);
      console.log(`📝 Note added: ${noteEntry.content}`);
      
      // Emit to chat interface for display
      this.events.emit('update-notes', this.playerNotes);
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
    
    console.log('=== NPC DATA ===');
    
    // Spread NPCs across the larger map for better proximity mechanics
    this.sheriff = new SmartNPC(
      this, 540, 540, "alex", "Sheriff Martinez",
      "Authoritative but fair, protective of the town, suspicious of strangers but willing to help those who prove trustworthy. Enjoys discussing local mysteries and town safety. Often approaches others to gather information.",
      "You are the town sheriff investigating strange occurrences around the whispering stones. You have 15 years of experience and know everyone in town. You often seek help from reliable citizens and enjoy collaborating on mysteries.",
      "law_enforcement"
    );
    console.log(`Sheriff Martinez: pixel(540, 540) = tile(${Math.floor(540/48)}, ${Math.floor(540/48)})`);
    
    this.townsperson = new SmartNPC(
      this, 1350, 1050, "amelia", "Sarah",
      "Curious and talkative, loves gossip and local news. Friendly to newcomers and eager to share what she knows. Often approaches others to start conversations and exchange information.",
      "You are a longtime resident who knows all the town gossip and local legends. You run the general store and love meeting new people. You're always eager to chat about the mysterious happenings and often initiate conversations.",
      "civilian"
    );
    console.log(`Sarah: pixel(1350, 1050) = tile(${Math.floor(1350/48)}, ${Math.floor(1050/48)})`);

    this.doctor = new SmartNPC(
      this, 1650, 600, "bob", "Dr. Thompson",
      "Analytical and methodical, concerned about recent strange symptoms in patients. Professional but approachable. Often seeks consultation with others about unusual cases and enjoys collaborative problem-solving.",
      "You are the town doctor who has noticed unusual patterns in recent patients. You believe the whispering stones might have medical significance. You enjoy collaborating with others to solve mysteries and often approach people to discuss your findings.",
      "medical"
    );
    console.log(`Dr. Thompson: pixel(1650, 600) = tile(${Math.floor(1650/48)}, ${Math.floor(600/48)})`);

    this.merchant = new SmartNPC(
      this, 1800, 1200, "alex", "Marcus Webb", 
      "Shrewd businessman who notices everything that affects trade. Talkative about economic impacts and always looking for opportunities. Likes to network with everyone and share stories from other towns.",
      "You are a traveling merchant who has seen similar phenomena in other towns. You have valuable information about the stones but want something in return. You're always ready to make a deal, share stories, and approach others for business or information.",
      "merchant"
    );
    console.log(`Marcus Webb: pixel(1800, 1200) = tile(${Math.floor(1800/48)}, ${Math.floor(1200/48)})`);

    this.librarian = new SmartNPC(
      this, 450, 1200, "amelia", "Eleanor Sage",
      "Scholarly and reserved but passionate about local history. Becomes animated when discussing ancient lore. Often seeks others to help research mysteries and loves intellectual discussions.",
      "You are the town librarian and historian who has researched the whispering stones extensively. You have ancient texts that might hold answers but need help interpreting them. You love intellectual discussions and often approach others to share your research.",
      "scholar"
    );
    console.log(`Eleanor Sage: pixel(450, 1200) = tile(${Math.floor(450/48)}, ${Math.floor(1200/48)})`);

    // Create the assistant - a knowledgeable guide who helps players navigate the story
    this.assistant = new SmartNPC(
      this, 1200, 1200, "bob", "Guide",
      "Wise and observant, knows everyone in town and understands the full scope of the mystery. Helpful and patient, enjoys guiding newcomers and taking detailed notes about important discoveries. Always ready to provide hints and explain how things work.",
      "You are Guide, the town's unofficial guide and record-keeper. You have observed the entire mystery unfold and know all the key players, locations, and clues. Your role is to help visitors navigate the investigation by providing hints, taking notes of important discoveries, and explaining how to interact with the world. You are knowledgeable about the full story but reveal information gradually to maintain the mystery. You always stay close to the visitor to provide assistance.",
      "guide"
    );
    console.log(`Guide: pixel(1200, 1200) = tile(${Math.floor(1200/48)}, ${Math.floor(1200/48)})`);
    
    console.log('=== END NPC DATA ===');
    
    // Set story-driven goals using GameStateManager
    const sheriffContext = this.gameStateManager.getNPCContext('Sheriff Martinez');
    this.sheriff.setGoals(sheriffContext.goals || [
      "Investigate Maya's disappearance",
      "Question townspeople about recent strange events", 
      "Maintain order while gathering information"
    ]);
    
    const doctorContext = this.gameStateManager.getNPCContext('Dr. Thompson');
    this.doctor.setGoals(doctorContext.goals || [
      "Investigate unusual patient symptoms",
      "Research possible connections to the whispering stones",
      "Seek collaboration on medical mysteries"
    ]);
    
    this.townsperson.setGoals([
      "Share local gossip and rumors",
      "Learn about the visitor's purpose in town",
      "Discuss the strange happenings around town"
    ]);
    
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

    this.assistant.setGoals([
      `Guide newcomers to start investigating Maya's disappearance at the hospital (Chapter ${currentChapter})`,
      "Provide specific, actionable hints about where to go and what to do next",
      "Take detailed notes about important discoveries and conversations", 
      "Explain game controls and interaction methods when needed",
      "Help players understand current story progress and next steps"
    ]);

    // Set up room context
    const playerCharacter = {
      id: "player",
      name: "Visitor",
      getPosition: () => ({ x: this.player.x, y: this.player.y }),
    };

    const allNPCs = [this.sheriff, this.townsperson, this.doctor, this.merchant, this.librarian, this.assistant];
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(50).fill(null).map(() => Array(37).fill(0)); // Larger grid for bigger map

    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext(this.townObjects, otherCharacters, grid);
      this.proximityService.addNPC(npc);
    });
  }



  update() {
    super.update();
    
    // Update Guide following behavior
    this.updateGuideFollowing();
    
    // Update proximity circle when player moves
    this.updateProximityCircle();
    
    // Check for nearby interactive objects
    this.checkNearbyObjects();
    
    // Check for building entrance triggers
    this.checkBuildingTriggers();
  }

  // GameplayScene abstract method implementations
  protected getSceneWidth(): number { return 2400; }
  protected getSceneHeight(): number { return 1800; }
  protected getPlayerBounds() {
    return { minX: 32, maxX: 2368, minY: 32, maxY: 1768 };
  }
  protected getExitPosition() { return { x: 1200, y: 1750 }; }
  protected getReturnScene() { return 'MainMenuScene'; }
  protected getReturnPosition() { return { x: 400, y: 300 }; }
  
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
  private lastTriggeredBuilding: string = "";
  private triggerCooldown: number = 0;

  private checkBuildingTriggers(): void {
    // Cooldown to prevent rapid re-triggering
    if (this.triggerCooldown > 0) {
      this.triggerCooldown -= this.game.loop.delta;
      return;
    }

    this.buildings.forEach(building => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, building.x, building.y + 40
      );
      
      if (distance < 40 && this.lastTriggeredBuilding !== building.name) {
        console.log(`🚪 TRIGGER: Entering ${building.name} from town`);
        this.lastTriggeredBuilding = building.name;
        this.triggerCooldown = 2000; // 2 second cooldown
        this.enterBuilding(building);
      }
    });

    // Reset trigger if player moves away from all buildings
    const nearAnyBuilding = this.buildings.some(building => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, building.x, building.y + 40
      );
      return distance < 60;
    });

    if (!nearAnyBuilding) {
      this.lastTriggeredBuilding = "";
    }
  }

  private enterBuilding(building: {x: number, y: number, scene: string, name: string}): void {
    // Check story progress for location access
    const locationKey = building.name.toLowerCase().replace(' ', '_');
    
    if (!this.gameStateManager.isLocationUnlocked(locationKey)) {
      console.log(`🚫 ${building.name} is not accessible yet.`);
      this.assistant?.speak(`That area isn't accessible yet. You need to progress further in the investigation.`);
      return;
    }
    
    console.log(`Entering ${building.name}`);
    
    // Map building scenes to actual scene keys
    const sceneMap: {[key: string]: string} = {
      'PoliceStationScene': 'PoliceStationScene',
      'HospitalScene': 'HospitalScene', 
      'SchoolScene': 'SchoolScene',
      'GroceryStoreScene': 'GroceryStoreScene',
      'ArtMuseumScene': 'ArtMuseumScene',
      'LibraryScene': 'LibraryScene',
      'TavernScene': 'TavernScene'
    };
    
    const actualScene = sceneMap[building.scene] || 'HospitalScene'; // Default to hospital if scene not found
    
    // Store return location
    this.registry.set('returnScene', 'TownOverworldScene');
    this.registry.set('returnPosition', { x: this.player.x, y: this.player.y });
    
    this.scene.start(actualScene);
  }

  private updateGuideFollowing(): void {
    if (!this.assistant || !this.player) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.assistant.sprite.x, this.assistant.sprite.y
    );

    // Follow player if distance exceeds 80 units
    if (distance > 80) {
      // Calculate position 60 units behind player based on last direction
      let targetX = this.player.x;
      let targetY = this.player.y;

      switch (this.lastDirection) {
        case 'up':
          targetY += 60;
          break;
        case 'down':
          targetY -= 60;
          break;
        case 'left':
          targetX += 60;
          break;
        case 'right':
          targetX -= 60;
          break;
      }

      // Use pathfinding to move Guide to target position
      const path = this.pathfinding.findPath(
        this.assistant.sprite.x, this.assistant.sprite.y,
        targetX, targetY
      );

      if (path.length > 1) {
        const nextStep = path[1];
        this.assistant.moveToPosition(nextStep.x, nextStep.y);
      }
    }
  }
}