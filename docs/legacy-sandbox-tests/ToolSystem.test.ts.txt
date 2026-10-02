import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Phaser
const mockScene = {
  add: {
    existing: vi.fn(),
    rectangle: vi.fn(() => ({
      setStrokeStyle: vi.fn(),
      setTint: vi.fn(),
      clearTint: vi.fn(),
      setAlpha: vi.fn()
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn(),
      setText: vi.fn(),
      setColor: vi.fn(),
      destroy: vi.fn()
    })),
    circle: vi.fn(() => ({}))
  },
  time: {
    delayedCall: vi.fn()
  }
}

describe('Tool System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ToolNPC', () => {
    it('should create NPC with tools', async () => {
      const { ToolNPC } = await import('../../sandbox/entities/ToolNPC')
      
      const npc = new ToolNPC(
        mockScene as any,
        100, 100,
        'Sheriff Martinez',
        ['hide_evidence', 'access_computer']
      )
      
      expect(npc.name).toBe('Sheriff Martinez')
      expect(npc.tools).toEqual(['hide_evidence', 'access_computer'])
      expect(npc.isUsingTool).toBe(false)
    })

    it('should use tool and change state', async () => {
      const { ToolNPC } = await import('../../sandbox/entities/ToolNPC')
      const { EnvironmentObject } = await import('../../sandbox/entities/EnvironmentObject')
      
      const npc = new ToolNPC(mockScene as any, 100, 100, 'Sheriff', ['hide_evidence'])
      const target = new EnvironmentObject(mockScene as any, 200, 200, 'evidence_locker', 'Evidence Locker')
      
      npc.useTool('hide_evidence', target)
      
      expect(npc.isUsingTool).toBe(true)
      expect(mockScene.time.delayedCall).toHaveBeenCalled()
    })
  })

  describe('EnvironmentObject', () => {
    it('should change state when tool is used', async () => {
      const { EnvironmentObject } = await import('../../sandbox/entities/EnvironmentObject')
      
      const obj = new EnvironmentObject(
        mockScene as any,
        100, 100,
        'evidence_locker',
        'Evidence Locker'
      )
      
      expect(obj.getState()).toBe('normal')
      
      obj.setState('hidden')
      expect(obj.getState()).toBe('hidden')
    })

    it('should reset state after temporary changes', async () => {
      const { EnvironmentObject } = await import('../../sandbox/entities/EnvironmentObject')
      
      const obj = new EnvironmentObject(mockScene as any, 100, 100, 'computer', 'Computer')
      
      obj.setState('accessing')
      expect(obj.getState()).toBe('accessing')
      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(5000, expect.any(Function))
    })
  })
})