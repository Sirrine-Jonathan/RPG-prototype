import Phaser from 'phaser'
import { NPCIndicator } from '../../src/ui/NPCIndicator'

class AIIndicatorTestScene extends Phaser.Scene {
  private indicators: NPCIndicator[] = []
  private modes: ('ai' | 'template')[] = ['ai', 'template', 'ai']

  constructor() {
    super({ key: 'AIIndicatorTestScene' })
  }

  create() {
    // Title
    this.add.text(400, 50, 'AI Indicator Component Test', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Instructions
    this.add.text(400, 80, 'Click indicators to toggle between AI and Template modes', {
      fontSize: '14px',
      color: '#bdc3c7'
    }).setOrigin(0.5)

    // Create isolated indicators
    this.createIndicators()
  }

  private createIndicators() {
    const positions = [
      { x: 200, y: 200, label: 'AI Mode' },
      { x: 400, y: 200, label: 'Template Mode' },
      { x: 600, y: 200, label: 'AI Mode' }
    ]

    positions.forEach((pos, index) => {
      // Create indicator
      const indicator = new NPCIndicator(this, pos.x, pos.y)
      indicator.setMode(this.modes[index])
      this.indicators.push(indicator)

      // Add label
      this.add.text(pos.x, pos.y + 50, pos.label, {
        fontSize: '12px',
        color: '#ffffff'
      }).setOrigin(0.5)

      // Add click area
      const clickArea = this.add.circle(pos.x, pos.y, 30, 0x000000, 0)
      clickArea.setInteractive()
      clickArea.on('pointerdown', () => {
        this.modes[index] = this.modes[index] === 'ai' ? 'template' : 'ai'
        indicator.setMode(this.modes[index])
        
        // Update label
        const newLabel = this.modes[index] === 'ai' ? 'AI Mode' : 'Template Mode'
        this.children.getByName(`label_${index}`)?.destroy()
        this.add.text(pos.x, pos.y + 50, newLabel, {
          fontSize: '12px',
          color: '#ffffff'
        }).setOrigin(0.5).setName(`label_${index}`)
      })
    })

    // Add mode descriptions
    this.add.text(200, 280, 'AI Mode:\n• Green glowing brain\n• Pulsing animation\n• Circuit patterns', {
      fontSize: '10px',
      color: '#00ff88',
      align: 'center'
    }).setOrigin(0.5)

    this.add.text(600, 280, 'Template Mode:\n• Orange document\n• Static display\n• Text line patterns', {
      fontSize: '10px',
      color: '#ffa500',
      align: 'center'
    }).setOrigin(0.5)
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 400,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  scene: [AIIndicatorTestScene]
}

new Phaser.Game(config)