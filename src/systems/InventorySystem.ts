export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category?: string;
}

export class InventorySystem {
  private static instance: InventorySystem;
  private inventories: Map<string, InventoryItem[]> = new Map();

  static getInstance(): InventorySystem {
    if (!InventorySystem.instance) {
      InventorySystem.instance = new InventorySystem();
    }
    return InventorySystem.instance;
  }

  addItem(actorId: string, item: InventoryItem): void {
    if (!this.inventories.has(actorId)) {
      this.inventories.set(actorId, []);
    }
    this.inventories.get(actorId)!.push(item);
  }

  removeItem(actorId: string, itemId: string): InventoryItem | null {
    const inventory = this.inventories.get(actorId);
    if (!inventory) return null;

    const index = inventory.findIndex(item => item.id === itemId);
    if (index === -1) return null;

    return inventory.splice(index, 1)[0];
  }

  getInventory(actorId: string): InventoryItem[] {
    return this.inventories.get(actorId) || [];
  }

  replaceInventory(actorId: string, items: InventoryItem[]): void {
    this.inventories.set(actorId, items.map(item => ({ ...item })));
  }

  hasItem(actorId: string, itemId: string): boolean {
    const inventory = this.inventories.get(actorId);
    return inventory ? inventory.some(item => item.id === itemId) : false;
  }

  transferItem(fromActorId: string, toActorId: string, itemId: string): boolean {
    const item = this.removeItem(fromActorId, itemId);
    if (item) {
      this.addItem(toActorId, item);
      return true;
    }
    return false;
  }
}
