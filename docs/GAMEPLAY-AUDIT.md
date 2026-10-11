# Gameplay completeness audit — 2026-10-11

Status: development prototype; complete campaign and human playthrough unverified.
The earlier paid launch packet and “100% launch-ready” status are withdrawn.

## What the current code supports

`main.ts` registers menu, town, library, and a police-station scaffold. Town/library
portals, movement, chat, inventory, local-AI responses, scripted fallback, and
checkpoint loading have targeted automated tests. This is meaningful functionality,
but it is not evidence of a complete mystery RPG.

## Concrete completion gaps

- `WinConditionManager` requires `mayas_photo`, `library_clue`, and `school_clue`.
  `PersistentNPC.getToolsForAI` offers the school clue to a Teacher or in SchoolScene.
  No SchoolScene is registered in main.ts and the active town/library NPCs are not
  Teachers. There is no demonstrated normal player route to all three clues.
- Photo/library clue handlers do connect to the victory manager. This corrects an
  initial shallow audit that overlooked PersistentNPC handlers. However, the
  chapter StoryProgressManager is not constructed/exposed by GameManager.
- OfflineDialogue explicitly cannot award clues or perform game actions. A free
  browser build without local AI does not provide a demonstrated finishable loop.
- Victory lifecycle defects were fixed in this review: New Game resets evidence
  and overlay; Load Game reconstructs known clues from saved inventory without
  replaying awards/events. Tests validate this lifecycle, but no human ending or
  complete campaign checkpoint walkthrough has been verified.
- Removed the menu Level Test entry that started an unregistered LevelTestScene.
  Police station remains a scaffold; town portal setup only registers the library route.
- Art/license provenance, browser/iframe compatibility, layout, actual native
  input, AI response quality and accessibility need review. No asset ownership or
  cross-browser performance claim follows from a build or unit test.

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
smoke would not prove a normal full playthrough. Current worker browser launch is
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
