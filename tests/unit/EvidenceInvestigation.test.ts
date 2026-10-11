// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class {} }));
vi.mock('../../src/ui/ActionBubble', () => ({ ActionBubble: class {} }));
import { PersistentNPC } from '../../src/entities/PersistentNPC';
import { InventorySystem } from '../../src/systems/InventorySystem';
import { WinConditionManager } from '../../src/systems/WinConditionManager';
import { saveEvidenceCheckpoint, watchEvidenceCheckpoint } from '../../src/systems/EvidenceCheckpoint';
const inventory = InventorySystem.getInstance();
const win = WinConditionManager.getInstance();
afterEach(() => { inventory.reset(); win.reset(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function witness(id: string, name: string, key: string) {
  const npc = Object.create(PersistentNPC.prototype);
  Object.assign(npc, { id, name, currentScene: { scene: { key } }, messages: [],
    logger: new Proxy({}, { get: () => vi.fn() }), say: vi.fn(), startRandomTimeout: vi.fn(),
    aiService: { generateResponseWithTools: vi.fn().mockRejectedValue(new Error('offline')) } });
  return npc;
}
function checkpointScene(key: string) {
  const callbacks: Array<() => void> = [];
  return { scene: { key }, callbacks,
    time: { delayedCall: vi.fn((_delay, callback) => callbacks.push(callback)) },
    gameManager: { entityManager: { getPlayer: () => ({ id: 'Detective Riley', getPosition: () => ({ x: 400, y: 200 }) }) } } };
}
it('collects each witness clue through real explicit speech handlers, checkpoints, reloads and completes the prototype', async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', { setItem: (key: string, value: string) => storage.set(key, value), getItem: (key: string) => storage.get(key) });
  const emit = vi.fn();
  vi.stubGlobal('gameManager', { winConditionManager: win, eventBus: { emit } });
  const grace = witness('Grace Sirrine', 'Grace Sirrine', 'NewTownScene');
  const sarah = witness('Librarian Sarah', 'Sarah Mills', 'NewLibraryScene');
  const teacher = witness('teacher_elena', 'Teacher Elena', 'NewTownScene');
  await grace.handleEvent('player_speech', { message: '/evidence', distance: 40 });
  await sarah.handleEvent('player_speech', { message: '/evidence', distance: 40 });
  const library = checkpointScene('NewLibraryScene');
  expect(saveEvidenceCheckpoint(library)).toBe(true);
  const saved = JSON.parse(localStorage.getItem('whispering_stones_save')!);
  expect(saved.currentScene).toBe('NewLibraryScene');
  expect(saved.gameProgress.currentObjective).toBe('interview_teacher');
  expect(saved.playerInventory.map((item: any) => item.id)).toEqual(['mayas_photo', 'library_clue']);
  inventory.reset(); win.reset();
  inventory.replaceInventory('Detective Riley', saved.playerInventory);
  win.restoreEvidence(saved.playerInventory.map((item: any) => item.id));
  expect(win.isGameWon()).toBe(false);
  await teacher.handleEvent('player_speech', { message: ' /EVIDENCE ', distance: 48 });
  expect(win.isGameWon()).toBe(true);
  expect(emit).toHaveBeenCalledOnce();
  expect(document.querySelector('h1')?.textContent).toBe('Evidence collected');
  expect(document.body.textContent).toContain('remain unresolved');
  for (const npc of [grace, sarah, teacher]) {
    await npc.handleEvent('player_speech', { message: '/evidence', distance: 40 });
    expect(npc.aiService.generateResponseWithTools).not.toHaveBeenCalled();
  }
  expect(inventory.getInventory('Detective Riley')).toHaveLength(3);
  expect(emit).toHaveBeenCalledOnce();
  expect(saveEvidenceCheckpoint(checkpointScene('NewTownScene'))).toBe(true);
  expect(JSON.parse(localStorage.getItem('whispering_stones_save')!).gameProgress.currentObjective).toBe('evidence_complete');
});
it('explicit requests work with AI paused and an existing pending request', async () => {
  const npc = witness('Grace Sirrine', 'Grace Sirrine', 'NewTownScene');
  npc.pendingLLMRequest = new Promise(() => {});
  vi.stubGlobal('gameManager', { systemManager: { aiSystem: { isNPCActive: () => false } } });
  npc.triggerEvent('player_speech', { message: '/evidence', distance: 30 });
  await vi.waitFor(() => expect(inventory.hasItem('Detective Riley', 'mayas_photo')).toBe(true));
  expect(npc.aiService.generateResponseWithTools).not.toHaveBeenCalled();
});
it('rechecks inventory after the first save, avoids unchanged writes and retries a denied write', () => {
  const scene = checkpointScene('NewLibraryScene');
  const save = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValue(true);
  inventory.addItem('Detective Riley', { id: 'mayas_photo', name: 'Photo', description: 'Photo' });
  watchEvidenceCheckpoint(scene, save);
  scene.callbacks.shift()!();
  scene.callbacks.shift()!();
  expect(save).toHaveBeenCalledOnce();
  inventory.addItem('Detective Riley', { id: 'library_clue', name: 'Clue', description: 'Clue' });
  scene.callbacks.shift()!();
  expect(scene.time.delayedCall.mock.calls.at(-1)![0]).toBe(30000);
  scene.callbacks.shift()!();
  expect(save).toHaveBeenCalledTimes(3);
  scene.callbacks.shift()!();
  expect(save).toHaveBeenCalledTimes(3);
});
it('unrelated witnesses cannot give the library clue through the explicit command', async () => {
  const npc = witness('Historian Vera', 'Vera Stone', 'NewLibraryScene');
  await npc.handleEvent('player_speech', { message: '/evidence', distance: 40 });
  expect(inventory.getInventory('Detective Riley')).toEqual([]);
  expect(npc.say).toHaveBeenCalledWith(expect.stringContaining('no case evidence'));
});
it.each([['player_speech', 49], ['player_speech', NaN], ['player_speech', -1], ['npc_speech_heard', 20]])(
  'does not award evidence or call AI for invalid command context %s/%s', async (event, distance) => {
    const npc = witness('Grace Sirrine', 'Grace Sirrine', 'NewTownScene');
    await npc.handleEvent(event, { message: '/evidence', distance });
    expect(inventory.getInventory('Detective Riley')).toEqual([]);
    expect(npc.aiService.generateResponseWithTools).not.toHaveBeenCalled();
  });
