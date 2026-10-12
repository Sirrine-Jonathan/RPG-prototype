const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordGameplayCheck } = require('./record-gameplay-check.cjs');

test('failed checkpoint retains saved contradiction and following independent check runs', async () => {
  const checks = [];
  const saved = { playerInventory: [], gameProgress: { hasPhoto: true } };
  await recordGameplayCheck(checks, 'checkpoint', async observe => {
    observe(saved);
    assert.equal(saved.gameProgress.hasPhoto, false);
  }, true);
  await recordGameplayCheck(checks, 'next checkpoint', async () => 'next');
  assert.equal(checks[0].status, 'failed');
  assert.deepEqual(checks[0].detail, saved);
  assert.equal(checks[1].status, 'passed');
});
test('dependent failure retains evidence and still aborts with original error', async () => {
  const checks = [];
  const error = new Error('dependent failure');
  await assert.rejects(recordGameplayCheck(checks, 'dependent', async observe => {
    observe({ scene: 'wrong-scene' });
    throw error;
  }), thrown => thrown === error);
  assert.deepEqual(checks, [{ name: 'dependent', status: 'failed', message: error.message,
    detail: { scene: 'wrong-scene' } }]);
});
test('startup failure does not invent an observation', async () => {
  const checks = [];
  await recordGameplayCheck(checks, 'startup', async () => { throw new Error('not loaded'); }, true);
  assert.equal(Object.hasOwn(checks[0], 'detail'), false);
});
test('successful check stores returned acceptance evidence', async () => {
  const checks = [];
  await recordGameplayCheck(checks, 'passed', async observe => {
    observe({ intermediate: true });
    return { completed: true };
  });
  assert.deepEqual(checks, [{ name: 'passed', status: 'passed', detail: { completed: true } }]);
});
