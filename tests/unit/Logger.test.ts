// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, LogTag } from '../../src/utils/Logger';

describe('Logger delivery recovery', () => {
  let logger: Logger;
  const flush = () => (logger as any).flushToBackend();
  beforeEach(() => {
    vi.useFakeTimers();
    (Logger as any).instance = undefined;
    logger = Logger.getInstance();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('retains entries when fetch is unavailable', async () => {
    vi.stubGlobal('fetch', undefined);
    logger.log(LogTag.DEBUG, 'retained');
    await flush();
    expect(logger.exportLogs()).toContain('retained');
  });

  it.each(['network', 'http'])('retries a %s failure in order with new entries', async (failure) => {
    let finish: (value?: any) => void;
    const fetchMock = vi.fn(() => new Promise((resolve, reject) => {
      finish = failure === 'network' ? reject : resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    logger.log(LogTag.DEBUG, 'first');
    const pending = flush();
    logger.log(LogTag.DEBUG, 'second');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish!(failure === 'network' ? new Error('offline') : { ok: false, status: 503 });
    await pending;
    fetchMock.mockResolvedValue({ ok: true } as never);
    await flush();
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(sent.logs.map((entry: any) => entry.message)).toEqual(['first', 'second']);
    expect(logger.exportLogs()).toBe('');
  });

  it('bounds recovered logs to the newest 1000 entries under load', async () => {
    let fail: (error: Error) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((_, reject) => { fail = reject; })));
    for (let i = 0; i < 800; i++) logger.log(LogTag.DEBUG, `old-${i}`);
    const pending = flush();
    for (let i = 0; i < 600; i++) logger.log(LogTag.DEBUG, `new-${i}`);
    fail!(new Error('offline'));
    await pending;
    const logs = logger.getLogsByTag(LogTag.DEBUG);
    expect(logs).toHaveLength(1000);
    expect(logs[0].message).toBe('old-400');
    expect(logs[999].message).toBe('new-599');
  });

  it('keeps entries created during a successful delivery for the next batch', async () => {
    let finish: (value: any) => void;
    const fetchMock = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    logger.log(LogTag.DEBUG, 'first');
    const pending = flush();
    logger.log(LogTag.DEBUG, 'second');
    finish!({ ok: true });
    await pending;
    expect(logger.getLogsByTag(LogTag.DEBUG).map(entry => entry.message)).toEqual(['second']);
    fetchMock.mockResolvedValue({ ok: true });
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).logs.map((entry: any) => entry.message)).toEqual(['second']);
    expect(logger.exportLogs()).toBe('');
  });

  it('aborts stalled delivery, restores the batch, and allows a retry', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new Error('Log timeout')), ms);
      return controller.signal;
    });
    const fetchMock = vi.fn((_url, options) => new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason));
    }));
    vi.stubGlobal('fetch', fetchMock);
    logger.log(LogTag.DEBUG, 'retained after timeout');
    const pending = flush();
    await vi.advanceTimersByTimeAsync(10000);
    await pending;
    expect(AbortSignal.timeout).toHaveBeenCalledWith(10000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logger.exportLogs()).toContain('retained after timeout');
    fetchMock.mockResolvedValue({ ok: true });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.exportLogs()).toBe('');
  });
});
