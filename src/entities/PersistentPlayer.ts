import { GameManager } from '../core/GameManager';

export class PersistentPlayer {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private currentScene: Phaser.Scene | null = null;
  private position: { x: number, y: number };
  private lastDirection: string = 'down';
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.position = { x, y };
    this.createSprite(scene);
  }
  
  private createSprite(scene: Phaser.Scene): void {
    this.currentScene = scene;
    this.sprite = scene.add.sprite(this.position.x, this.position.y, 'adam', 0);
    this.sprite.setScale(2);
    this.sprite.setOrigin(0.5, 0.5);
    
    // Check if animation exists before playing
    const animKey = `adam_idle_${this.lastDirection}`;
    if (scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
    } else {
      console.warn(`Missing animation: ${animKey}`);
      this.sprite.setFrame(0); // Use default frame
    }
    
    // Start camera following
    scene.cameras.main.startFollow(this.sprite);
    console.log('📷 PersistentPlayer: Camera following player');
  }
  
  public transferToScene(newScene: Phaser.Scene): void {
    // Save current position
    if (this.sprite) {
      this.position.x = this.sprite.x;
      this.position.y = this.sprite.y;
      this.sprite.destroy();
    }
    
    // Create sprite in new scene
    this.createSprite(newScene);
    
    // Set up camera following
    newScene.cameras.main.startFollow(this.sprite!);
    console.log('📷 PersistentPlayer: Camera now following player');
  }
  
  public setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    if (this.sprite) {
      this.sprite.setPosition(x, y);
    }
  }
  
  public getPosition(): { x: number, y: number } {
    if (this.sprite) {
      return { x: this.sprite.x, y: this.sprite.y };
    }
    return { ...this.position };
  }
  
  public getSprite(): Phaser.GameObjects.Sprite | null {
    return this.sprite;
  }
  
  public update(): void {
    // Player update logic will be handled by MovementSystem
  }
  
  public destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    this.currentScene = null;
  }
}
