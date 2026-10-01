// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { offlineDialogue } from '../../src/services/OfflineDialogue';

describe('Scripted offline dialogue', () => {
  it.each(['initial_approach', 'player_nearby'])('greets a player on %s and discloses the fallback', event => {
    expect(offlineDialogue('Ada', event)).toContain("I'm Ada");
    expect(offlineDialogue('Ada', event)).toContain('scripted dialogue');
  });
  it('responds to greetings and requests for help without inventing clues', () => {
    expect(offlineDialogue('Ada', 'player_speech', 'HI!')).toContain('Hello again');
    expect(offlineDialogue('Ada', 'player_speech', 'Where is a clue?')).toContain('cannot provide new clues');
    expect(offlineDialogue('Ada', 'player_speech', 'Tell me your secrets')).toContain("can't answer that freely");
  });
  it.each(['npc_speech_heard', 'timeout_prompt', 'player_left'])('stays silent on %s to avoid reply loops', event => {
    expect(offlineDialogue('Ada', event, 'hello')).toBeUndefined();
  });
});
