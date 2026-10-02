// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ Scene: class {} }));
import { MainMenuScene } from '../../src/scenes/MainMenuScene';
import { InventorySystem } from '../../src/systems/InventorySystem';
afterEach(() => vi.unstubAllGlobals());

it('clears shared player and NPC inventories before starting a new game', () => {
  const inventory = InventorySystem.getInstance();
  const clue = { id: 'maya_photo', name: 'Photo', description: 'Evidence' };
  inventory.addItem('Detective Riley', clue);
  inventory.addItem('scholar', clue);
  const storage = { removeItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const menu = new MainMenuScene();
  menu.scene = { start: vi.fn(() => {
    expect(inventory.getInventory('Detective Riley')).toEqual([]);
    expect(inventory.getInventory('scholar')).toEqual([]);
  }) } as any;
  menu.startNewGame();
  expect(storage.removeItem).toHaveBeenCalledWith('whispering_stones_save');
  expect(menu.scene.start).toHaveBeenCalledWith('NewTownScene');
  inventory.addItem('scholar', clue);
  expect(inventory.transferItem('scholar', 'Detective Riley', clue.id)).toBe(true);
  expect(inventory.getInventory('Detective Riley')).toEqual([clue]);
  inventory.reset();
});

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

it.each([
  'null', '{broken',
  JSON.stringify({ currentScene: 'MissingScene', playerPosition: { x: 1, y: 2 }, playerInventory: [] }),
  JSON.stringify({ currentScene: 'NewTownScene', playerPosition: { x: 1, y: 2 }, playerInventory: [] }),
  JSON.stringify({ currentScene: 'NewLibraryScene', playerPosition: { x: '1', y: 2 }, playerInventory: [] }),
  JSON.stringify({ currentScene: 'NewLibraryScene', playerPosition: { x: 1, y: 2 }, playerInventory: {} }),
  JSON.stringify({ currentScene: 'NewLibraryScene', playerPosition: { x: 1, y: 2 }, playerInventory: [null] }),
])('starts a new game safely for invalid save %s', (raw) => {
  const storage = { getItem: () => raw, removeItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const menu = new MainMenuScene();
  menu.scene = { start: vi.fn() } as any;
  menu.loadGame();
  expect(menu.scene.start).toHaveBeenCalledTimes(1);
  expect(menu.scene.start).toHaveBeenCalledWith('NewTownScene');
  expect(storage.removeItem).toHaveBeenCalledWith('whispering_stones_save');
});
