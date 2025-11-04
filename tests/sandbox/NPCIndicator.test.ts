import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NPCIndicator } from '../../sandbox/components/NPCIndicator'

// Mock Phaser
const mockScene = {
  add: {
    container: vi.fn(() => ({
      add: vi.fn()
    })),
    graphics: vi.fn(() => ({
      clear: vi.fn(),
      lineStyle: vi.fn(),
      fillStyle: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fillPath: vi.fn(),
      strokePath: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn()
    }))
  },
  tweens: {
    add: vi.fn(() => ({
      destroy: vi.fn()
    }))
  }
}

describe('NPCIndicator', () => {
  let indicator: NPCIndicator

  beforeEach(() => {
    vi.clearAllMocks()
    indicator = new NPCIndicator(mockScene as any, 100, 100)
  })

  it('should create indicator at specified position', () => {
    expect(mockScene.add.container).toHaveBeenCalledWith(100, 100)
  })

  it('should start in template mode by default', () => {
    // Should not have pulse animation initially
    expect(mockScene.tweens.add).not.toHaveBeenCalled()
  })

  it('should switch to AI mode with pulse animation', () => {
    indicator.setMode('ai')
    
    // Should create pulse animation for AI mode
    expect(mockScene.tweens.add).toHaveBeenCalledWith(
      expect.objectContaining({
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.7,
        duration: 1000,
        yoyo: true,
        repeat: -1
      })
    )
  })

  it('should switch back to template mode without animation', () => {
    // First switch to AI
    indicator.setMode('ai')
    vi.clearAllMocks()
    
    // Then switch back to template
    indicator.setMode('template')
    
    // Should not create new animation
    expect(mockScene.tweens.add).not.toHaveBeenCalled()
  })
})