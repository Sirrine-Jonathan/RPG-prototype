// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AIService } from '../../src/services/AIService';
import { Logger } from '../../src/utils/Logger';

beforeEach(() => {
  vi.useFakeTimers();
  (Logger as any).instance = undefined;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each([
  null,
  {},
  { message: { content: '   ' } },
  { message: { content: 123 } },
  { message: { tool_calls: 'invalid' } },
  { message: { tool_calls: [{}] } },
])('rejects malformed successful AI response %# so fallback can run', async data => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data }));
  await expect(new AIService().generateResponseWithTools([], [])).rejects.toThrow('Invalid response from local AI');
});

it.each([
  { content: 'Welcome to town.' },
  { content: null, tool_calls: [{ function: { name: 'speak', arguments: { text: 'Hello' } } }] },
])('returns usable AI dialogue or tool calls %#', async message => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ message }) }));
  expect(await new AIService().generateResponseWithTools([], [])).toEqual(message);
});

it('rejects a non-success HTTP response so fallback can run', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'Unavailable' }));
  await expect(new AIService().generateResponseWithTools([], [])).rejects.toThrow('HTTP 503: Unavailable');
});

it('aborts a stalled local AI request and rejects so NPC fallback can run', async () => {
  vi.useFakeTimers();
  (Logger as any).instance = undefined;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error('AI timeout')), ms);
    return controller.signal;
  });
  vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason));
  })));
  const request = new AIService().generateResponseWithTools([], []);
  const rejection = expect(request).rejects.toThrow('AI timeout');
  await vi.advanceTimersByTimeAsync(10000);
  await rejection;
  expect(AbortSignal.timeout).toHaveBeenCalledWith(10000);
});
