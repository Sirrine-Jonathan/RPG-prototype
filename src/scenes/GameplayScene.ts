import { BaseScene } from "./BaseScene";
import { ProximityService } from "../services/ProximityService";
import { AssetManager } from "../systems/AssetManager";
import { GameStateManager } from "../systems/GameStateManager";
import { Pathfinding } from "../utils/Pathfinding";

export abstract class GameplayScene extends BaseScene {
  protected player!: Phaser.GameObjects.Sprite;
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
    this.proximityService = new ProximityService();
    this.pathfinding = new Pathfinding(30, this.getSceneWidth(), this.getSceneHeight());
    
    this.setupInput();
  }

  protected setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D', false);
    
    // Add click-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isMoving) {
        this.movePlayerTo(pointer.worldX, pointer.worldY);
      }
    });
  }

  protected createPlayer(x: number, y: number): void {
    this.player = this.add.sprite(x, y, "adam", 0);
    this.player.setScale(2);
    this.player.setOrigin(0.5, 0.5);
    this.player.play(`adam_idle_${this.lastDirection}`);
    
    this.cameras.main.startFollow(this.player);
  }

  protected movePlayerTo(targetX: number, targetY: number): void {
    const path = this.pathfinding.findPath(this.player.x, this.player.y, targetX, targetY);
    
    if (path.length > 1) {
      this.currentPath = path.slice(1);
      this.pathIndex = 0;
      this.isMoving = true;
      this.followPath();
    }
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

  protected updateNPCs(): void {
    // Update all NPCs in the proximity service
    if (this.proximityService && (this.proximityService as any).npcs) {
      (this.proximityService as any).npcs.forEach((npc: any) => {
        if (npc.update) {
          npc.update();
        }
      });
    }
  }

  protected handleMovement(): void {
    const isChatFocused = document.activeElement?.tagName === "TEXTAREA" || 
                         document.activeElement?.tagName === "INPUT";

    if (!isChatFocused && !this.isMoving && this.player) {
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
        this.player.play(`adam_walk_${this.lastDirection}`, true);
      } else {
        this.player.play(`adam_idle_${this.lastDirection}`, true);
      }

      // Keep player in bounds
      const bounds = this.getPlayerBounds();
      this.player.x = Phaser.Math.Clamp(this.player.x, bounds.minX, bounds.maxX);
      this.player.y = Phaser.Math.Clamp(this.player.y, bounds.minY, bounds.maxY);
    }
  }

  protected updateProximity(): void {
    this.proximityService.updatePlayerPosition(this.player.x, this.player.y);
    const nearestNPC = this.proximityService.getNearestNPC();
    const nearbyNPCs = nearestNPC ? [nearestNPC] : [];
    this.chatInterface.updateNearbyNPCs(nearbyNPCs);
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
}
