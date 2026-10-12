// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/scenes/NewGameplayScene', () => ({ NewGameplayScene: class {} }));
vi.mock('../../src/systems/LevelLoader', () => ({ LevelLoader: class {} }));
vi.mock('../../src/ui/ChatInterface', () => ({ ChatInterface: class {} }));
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class {} }));
vi.mock('../../src/ui/ActionBubble', () => ({ ActionBubble: class {} }));
import { PersistentNPC } from '../../src/entities/PersistentNPC';
import { NewTownScene } from '../../src/scenes/NewTownScene';
import { InventorySystem } from '../../src/systems/InventorySystem';

afterEach(() => {
  InventorySystem.getInstance().reset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('checkpoints the real NPC photo award through the town autosave timer', async () => {
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { setItem });
  const addEvidence = vi.fn();
  vi.stubGlobal('gameManager', { winConditionManager: { addEvidence } });
  const npc = Object.create(PersistentNPC.prototype);
  npc.name = 'Grace Sirrine';
  npc.say = vi.fn();
  const result = await npc.handleGiveMayasPhoto();
  expect(result.success).toBe(true);
  expect(addEvidence).toHaveBeenCalledWith('mayas_photo');
  expect(InventorySystem.getInstance().getInventory('Grace Sirrine')).toEqual([]);
  const callbacks: Array<() => void> = [];
  const scene: any = {
    time: { delayedCall: (_delay: number, callback: () => void) => callbacks.push(callback) },
    gameManager: { entityManager: { getPlayer: () => ({
      id: 'Detective Riley', getPosition: () => ({ x: 812, y: 640 }),
    }) } },
    saveGameState: () => (NewTownScene.prototype as any).saveGameState.call(scene),
  };
  (NewTownScene.prototype as any).setupAutoSave.call(scene);
  callbacks.shift()!();
  expect(callbacks).toHaveLength(1);
  expect(setItem).toHaveBeenCalledOnce();
  const checkpoint = JSON.parse(setItem.mock.calls[0][1]);
  expect(checkpoint.playerInventory).toEqual([{
    id: 'mayas_photo', name: "Maya's Photo",
    description: 'A recent photo of Maya showing her at the library entrance. This is crucial evidence.',
    category: 'Evidence',
  }]);
  expect(checkpoint.gameProgress.hasPhoto).toBe(true);
  expect(checkpoint.gameProgress.currentObjective).toBe('investigate_library');
  expect(checkpoint.playerPosition).toEqual({ x: 812, y: 640 });
});
