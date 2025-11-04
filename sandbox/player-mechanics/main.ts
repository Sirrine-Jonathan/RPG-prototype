import Phaser from 'phaser'
import { PlayerMechanicsTestScene } from '../../src/scenes/PlayerMechanicsTestScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [PlayerMechanicsTestScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
}

new Phaser.Game(config)