import Phaser from 'phaser'
import { MainMenuScene } from './scenes/MainMenuScene'
import { TownScene } from './scenes/TownScene'
import { PoliceStationScene } from './scenes/PoliceStationScene'
import { MuseumScene } from './scenes/MuseumScene'
import { LibraryScene } from './scenes/LibraryScene'
import { ParkScene } from './scenes/ParkScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [MainMenuScene, TownScene, PoliceStationScene, MuseumScene, LibraryScene, ParkScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  input: {
    mouse: {
      target: 'game-container'
    }
  }
}

const game = new Phaser.Game(config)