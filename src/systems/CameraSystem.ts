import { GameManager } from '../core/GameManager';

export class CameraSystem {
  private currentScene: Phaser.Scene | null = null;
  private isFollowing: boolean = false;
  
  public initialize(): void {
    console.log('📷 CameraSystem: Initialized');
  }
  
  public setupForScene(scene: Phaser.Scene): void {
    this.currentScene = scene;
    
    // Start following player if it exists
    const gameManager = GameManager.getInstance();
    const player = gameManager.entityManager.getPlayer();
    if (player) {
      this.startFollowingPlayer();
    }
  }
  
  public startFollowingPlayer(): void {
    if (!this.currentScene) return;
    
    const gameManager = GameManager.getInstance();
    const player = gameManager.entityManager.getPlayer();
    const sprite = player?.getSprite();
    
    if (sprite) {
      this.currentScene.cameras.main.startFollow(sprite);
      this.isFollowing = true;
      console.log('📷 CameraSystem: Started following player');
    }
  }
  
  public stopFollowing(): void {
    if (this.currentScene) {
      this.currentScene.cameras.main.stopFollow();
      this.isFollowing = false;
      console.log('📷 CameraSystem: Stopped following player');
    }
  }
  
  public smoothPanToPlayer(): void {
    if (!this.currentScene || this.isFollowing) return;
    
    const gameManager = GameManager.getInstance();
    const player = gameManager.entityManager.getPlayer();
    const sprite = player?.getSprite();
    
    if (sprite) {
      this.currentScene.tweens.add({
        targets: this.currentScene.cameras.main,
        scrollX: sprite.x - this.currentScene.cameras.main.width / 2,
        scrollY: sprite.y - this.currentScene.cameras.main.height / 2,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          this.startFollowingPlayer();
        }
      });
    }
  }
  
  public shutdown(): void {
    this.stopFollowing();
    this.currentScene = null;
  }
}
