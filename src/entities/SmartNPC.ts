import { Scene } from "phaser";
import { AIService, NPCContext, NPCTool } from "../services/AIService";
import { InteractiveObject } from "./InteractiveObject";
import { SpeechBubble } from "../ui/SpeechBubble";
import { Pathfinding } from "../utils/Pathfinding";

const ACTION_DELAY = 20000; // 20 seconds between timed actions (fallback only)
const LINE_OF_SIGHT_RANGE = 150;

export interface Character {
  id: string;
  name: string;
  getPosition(): { x: number; y: number };
}

export class SmartNPC implements Character {
  public sprite: Phaser.GameObjects.Sprite;
  public nameText: Phaser.GameObjects.Text;
  public scene: Scene;
  public id: string;
  public name: string;
  public personality: string;
  public background: string;

  private aiService: AIService;
  private actionTimer?: Phaser.Time.TimerEvent;
  private speechBubble: SpeechBubble;

  // LLM request tracking
  private lastLLMRequest: number = 0;
  private llmRequestCount: number = 0;
  private activityTimer?: Phaser.Time.TimerEvent;
  private lastEventTime: number = 0; // Track when last event occurred
  private pendingLLMRequest?: Promise<any>; // Track in-flight requests
  private pathfindingTimer?: Phaser.Time.TimerEvent; // Separate timer for pathfinding
  private isMoving: boolean = false; // Track if NPC is currently moving

  // Discovery and awareness
  private discoveredObjects: Set<string> = new Set();
  private discoveredCharacters: Set<string> = new Set();
  private discoveredLocations: Map<string, {x: number, y: number, name: string}> = new Map();
  private conversationMessages: Array<{
    role: string;
    content?: string;
    tool_calls?: any;
    name?: string;
    hearers?: string[]; // NPCs who were in earshot when this was said
  }> = [];
  private lastDirection = "down";

  // Room context
  private roomObjects: InteractiveObject[] = [];
  private roomCharacters: Character[] = [];
  private roomGrid: number[][] = [];
  private customGoals: string[] = [];
  private pathfinding: Pathfinding;
  private currentPath: Array<{x: number, y: number}> = [];
  private pathIndex: number = 0;
  private pathTarget: string = ""; // Track what we're moving toward
  private role: string; // Store the NPC's role for special abilities

