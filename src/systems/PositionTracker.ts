export class PositionTracker {
  private static instance: PositionTracker | null = null;
  private positions: Map<string, { x: number; y: number; timestamp: number }> = new Map();

  public static getInstance(): PositionTracker {
    if (!PositionTracker.instance) {
      PositionTracker.instance = new PositionTracker();
    }
    return PositionTracker.instance;
  }

  public updatePosition(id: string, x: number, y: number): void {
    this.positions.set(id, { x, y, timestamp: Date.now() });
  }

  public getPosition(id: string): { x: number; y: number } | null {
    const pos = this.positions.get(id);
    return pos ? { x: pos.x, y: pos.y } : null;
  }

  public getAllPositions(): Map<string, { x: number; y: number }> {
    const result = new Map();
    this.positions.forEach((pos, id) => {
      result.set(id, { x: pos.x, y: pos.y });
    });
    return result;
  }

  public getDistance(id1: string, id2: string): number | null {
    const pos1 = this.getPosition(id1);
    const pos2 = this.getPosition(id2);
    if (!pos1 || !pos2) return null;
    
    return Math.sqrt((pos2.x - pos1.x) ** 2 + (pos2.y - pos1.y) ** 2);
  }
}