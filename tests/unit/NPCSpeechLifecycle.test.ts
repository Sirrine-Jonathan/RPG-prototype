// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class {} }));
vi.mock('../../src/ui/ActionBubble', () => ({ ActionBubble: class {} }));
import { PersistentNPC } from '../../src/entities/PersistentNPC';
import { EventBus } from '../../src/systems/EventBus';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('removes destroyed NPC speech listeners from the original bus without removing live listeners', () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const bus = new EventBus();
  vi.stubGlobal('gameManager', { eventBus: bus });
  // Exercise the real subscription and destruction methods without rendering.
  const makeNPC = () => {
    const npc = Object.create(PersistentNPC.prototype);
    npc.handleSpeechEvent = vi.fn();
    npc.setupEventListeners();
    return npc;
  };
  const live = makeNPC();
  for (let i = 0; i < 3; i++) {
    const removed = makeNPC();
    bus.emit('npc_speech', { message: 'Before destruction' });
    expect(removed.handleSpeechEvent).toHaveBeenCalledTimes(1);
    // Cleanup must use the bus that registered the callback, even if the
    // global manager has been replaced during shutdown or a fresh game.
    vi.stubGlobal('gameManager', { eventBus: new EventBus() });
    removed.destroy();
    removed.destroy();
    bus.emit('npc_speech', { message: 'After destruction' });
    expect(removed.handleSpeechEvent).toHaveBeenCalledTimes(1);
    vi.stubGlobal('gameManager', { eventBus: bus });
  }
  expect(live.handleSpeechEvent).toHaveBeenCalledTimes(6);
  live.destroy();
  bus.emit('npc_speech', { message: 'All destroyed' });
  expect(live.handleSpeechEvent).toHaveBeenCalledTimes(6);
});
