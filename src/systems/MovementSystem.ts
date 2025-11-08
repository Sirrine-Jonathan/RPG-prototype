import { GameManager } from '../core/GameManager';

export class MovementSystem {
  private isActive: boolean = false;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: any = null;
  private currentScene: Phaser.Scene | null = null;
  
  public initialize(): void {
    this.isActive = true;
  }
  
  public setupInput(scene: Phaser.Scene): void {
    this.currentScene = scene;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,S,A,D', false);
    
    // Set up click-to-move
    scene.input.on('pointerdown', this.handlePointerDown.bind(this));
  }
  
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isActive || !pointer.leftButtonDown()) return;
    
    const gameManager = GameManager.getInstance();
    const player = gameManager.entityManager.getPlayer();
    if (!player) return;
    
    // Use pathfinding system for movement
    gameManager.systemManager.pathfindingSystem.movePlayerTo(
      player,
      pointer.worldX,
      pointer.worldY
    );
  }
  
  public update(): void {
    if (!this.isActive || !this.currentScene) return;
    
    const gameManager = GameManager.getInstance();
    const player = gameManager.entityManager.getPlayer();
    if (!player || !this.cursors || !this.wasd) return;
    
    // Handle keyboard movement
    const isChatFocused = document.activeElement?.tagName === "TEXTAREA" || 
                         document.activeElement?.tagName === "INPUT";
    
    if (!isChatFocused) {
      this.handleKeyboardMovement(player);
    }
  }
  
  private handleKeyboardMovement(player: any): void {
    const speed = 200;
    let moving = false;
    let direction = '';
    
    const playerPos = player.getPosition();
    let newX = playerPos.x;
    let newY = playerPos.y;
    
    if (this.cursors!.left.isDown || this.wasd.A.isDown) {
      newX -= (speed * this.currentScene!.game.loop.delta) / 1000;
      direction = 'left';
      moving = true;
    } else if (this.cursors!.right.isDown || this.wasd.D.isDown) {
      newX += (speed * this.currentScene!.game.loop.delta) / 1000;
      direction = 'right';
      moving = true;
    }
    
    if (this.cursors!.up.isDown || this.wasd.W.isDown) {
      newY -= (speed * this.currentScene!.game.loop.delta) / 1000;
      direction = 'up';
      moving = true;
    } else if (this.cursors!.down.isDown || this.wasd.S.isDown) {
      newY += (speed * this.currentScene!.game.loop.delta) / 1000;
      direction = 'down';
      moving = true;
    }
    
    if (moving) {
      player.setPosition(newX, newY);
      // Handle animation through sprite
      const sprite = player.getSprite();
      if (sprite) {
        sprite.play(`adam_walk_${direction}`, true);
      }
    } else {
      const sprite = player.getSprite();
      if (sprite) {
        sprite.play(`adam_idle_down`, true);
      }
    }
  }
  
  public pause(): void {
    this.isActive = false;
  }
  
  public resume(): void {
    this.isActive = true;
  }
  
  public shutdown(): void {
    this.isActive = false;
    this.cursors = null;
    this.wasd = null;
    this.currentScene = null;
  }
}
