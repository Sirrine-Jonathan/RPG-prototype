// Read-only reanalysis of a saved harness report. This never launches a browser.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { assertPhotoConsistency } = require('./checkpoint-invariants.cjs');
function auditCheckpointEvidence(report, { requirePhotoReloads = false } = {}) {
  const findings = [];
  const names = ['town checkpoint reload', 'new game clears a loaded checkpoint'];
  if (requirePhotoReloads) names.push('photo checkpoint reload: photo', "photo checkpoint reload: Maya's Photo");
  for (const name of names) {
    const matches = report.checks?.filter(check => check.name === name) || [];
    if (matches.length !== 1) {
      findings.push({ name, status: 'unverified', reason: 'Expected exactly one saved check' });
      continue;
    }
    const check = matches[0];
    if (check.status !== 'passed') {
      findings.push({ name, status: 'unverified', reason: 'Original check did not pass' });
      continue;
    }
    const saved = name === names[0] ? check.detail : check.detail?.saved;
    try {
      assertPhotoConsistency(saved);
      if (name.startsWith('photo checkpoint reload: ')) {
        const id = name.slice('photo checkpoint reload: '.length);
        assert.ok(saved.playerInventory.some(item => item?.id === id), 'Expected photo ID missing from saved inventory');
      }
      findings.push({ name, status: 'consistent' });
    } catch (error) {
      findings.push({ name, status: 'inconsistent', reason: error.message });
    }
  }
  return { executionPerformed: false, originalStatus: report.status, requirePhotoReloads,
    status: findings.some(f => f.status === 'inconsistent') ? 'inconsistent' :
      findings.every(f => f.status === 'consistent') ? 'consistent' : 'unverified', findings,
    limitations: ['Reanalysis of saved JSON only; consistency does not establish gameplay, ownership, source provenance or story completion.'] };
}
module.exports = { auditCheckpointEvidence };
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length < 1 || args.length > 2 || (args[1] && args[1] !== '--require-photo-reloads')) {
      throw new Error('Usage: node audit-checkpoint-evidence.cjs results.json [--require-photo-reloads]');
    }
    const result = auditCheckpointEvidence(JSON.parse(fs.readFileSync(args[0], 'utf8')),
      { requirePhotoReloads: args[1] === '--require-photo-reloads' });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'consistent') process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
