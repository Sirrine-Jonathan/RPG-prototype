import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventorySystem } from '../../src/systems/InventorySystem';

vi.mock('phaser', () => ({ Scene: class {} }));
vi.mock('../../src/utils/Logger', () => ({
  Logger: { getInstance: () => ({}) }, LogTag: {},
}));

import { PersistentNPC } from '../../src/entities/PersistentNPC';

describe('NPC evidence delivery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function setup(name: string) {
    const inventory = new InventorySystem();
    vi.spyOn(InventorySystem, 'getInstance').mockReturnValue(inventory);
    const completePuzzle = vi.fn();
    const addEvidence = vi.fn();
    vi.stubGlobal('gameManager', {
      storyProgressManager: { completePuzzle }, winConditionManager: { addEvidence },
    });
    const npc = Object.assign(Object.create(PersistentNPC.prototype), { name, say: vi.fn() });
    return { npc, inventory, completePuzzle, addEvidence };
  }

  it('transfers Maya’s photo and records story progress', async () => {
    const { npc, inventory, completePuzzle, addEvidence } = setup('Grace Sirrine');
    const result = await npc.handleGiveMayasPhoto();
    expect(result.success).toBe(true);
    expect(inventory.getInventory('Grace Sirrine')).toEqual([]);
    expect(inventory.hasItem('Detective Riley', 'mayas_photo')).toBe(true);
    expect(completePuzzle).toHaveBeenCalledWith('received_photo');
    expect(addEvidence).toHaveBeenCalledWith('mayas_photo');
  });

  it('transfers other evidence through the shared inventory', async () => {
    const { npc, inventory, addEvidence } = setup('Witness');
    const result = await npc.handleGiveEvidence('note', 'Library note', 'A clue');
    expect(result.success).toBe(true);
    expect(inventory.getInventory('Witness')).toEqual([]);
    expect(inventory.getInventory('Detective Riley')).toEqual([
      { id: 'note', name: 'Library note', description: 'A clue', category: 'Evidence' },
    ]);
    expect(addEvidence).toHaveBeenCalledWith('note');
  });
});
