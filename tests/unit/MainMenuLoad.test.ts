// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ Scene: class {} }));
import { MainMenuScene } from '../../src/scenes/MainMenuScene';
afterEach(() => vi.unstubAllGlobals());

it('starts town without creating evidence or a checkpoint when there is no save', () => {
  const storage = { getItem: vi.fn(() => null), removeItem: vi.fn(), setItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const menu = new MainMenuScene();
  menu.scene = { start: vi.fn() } as any;
  menu.loadGame();
  expect(menu.scene.start).toHaveBeenCalledWith('NewTownScene');
  expect(storage.setItem).not.toHaveBeenCalled();
});

it('passes an existing library save through without replacing its inventory', () => {
  const save = { currentScene: 'NewLibraryScene', playerInventory: [], playerPosition: { x: 250, y: 200 } };
  const storage = { getItem: () => JSON.stringify(save), removeItem: vi.fn(), setItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const menu = new MainMenuScene();
  menu.scene = { start: vi.fn() } as any;
  menu.loadGame();
  expect(menu.scene.start).toHaveBeenCalledWith('NewLibraryScene', { loadedState: save });
  expect(storage.removeItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});
