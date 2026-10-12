// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ Scene: class {} }));
import { WinConditionManager } from '../../src/systems/WinConditionManager';
import { MainMenuScene } from '../../src/scenes/MainMenuScene';
const manager = WinConditionManager.getInstance();
beforeEach(() => manager.reset());
afterEach(() => { manager.reset(); vi.unstubAllGlobals(); document.body.replaceChildren(); });

it('counts only distinct required clues and emits one win with safe UI', () => {
  const emit = vi.fn();
  vi.stubGlobal('gameManager', { eventBus: { emit } });
  manager.addEvidence('<img src=x onerror=alert(1)>');
  expect(manager.getProgress().percentage).toBe(0);
  manager.addEvidence('mayas_photo');
  manager.addEvidence('mayas_photo');
  expect(manager.getProgress().percentage).toBe(33);
  manager.addEvidence('library_clue');
  expect(manager.isGameWon()).toBe(false);
  manager.addEvidence('school_clue');
  manager.addEvidence('school_clue');
  expect(manager.isGameWon()).toBe(true);
  expect(manager.getProgress().percentage).toBe(100);
  expect(emit).toHaveBeenCalledOnce();
  expect(emit.mock.calls[0][0]).toBe('game_won');
  expect(document.querySelectorAll('h1')).toHaveLength(1);
  expect(document.querySelector('img')).toBeNull();
  document.querySelector('button')!.click();
  expect(document.querySelector('h1')).toBeNull();
});

it('New Game clears completed evidence and its overlay before entering town', () => {
  for (const id of manager.getProgress().required) manager.addEvidence(id);
  vi.stubGlobal('localStorage', { removeItem: vi.fn() });
  const menu = new MainMenuScene();
  menu.scene = { start: vi.fn(() => {
    expect(manager.isGameWon()).toBe(false);
    expect(manager.getProgress().collected).toEqual([]);
    expect(document.querySelector('h1')).toBeNull();
  }) } as any;
  menu.startNewGame();
  expect(menu.scene.start).toHaveBeenCalledWith('NewTownScene');
});

it.each([['mayas_photo'], ['mayas_photo', 'library_clue', 'school_clue']])(
  'Load Game rebuilds evidence from the saved inventory without replaying a victory', (...ids) => {
    manager.addEvidence('library_clue');
    const emit = vi.fn();
    vi.stubGlobal('gameManager', { eventBus: { emit } });
    const save = { currentScene: 'NewTownScene', playerPosition: { x: 10, y: 20 },
      playerInventory: [...ids, 'unrelated'].map(id => ({ id, name: id, description: 'Saved item' })) };
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(save) });
    const menu = new MainMenuScene();
    menu.scene = { start: vi.fn() } as any;
    menu.loadGame();
    expect(manager.getProgress().collected).toEqual(ids);
    expect(manager.isGameWon()).toBe(ids.length === 3);
    expect(emit).not.toHaveBeenCalled();
    expect(document.querySelector('h1')).toBeNull();
  });
