const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertPhotoConsistency } = require('./checkpoint-invariants.cjs');
const checkpoint = (ids, hasPhoto) => ({ playerInventory: ids.map(id => ({ id })), gameProgress: { hasPhoto } });
test('absent evidence cannot be recorded as acquired', () => {
  assert.throws(() => assertPhotoConsistency(checkpoint([], true)), /disagrees/);
  assert.throws(() => assertPhotoConsistency(checkpoint(['smoke-evidence'], true)), /disagrees/);
  assert.doesNotThrow(() => assertPhotoConsistency(checkpoint([], false)));
});
test('canonical and legacy photo IDs require an acquired flag', () => {
  for (const id of ['photo', "Maya's Photo"]) {
    assert.doesNotThrow(() => assertPhotoConsistency(checkpoint([id], true)));
    assert.throws(() => assertPhotoConsistency(checkpoint([id], false)), /disagrees/);
  }
});
test('missing inventory or progress cannot silently pass', () => {
  assert.throws(() => assertPhotoConsistency({}), /array/);
  assert.throws(() => assertPhotoConsistency({ playerInventory: [] }), /disagrees/);
  assert.throws(() => assertPhotoConsistency(checkpoint([], 'false')), /disagrees/);
});
const { auditCheckpointEvidence } = require('./audit-checkpoint-evidence.cjs');
test('saved passing reports can still contain two inconsistent checkpoints', () => {
  const report = { status: 'passed', checks: [
    { name: 'town checkpoint reload', status: 'passed', detail: checkpoint(['smoke-evidence'], true) },
    { name: 'new game clears a loaded checkpoint', status: 'passed', detail: { saved: checkpoint([], true) } }
  ] };
  const audit = auditCheckpointEvidence(report);
  assert.equal(audit.executionPerformed, false);
  assert.equal(audit.status, 'inconsistent');
  assert.equal(audit.findings.filter(f => f.status === 'inconsistent').length, 2);
});
test('missing, duplicate and failed original checks remain unverified', () => {
  const check = { name: 'town checkpoint reload', status: 'passed', detail: checkpoint([], false) };
  for (const checks of [[], [check, check], [{ ...check, status: 'failed' }]]) {
    assert.equal(auditCheckpointEvidence({ checks }).status, 'unverified');
  }
});
test('both consistent saved checkpoints produce a narrowly scoped result', () => {
  assert.equal(auditCheckpointEvidence({ status: 'passed', checks: [
    { name: 'town checkpoint reload', status: 'passed', detail: checkpoint(['photo'], true) },
    { name: 'new game clears a loaded checkpoint', status: 'passed', detail: { saved: checkpoint([], false) } }
  ] }).status, 'consistent');
});
