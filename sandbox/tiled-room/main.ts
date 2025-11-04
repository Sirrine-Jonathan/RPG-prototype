import Phaser from 'phaser'
import { TiledRoomScene } from '../../src/scenes/TiledRoomScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [TiledRoomScene]
}

new Phaser.Game(config)