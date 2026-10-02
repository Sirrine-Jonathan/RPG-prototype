// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/scenes/NewGameplayScene', () => ({ NewGameplayScene: class {} }));
vi.mock('../../src/systems/LevelLoader', () => ({ LevelLoader: class {} }));
vi.mock('../../src/ui/ChatInterface', () => ({ ChatInterface: class {} }));
vi.mock('../../src/entities/PersistentNPC', () => ({ PersistentNPC: class {} }));
import { NewTownScene } from '../../src/scenes/NewTownScene';
import { InventorySystem } from '../../src/systems/InventorySystem';
afterEach(() => vi.restoreAllMocks());

it('polls the persistent player inventory using scene-owned timers and stops after saving', () => {
  const photo = { id: "Maya's Photo", name: "Maya's Photo" };
  const inventory = vi.spyOn(InventorySystem.getInstance(), 'getInventory');
  inventory.mockReturnValueOnce([]).mockReturnValue([photo] as any);
  const callbacks: Array<() => void> = [];
  const delayedCall = vi.fn((_delay, callback) => callbacks.push(callback));
  const saveGameState = vi.fn();
  const scene = { time: { delayedCall }, gameManager: { entityManager: {
    getPlayer: () => ({ id: 'Detective Riley' })
  } }, saveGameState };
  (NewTownScene.prototype as any).setupAutoSave.call(scene);
  expect(delayedCall.mock.calls[0][0]).toBe(5000);
  callbacks.shift()!();
  expect(inventory).toHaveBeenCalledWith('Detective Riley');
  expect(delayedCall.mock.calls[1][0]).toBe(2000);
  expect(saveGameState).not.toHaveBeenCalled();
  callbacks.shift()!();
  expect(saveGameState).toHaveBeenCalledTimes(1);
  expect(callbacks).toHaveLength(0);
});

it('serializes the photo from the same inventory used by item transfers', () => {
  const photo = { id: "Maya's Photo", name: "Maya's Photo" };
  const inventory = vi.spyOn(InventorySystem.getInstance(), 'getInventory').mockReturnValue([photo] as any);
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { setItem });
  try {
    (NewTownScene.prototype as any).saveGameState.call({ gameManager: { entityManager: {
      getPlayer: () => ({ id: 'Detective Riley' })
    } } });
    expect(inventory).toHaveBeenCalledWith('Detective Riley');
    expect(JSON.parse(setItem.mock.calls[0][1]).playerInventory).toEqual([photo]);
  } finally { vi.unstubAllGlobals(); }
});
