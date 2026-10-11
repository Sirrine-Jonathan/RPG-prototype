import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventorySystem } from '../../src/systems/InventorySystem';
import { PersistentPlayer } from '../../src/entities/PersistentPlayer';

vi.mock('../../src/utils/Logger', () => ({ Logger: { getInstance: () => ({}) }, LogTag: {} }));

describe('player autoplay integration', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  function setup(response: any) {
    vi.spyOn(InventorySystem, 'getInstance').mockReturnValue(new InventorySystem());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const emit = vi.fn();
    vi.stubGlobal('gameManager', { eventBus: { emit } });
    const complete = vi.fn().mockResolvedValue(response);
    const addEvent = vi.fn();
    const player = Object.assign(Object.create(PersistentPlayer.prototype), {
      id: 'Detective Riley', autoMode: true, position: { x: 48, y: 96 },
      MIN_TIMEOUT: 10000, MAX_TIMEOUT: 20000,
      currentScene: { scene: { key: 'town' }, time: { addEvent } },
      aiService: { generateResponseWithTools: complete },
    });
    return { player, emit, complete, addEvent };
  }

  it('sends chat messages and serializable tool definitions, then dispatches speech', async () => {
    const { player, emit, complete, addEvent } = setup({ tool_calls: [
      { function: { name: 'speak_to_npcs', arguments: '{"message":"Have you seen Maya?"}' } },
      { function: { name: 'navigate_to_location', arguments: { location: 'town', reason: 'Search' } } },
    ] });
    await player.performAutoAction();
    const [messages, tools] = complete.mock.calls[0];
    expect(complete.mock.calls[0]).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'system' });
    expect(messages[1].content).toContain('Current location: town');
    expect(tools[0]).toMatchObject({ type: 'function', function: { name: 'speak_to_npcs' } });
    expect(JSON.stringify(tools)).not.toContain('handler');
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith('player_speech', expect.objectContaining({ message: 'Have you seen Maya?' }));
    expect(addEvent).toHaveBeenCalledOnce();
  });

  it('dispatches object arguments for a valid navigation intent', async () => {
    const { player, emit } = setup({ tool_calls: [{ function: {
      name: 'navigate_to_location', arguments: { location: 'library', reason: 'Follow the clue' },
    } }] });
    await player.performAutoAction();
    expect(emit).toHaveBeenCalledWith('player_navigation_request', {
      location: 'library', reason: 'Follow the clue', playerId: 'Detective Riley',
    });
  });

  it.each([
    ['unknown', {}], ['speak_to_npcs', '{invalid'], ['speak_to_npcs', {}],
    ['speak_to_npcs', { message: ' ' }], ['navigate_to_location', { location: 'invalid', reason: 'Search' }],
  ])('rejects invalid action %s and schedules recovery', async (name, args) => {
    const { player, emit, addEvent } = setup({ tool_calls: [{ function: { name, arguments: args } }] });
    await player.performAutoAction();
    expect(emit).not.toHaveBeenCalled();
    expect(addEvent).toHaveBeenCalledOnce();
  });

  it('recovers from inference rejection', async () => {
    const { player, complete, emit, addEvent } = setup(null);
    complete.mockRejectedValue(new Error('offline'));
    await player.performAutoAction();
    expect(emit).not.toHaveBeenCalled();
    expect(addEvent).toHaveBeenCalledOnce();
  });

  it('discards an in-flight action when autoplay is disabled', async () => {
    const { player, complete, emit, addEvent } = setup(null);
    let finish!: (value: any) => void;
    complete.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const action = player.performAutoAction();
    player.disableAutoMode();
    finish({ tool_calls: [{ function: { name: 'speak_to_npcs', arguments: { message: 'Late speech' } } }] });
    await action;
    expect(emit).not.toHaveBeenCalled();
    expect(addEvent).not.toHaveBeenCalled();
  });
});
