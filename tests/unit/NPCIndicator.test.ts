import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ Scene: class {} }));
import { NPCIndicator } from '../../src/ui/NPCIndicator';

let background: any;
let icon: any;
let container: any;
let scene: any;
beforeEach(() => {
  const graphics = () => Object.fromEntries([
    'clear', 'fillStyle', 'fillCircle', 'lineStyle', 'strokeCircle',
    'strokePath', 'fillRoundedRect', 'strokeRect'
  ].map(name => [name, vi.fn()]));
  background = graphics();
  icon = graphics();
  container = { add: vi.fn(), setSize: vi.fn(), destroy: vi.fn() };
  scene = { add: {
    container: vi.fn(() => container),
    graphics: vi.fn().mockReturnValueOnce(background).mockReturnValueOnce(icon)
  } };
});

it('replaces the AI icon with scripted-mode rendering and can switch back', () => {
  const indicator = new NPCIndicator(scene, 100, 200);
  expect(scene.add.container).toHaveBeenCalledWith(100, 200);
  expect(background.fillStyle).toHaveBeenLastCalledWith(0x00ff88, 0.8);
  indicator.setMode('template');
  expect(background.clear).toHaveBeenCalledTimes(2);
  expect(icon.clear).toHaveBeenCalledTimes(2);
  expect(background.fillStyle).toHaveBeenLastCalledWith(0xffa500, 0.8);
  expect(icon.strokeRect).toHaveBeenCalledTimes(3);
  indicator.setMode('ai');
  expect(background.fillStyle).toHaveBeenLastCalledWith(0x00ff88, 0.8);
  indicator.destroy();
  expect(container.destroy).toHaveBeenCalledOnce();
});
