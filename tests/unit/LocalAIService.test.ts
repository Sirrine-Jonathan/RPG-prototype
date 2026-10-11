// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/utils/Logger', () => ({
  Logger: { getInstance: () => ({ debug: vi.fn(), error: vi.fn() }) },
  LogTag: { LLM_INTERFACE: 'LLM' },
}));
import { AIService } from '../../src/services/AIService';

afterEach(() => {
  AIService.getInstance().setLocalBackend();
  vi.unstubAllGlobals();
});

it('routes existing singleton users through local inference and cleans tool history', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const service = AIService.getInstance();
  const message = { tool_calls: [{ function: { name: 'speak', arguments: { text: 'Hello' } } }] };
  const complete = vi.fn().mockResolvedValue({ message });
  service.setLocalBackend({ complete });
  const tools = [{ function: { name: 'speak' } }];
  const history = [
    { role: 'assistant', tool_calls: [{ function: { name: 'speak', arguments: '{"text":"Earlier"}' } }] },
    { role: 'tool', tool_call_id: 'call-1', content: '' },
  ];
  expect(await service.generateResponseWithTools(history, tools)).toBe(message);
  expect(complete).toHaveBeenCalledWith({ messages: [
    { role: 'assistant', content: null, tool_calls: [{ function: { name: 'speak', arguments: { text: 'Earlier' } } }] },
    { role: 'tool', tool_call_id: 'call-1', content: '{}' },
  ], tools });
  expect(history[0].tool_calls[0].function.arguments).toBe('{"text":"Earlier"}');
  expect(fetch).not.toHaveBeenCalled();
});

it('restores the current server route when the backend is cleared', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: 'Server' } }) });
  vi.stubGlobal('fetch', fetch);
  const service = new AIService({ complete: vi.fn() });
  service.setLocalBackend();
  await expect(service.generateResponseWithTools([{ role: 'user', content: 'Hi' }], [])).resolves.toEqual({ content: 'Server' });
  expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/chat', expect.objectContaining({
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }], tools: [] }),
  }));
});

it('propagates local failure without silently calling the server, then recovers', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const complete = vi.fn().mockRejectedValueOnce(new Error('Missing model')).mockResolvedValueOnce({ message: { content: 'Recovered' } });
  const service = new AIService({ complete });
  await expect(service.generateResponseWithTools([], [])).rejects.toThrow('Missing model');
  await expect(service.generateResponseWithTools([], [])).resolves.toEqual({ content: 'Recovered' });
  expect(fetch).not.toHaveBeenCalled();
});

it.each([undefined, {}, { message: {} }, { message: { content: ' ' } }, { message: { tool_calls: [{}] } }])('rejects unusable local envelopes: %j', async (result) => {
  const service = new AIService({ complete: vi.fn().mockResolvedValue(result) });
  await expect(service.generateResponseWithTools([], [])).rejects.toThrow('Invalid AI response message');
});

it('rejects unusable server envelopes and preserves HTTP errors', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Unavailable' });
  vi.stubGlobal('fetch', fetch);
  const service = new AIService();
  await expect(service.generateResponseWithTools([], [])).rejects.toThrow('Invalid AI response message');
  await expect(service.generateResponseWithTools([], [])).rejects.toThrow('Server error: 503 Unavailable');
});
