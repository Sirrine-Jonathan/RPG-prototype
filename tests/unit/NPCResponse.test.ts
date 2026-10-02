// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../src/ui/SpeechBubble', () => ({ SpeechBubble: class {} }));
vi.mock('../../src/ui/ActionBubble', () => ({ ActionBubble: class {} }));
import { PersistentNPC } from '../../src/entities/PersistentNPC';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

// Run real event processing without a renderer or local AI service.
function makeNPC(response: unknown, failure = false) {
  const npc = Object.create(PersistentNPC.prototype);
  npc.name = 'Ada';
  npc.messages = [];
  npc.logger = new Proxy({}, { get: () => vi.fn() });
  npc.startRandomTimeout = vi.fn();
  npc.getSystemPrompt = () => ({ role: 'system', content: 'You are Ada' });
  npc.getRecentMessages = () => npc.messages;
  npc.getToolsForAI = () => [];
  npc.handleSpeak = vi.fn().mockResolvedValue({ success: true, message: 'Spoke' });
  npc.aiService = { generateResponseWithTools: failure
    ? vi.fn().mockRejectedValue(response) : vi.fn().mockResolvedValue(response) };
  return npc;
}

it('delivers plain AI dialogue through the speech handler and retains history', async () => {
  const npc = makeNPC({ content: 'Welcome to the library.' });
  await npc.handleEvent('player_speech', { message: 'Hello', distance: 40 });
  expect(npc.handleSpeak).toHaveBeenCalledTimes(1);
  expect(npc.handleSpeak).toHaveBeenCalledWith('Welcome to the library.');
  expect(npc.messages.at(-1)).toEqual({ role: 'assistant', content: 'Welcome to the library.' });
  expect(npc.pendingLLMRequest).toBeUndefined();
});

it('executes a speak tool once without also speaking its accompanying content', async () => {
  const npc = makeNPC({ content: 'Internal explanation', tool_calls: [{
    id: 'call-1', function: { name: 'speak', arguments: { message: 'Hello, Detective.' } }
  }] });
  await npc.handleEvent('player_speech', { message: 'Hello', distance: 40 });
  expect(npc.handleSpeak).toHaveBeenCalledTimes(1);
  expect(npc.handleSpeak).toHaveBeenCalledWith('Hello, Detective.');
  expect(npc.messages.at(-1)).toEqual({ role: 'tool', tool_call_id: 'call-1', content: 'Spoke' });
  expect(npc.pendingLLMRequest).toBeUndefined();
});

it('delivers scripted player dialogue on AI failure and stays silent for NPC speech', async () => {
  const npc = makeNPC(new Error('AI unavailable'), true);
  await npc.handleEvent('player_speech', { message: 'Where is a clue?', distance: 40 });
  expect(npc.handleSpeak).toHaveBeenCalledTimes(1);
  expect(npc.handleSpeak.mock.calls[0][0]).toContain('cannot provide new clues');
  await npc.handleEvent('npc_speech_heard', { speakerName: 'Bob', message: 'Hello', distance: 40 });
  expect(npc.handleSpeak).toHaveBeenCalledTimes(1);
  expect(npc.pendingLLMRequest).toBeUndefined();
});
