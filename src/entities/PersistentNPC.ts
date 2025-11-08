export class PersistentNPC {
  public id: string;
  public name: string;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;
  private currentScene: Phaser.Scene | null = null;
  private position: { x: number, y: number };
  private config: any;
  private state: any = {};
  
  constructor(scene: Phaser.Scene, config: any) {
    this.id = config.id;
    this.name = config.name;
    this.position = { x: config.x, y: config.y };
    this.config = config;
    this.createSprite(scene);
  }
  
  private createSprite(scene: Phaser.Scene): void {
    this.currentScene = scene;
    
    this.sprite = scene.add.sprite(this.position.x, this.position.y, this.config.spriteKey, 0);
    this.sprite.setScale(2);
    this.sprite.setInteractive();
    
    this.nameText = scene.add.text(this.position.x, this.position.y - 35, this.name, {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5).setAlpha(0.9);
  }
  
  public transferToScene(newScene: Phaser.Scene): void {
    // Save current position and state
    if (this.sprite) {
      this.position.x = this.sprite.x;
      this.position.y = this.sprite.y;
      this.sprite.destroy();
      this.nameText?.destroy();
    }
    
    // Create sprite in new scene
    this.createSprite(newScene);
  }
  
  public saveState(): void {
    if (this.sprite) {
      this.position.x = this.sprite.x;
      this.position.y = this.sprite.y;
    }
    // Save AI state, conversation history, etc.
  }
  
  public prepareForTransfer(): void {
    this.saveState();
    // Pause AI, clean up timers, etc.
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
  
  public destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.nameText?.destroy();
      this.sprite = null;
      this.nameText = null;
    }
    this.currentScene = null;
  }
}