  constructor(
    scene: Scene,
    x: number,
    y: number,
    spriteKey: string,
    name: string,
    personality: string,
    background: string,
    role: string = "civilian"
  ) {
    this.scene = scene;
    this.id = `${spriteKey}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`; // Unique ID
    this.name = name;
    this.personality = personality;
    this.background = background;
    this.role = role;
    this.aiService = AIService.getInstance();
    this.speechBubble = new SpeechBubble(scene);
    this.pathfinding = new Pathfinding(30, 2400, 1800);

    // Initialize known landmarks
    this.initializeKnownLandmarks();

    // Listen for global town speech events
    this.scene.events.on("town-speech", this.onTownSpeech, this);

    // Create sprite
    this.sprite = scene.add.sprite(x, y, spriteKey, 0);
    this.sprite.setScale(2);
    this.sprite.setInteractive();

    // Play idle animation
    if (spriteKey === "alex") {
      this.sprite.play("alex_idle_down");
    } else if (spriteKey === "amelia") {
      this.sprite.play("amelia_idle_down");
    } else if (spriteKey === "bob") {
      this.sprite.play("bob_idle_down");
    } else {
      this.sprite.setFrame(0);
    }

    // Create name text
    this.nameText = scene.add
      .text(x, y - 35, name, {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 6, y: 3 },
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setAlpha(0.9);

    this.startAILoop();

    // Start activity monitoring
    this.activityTimer = this.scene.time.addEvent({
      delay: 30000, // Every 30 seconds
      callback: this.logActivity,
      callbackScope: this,
      loop: true,
    });
  }

  private moveToTarget(target: string): { success: boolean; message: string } {
    const currentPos = this.getPosition();
    let targetX: number;
    let targetY: number;
    let targetName: string;

    // Check if target is coordinates (x,y format)
    if (target.includes(',')) {
      const coords = target.split(',').map(s => parseInt(s.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        targetX = coords[0];
        targetY = coords[1];
        targetName = `coordinates (${targetX}, ${targetY})`;
      } else {
        return { success: false, message: `Invalid coordinate format: ${target}` };
      }
    } else {
      // Try to find landmark by name
      const landmarkKey = target.toLowerCase().replace(/\s+/g, '_');
      const landmark = this.discoveredLocations.get(landmarkKey);
      
      if (landmark) {
        targetX = landmark.x;
        targetY = landmark.y;
        targetName = landmark.name;
      } else {
        // Try partial matching for landmark names
        const partialMatch = Array.from(this.discoveredLocations.entries())
          .find(([key, location]) => 
            key.includes(landmarkKey) || 
            location.name.toLowerCase().includes(target.toLowerCase())
          );
        
        if (partialMatch) {
          targetX = partialMatch[1].x;
          targetY = partialMatch[1].y;
          targetName = partialMatch[1].name;
        } else {
          return { success: false, message: `Unknown location: ${target}` };
        }
      }
    }

    // Use pathfinding to calculate full path to target
    const path = this.pathfinding.findPath(currentPos.x, currentPos.y, targetX, targetY);
    
    if (path.length > 1) {
      // Store the full path for continuous movement
      this.currentPath = path.slice(1); // Skip current position
      this.pathIndex = 0;
      this.pathTarget = targetName;
      
      // Start smooth pathfinding like the player
      this.isMoving = true;
      this.followPath();
      
      const distance = Math.round(Phaser.Math.Distance.Between(currentPos.x, currentPos.y, targetX, targetY));
      return { 
        success: true, 
        message: `Started pathfinding to ${targetName} (${distance} units away)` 
      };
    } else {
      return {
        success: false,
        message: `Cannot find path to ${targetName} - path blocked`,
      };
    }
  }

  private continuePathfinding(): { success: boolean; message: string } {
    if (this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
      // Path completed
      this.currentPath = [];
      this.pathIndex = 0;
      const target = this.pathTarget;
      this.pathTarget = "";
      return { success: true, message: `Arrived at ${target}` };
    }

    // Move to next step in path
    const nextStep = this.currentPath[this.pathIndex];
    this.moveToPosition(nextStep.x, nextStep.y);
    this.pathIndex++;

    const remaining = this.currentPath.length - this.pathIndex;
    return { 
      success: true, 
      message: `Continuing toward ${this.pathTarget} (${remaining} steps remaining)` 
    };
  }

  private abandonPath(): { success: boolean; message: string } {
    const target = this.pathTarget;
    this.currentPath = [];
    this.pathIndex = 0;
    this.pathTarget = "";
    this.isMoving = false;
    return { 
      success: true, 
      message: `Abandoned pathfinding to ${target}` 
    };
  }

  private followPath(): void {
    if (this.pathIndex >= this.currentPath.length) {
      // Path completed
      this.isMoving = false;
      const target = this.pathTarget;
      this.currentPath = [];
      this.pathIndex = 0;
      this.pathTarget = "";
      
      // Play idle animation
      this.playIdleAnimation();
      console.log(`🎯 ${this.name}: Arrived at ${target}`);
      return;
    }

    const target = this.currentPath[this.pathIndex];
    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.x, target.y);
    
    if (distance < 5) {
      this.pathIndex++;
      this.followPath();
      return;
    }

    // Determine direction for animation
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      this.lastDirection = dx > 0 ? 'right' : 'left';
    } else {
      this.lastDirection = dy > 0 ? 'down' : 'up';
    }
    
    // Play walking animation
    this.playWalkAnimation();

    // Move towards target with smooth tween
    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      x: target.x,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.pathIndex++;
        this.followPath();
      }
    });

    this.scene.tweens.add({
      targets: this.nameText,
      y: target.y - 35,
      duration: 300,
      ease: 'Linear'
    });

    this.scene.tweens.add({
      targets: this.sprite,
      y: target.y,
      duration: 300,
      ease: 'Linear'
    });
  }

  private playWalkAnimation(): void {
    if (!this.sprite || !this.sprite.scene || !this.sprite.anims) return;
    
    const spriteKey = this.sprite.texture.key;
    if (spriteKey === "alex") {
      this.sprite.play(`alex_walk_${this.lastDirection}`, true);
    } else if (spriteKey === "amelia") {
      this.sprite.play(`amelia_walk_${this.lastDirection}`, true);
    } else if (spriteKey === "bob") {
      this.sprite.play(`bob_walk_${this.lastDirection}`, true);
    }
  }

  private playIdleAnimation(): void {
    if (!this.sprite || !this.sprite.scene || !this.sprite.anims) return;
    
    const spriteKey = this.sprite.texture.key;
    if (spriteKey === "alex") {
      this.sprite.play(`alex_idle_${this.lastDirection}`, true);
    } else if (spriteKey === "amelia") {
      this.sprite.play(`amelia_idle_${this.lastDirection}`, true);
    } else if (spriteKey === "bob") {
      this.sprite.play(`bob_idle_${this.lastDirection}`, true);
    }
  }

  private takeNote(note: string, category: string): { success: boolean; message: string } {
    const noteEntry = {
      id: Date.now().toString(),
      content: note,
      category: category,
      timestamp: new Date().toLocaleString(),
      location: "Town Square" // Could be enhanced to track actual location
    };

    // Emit note to the scene for storage
    this.scene.events.emit('note-taken', noteEntry);
    
    // Also speak the note for immediate feedback
    this.showSpeech(`📝 Noted: ${note}`);
    
    return { 
      success: true, 
      message: `Recorded note: ${note}` 
    };
  }

  private initializeKnownLandmarks(): void {
    // NPCs know about major town landmarks from the start
    const landmarks = [
      { name: "Police Station", x: 600, y: 450 },
      { name: "Hospital", x: 1800, y: 450 },
      { name: "School", x: 600, y: 1350 },
      { name: "Grocery Store", x: 1800, y: 1350 },
      { name: "Art Museum", x: 1200, y: 300 },
      { name: "Library", x: 300, y: 900 },
      { name: "Tavern", x: 2100, y: 900 },
      { name: "Town Center", x: 1200, y: 900 },
      { name: "North Well", x: 600, y: 1200 },
      { name: "Main Well", x: 1200, y: 600 },
      { name: "Town Square", x: 1200, y: 900 },
    ];

    landmarks.forEach(landmark => {
      this.discoveredLocations.set(landmark.name.toLowerCase().replace(/\s+/g, '_'), {
        x: landmark.x,
        y: landmark.y,
        name: landmark.name
      });
    });
  }

  private logActivity(): void {
    const avgRequestInterval =
      this.llmRequestCount > 1
        ? (Date.now() -
            (this.lastLLMRequest - (this.llmRequestCount - 1) * 1000)) /
          this.llmRequestCount
        : 0;

    console.log(
      `📊 ${this.name}: Activity Summary - ${
        this.llmRequestCount
      } LLM requests, avg interval: ${Math.round(
        avgRequestInterval
      )}ms, in conversation: ${this.isInPlayerConversation}`
    );
  }

  private startAILoop(): void {
    console.log(`🧠 ${this.name}: Starting AI loop`);
    // Start with initial timed action
    this.resetActionTimer();
  }

  private async performAIAction(eventType?: string, eventData?: any): Promise<void> {
    // Update line of sight and check proximity
    this.updateLineOfSight();

    const context = this.buildAIContext();

    try {
      // If this is an event-driven action, cancel any pending timed requests
      if (eventType && eventData && this.pendingLLMRequest) {
        console.log(`🚫 ${this.name}: Cancelling pending timed request due to event: ${eventType}`);
        // Note: We can't actually cancel the HTTP request, but we can ignore its result
        this.pendingLLMRequest = undefined;
      }

      // For timed actions, check if enough time has passed since last event
      if (!eventType) {
        const timeSinceLastEvent = Date.now() - this.lastEventTime;
        const MIN_INACTIVITY_TIME = 15000; // 15 seconds minimum inactivity
        
        if (timeSinceLastEvent < MIN_INACTIVITY_TIME) {
          console.log(`⏰ ${this.name}: Skipping timed action - only ${timeSinceLastEvent}ms since last event (need ${MIN_INACTIVITY_TIME}ms)`);
          this.resetActionTimer();
          return;
        }
      }

      // Track LLM request frequency
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastLLMRequest;
      this.lastLLMRequest = now;
      this.llmRequestCount++;

      console.log(
        `🕐 ${this.name}: LLM Request #${this.llmRequestCount} (${timeSinceLastRequest}ms since last request)`
      );

      let decision;
      let requestPromise;
      
      // Use event-driven response if we have an event, otherwise use regular action generation
      if (eventType && eventData) {
        console.log(`🎯 ${this.name}: Processing event: ${eventType}`, eventData);
        this.lastEventTime = now; // Update event time
        requestPromise = this.aiService.generateEventResponse(
          context,
          eventType,
          eventData,
          this.conversationMessages
        );
      } else {
        console.log(`⏰ ${this.name}: Timed action (no recent events)`);
        requestPromise = this.aiService.generateNPCAction(
          context,
          this.conversationMessages
        );
        this.pendingLLMRequest = requestPromise; // Track timed requests
      }

      decision = await requestPromise;

      // Clear pending request tracking
      if (this.pendingLLMRequest === requestPromise) {
        this.pendingLLMRequest = undefined;
      }

      console.log(`🤖 ${this.name}: LLM Decision:`, {
        action: decision.action,
        parameters: decision.parameters,
        reasoning: decision.reasoning,
      });

      if (!decision.action) {
        throw new Error("LLM returned undefined action");
      }

      const result = await this.executeAction(
        decision.action,
        decision.parameters
      );

      console.log(
        `📝 ${this.name}: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}: ${
          result.message
        }`
      );

      // Add to conversation history
      this.conversationMessages.push({
        role: "assistant",
        content: `I chose action: ${decision.action}${
          decision.parameters
            ? ` with parameters: ${JSON.stringify(decision.parameters)}`
            : ""
        }. Reasoning: ${decision.reasoning}`,
        tool_calls: decision.tool_calls,
      });

      this.conversationMessages.push({
        role: "tool",
        content: result.success
          ? `SUCCESS: ${result.message}`
          : `FAILED: ${result.message}`,
        name: decision.action,
      });

      // Keep conversation manageable
      if (this.conversationMessages.length > 20) {
        this.conversationMessages = this.conversationMessages.slice(-10);
      }

      // Reset the timer for next timed action
      this.resetActionTimer();
      
    } catch (error) {
      console.error(`AI action failed for ${this.name}:`, error);
      // Clear pending request tracking on error
      this.pendingLLMRequest = undefined;
      this.resetActionTimer();
    }
  }

  private resetActionTimer(): void {
    // Clear existing timer
    if (this.actionTimer) {
      this.actionTimer.destroy();
    }
    
    // Only set timer if not in player conversation
    if (!this.isInPlayerConversation) {
      this.actionTimer = this.scene.time.addEvent({
        delay: ACTION_DELAY,
        callback: () => this.performAIAction(),
        callbackScope: this,
        loop: false
      });
    }
  }

  private updateLineOfSight(): void {
    const myPos = this.getPosition();
    this.discoveredObjects.clear();
    this.discoveredCharacters.clear();

    // Check objects within proximity range
    this.roomObjects.forEach((obj) => {
      const distance = Phaser.Math.Distance.Between(
        myPos.x,
        myPos.y,
        obj.getPosition().x,
        obj.getPosition().y
      );
      if (distance < LINE_OF_SIGHT_RANGE) {
        this.discoveredObjects.add(obj.id);
      }
    });

    // Check characters within proximity range
    this.roomCharacters.forEach((char) => {
      if (char.id !== this.id) {
        const distance = Phaser.Math.Distance.Between(
          myPos.x,
          myPos.y,
          char.getPosition().x,
          char.getPosition().y
        );
        if (distance < LINE_OF_SIGHT_RANGE * 1.5) {
          this.discoveredCharacters.add(char.id);
        }
      }
    });
  }

  private buildAIContext(): NPCContext {
    const visibleObjects = Array.from(this.discoveredObjects)
      .map((id) => this.roomObjects.find((obj) => obj.id === id))
      .filter((obj) => obj)
      .map((obj) => obj!.getStateDescription());

    const visibleCharacters = Array.from(this.discoveredCharacters)
      .map((id) => this.roomCharacters.find((char) => char.id === id))
      .filter((char) => char)
      .map((char) => char!.name);

    const availableTools = this.getAvailableTools();
    
    // Include only messages this NPC actually heard
    const heardMessages = this.getHeardMessages();
    const contextHistory = heardMessages.slice(-8); // More context for better responses

    // Add specific goals and motivations based on character
    const goals = this.getCharacterGoals();

    // Build spatial awareness context
    const spatialContext = this.buildSpatialContext();

    return {
      name: this.name,
      background: this.background,
      personality: this.personality,
      currentLocation: "current room",
      visibleObjects,
      visibleCharacters,
      availableTools,
      conversationHistory: contextHistory,
      currentGoals: goals,
      spatialContext: spatialContext,
    };
  }

  private getCharacterGoals(): string[] {
    // Return custom goals if set, otherwise use default goals
    if (this.customGoals.length > 0) {
      return this.customGoals;
    }
    
    const name = this.name.toLowerCase();
    
    if (name.includes('doctor') || name.includes('thompson')) {
      return [
        "Investigate the mysterious illness affecting townspeople",
        "Gather symptoms and medical information from residents", 
        "Find the source of the strange ailments",
        "Document unusual patient behaviors and patterns"
      ];
    }
    
    if (name.includes('sheriff') || name.includes('martinez')) {
      return [
        "Maintain law and order in the town",
        "Investigate reports of strange occurrences", 
        "Question strangers and newcomers",
        "Protect townspeople from potential threats",
        "Gather information about the Whispering Stones incidents"
      ];
    }
    
    if (name.includes('sage') || name.includes('eleanor')) {
      return [
        "Research the ancient history of the Whispering Stones",
        "Decode old texts and manuscripts about the town's past",
        "Share knowledge with those who seek understanding",
        "Uncover the truth behind the mystical events",
        "Preserve important historical information"
      ];
    }
    
    if (name.includes('sarah')) {
      return [
        "Gather gossip and information from townspeople and visitors",
        "Help newcomers feel welcome while protecting town secrets",
        "Keep track of who's coming and going",
        "Share local knowledge and rumors",
        "Maintain her position as the town's information hub"
      ];
    }
    
    if (name.includes('marcus') || name.includes('webb')) {
      return [
        "Identify profitable business opportunities in town",
        "Investigate the commercial potential of recent strange events",
        "Build relationships with key townspeople",
        "Gather information about valuable resources or artifacts",
        "Establish trade connections and partnerships"
      ];
    }
    
    // Default goals for other NPCs
    return [
      "Interact with townspeople and visitors",
      "Share information about local events",
      "Maintain daily routines and responsibilities"
    ];
  }

  private buildSpatialContext(): any {
    const myPos = this.getPosition();
    
    // Get known landmarks
    const knownLandmarks = Array.from(this.discoveredLocations.entries()).map(([key, location]) => ({
      name: location.name,
      key: key,
      x: location.x,
      y: location.y,
      distance: Math.round(Phaser.Math.Distance.Between(myPos.x, myPos.y, location.x, location.y))
    }));

    // Get discovered characters with their last known positions
    const discoveredCharacterPositions = Array.from(this.discoveredCharacters)
      .map(charId => {
        const char = this.roomCharacters.find(c => c.id === charId);
        if (char) {
          const pos = char.getPosition();
          return {
            name: char.name,
            id: charId,
            x: pos.x,
            y: pos.y,
            distance: Math.round(Phaser.Math.Distance.Between(myPos.x, myPos.y, pos.x, pos.y))
          };
        }
        return null;
      })
      .filter(char => char !== null);

    // Get discovered objects with positions
    const discoveredObjectPositions = Array.from(this.discoveredObjects)
      .map(objId => {
        const obj = this.roomObjects.find(o => o.id === objId);
        if (obj) {
          const pos = obj.getPosition();
          return {
            name: obj.name,
            id: objId,
            x: pos.x,
            y: pos.y,
            distance: Math.round(Phaser.Math.Distance.Between(myPos.x, myPos.y, pos.x, pos.y))
          };
        }
        return null;
      })
      .filter(obj => obj !== null);

    return {
      currentPosition: { x: Math.round(myPos.x), y: Math.round(myPos.y) },
      knownLandmarks: knownLandmarks.sort((a, b) => a.distance - b.distance),
      discoveredCharacters: discoveredCharacterPositions.sort((a, b) => a.distance - b.distance),
      discoveredObjects: discoveredObjectPositions.sort((a, b) => a.distance - b.distance),
      mapBounds: { width: 2400, height: 1800 }
    };
  }

  private getAvailableTools(): NPCTool[] {
    const tools: NPCTool[] = [];

    // PRIORITY: Add speak tool FIRST - NPCs should prioritize communication
    tools.push(
      { 
        name: "speak", 
        description: "Say something to nearby characters",
        parameters: { message: "string" }
      }
    );

    // Add move_to tool for intelligent pathfinding
    tools.push(
      {
        name: "move_to",
        description: "Move to a specific location using pathfinding. Can use coordinates (x,y) or landmark names like 'hospital', 'library', 'town_center'",
        parameters: { 
          target: "string - either 'x,y' coordinates or landmark name like 'hospital', 'library', 'police_station'" 
        }
      }
    );

    // Add abandon_path tool if currently pathfinding
    if (this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
      tools.push(
        {
          name: "abandon_path",
          description: `Stop pathfinding to ${this.pathTarget} and do something else instead.`,
          parameters: {}
        }
      );
    }

    // Add special tools based on role
    if (this.role === "guide") {
      tools.push(
        {
          name: "take_note",
          description: "Record an important discovery, conversation, or clue for the player's reference",
          parameters: { 
            note: "string - the important information to record",
            category: "string - category like 'clue', 'character', 'location', 'event'"
          }
        },
        {
          name: "give_hint",
          description: "Provide a helpful hint about what the player should do next or where to investigate",
          parameters: {
            hint: "string - the helpful guidance to provide"
          }
        },
        {
          name: "explain_controls",
          description: "Explain how to interact with the game world, NPCs, or objects",
          parameters: {
            explanation: "string - the control or interaction explanation"
          }
        }
      );
      // Guide doesn't get movement tools - it follows the player automatically
      return tools;
    }

    // Always include basic tools
    tools.push(
      { name: "wait", description: "Do nothing and observe the surroundings" }
    );

    // Add movement tools in random order
    const movementTools = [
      {
        name: "move_north",
        description: "Move north (up) to explore that area",
      },
      {
        name: "move_south",
        description: "Move south (down) to explore that area",
      },
      {
        name: "move_east",
        description: "Move east (right) to explore that area",
      },
      {
        name: "move_west",
        description: "Move west (left) to explore that area",
      }
    ];
    
    // Shuffle movement tools to prevent bias
    Phaser.Utils.Array.Shuffle(movementTools);
    tools.push(...movementTools);

    // Always add movement tools (removed player proximity restriction)
    tools.push(
      {
        name: "move_random",
        description: "Walk to a different area of the room",
      },
      { name: "patrol", description: "Move around the room to patrol the area" }
    );

    // Add interaction tools for discovered objects
    console.log(
      `🔍 ${this.name}: Discovered objects:`,
      Array.from(this.discoveredObjects)
    );
    Array.from(this.discoveredObjects).forEach((objId) => {
      const obj = this.roomObjects.find((o) => o.id === objId);
      if (obj && typeof obj.getOfferedTools === "function") {
        const objectTools = obj.getOfferedTools();
        objectTools.forEach((tool) => {
          tools.push({
            name: `${tool.name}_${obj.id}`,
            description: `${tool.description} (${obj.name})`,
            parameters: { objectId: obj.id, ...tool.parameters },
          });
        });
      }
    });

    console.log(
      `🔧 ${this.name}: Available tools:`,
      tools.map((t) => t.name)
    );
    return tools;
  }

  private isPlayerNearby(): boolean {
    const player = this.roomCharacters.find((c) => c.id === "player");
    if (!player) return false;

    const distance = Phaser.Math.Distance.Between(
      this.getPosition().x,
      this.getPosition().y,
      player.getPosition().x,
      player.getPosition().y
    );

    return distance < 80;
  }

  private async executeAction(
    action: string,
    parameters?: any
  ): Promise<{ success: boolean; message: string }> {
    const pos = this.getPosition();
    console.log(
      `⚡ ${this.name} @(${Math.round(pos.x)},${Math.round(
        pos.y
      )}): Executing action '${action}'${
        parameters ? ` with params: ${JSON.stringify(parameters)}` : ""
      }`
    );

    switch (action) {
      case "wait":
        return { success: true, message: "Observed surroundings" };

      case "move_north":
      case "move_south":
      case "move_east":
      case "move_west":
        const direction = action.split("_")[1];
        return this.moveInDirection(direction);

      case "move_random":
      case "patrol":
        this.moveRandomly();
        return { success: true, message: "Moved to new area" };

      case "move_to":
        if (parameters?.target) {
          return this.moveToTarget(parameters.target);
        }
        return { success: false, message: "No target specified for move_to" };

      case "abandon_path":
        return this.abandonPath();

      case "take_note":
        if (parameters?.note) {
          return this.takeNote(parameters.note, parameters.category || "general");
        }
        return { success: false, message: "No note content provided" };

      case "give_hint":
        if (parameters?.hint) {
          this.showSpeech(`💡 Hint: ${parameters.hint}`);
          return { success: true, message: `Provided hint: ${parameters.hint}` };
        }
        return { success: false, message: "No hint provided" };

      case "explain_controls":
        if (parameters?.explanation) {
          this.showSpeech(`🎮 ${parameters.explanation}`);
          return { success: true, message: `Explained controls: ${parameters.explanation}` };
        }
        return { success: false, message: "No explanation provided" };

      case "speak":
        if (parameters?.message) {
          console.log(`💬 CONVO ${this.name}: Raw message parameter:`, JSON.stringify(parameters.message));
          console.log(`💬 CONVO ${this.name}: Message length: ${parameters.message.length}`);
          console.log(`💬 CONVO ${this.name}: "${parameters.message}"`);
          this.showSpeech(parameters.message);
          // Emit as town speech
          this.scene.events.emit("town-speech", {
            speaker: this.name,
            speakerId: this.id,
            message: parameters.message,
            position: this.getPosition(),
            timestamp: Date.now(),
          });
          return { success: true, message: `Said: "${parameters.message}"` };
        }
        return { success: false, message: "No message provided" };

      case "leave_conversation":
        console.log(`🚪 ${this.name}: Ending player conversation`);
        this.isInPlayerConversation = false;
        return { success: true, message: "Ended conversation" };

      default:
        // Handle dynamic character and object actions
        const actionParts = action.split("_");
        if (actionParts.length >= 2) {
          let baseAction: string;
          let targetId: string;

          // Handle speak_to_X actions specially
          if (action.startsWith("speak_to_")) {
            baseAction = "speak_to";
            targetId = action.substring(9); // Remove "speak_to_" prefix
          } else if (action.startsWith("move_to_")) {
            baseAction = "move_to";
            targetId = action.substring(8); // Remove "move_to_" prefix
          } else {
            baseAction = actionParts[0];
            targetId = actionParts.slice(1).join("_");
          }

          // Handle character actions
          console.log(
            `🔍 ${this.name}: Looking for character with ID: "${targetId}"`
          );
          console.log(
            `🔍 ${this.name}: Available characters:`,
            this.roomCharacters.map((c) => `${c.name} (id: ${c.id})`)
          );

          const character = this.roomCharacters.find((c) => c.id === targetId);
          if (character) {
            console.log(`✅ ${this.name}: Found character: ${character.name}`);
            if (baseAction === "speak_to") {
              // NPCs should not have direct speak_to actions - use town speech system
              return {
                success: false,
                message: `Use town speech system for communication`,
              };
            } else if (baseAction === "move_to") {
              // NPCs should use normal movement tools instead of teleporting
              return {
                success: false,
                message: `Use directional movement to approach ${character.name}`,
              };
            }
          }

          // Also try finding character by name (alex -> Sheriff Martinez)
          const characterByName = this.roomCharacters.find(
            (c) =>
              c.name.toLowerCase().includes(targetId.toLowerCase()) ||
              c.id.toLowerCase() === targetId.toLowerCase()
          );
          if (characterByName) {
            console.log(
              `✅ ${this.name}: Found character by name: ${characterByName.name}`
            );
            if (baseAction === "speak_to") {
              // NPCs should not have direct speak_to actions - use town speech system
              return {
                success: false,
                message: `Use town speech system for communication`,
              };
            } else if (baseAction === "move_to") {
              // NPCs should use normal movement tools instead of teleporting
              return {
                success: false,
                message: `Use directional movement to approach ${characterByName.name}`,
              };
            }
          }

          console.log(
            `❌ ${this.name}: Could not find character "${targetId}" for action "${baseAction}"`
          );

          // Handle object actions using event system
          const obj = this.roomObjects.find((o) => o.id === targetId);
          if (obj) {
            return new Promise((resolve) => {
              console.log(
                `🔧 ${this.name}: Firing event ${action} for object interaction`
              );

              const responseEvent = `tool-response-${action}`;
              this.scene.events.once(
                responseEvent,
                (result: {
                  success: boolean;
                  message: string;
                  target: string;
                }) => {
                  console.log(
                    `📝 ${this.name} -> ${result.target}: ${result.message}`
                  );
                  
                  // Emit action to town chat with the actual result message
                  this.scene.events.emit('town-action', {
                    actor: this.name,
                    action: result.message,
                    timestamp: Date.now()
                  });
                  
                  resolve(result);
                }
              );

              this.scene.events.emit(action, {
                initiator: this,
                parameters: { objectId: targetId },
              });
            });
          }
        }

        return { success: false, message: `Unknown action: ${action}` };
    }
  }

  private moveInDirection(direction: string): {
    success: boolean;
    message: string;
  } {
    const currentPos = this.getPosition();
    const moveDistance = 60; // Larger steps for pathfinding
    let targetX = currentPos.x;
    let targetY = currentPos.y;

    switch (direction) {
      case "north":
        targetY -= moveDistance;
        this.lastDirection = "up";
        break;
      case "south":
        targetY += moveDistance;
        this.lastDirection = "down";
        break;
      case "east":
        targetX += moveDistance;
        this.lastDirection = "right";
        break;
      case "west":
        targetX -= moveDistance;
        this.lastDirection = "left";
        break;
    }

    // Use pathfinding to move
    const path = this.pathfinding.findPath(currentPos.x, currentPos.y, targetX, targetY);
    
    if (path.length > 1) {
      const target = path[1]; // Next step in path
      this.moveToPosition(target.x, target.y);
      return { success: true, message: `Moved ${direction}` };
    } else {
      return {
        success: false,
        message: `Cannot move ${direction} - path blocked`,
      };
    }
  }

  private moveToPosition(x: number, y: number): void {
    // Get scene bounds to keep NPCs within the scene
    const sceneBounds = this.getSceneBounds();
    const clampedX = Phaser.Math.Clamp(x, sceneBounds.minX, sceneBounds.maxX);
    const clampedY = Phaser.Math.Clamp(y, sceneBounds.minY, sceneBounds.maxY);

    // Calculate direction for animation
    const dx = clampedX - this.sprite.x;
    const dy = clampedY - this.sprite.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      this.lastDirection = dx > 0 ? 'right' : 'left';
    } else {
      this.lastDirection = dy > 0 ? 'down' : 'up';
    }
    
    // Play walking animation
    this.playWalkAnimation();

    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      x: clampedX,
      duration: 1000,
      ease: "Power1",
    });

    this.scene.tweens.add({
      targets: this.nameText,
      y: clampedY - 25,
      duration: 1000,
      ease: "Power1",
    });

    this.scene.tweens.add({
      targets: this.sprite,
      y: clampedY,
      duration: 1000,
      ease: "Power1",
      onComplete: () => {
        // Play idle animation when movement completes
        this.playIdleAnimation();
        this.updateLineOfSight();
      },
    });
  }

  private getSceneBounds(): { minX: number, maxX: number, minY: number, maxY: number } {
    // Default bounds for town scene
    let bounds = { minX: 80, maxX: 2320, minY: 120, maxY: 1680 };
    
    // Hospital scene bounds
    if (this.scene.scene.key === 'HospitalScene') {
      bounds = { minX: 50, maxX: 750, minY: 50, maxY: 550 };
    }
    
    return bounds;
  }

  private moveRandomly(): void {
    const currentPos = this.getPosition();
    const moveDistance = 25; // Smaller random movements
    const newX =
      currentPos.x + Phaser.Math.Between(-moveDistance, moveDistance);
    const newY =
      currentPos.y + Phaser.Math.Between(-moveDistance, moveDistance);

    // Use larger map bounds
    const clampedX = Phaser.Math.Clamp(newX, 80, 2320);
    const clampedY = Phaser.Math.Clamp(newY, 120, 1680);

    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      x: clampedX,
      duration: 2000, // Slower random movement
      ease: "Power1",
    });

    this.scene.tweens.add({
      targets: this.nameText,
      y: clampedY - 25,
      duration: 2000,
      ease: "Power1",
    });

    this.scene.tweens.add({
      targets: this.sprite,
      y: clampedY,
      duration: 2000,
      ease: "Power1",
      onComplete: () => {
        this.updateLineOfSight();
      },
    });
  }

  private onTownSpeech = (data: {
    speaker: string;
    speakerId: string;
    message: string;
    targetName?: string;
    position: { x: number; y: number };
    timestamp: number;
  }) => {
    console.log(`🔍 ${this.name}: onTownSpeech - speaker: ${data.speaker}, speakerId: ${data.speakerId}, myId: ${this.id}`);
    
    // Don't respond to own speech
    if (data.speakerId === this.id) {
      console.log(`🚫 ${this.name}: Ignoring own speech`);
      return;
    }

    // Check proximity - only respond if nearby
    const distance = Phaser.Math.Distance.Between(
      this.getPosition().x,
      this.getPosition().y,
      data.position.x,
      data.position.y
    );

    const HEARING_RANGE = 120; // Reduced from 200 to make conversations more intimate
    if (distance > HEARING_RANGE) {
      console.log(`🔇 ${this.name}: Too far from ${data.speaker} (distance: ${Math.round(distance)}, range: ${HEARING_RANGE})`);
      return;
    }

    console.log(`👂 ${this.name}: Heard ${data.speaker} nearby (distance: ${Math.round(distance)})`);

    // Find all NPCs who can hear this message
    const hearers = this.findNPCsInRange(data.position, HEARING_RANGE);

    // Add to conversation memory with hearers list
    this.conversationMessages.push({
      role: "user",
      content: data.message,
      name: data.speakerId,
      hearers: hearers
    });

    // Check if we should respond to this speech
    if (this.shouldEngageWithSpeech(data)) {
      // Update event time to prevent timed actions
      this.lastEventTime = Date.now();
      
      // Cancel any pending timed action since we have an event
      if (this.actionTimer) {
        console.log(`🚫 ${this.name}: Cancelling timed action due to speech event`);
        this.actionTimer.destroy();
        this.actionTimer = undefined;
      }
      
      console.log(`🎯 ${this.name}: Triggering event-driven response to speech from ${data.speaker}: "${data.message}"`);
      
      // Trigger immediate event-driven response
      this.performAIAction('speech_heard', { speaker: data.speaker, message: data.message })
        .then(() => {
          console.log(`✅ ${this.name}: Completed event response to speech`);
        })
        .catch((error) => {
          console.error(`❌ ${this.name}: Error in speech event response:`, error);
        });
    } else {
      console.log(`🚫 ${this.name}: Not responding to speech - shouldEngage returned false`);
    }
  };

  private shouldEngageWithSpeech(data: {
    speaker: string;
    speakerId: string;
    message: string;
  }): boolean {
    // Always respond to player messages (100% engagement)
    if (data.speakerId === 'player') {
      console.log(`🎯 ${this.name}: Will respond to player message: "${data.message}"`);
      this.isInPlayerConversation = true; // Enter conversation mode
      return true;
    }

    // Don't respond if already in player conversation
    if (this.isInPlayerConversation) return false;

    // For NPC-to-NPC, use more selective filtering
    if (Math.random() > 0.33) return false;

    // More likely to respond if message mentions keywords relevant to personality
    const message = data.message.toLowerCase();
    const keywords = this.getPersonalityKeywords();
    const isRelevant = keywords.some((keyword) => message.includes(keyword));

    return isRelevant || Math.random() < 0.1; // 10% chance even if not relevant
  }

  private getPersonalityKeywords(): string[] {
    const name = this.name.toLowerCase();
    if (name.includes("doctor") || name.includes("thompson")) {
      return [
        "symptoms",
        "patients",
        "medical",
        "health",
        "strange",
        "illness",
      ];
    }
    if (name.includes("sheriff") || name.includes("martinez")) {
      return ["trouble", "law", "investigate", "reports", "crime", "safety"];
    }
    if (name.includes("sage") || name.includes("eleanor")) {
      return ["books", "history", "ancient", "texts", "knowledge", "stones"];
    }
    if (name.includes("sarah")) {
      return ["town", "folks", "rumors", "gossip", "community"];
    }
    return ["help", "talk", "discuss"];
  }

  // Legacy methods removed - NPCs now use unified tool system

  public showSpeech(message: string): void {
    console.log(`🗨️ ${this.name}: showSpeech called with message length: ${message.length}`);
    console.log(`🗨️ ${this.name}: showSpeech message: "${message}"`);
    console.log(`🗨️ ${this.name}: Showing speech bubble at (${this.sprite.x}, ${this.sprite.y})`);
    this.speechBubble.show(
      this.sprite.x,
      this.sprite.y - 40,
      message,
      this.name,
      true // Auto-hide with longer timeout
    );
  }

  public receiveConversationAttempt(initiator: Character): void {
    console.log(
      `📞 ${this.name}: Received conversation attempt from ${initiator.name}`
    );

    if (initiator.id === "player") {
      this.isInPlayerConversation = true;
      console.log(`🟢 ${this.name}: Now in player conversation`);
    }
  }

  public sendMessage(message: string, sender: Character): void {
    console.log(
      `📨 ${this.name}: Received message from ${sender.name}: "${message}"`
    );

    // All messages should go through town speech system - no direct processing
    if (sender.id === "player") {
      console.log(`🔄 ${this.name}: Redirecting player message to town speech system`);
      // The message will be processed via onTownSpeech when the town-speech event is emitted
    }
  }

  private findNPCsInRange(position: { x: number; y: number }, range: number): string[] {
    const hearers: string[] = [];
    
    // Always include the player if in range
    const player = this.roomCharacters.find(c => c.id === 'player');
    if (player) {
      const distance = Phaser.Math.Distance.Between(
        position.x, position.y,
        player.getPosition().x, player.getPosition().y
      );
      if (distance <= range) {
        hearers.push('player');
      }
    }
    
    // Include all NPCs in range
    this.roomCharacters.forEach(char => {
      if (char.id !== 'player' && char.id !== this.id) {
        const distance = Phaser.Math.Distance.Between(
          position.x, position.y,
          char.getPosition().x, char.getPosition().y
        );
        if (distance <= range) {
          hearers.push(char.id);
        }
      }
    });
    
    return hearers;
  }

  private getHeardMessages() {
    return this.conversationMessages.filter(msg => 
      !msg.hearers || msg.hearers.includes(this.id) || msg.name === this.id
    );
  }
  public setRoomContext(
    objects: InteractiveObject[],
    characters: Character[],
    grid: number[][]
  ): void {
    this.roomObjects = objects;
    this.roomCharacters = characters;
    this.roomGrid = grid;
  }

  
  public setGoals(goals: string[]): void {
    this.customGoals = goals;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  public getState(): string {
    return this.isInPlayerConversation ? "ENGAGED" : "IDLE";
  }

  update() {
    // Guide NPCs follow the player automatically
    if (this.role === "guide") {
      this.followPlayer();
    }
  }

  private followPlayer(): void {
    // Only follow in TownOverworldScene
    if (this.scene.scene.key !== 'TownOverworldScene') {
      return;
    }

    const player = this.roomCharacters.find(c => c.id === "player");
    if (!player) return;

    const playerPos = player.getPosition();
    const myPos = this.getPosition();
    const distance = Phaser.Math.Distance.Between(myPos.x, myPos.y, playerPos.x, playerPos.y);

    // Follow if player is too far away (more than 80 units) and not already moving
    if (distance > 80 && !this.isMoving) {
      // Calculate position slightly behind the player
      const followDistance = 60;
      const angle = Phaser.Math.Angle.Between(playerPos.x, playerPos.y, myPos.x, myPos.y);
      const targetX = playerPos.x + Math.cos(angle) * followDistance;
      const targetY = playerPos.y + Math.sin(angle) * followDistance;

      // Use pathfinding system for smooth movement
      const path = this.pathfinding.findPath(myPos.x, myPos.y, targetX, targetY);
      
      if (path.length > 1) {
        this.currentPath = path.slice(1);
        this.pathIndex = 0;
        this.pathTarget = "Player";
        this.isMoving = true;
        this.followPath();
      }
    }
  }

  public destroy(): void {
    // Clean up event listeners
    this.scene.events.off("town-speech", this.onTownSpeech, this);

    if (this.actionTimer) this.actionTimer.destroy();
    if (this.activityTimer) this.activityTimer.destroy();
    this.speechBubble.destroy();
    this.sprite.destroy();
    this.nameText.destroy();
  }
}
