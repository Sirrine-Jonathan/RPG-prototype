# Native checkpoint evidence review

The successful Production gameplay run [38182600934](https://github.com/Sirrine-Jonathan/RPG-prototype/actions/runs/38182600934)
executed Linux Chromium on main commit bcba8574142c3a49fedc10c6498f36dfc9421fdf.
Its seven checks are smoke coverage, not a human playthrough or a complete mystery.
The saved report contains no uncaught page errors or missing build assets, and
contains eight console errors associated with blocked AI requests.

Two saved checkpoints contain inconsistent photo flags: the reload fixture has
only synthetic smoke-evidence and the New Game save has an empty inventory, yet
both record gameProgress.hasPhoto=true. The original harness did not assert that
flag. This is a finding from actual archived native evidence, not a fresh native run.

This separate test branch adds assertPhotoConsistency, recognizing canonical
photo and legacy Maya's Photo IDs, to both checkpoint checks. Each failed check
is recorded. Both independently reloaded checkpoint checks may finish despite an
assertion failure, and the final status/exit code still fails if either failed.
Earlier startup/portal failures continue to stop dependent gameplay checks.
Failed checkpoint checks now retain observations captured before their assertions,
including the actual saved inventory/progress. Failures before observation do not
invent a saved state. A failure still fails the overall run; retained detail is
diagnostic evidence, not a passing result.

Two additional independent reload checks cover canonical `photo` and legacy
`Maya's Photo` inventories. Their fixtures deliberately contain a stale false
photo flag. The re-saved inventory, position and scene must match the fixture,
and the photo flag must agree with inventory. New Game runs after these photo
loads, so its empty-inventory assertion also checks clearing previously loaded
photo evidence. These are synthetic fixtures, not NPC photo acquisition.
No game-source repair or PR #3 change is included. Main is expected to fail these
new assertions; existing proposed photo repairs have not been natively validated
by this branch.

Run focused dependency-free regressions:

    node --test scripts/checkpoint-invariants.node.cjs scripts/record-gameplay-check.node.cjs

Read-only audit of a saved report (exit 1 on inconsistent/unverified):

    node scripts/audit-checkpoint-evidence.cjs path/to/results.json

Require the positive reload checks as well for a new report:

    node scripts/audit-checkpoint-evidence.cjs path/to/results.json --require-photo-reloads

This expanded mode also requires the corresponding photo ID in each positive
checkpoint. Older reports lack those checks and cannot establish this coverage.
The original archived report still has two contradictions; its two missing
positive checks are separately unverified. The default historical audit remains
limited to the original two checkpoints. Failed original checks remain unverified
even when their diagnostic saved data is retained.

The audit requires exactly one originally passing check for each checkpoint.
It never launches a browser and does not prove report provenance or story completion.

The initial branch passed 72 existing Vitest tests, six new Node tests, TypeScript and a
production build locally. The observation/reload follow-up passes eleven focused
Node tests and harness syntax checks. These script-only changes do not alter the
game build. No new native run has occurred. Shared workspace dependencies were linked after the
initial no-dependency attempt failed module resolution. The production build
retains the existing large-chunk warning.

Starting the existing workflow was rejected by automatic approval review:
“Starting or changing GitHub Actions workflows requires owner approval”. An
explicit owner decision is pending; no workflow configuration/auth changes or
alternative trigger have been used. No new native execution is claimed.
