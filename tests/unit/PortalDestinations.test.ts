// @vitest-environment node
import { expect, it, vi } from 'vitest';
import town from '../../public/levels/town_overworld.json';
import library from '../../public/levels/library_interior.json';
vi.mock('../../src/utils/Debug', () => ({ Debug: { enabled: false } }));
vi.mock('../../src/scenes/BaseScene', () => ({ BaseScene: class {} }));
vi.mock('../../src/core/GameManager', () => ({ GameManager: class {} }));
vi.mock('../../src/systems/AssetManager', () => ({ AssetManager: class {} }));
vi.mock('../../src/ui/QuickSpeechUI', () => ({ QuickSpeechUI: class {} }));
vi.mock('../../src/ui/ChatInterface', () => ({ ChatInterface: class {} }));
vi.mock('../../src/entities/PersistentNPC', () => ({ PersistentNPC: class {} }));
import { NewGameplayScene } from '../../src/scenes/NewGameplayScene';
import { NewTownScene } from '../../src/scenes/NewTownScene';
import { NewLibraryScene } from '../../src/scenes/NewLibraryScene';
import { PortalService } from '../../src/systems/PortalService';
import { BoundarySystem } from '../../src/systems/BoundarySystem';

function setup(Scene: any, level: any, targetPortalId?: string) {
  const setPosition = vi.fn();
  const context: any = {
    levelLoader: { getLevelData: () => level },
    gameManager: { systemManager: { boundarySystem: BoundarySystem.getInstance() },
      entityManager: { getPlayer: () => ({ setPosition }) } },
    createBookshelves: vi.fn(),
    applyPortalSpawn: (NewGameplayScene.prototype as any).applyPortalSpawn,
    pendingPortalData: targetPortalId ? { targetPortalId } : undefined,
  };
  context.portalService = new PortalService({} as any);
  Scene.prototype.setupPortalsAndSpawns.call(context);
  return { context, setPosition };
}

it('uses matching destination IDs and safe positions for a town/library round trip', () => {
  const a = setup(NewTownScene, town);
  const outward = a.context.portalService.getPortals();
  expect(outward).toHaveLength(1); // Unimplemented tavern is not routed to the library.
  const b = setup(NewLibraryScene, library, outward[0].targetPortalId);
  expect(b.setPosition).toHaveBeenCalledWith(480, 576);
  expect(BoundarySystem.getInstance().getBounds()).toEqual({ width: 960, height: 720 });
  expect(BoundarySystem.getInstance().isPositionValid(1200, 800)).toBe(false);
  const exit = b.context.portalService.getPortals()[0];
  const c = setup(NewTownScene, town, exit.targetPortalId);
  expect(c.setPosition).toHaveBeenCalledWith(192, 864);
  expect(BoundarySystem.getInstance().getBounds()).toEqual({ width: 2784, height: 1824 });
  for (const { context, setPosition } of [b, c]) {
    const [x, y] = setPosition.mock.calls[0];
    expect(context.portalService.getPortals().every((p: any) => Math.hypot(x-p.x, y-p.y) >= 60)).toBe(true);
    expect(context.pendingPortalData).toBeUndefined();
  }
});

it('falls back to the default spawn when a destination is unknown', () => {
  const { setPosition } = setup(NewLibraryScene, library, 'missing');
  expect(setPosition).toHaveBeenCalledWith(480, 576);
});
