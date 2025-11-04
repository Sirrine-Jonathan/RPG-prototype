import Phaser from 'phaser'
import { SmartNPCTestScene } from '../../src/scenes/SmartNPCTestScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [SmartNPCTestScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
}

new Phaser.Game(config)