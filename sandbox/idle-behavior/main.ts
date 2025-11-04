import Phaser from 'phaser'
import { IdleBehaviorTestScene } from '../../src/scenes/IdleBehaviorTestScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 400,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [IdleBehaviorTestScene]
}

new Phaser.Game(config)