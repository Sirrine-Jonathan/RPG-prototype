// @vitest-environment node
import { expect, it, vi } from 'vitest';

vi.mock('../../src/entities/PersistentNPC', () => ({
  PersistentNPC: class {
    id: string;
    name: string;
    constructor(_scene: unknown, config: any) {
      this.id = config.id;
      this.name = config.name;
    }
    getPosition() { return { x: 400, y: 200 }; }
  }
}));
vi.mock('../../src/scenes/NewGameplayScene', () => ({ NewGameplayScene: class {} }));
vi.mock('../../src/systems/LevelLoader', () => ({ LevelLoader: class {} }));
vi.mock('../../src/ui/ChatInterface', () => ({ ChatInterface: class {} }));
import { EntityManager } from '../../src/core/EntityManager';
import { NewLibraryScene } from '../../src/scenes/NewLibraryScene';
import { InventorySystem } from '../../src/systems/InventorySystem';

it('restores the active player inventory exactly on repeated and empty loads', () => {
  const inventory = new InventorySystem();
  const singleton = vi.spyOn(InventorySystem, 'getInstance').mockReturnValue(inventory);
  const photo = { id: 'photo', name: 'Photo', description: 'Evidence' };
  const stale = { id: 'stale', name: 'Old clue', description: 'Not saved' };
  inventory.addItem('Detective Riley', stale);
  inventory.addItem('Margaret', stale);
  const player = { id: 'Detective Riley', setPosition: vi.fn() };
  const scene = {
    loadedState: { playerInventory: [photo], playerPosition: { x: 250, y: 200 } },
    gameManager: { entityManager: { getPlayer: () => player } }
  };
  try {
    const restore = () => (NewLibraryScene.prototype as any).restoreGameState.call(scene);
    restore();
    restore();
    expect(inventory.getInventory(player.id)).toEqual([photo]);
    expect(inventory.getInventory('player')).toEqual([]);
    expect(inventory.getInventory('Margaret')).toEqual([stale]);
    expect(player.setPosition).toHaveBeenCalledWith(250, 200);
    inventory.getInventory(player.id)[0].name = 'Changed';
    expect(photo.name).toBe('Photo');
    scene.loadedState.playerInventory = [];
    restore();
    expect(inventory.getInventory(player.id)).toEqual([]);
  } finally { singleton.mockRestore(); }
});

it('creates and registers all library NPCs under their persistent IDs', () => {
  const entityManager = new EntityManager();
  const scene = { scene: { key: 'NewLibraryScene' }, gameManager: { entityManager } };
  // Invoke the real scene setup: this failed on an unknown librarian type,
  // then silently lost scholar/historian registration under their aliases.
  (NewLibraryScene.prototype as any).createSceneNPCs.call(scene);
  const npcs = entityManager.getNPCsForScene('NewLibraryScene');
  expect(npcs.map(npc => npc.id)).toEqual(['Librarian Sarah', 'Scholar Marcus', 'Historian Vera']);
  expect(npcs.map(npc => npc.name)).toEqual(['Sarah Mills', 'Marcus Reed', 'Vera Stone']);
  for (const npc of npcs) expect(entityManager.getNPC(npc.id)).toBe(npc);
  (NewLibraryScene.prototype as any).createSceneNPCs.call(scene);
  expect(entityManager.getNPCsForScene('NewLibraryScene')).toEqual(npcs);
});
