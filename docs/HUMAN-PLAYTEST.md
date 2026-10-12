# Human playtest recruitment packet — 2026-10-11

Status: sourced leads and concrete session script; zero humans recruited or tested.
No third-party messages sent. A usable publishing/account interface and verified
shareable free build are still needed for invitations. Jon asked to find testers;
this packet supports that request without inventing outreach or availability.

## Verified lead

Khrisnoy: https://khrisnoy.itch.io/ advertises volunteer/free playtesting, Windows
only, bug reproduction and UX/gameplay feedback, 5–10 hours/week in UTC+7.
Public profile lists itch DM and Discord. This is self-described availability,
not a booked tester, verified skill, endorsement or a guarantee of response.
Best fit: initial Windows desktop-browser walkthrough if the volunteer accepts.

## Community routes

itch playtesting board: https://itch.io/board/385447/playtesting-
Currently has a mix of tabletop and digital game requests. Read the board template
and state HTML5/Windows-browser prototype clearly; don't assume every reader is a
videogame tester. A post needs a working free playable link.

r/playmygame moderator guidance:
https://www.reddit.com/r/playmygame/comments/1eg08dh/
Requires a freely playable game; recheck current rules before posting and meet
reciprocal-feedback requirements. A forum suggestion is not actual recruitment.

## Ready invitation draft

I'm Douglas Bot, working with Jonathan Sirrine on Whispering Stones, a development
mystery RPG prototype. Would you be interested in a free 15–20 minute Windows
browser playtest? We need candid feedback on starting a new game, moving around,
finding the library, talking to NPCs and loading a checkpoint. The campaign is
unfinished; we are not asking for a positive review. Local AI is optional and the
explicit `/evidence` request can collect witness clues without AI; the full mystery remains unfinished. We will supply a verified build/link and
known limitations before the session. No recording is necessary. Please tell us
if that scope fits; no account credentials or personal documents are needed.

Do not send this with a fake or inaccessible link. For an initial cold-play test,
avoid telling the tester where the library is until they get stuck.

## First three sessions

Aim for one unfamiliar Windows browser user, one regular RPG player, and one user
without local AI. These are recruiting targets, not acquired participants.

1. Record exact build SHA256, browser/version, OS, AI mode and date. No real name
   required. Ask for a short written report; screen recording is optional.
2. Start New Game without developer-console commands. Ask what they think their
   goal is and whether they can move within 60 seconds.
3. Let them explore for five minutes. Record whether they find the library, any
   stuck routes, unexpected scene returns, unreadable UI or missing assets.
4. Try quick speech (Space, text, Enter; Escape closes). Note clarity, response
   delay, failures and whether the player understands the AI/fallback difference.
5. Follow PROTOTYPE-INVESTIGATION.md for the explicit three-witness route. After
   collecting the photo/library clue, wait for autosave, reload and Load Game. Check
   actual inventory and position. No synthetic save or console-awarded clues.
6. Return between town/library and repeat a conversation. Start another New Game
   and check that previous inventory/evidence is absent.
7. Ask: what was confusing, what worked, what would make you return? Would you
   voluntarily play more? Do not request a positive public rating or testimonial.

## Report template

Build/hash:
Browser/version, OS, AI mode:
Start/movement success:
Library found unaided? Time/help needed:
Conversation observations and delay:
Checkpoint path actually exercised:
Reproduction steps for each blocker:
What goal did you understand?
Most confusing / most enjoyable moment:
Would you play again? Why?

Campaign finish rate is currently not measurable: no supported normal ending path
has been demonstrated. Invitations and automated suite counts are not human QA.
