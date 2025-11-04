# Pre-Development Questions & Clarifications

## LLM Integration & Configuration

### 1. LLM Provider & Model Selection

- **Primary LLM provider**: OpenAI, Anthropic, or local (Ollama/LM Studio)?
  For development, let's use ollama locally. You have terminal access and can run it yourself, but
  provide instructions on how to run it for development within CONTRIBUTING.md
- **Model preference**: GPT-3.5-turbo for cost, GPT-4 for quality, or local model for privacy?
  We will need to assign the right model for each character. Some may need a model that supports tools while others may not.
- **Fallback strategy**: Should we always have template responses, or is LLM-only acceptable for some NPCs?
  We should always have fallbacks so the story never truly requires LLM integration. The LLM integration is there to
  enhance gameplay and npm behavior. It should be clear to the user when a character is being operated by LLM integration
  and when it is not.
- **Rate limiting**: Any concerns about API costs or rate limits during development/testing?
  Yes. We need to gracefully handle 429s with a retry system that delays requests,
  excessive 429s and other non 200 responses should fallback to the template system (think classic RPG).

### 2. AI Response Constraints

- **Response length**: Is 100-150 words per NPC response appropriate, or shorter/longer?
  Yes, constrain NPC responses.
- **Response time**: What's acceptable latency? 1-2 seconds for AI responses?
  At your suggestion.
- **Context window**: How much conversation history should NPCs remember? Last 3 exchanges? Entire session?
  May depend on the NPC.
- **Personality consistency**: Should NPCs have strict personality constraints or can they be more dynamic?
  System prompts that constrain personalities.

## Game Mechanics & Progression

### 3. Player Interaction Model

- **Movement**: Point-and-click only, or WASD/arrow keys as well?
  Mobile controls first.
- **Interaction range**: How close must player be to interact with NPCs/objects?
  We'll work this out in the MVP, but I imagine there is an industry standard we can follow.
- **Conversation UI**: Modal dialogue boxes, or speech bubbles above NPCs?
  I prefer speech bubbles.
- **Inventory access**: Always visible, or hidden until needed?
  hidden until needed (toggle).

### 4. NPC Autonomous Behavior

- **Idle frequency**: Are 15-60 second intervals appropriate, or too frequent/slow?
  15-60 is appropriate. Should stop idle behavior when engaged by a player action (or other NPC action). Should resume idle behavior after no player interaction for some timeout.
- **Player awareness**: Should NPCs stop autonomous actions when player is watching, or continue naturally?
  Most NPCs should only do their idle behavior when in the presence of the user's character, but some key NPCs may need to always be acting.
- **NPC-to-NPC conversations**: Should these happen in real-time while player watches, or only off-screen?
  Mostly in real-time while player watches. These should not prevent user interaction/intervention.
- **Environmental persistence**: If Sheriff hides evidence, does it stay hidden between game sessions?
  Yes.

### 5. Game State & Progression

- **Save system**: Auto-save only, or manual save slots? Local storage or cloud sync?
  Let's just do local storage for now, but build the storage mechanisms so that we can easily upgrade when needed.
- **Progress tracking**: Should NPCs remember every conversation detail, or just key story flags?
  Whatever is most context efficient while remaining
- **Branching paths**: Can player actions lock them out of certain story paths, or always recoverable?
  Always recoverable.
- **Failure states**: Can the player "lose" by making wrong choices, or is it exploration-focused?
  Exploration focused.

## Technical Architecture

### 6. Performance & Scalability

- **Target devices**: Primarily mobile phones? What's the minimum spec we should support?
- **Asset loading**: Preload everything, or stream assets as needed?
- **Memory management**: Any constraints on total game size or memory usage?
- **Offline capability**: Must work completely offline, or just graceful degradation?
  Graceful degradation. I'll follow your suggestions for the other "Performance & Scalability" items.

### 7. Development & Testing

- **Browser targets**: Chrome/Safari mobile primarily, or broader compatibility?
  Chrome/Safari mobile primarily
- **Testing approach**: Should I write tests as I go, or implement first then test?
  For the MVP, write tests as you go. The MVP needs to be a fully tested proof of concept
  that will empower us to complete the rest of the game. This may even take multiple iterations
  or even multiple separate MVPs to iron out specific game mechanics before we build out the actual game.
  We may want to set up a sub directory for a sandbox to figure out some of these ideas. A sort of playground.
- **Debug features**: Do you want debug overlays showing NPC states, AI prompts, etc.?
- **Hot reloading**: Important for development, or can we work with full rebuilds?
  Hot reloading for faster development.

## Content & Design

### 8. Visual Style & Assets

- **Art style**: Pixel art, simple geometric shapes, or realistic graphics?
  Simple pixel art. For each asset we need a way to generate that asset. So each asset will need a prompt
  and all the assets can share a guide on how to use each assets prompt to get the asset generated by AI.
