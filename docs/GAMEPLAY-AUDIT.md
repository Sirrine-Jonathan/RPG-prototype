# Gameplay completeness audit — 2026-10-11

Status: development prototype; complete campaign and human playthrough unverified.
The earlier paid launch packet and “100% launch-ready” status are withdrawn.

## What the current code supports

`main.ts` registers menu, town, library, and a police-station scaffold. Town/library
portals, movement, chat, inventory, local-AI responses, scripted fallback, and
checkpoint loading have targeted automated tests. This is meaningful functionality,
but it is not evidence of a complete mystery RPG.

## Prototype progression update

The three-witness collection loop now has an explicit player speech command,
`/evidence`, which uses the existing NPC evidence handlers without waiting for AI.
Grace supplies the photo in town; Sarah Mills supplies the library clue; Teacher
Elena visits Grace in town and supplies the school clue. The teacher is registered
through EntityManager and reused on town re-entry. The command is accepted only
for direct player speech within 48px; hearing another NPC or distant speech cannot
award evidence. It works while autonomous AI is paused or waiting on a request.
Normal conversation still uses local AI with scripted failure responses.

An on-screen objective gives witness/location instructions and explains Space,
`/evidence`, Enter. The completion overlay accurately calls this an evidence
collection prototype: Maya's fate and the full mystery remain unresolved. This
adds a supported collection route; it does not complete the intended story campaign
or wire StoryProgressManager chapters.

Town autosave now continues after the photo and library autosave records subsequent
inventory changes. The shared checkpoint service saves the active scene, inventory,
position and inventory-derived objective; unchanged inventory avoids repeated
writes, and failed writes retry after 30 seconds. Normal checks run every 2 seconds
following a 5-second scene-start delay. Abrupt closing before that check can lose
the newest change. Scene-owned timers end on shutdown.

QuickSpeechUI now removes its DOM and key listener on shutdown and uses scene-owned
timers, so delayed reopening cannot leave an old speech input across transitions.

## Remaining completion gaps

- No native browser or human playthrough has demonstrated the collection route,
  teacher approach, HUD layout, scene transitions or checkpoint timers.
- Story chapters, school interior, police station interactions and Maya's resolution
  remain unfinished. The teacher's town visit supplies testimony, not a school level.
- Art/license provenance, browser/iframe compatibility, layout, actual native
  input, AI response quality and accessibility need review. No asset ownership or
  cross-browser performance claim follows from a build or unit test.
- Human tester recruitment remains pending a verified accessible build and an
  authorized third-party outreach channel. No sessions or invitations claimed.

## Fixed photo checkpoint defect

Actual NPC awards use `mayas_photo`; town autosave formerly watched only
`Maya's Photo`. Earlier tests repeated that wrong ID and passed. Autosave now accepts
canonical and legacy IDs. Saved hasPhoto/currentObjective reflect actual inventory
rather than claiming acquisition for an empty inventory.

PhotoCheckpointIntegration.test.ts invokes the real NPC photo handler and real town
poll/save methods with isolated timers/storage, then asserts exact transferred item,
checkpoint position and objective. It fails on the old source and passes with the
fix. It still does not validate browser timers, renderer or player interaction.

## Automated coverage limits

The original 15 suites / 72 tests cover targeted paths, often with scene/render/AI
mocks. They do not assert all behaviors or demonstrate an ending. The production
Playwright smoke teleports to portals and injects a save fixture, so even a passing
smoke would not prove a normal full playthrough. The new EvidenceInvestigation integration suite exercises real speech/tool handlers,
actual inventory, checkpoint serialization/restoration and victory state. It uses
mocked renderer, distances and scene services; it does not prove navigation.
Current worker browser launch is
blocked before gameplay: no smoke checks ran. CI workflow upload is separately
blocked by missing OAuth workflow scope; it has not run.

## Acceptance before a paid full-game release

1. Define the complete supported quest, ending and allowed AI/offline modes.
2. Implement reachable clues and clear player objectives; verify real input route
   to ending without console calls, debug teleports or synthetic inventory.
3. Verify New Game, save/reload, library/town re-entry and ending state repeatedly.
4. Complete isolated desktop-browser and itch embed playthroughs with error/asset
   checks, screenshots, browser version, exact build hash and no local AI if sold
   as zero-install offline gameplay.
5. Recruit at least three first-time human testers. Record what they can discover
   unaided, blockers, dialogue delays, reload behavior and finish rate. Do not count
   invitations or automated tests as human sessions.
6. Verify asset distribution rights and rewrite listing to demonstrated features.

For now invite testers to a free development prototype, with a verified accessible
build and explicit limits, rather than sell the unverified campaign.
