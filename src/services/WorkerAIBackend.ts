import type { LocalAIBackend } from './AIService';

type Request = Parameters<LocalAIBackend['complete']>[0];
type Result = Awaited<ReturnType<LocalAIBackend['complete']>>;

/** Owns a dedicated worker; a missed deadline terminates its generation. */
export class WorkerAIBackend implements LocalAIBackend {
  private nextId = 0;
  private closed = false;
  private pending = new Map<number, { resolve: (value: Result) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  constructor(private readonly worker: Worker, private readonly timeoutMs = 10000) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid inference deadline');
    worker.addEventListener('message', this.onMessage);
    worker.addEventListener('error', this.onError);
    worker.addEventListener('messageerror', this.onError);
  }

  complete(request: Request): Promise<Result> {
    if (this.closed) return Promise.reject(new Error('Inference worker is closed'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.dispose(new Error('Local inference timed out')), this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.worker.postMessage({ type: 'complete', id, request }); }
      catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('Cannot send inference request'));
      }
    });
  }

  private onMessage = (event: MessageEvent) => {
    const data = event.data;
    const pending = this.pending.get(data?.id);
    if (!pending || (data.type !== 'result' && data.type !== 'error')) return;
    this.pending.delete(data.id);
    clearTimeout(pending.timer);
    if (data.type === 'error') pending.reject(new Error(typeof data.error === 'string' ? data.error : 'Local inference failed'));
    else pending.resolve(data.result);
  };

  private onError = () => this.dispose(new Error('Inference worker failed'));

  dispose(reason = new Error('Inference worker disposed')): void {
    if (this.closed) return;
    this.closed = true;
    this.worker.removeEventListener('message', this.onMessage);
    this.worker.removeEventListener('error', this.onError);
    this.worker.removeEventListener('messageerror', this.onError);
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(reason);
    }
    this.pending.clear();
  }
}
