export class Debug {
  private static _enabled: boolean | null = null;

  static get enabled(): boolean {
    if (this._enabled === null) {
      const params = new URLSearchParams(window.location.search);
      this._enabled = params.get('debug') === 'true';
    }
    return this._enabled;
  }
}
