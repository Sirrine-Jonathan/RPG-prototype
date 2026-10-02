import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { manager } = vi.hoisted(() => ({ manager: {
  entityManager: { getPlayer: vi.fn() },
  systemManager: { pathfindingSystem: {
    movePlayerTo: vi.fn(), isPathfindingActive: vi.fn(() => true),
    cancelPathfinding: vi.fn(), isPlayerMoving: vi.fn(() => false),
    cancelPlayerMovement: vi.fn()
  } }
} }));
vi.mock('../../src/core/GameManager', () => ({
  GameManager: { getInstance: () => manager }
}));
import { MovementSystem } from '../../src/systems/MovementSystem';

let system: MovementSystem;
let player: any;
let keys: any;
let pointerDown: (pointer: any) => void;
beforeEach(() => {
  vi.clearAllMocks();
  player = { getPosition: () => ({ x: 100, y: 100 }), setPosition: vi.fn(), getSprite: () => null };
  manager.entityManager.getPlayer.mockReturnValue(player);
  keys = Object.fromEntries(['W', 'S', 'A', 'D'].map(key => [key, { isDown: false }]));
  const cursors = Object.fromEntries(['left', 'right', 'up', 'down'].map(key => [key, { isDown: false }]));
  system = new MovementSystem();
  system.initialize();
  system.setupInput({
    input: { keyboard: { createCursorKeys: () => cursors, addKeys: () => keys },
      on: (_event: string, handler: typeof pointerDown) => { pointerDown = handler; } },
    game: { loop: { delta: 100 } }
  } as any);
  vi.stubGlobal('gameManager', { proximitySystem: { updatePlayerPosition: vi.fn() } });
});
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it('routes left clicks to pathfinding and ignores clicks while paused', () => {
  pointerDown({ leftButtonDown: () => false, worldX: 200, worldY: 300 });
  expect(manager.systemManager.pathfindingSystem.movePlayerTo).not.toHaveBeenCalled();
  pointerDown({ leftButtonDown: () => true, worldX: 200, worldY: 300 });
  expect(manager.systemManager.pathfindingSystem.movePlayerTo).toHaveBeenCalledWith(player, 200, 300, true);
  system.pause();
  pointerDown({ leftButtonDown: () => true, worldX: 400, worldY: 500 });
  expect(manager.systemManager.pathfindingSystem.movePlayerTo).toHaveBeenCalledOnce();
});

it('cancels click movement and moves with keyboard input', () => {
  keys.D.isDown = true;
  system.update();
  expect(manager.systemManager.pathfindingSystem.cancelPathfinding).toHaveBeenCalledOnce();
  expect(player.setPosition).toHaveBeenCalledWith(120, 100);
});

it.each(['input', 'textarea'])('typing in %s does not cancel a route or move the player', tag => {
  const field = document.createElement(tag);
  document.body.append(field);
  field.focus();
  keys.W.isDown = true;
  system.update();
  expect(manager.systemManager.pathfindingSystem.cancelPathfinding).not.toHaveBeenCalled();
  expect(player.setPosition).not.toHaveBeenCalled();
});
