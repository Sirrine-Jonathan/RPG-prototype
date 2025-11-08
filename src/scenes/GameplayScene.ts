import { BaseScene } from "./BaseScene";
import { ProximityService } from "../services/ProximityService";
import { AssetManager } from "../systems/AssetManager";
import { GameStateManager } from "../systems/GameStateManager";
import { Pathfinding } from "../utils/Pathfinding";

export abstract class GameplayScene extends BaseScene {
  protected player!: Phaser.GameObjects.Sprite;
  protected playerProximityIndicator!: Phaser.GameObjects.Graphics;
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected wasd!: any;
  protected proximityService!: ProximityService;
  protected assetManager!: AssetManager;
  protected gameStateManager!: GameStateManager;
  protected pathfinding!: Pathfinding;
  protected isMoving = false;
  protected lastDirection = 'down';
  protected currentPath: Array<{x: number, y: number}> = [];
  protected pathIndex: number = 0;
  
  // Camera panning state
  protected isPanning = false;
  protected lastPanX = 0;
  protected lastPanY = 0;

  constructor(config: Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  preload() {
    this.assetManager = new AssetManager(this);
    this.assetManager.preloadTechDungeonAssets();
  }

  create() {
    super.create();
    
    this.gameStateManager = GameStateManager.getInstance();
    this.assetManager.createPlayerAnimations();
    this.proximityService = new ProximityService(this);
    this.pathfinding = new Pathfinding(30, this.getSceneWidth(), this.getSceneHeight());
    
    this.setupInput();
    this.setupProximityEvents();
  }

  protected setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D', false);
    
    // Add click-to-move (left click only)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.isMoving) {
        this.movePlayerTo(pointer.worldX, pointer.worldY);
      } else if (pointer.rightButtonDown()) {
        // Start camera panning
        this.isPanning = true;
        this.lastPanX = pointer.x;
        this.lastPanY = pointer.y;
        this.cameras.main.stopFollow();
      }
    });
    
    // Handle camera panning
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning && pointer.rightButtonDown()) {
        const deltaX = this.lastPanX - pointer.x;
        const deltaY = this.lastPanY - pointer.y;
        
        this.cameras.main.scrollX += deltaX;
        this.cameras.main.scrollY += deltaY;
        
        this.lastPanX = pointer.x;
        this.lastPanY = pointer.y;
      }
    });
    
    // Stop panning on mouse up
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        this.isPanning = false;
        // Don't resume following immediately - let player movement handle it
      }
    });
  }

  protected createPlayer(x: number, y: number): void {
    this.player = this.add.sprite(x, y, "adam", 0);
    this.player.setScale(2);
    this.player.setOrigin(0.5, 0.5);
    this.player.play(`adam_idle_${this.lastDirection}`);
    
    // Create player proximity indicator
    this.playerProximityIndicator = this.add.graphics();
    this.playerProximityIndicator.setAlpha(0.2);
    this.updatePlayerProximityIndicator();
    
    this.cameras.main.startFollow(this.player);
    
    // Ensure input is properly set up after player creation
    if (!this.cursors || !this.wasd) {
      this.setupInput();
    }
  }

  protected movePlayerTo(targetX: number, targetY: number): void {
    console.log(`🎯 Click-to-move: from (${this.player.x}, ${this.player.y}) to (${targetX}, ${targetY})`);
    const path = this.pathfinding.findPath(this.player.x, this.player.y, targetX, targetY);
    console.log(`🎯 Pathfinding result: ${path.length} steps`);
    
    if (path.length > 1) {
      this.currentPath = path.slice(1);
      this.pathIndex = 0;
      this.isMoving = true;
      // Smoothly transition camera back to player
      this.smoothFollowPlayer();
      this.followPath();
    }
  }

  protected smoothFollowPlayer(): void {
    if (this.cameras.main.followTarget) return; // Already following
    
    // Smoothly pan camera to player position, then start following
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: this.player.x - this.cameras.main.width / 2,
      scrollY: this.player.y - this.cameras.main.height / 2,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.cameras.main.startFollow(this.player);
      }
    });
  }

  protected followPath(): void {
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

  update() {
    this.handleMovement();
    this.updateProximity();
    this.updateNPCs();
  }

  protected setupProximityEvents(): void {
    this.events.on('npc-proximity-enter', (data: { npc: any, distance: number }) => {
      data.npc.onPlayerProximityEnter(data.distance);
    });
    
    this.events.on('npc-proximity-exit', (data: { npc: any, distance: number }) => {
      data.npc.onPlayerProximityExit(data.distance);
    });
  }

  protected updateNPCs(): void {
    // Just update NPC logic, proximity is handled by events
    if (this.proximityService) {
      const allNPCs = this.proximityService.getAllNPCs();
      allNPCs.forEach((npc: any) => {
        if (npc.update) {
          npc.update();
        }
      });
    }
  }

  protected handleMovement(): void {
    const isChatFocused = document.activeElement?.tagName === "TEXTAREA" || 
                         document.activeElement?.tagName === "INPUT";

    if (!isChatFocused && !this.isMoving && this.player && this.cursors && this.wasd) {
      const speed = 200;
      let moving = false;

      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        this.player.x -= (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'left';
        moving = true;
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        this.player.x += (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'right';
        moving = true;
      }

      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        this.player.y -= (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'up';
        moving = true;
      } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
        this.player.y += (speed * this.game.loop.delta) / 1000;
        this.lastDirection = 'down';
        moving = true;
      }

      if (moving) {
        if (this.player && this.player.play) {
          this.player.play(`adam_walk_${this.lastDirection}`, true);
        }
        // Smoothly transition camera back to player when moving with keyboard
        if (!this.cameras.main.followTarget) {
          this.smoothFollowPlayer();
        }
      } else {
        if (this.player && this.player.play) {
          this.player.play(`adam_idle_${this.lastDirection}`, true);
        }
      }

      // Keep player in bounds
      if (this.player) {
        const bounds = this.getPlayerBounds();
        this.player.x = Phaser.Math.Clamp(this.player.x, bounds.minX, bounds.maxX);
        this.player.y = Phaser.Math.Clamp(this.player.y, bounds.minY, bounds.maxY);
      }
    }
  }

  protected updatePlayerProximityIndicator(): void {
    if (!this.playerProximityIndicator || !this.player) return;
    
    this.playerProximityIndicator.clear();
    this.playerProximityIndicator.lineStyle(2, 0x0088ff, 0.6);
    this.playerProximityIndicator.strokeCircle(this.player.x, this.player.y, this.proximityService.getRange());
  }

  protected updateProximity(): void {
    this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
    this.updatePlayerProximityIndicator();
    const nearbyNPCs = this.proximityService.getNearbyNPCs();
    this.chatInterface.updateNearbyNPCs(nearbyNPCs);
  }

  protected setupNPCRoomContext(): void {
    // Create player character object for NPCs to reference
    const playerCharacter = {
      id: "player",
      name: "Visitor", 
      getPosition: () => ({ x: this.player.x, y: this.player.y })
    };

    // Get all NPCs from proximity service
    const allNPCs = this.proximityService.getAllNPCs();
    const allCharacters = [playerCharacter, ...allNPCs];
    const grid = Array(Math.ceil(this.getSceneWidth() / 48)).fill(null)
      .map(() => Array(Math.ceil(this.getSceneHeight() / 48)).fill(0));

    // Set room context for each NPC
    allNPCs.forEach(npc => {
      const otherCharacters = allCharacters.filter(char => char !== npc);
      npc.setRoomContext([], otherCharacters, grid); // Empty objects array for now
    });
  }

  // Abstract methods for scene-specific configuration
  protected abstract getSceneWidth(): number;
  protected abstract getSceneHeight(): number;
  protected abstract getPlayerBounds(): { minX: number, maxX: number, minY: number, maxY: number };
  protected abstract getExitPosition(): { x: number, y: number };
  protected abstract getReturnScene(): string;
  protected abstract getReturnPosition(): { x: number, y: number };

  protected createExitTrigger(x: number, y: number, width: number = 80, height: number = 40): void {
    const exitZone = this.add.zone(x, y, width, height);
    exitZone.setData('exit', true);
  }

  protected checkExitTrigger(): void {
    if (!this.player) return;
    
    const exitPos = this.getExitPosition();
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, exitPos.x, exitPos.y);
    
    // Debug logging
    if (distance < 60) {
      console.log(`🚪 DEBUG: Player at (${Math.round(this.player.x)}, ${Math.round(this.player.y)}), Exit at (${exitPos.x}, ${exitPos.y}), Distance: ${Math.round(distance)}`);
    }
    
    if (distance < 40) {
      console.log(`🚪 TRIGGER: Exiting ${this.scene.key} to ${this.getReturnScene()}`);
      this.exitScene();
    }
  }

  protected exitScene(): void {
    const returnScene = this.getReturnScene();
    const returnPosition = this.getReturnPosition();
    
    this.scene.start(returnScene, { playerPosition: returnPosition });
  }

  shutdown() {
    // Stop all NPCs when leaving the scene
    if (this.proximityService) {
      const allNPCs = this.proximityService.getAllNPCs();
      console.log(`🛑 Shutting down ${allNPCs.length} NPCs in ${this.scene.key}`);
      allNPCs.forEach(npc => {
        if (npc.stopAI) {
          npc.stopAI();
        }
      });
    }
  }
}
