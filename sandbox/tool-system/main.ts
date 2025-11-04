import Phaser from 'phaser'
import { ToolSystemTestScene } from '../../src/scenes/ToolSystemTestScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [ToolSystemTestScene]
}

const game = new Phaser.Game(config)

// Global functions for controls
;(window as any).triggerTool = (toolName: string) => {
  const scene = game.scene.getScene('ToolSystemTestScene') as ToolSystemTestScene
  scene.forceTool(toolName)
}

;(window as any).toggleAutoMode = () => {
  const scene = game.scene.getScene('ToolSystemTestScene') as ToolSystemTestScene
  scene.toggleAutoMode()
}

;(window as any).clearLog = () => {
  const log = document.getElementById('tool-log')
  if (log) {
    log.innerHTML = '<div>Log cleared.</div>'
  }
}