- **Asset creation**: Should I create placeholder programmer art, or use existing assets?
  Placeholder programmer art.
- **Animation**: Simple tweens for movement, or more complex sprite animations?
  Simple tweens.
- **UI style**: Modern flat design, retro game UI, or minimal/invisible interface?
  Match the style of the game.

### 9. Audio & Atmosphere

- **Sound effects**: Essential for MVP, or can we skip for now?
  Skip for now.
- **Background music**: Needed for atmosphere testing, or silence is fine?
  Skip for now.
- **Voice acting**: Text-only, or should we consider text-to-speech for NPCs?
  Skip for now.
- **Audio cues**: Should NPC actions (like hiding evidence) have audio feedback?
  Skip for now.

## Story & Narrative

### 10. Dialogue & Writing

- **Tone consistency**: Should I maintain the mystery/noir tone throughout, or more casual for MVP?
  Casual for MVP
- **Player character voice**: Silent protagonist, or should player responses have personality?
  Player responses should be 100% user generated.
- **Exposition handling**: How much backstory should NPCs reveal in early conversations?
  IDK
- **Mystery pacing**: Should the MVP reveal the supernatural elements, or keep it grounded?
  MVP should only proof the concept/mechanics. It doesn't even have to integrate the actual story yet at all.

### 11. NPC Behavior Boundaries

- **Ethical constraints**: Any topics or behaviors NPCs should avoid discussing?
  Keep it PG
- **Violence/conflict**: How should NPCs react to aggressive player behavior?
- **Information sharing**: Should NPCs ever refuse to talk, or always be responsive?
  Allow them the option.
- **Relationship dynamics**: Can NPCs become hostile permanently, or always redeemable?
  Leave that to the AI of each character.

## Development Process

### 12. Iteration & Feedback

- **Testing frequency**: Should I implement features incrementally for your testing, or larger chunks?
- **Priority order**: If we hit time constraints, what features are most/least important?
- **Code review**: Do you want to review code as we go, or trust the implementation?
- **Documentation**: How much inline documentation vs. external docs do you prefer?

### 13. Deployment & Distribution

- **Hosting**: Where should the MVP be deployed for testing? GitHub Pages, Netlify, local server?
  What do you suggest for hosting?
- **Version control**: Standard git workflow, or any specific branching strategy?
  The project is a local git repo for now.
- **Environment setup**: Any specific Node.js version or development environment requirements?
  No.
- **Collaboration**: Will this be solo development, or might others contribute later?
  Solo.

## Risk Assessment

### 14. Technical Risks I've Identified

- **AI reliability**: What if LLM responses are inappropriate or break character?
  We need to iron this out in the POC/MVP
- **Performance on mobile**: Complex NPC behavior might impact frame rate
  We need to iron this out in the POC/MVP
- **State synchronization**: Keeping NPC knowledge consistent with game state
  We need to iron this out in the POC/MVP
- **Network dependency**: Graceful handling of connectivity issues
  We need to iron this out in the POC/MVP

### 15. Scope Creep Concerns

- **Feature expansion**: How do we resist adding "just one more" feature during development?
- **Polish vs. functionality**: When do we stop iterating and consider MVP complete?
- **Testing thoroughness**: How much testing is "enough" for an MVP?

Please answer any/all questions that help clarify the vision and reduce development risk. Feel free to add any additional requirements, constraints, or preferences I haven't considered.

## Main Menu Implementation Questions

Before implementing the main menu, I need to understand the game structure:

1. **What happens when someone clicks "New Game"?** Do they go straight to the police station? Character creation? A tutorial?
   No character creation or tutorial. They should start in the town, but outside. There needs to be some way to go from one setting to another.
   For example, what happens when you leave the police station? How do you get to the Museum (for example) from the Police Station (for example)?
   We don't have to answer that quite yet, though, because we are just trying to get a navigable main menu working. Don't make any assumptions about any features
   that are not documented somewhere withing the markdown files in `docs/`

2. **How do our location configs actually work in practice?** We have the police_station.json you just created, but how does the game transition between locations?

What do you suggest? I think there needs to be a 'outside' scene/setting that allows the user to explore the town and get to and from each other setting/scene.

3. **What's the core game loop?** Is this a point-and-click adventure? An RPG with combat? A detective story?
   Basic RPG. It's a mystery story that features AI Driven NPCs.

4. **How do saves work?** Our GameState class exists, but what exactly gets saved and loaded?
   Review `docs/` for what is needed.

5. **Should we first create a simple "GameScene" that integrates our existing components** (player, NPCs, conversation system, etc.) and then build a menu that launches into that?
   Possibly... Let's just get the main menu UI working nice first.
   I noticed that the canvas and #game-container look a bit weird. Just do a full screen canvas or something.
   The canvas should be the 'viewport' to the game world, not necessarily the games boundaries. Does that make sense?
