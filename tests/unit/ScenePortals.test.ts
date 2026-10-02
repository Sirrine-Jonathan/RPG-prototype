// @vitest-environment node
import { expect, it, vi } from 'vitest';

const { move } = vi.hoisted(() => ({ move: vi.fn() }));
vi.mock('../../src/scenes/NewGameplayScene', () => ({
  NewGameplayScene: class { update() { move(); } }
}));
vi.mock('../../src/systems/LevelLoader', () => ({ LevelLoader: class {} }));
vi.mock('../../src/ui/ChatInterface', () => ({ ChatInterface: class {} }));
vi.mock('../../src/entities/PersistentNPC', () => ({ PersistentNPC: class {} }));
import { NewTownScene } from '../../src/scenes/NewTownScene';
import { NewLibraryScene } from '../../src/scenes/NewLibraryScene';

it.each([['town', NewTownScene], ['library', NewLibraryScene]] as const)('%s checks portals at the position after movement', (_name, Scene) => {
  let position = { x: 0, y: 0 };
  move.mockImplementation(() => { position = { x: 480, y: 576 }; });
  const checkPortalTriggers = vi.fn();
  const scene = {
    gameManager: { entityManager: { getPlayer: () => ({ getPosition: () => position }) } },
    portalService: { checkPortalTriggers }
  };
  Scene.prototype.update.call(scene as any);
  expect(checkPortalTriggers).toHaveBeenCalledTimes(1);
  expect(checkPortalTriggers).toHaveBeenCalledWith(480, 576);
});

it.each([['town', NewTownScene], ['library', NewLibraryScene]] as const)('%s tolerates startup before player or portals exist', (_name, Scene) => {
  move.mockImplementation(() => {});
  const scene: any = { gameManager: { entityManager: { getPlayer: () => null } } };
  expect(() => Scene.prototype.update.call(scene)).not.toThrow();
  scene.gameManager.entityManager.getPlayer = () => ({ getPosition: () => ({ x: 0, y: 0 }) });
  expect(() => Scene.prototype.update.call(scene)).not.toThrow();
});
