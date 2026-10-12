// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class {} }));
import { QuickSpeechUI } from '../../src/ui/QuickSpeechUI';
afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });
it('removes speech DOM and key handlers on scene shutdown; delayed callbacks cannot revive them', () => {
  vi.stubGlobal('Phaser', { Input: { Keyboard: { KeyCodes: { SPACE: 32 } } } });
  const keys: any[] = [];
  const callbacks: Array<() => void> = [];
  let shutdown: () => void = () => {};
  const scene: any = {
    input: { keyboard: { addKey: vi.fn(() => {
      const key = { on: vi.fn(), destroy: vi.fn() }; keys.push(key); return key;
    }) } },
    events: { once: vi.fn((_event, callback) => { shutdown = callback; }) },
    time: { delayedCall: vi.fn((_delay, callback) => { callbacks.push(callback); }) },
  };
  const ui: any = new QuickSpeechUI(scene);
  ui.show();
  expect(document.querySelector('textarea')).not.toBeNull();
  ui.hide();
  shutdown();
  for (const callback of callbacks) callback();
  ui.show(); ui.destroy();
  expect(document.querySelector('textarea')).toBeNull();
  expect(scene.input.keyboard.addKey).toHaveBeenCalledOnce();
  expect(keys[0].destroy).toHaveBeenCalledOnce();
  expect(scene.events.once).toHaveBeenCalledWith('shutdown', expect.any(Function));
});
