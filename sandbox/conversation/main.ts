import Phaser from 'phaser'
import { ConversationTestScene } from '../../src/scenes/ConversationTestScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [ConversationTestScene]
}

new Phaser.Game(config)