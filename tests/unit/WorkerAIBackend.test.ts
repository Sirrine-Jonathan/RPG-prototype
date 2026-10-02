// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { WorkerAIBackend } from '../../src/services/WorkerAIBackend';
class FakeWorker extends EventTarget {
  postMessage = vi.fn();
  terminate = vi.fn();
  reply(data: any) { this.dispatchEvent(new MessageEvent('message', { data })); }
}
const request = { model: 'test', messages: [], tools: [], stream: false, options: {} };
afterEach(() => { vi.useRealTimers(); });
it('correlates concurrent replies and preserves tool output', async () => {
  const worker = new FakeWorker();
  const backend = new WorkerAIBackend(worker as any);
  const first = backend.complete(request);
  const second = backend.complete(request);
  worker.reply({ type: 'result', id: 999, result: {} });
  const result = { message: { tool_calls: [{ function: { name: 'speak' } }] } };
  worker.reply({ type: 'result', id: 2, result });
  worker.reply({ type: 'result', id: 1, result: { message: { content: 'Hello' } } });
  expect(await second).toEqual(result);
  expect(await first).toEqual({ message: { content: 'Hello' } });
  backend.dispose();
});
it('terminates stalled generation and rejects all queued requests', async () => {
  vi.useFakeTimers();
  const worker = new FakeWorker();
  const backend = new WorkerAIBackend(worker as any, 100);
  const first = expect(backend.complete(request)).rejects.toThrow('timed out');
  const second = expect(backend.complete(request)).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(100);
  await Promise.all([first, second]);
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  await expect(backend.complete(request)).rejects.toThrow('closed');
  backend.dispose();
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});
it('propagates generation errors while allowing recovery', async () => {
  const worker = new FakeWorker();
  const backend = new WorkerAIBackend(worker as any);
  const failure = expect(backend.complete(request)).rejects.toThrow('Missing model');
  worker.reply({ type: 'error', id: 1, error: 'Missing model' });
  await failure;
  const next = backend.complete(request);
  worker.reply({ type: 'result', id: 2, result: { message: { content: 'Recovered' } } });
  await expect(next).resolves.toEqual({ message: { content: 'Recovered' } });
  backend.dispose();
});
it('cleans up after worker crashes and message cloning failures', async () => {
  const worker = new FakeWorker();
  const backend = new WorkerAIBackend(worker as any);
  worker.postMessage.mockImplementationOnce(() => { throw new Error('Clone failed'); });
  await expect(backend.complete(request)).rejects.toThrow('Clone failed');
  const failure = expect(backend.complete(request)).rejects.toThrow('worker failed');
  worker.dispatchEvent(new Event('error'));
  await failure;
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});
