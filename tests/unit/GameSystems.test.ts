// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BoundarySystem } from '../../src/systems/BoundarySystem';
import { InventorySystem } from '../../src/systems/InventorySystem';

describe('level boundaries', () => {
  it('uses the loaded map dimensions and player margin', () => {
    const bounds = new BoundarySystem();
    bounds.setLevelBounds({ width: 10, height: 8, tileSize: 48 });
    expect(bounds.getBounds()).toEqual({ width: 480, height: 384 });
    expect(bounds.isPositionValid(48, 48)).toBe(true);
    expect(bounds.isPositionValid(432, 336)).toBe(true);
    for (const [x, y] of [[47, 48], [433, 48], [48, 47], [48, 337]]) {
      expect(bounds.isPositionValid(x, y)).toBe(false);
    }
    bounds.setLevelBounds({ width: 20, height: 10, tileSize: 16 });
    expect(bounds.isPositionValid(432, 100)).toBe(false);
    expect(bounds.isPositionValid(300, 140, 16)).toBe(true);
  });
});

describe('inventory transfers', () => {
  it('moves an item once without affecting other actors or items', () => {
    const inventory = new InventorySystem();
    const clue = { id: 'clue', name: 'Clue', description: 'A note' };
    const key = { id: 'key', name: 'Key', description: 'A brass key' };
    inventory.addItem('scholar', clue);
    inventory.addItem('scholar', key);
    expect(inventory.transferItem('scholar', 'player', 'clue')).toBe(true);
    expect(inventory.getInventory('scholar')).toEqual([key]);
    expect(inventory.getInventory('player')).toEqual([clue]);
    expect(inventory.transferItem('scholar', 'player', 'clue')).toBe(false);
    expect(inventory.getInventory('player')).toEqual([clue]);
    expect(inventory.hasItem('player', 'clue')).toBe(true);
    expect(inventory.getInventory('stranger')).toEqual([]);
  });
});
