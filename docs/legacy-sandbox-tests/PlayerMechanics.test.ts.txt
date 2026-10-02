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
  physics: {
    add: {
      existing: vi.fn()
    }
  },
  time: {
    delayedCall: vi.fn()
  }
}

describe('Player Mechanics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Player Movement', () => {
    it('should create player with movement capabilities', async () => {
      const { Player } = await import('../../sandbox/entities/Player')
      
      const player = new Player(mockScene as any, 100, 100)
      
      expect(player.x).toBe(100)
      expect(player.y).toBe(100)
    })

    it('should handle click-to-move', async () => {
      const { Player } = await import('../../sandbox/entities/Player')
      
      const player = new Player(mockScene as any, 100, 100)
      
      player.moveTo(200, 200)
      
      // Should have target coordinates set
      expect(player['targetX']).toBe(200)
      expect(player['targetY']).toBe(200)
    })

    it('should constrain movement to boundaries', async () => {
      const { Player } = await import('../../sandbox/entities/Player')
      
      const player = new Player(mockScene as any, 100, 100)
      
      // Try to move outside boundaries
      player.moveTo(50, 50) // Should be constrained
      
      expect(player['targetX']).toBe(75) // Constrained to minimum
      expect(player['targetY']).toBe(75)
    })
  })

  describe('NPC Interactions', () => {
    it('should create test NPC with interaction capabilities', async () => {
      const { TestNPC } = await import('../../sandbox/entities/TestNPC')
      
      const npc = new TestNPC(mockScene as any, 100, 100, 'Test NPC', 0x3498db)
      
      expect(npc.name).toBe('Test NPC')
      expect(npc.hasActivePrompt()).toBe(false)
    })

    it('should show interaction prompt when requested', async () => {
      const { TestNPC } = await import('../../sandbox/entities/TestNPC')
      
      const npc = new TestNPC(mockScene as any, 100, 100, 'Test NPC', 0x3498db)
      
      npc.showInteractionPrompt(true)
      expect(npc.hasActivePrompt()).toBe(true)
      
      npc.showInteractionPrompt(false)
      expect(npc.hasActivePrompt()).toBe(false)
    })

    it('should handle interaction with visual feedback', async () => {
      const { TestNPC } = await import('../../sandbox/entities/TestNPC')
      
      const npc = new TestNPC(mockScene as any, 100, 100, 'Test NPC', 0x3498db)
      
      npc.startInteraction()
      
      // Should set visual feedback and schedule reset
      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(2000, expect.any(Function))
    })
  })

  describe('Object Interactions', () => {
    it('should create test object with interaction capabilities', async () => {
      const { TestObject } = await import('../../sandbox/entities/TestObject')
      
      const obj = new TestObject(mockScene as any, 100, 100, 'test_box', 'Test Box')
      
      expect(obj.id).toBe('test_box')
      expect(obj.displayName).toBe('Test Box')
      expect(obj.hasActivePrompt()).toBe(false)
    })

    it('should show interaction prompt for objects', async () => {
      const { TestObject } = await import('../../sandbox/entities/TestObject')
      
      const obj = new TestObject(mockScene as any, 100, 100, 'test_terminal', 'Test Terminal')
      
      obj.showInteractionPrompt(true)
      expect(obj.hasActivePrompt()).toBe(true)
      
      obj.showInteractionPrompt(false)
      expect(obj.hasActivePrompt()).toBe(false)
    })

    it('should handle object interaction', async () => {
      const { TestObject } = await import('../../sandbox/entities/TestObject')
      
      const obj = new TestObject(mockScene as any, 100, 100, 'test_door', 'Test Door')
      
      obj.interact()
      
      // Should set visual feedback and schedule reset
      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(1500, expect.any(Function))
    })
  })
})