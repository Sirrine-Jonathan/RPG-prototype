/** Scripted responses only to player events; silence prevents NPC reply loops. */
export function offlineDialogue(name: string, event: string, message = ""): string | undefined {
  if (event === "initial_approach" || event === "player_nearby") {
    return `Hello, Detective Riley. I'm ${name}. I'm using scripted dialogue while local AI is unavailable.`;
  }
  if (event !== "player_speech") return undefined;
  if (/\b(hello|hi|hey)\b/i.test(message)) return `Hello again, Detective Riley. I'm ${name}.`;
  if (/\b(help|where|what|clue|mystery)\b/i.test(message)) {
    return "You can explore the town and inspect nearby objects. My scripted dialogue cannot provide new clues; local AI is currently unavailable.";
  }
  return "I heard you, Detective Riley. I'm using scripted dialogue while local AI is unavailable, so I can't answer that freely yet.";
}
