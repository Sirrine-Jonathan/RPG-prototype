// Read-only reanalysis of a saved harness report. This never launches a browser.
const fs = require('node:fs');
const { assertPhotoConsistency } = require('./checkpoint-invariants.cjs');
function auditCheckpointEvidence(report) {
  const findings = [];
  const names = ['town checkpoint reload', 'new game clears a loaded checkpoint'];
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
      findings.push({ name, status: 'consistent' });
    } catch (error) {
      findings.push({ name, status: 'inconsistent', reason: error.message });
    }
  }
  return { executionPerformed: false, originalStatus: report.status,
    status: findings.some(f => f.status === 'inconsistent') ? 'inconsistent' :
      findings.every(f => f.status === 'consistent') ? 'consistent' : 'unverified', findings,
    limitations: ['Reanalysis of saved JSON only; consistency does not establish gameplay, ownership, source provenance or story completion.'] };
}
module.exports = { auditCheckpointEvidence };
if (require.main === module) {
  try {
    const result = auditCheckpointEvidence(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'consistent') process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
