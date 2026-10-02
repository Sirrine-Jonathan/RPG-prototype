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
