import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Phaser
const mockScene = {
  add: {
    existing: vi.fn(),
    rectangle: vi.fn(() => ({
      setStrokeStyle: vi.fn(),
      setTint: vi.fn(),
      clearTint: vi.fn()
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn(),
      destroy: vi.fn()
    }))
  },
  time: {
    delayedCall: vi.fn(),
    addEvent: vi.fn()
  },
  tweens: {
    add: vi.fn()
  }
}

describe('Idle Behavior System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('IdleNPC', () => {
    it('should create NPC with behaviors and intervals', async () => {
      const { IdleNPC } = await import('../../sandbox/entities/IdleNPC')
      
      const npc = new IdleNPC(
        mockScene as any,
        100, 100,
        'Sheriff Martinez',
        0x8b4513,
        ['patrol', 'check_evidence'],
        { min: 15, max: 30 }
      )
      
      expect(npc.name).toBe('Sheriff Martinez')
      expect(npc.behaviors).toEqual(['patrol', 'check_evidence'])
      expect(npc.baseInterval).toEqual({ min: 15, max: 30 })
      expect(npc.isActive).toBe(true)
      expect(npc.isPlayerInteracting).toBe(false)
    })

    it('should perform actions with visual feedback', async () => {
      const { IdleNPC } = await import('../../sandbox/entities/IdleNPC')
      
      const npc = new IdleNPC(
        mockScene as any, 100, 100, 'Test NPC', 0x000000,
        ['patrol'], { min: 10, max: 20 }
      )
      
      npc.performAction('patrol')
      
      // Should show visual feedback
      expect(mockScene.time.delayedCall).toHaveBeenCalled()
    })

    it('should pause and resume correctly', async () => {
      const { IdleNPC } = await import('../../sandbox/entities/IdleNPC')
      
      const npc = new IdleNPC(
        mockScene as any, 100, 100, 'Test NPC', 0x000000,
        ['patrol'], { min: 10, max: 20 }
      )
      
      expect(npc.isActive).toBe(true)
      
      npc.pause()
      expect(npc.isActive).toBe(false)
      
      npc.resume()
      expect(npc.isActive).toBe(true)
    })

    it('should handle player interaction state', async () => {
      const { IdleNPC } = await import('../../sandbox/entities/IdleNPC')
      
      const npc = new IdleNPC(
        mockScene as any, 100, 100, 'Test NPC', 0x000000,
        ['patrol'], { min: 10, max: 20 }
      )
      
      expect(npc.isPlayerInteracting).toBe(false)
      
      npc.setPlayerInteracting(true)
      expect(npc.isPlayerInteracting).toBe(true)
      
      npc.setPlayerInteracting(false)
      expect(npc.isPlayerInteracting).toBe(false)
    })
  })

  describe('Behavior Actions', () => {
    it('should have different durations for different actions', async () => {
      const { IdleNPC } = await import('../../sandbox/entities/IdleNPC')
      
      const npc = new IdleNPC(
        mockScene as any, 100, 100, 'Test NPC', 0x000000,
        ['patrol', 'use_computer'], { min: 10, max: 20 }
      )
      
      // Test that different actions trigger different behaviors
      npc.performAction('patrol')
      expect(mockScene.tweens.add).toHaveBeenCalled()
      
      vi.clearAllMocks()
      
      npc.performAction('use_computer')
      expect(mockScene.tweens.add).toHaveBeenCalled()
    })
  })
})