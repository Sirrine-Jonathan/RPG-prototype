# Three-witness prototype review

This is a development prototype, not a complete mystery game or paid release.
No AI account, Ollama or paid API is needed for the explicit evidence requests.
Local AI still powers optional free-form conversations.

1. Start New Game. Use arrows/WASD or click to move; Space opens speech.
2. Approach Grace Sirrine in town at (795, 880). Within 48px, type `/evidence`
   and press Enter. She gives Maya's photo.
3. Enter the library using the existing portal. Approach Sarah Mills (400, 200)
   and say `/evidence`. She gives the library clue.
4. Wait for the checkpoint (5 seconds after scene startup, then checks every
   2 seconds). Reload and choose Load Game; check inventory and position.
5. Return to town. Approach Teacher Elena (900, 880) and say `/evidence`.
6. The evidence-complete overlay should appear once. It explicitly says Maya's
   fate and the full mystery are unresolved. Continue dismisses it.
7. Repeat evidence requests; inventory must not accumulate duplicate clues.
8. Wait for autosave, reload, confirm all three clues remain without replaying
   the overlay. New Game should clear the checkpoint and all evidence.

Expected objectives: meet Grace, investigate library, interview teacher,
evidence complete. Ordinary questions still depend on local AI/fallback; the
literal command follows the deterministic prototype route.

Record exact build hash, browser/version, OS, screenshots, errors and actual
results for each step. Failure to discover or reach a witness counts as a blocker.
The automated integration test supplies proximity distances and mocks scenes;
it cannot substitute for this native-input playthrough or first-time humans.
