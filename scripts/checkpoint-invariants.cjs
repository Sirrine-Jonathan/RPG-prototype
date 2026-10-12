const assert = require('node:assert/strict');

// This checks saved evidence consistency, not story completion or valid ownership.
function assertPhotoConsistency(saved) {
  assert.ok(Array.isArray(saved?.playerInventory), 'Checkpoint inventory must be an array');
  const hasPhoto = saved.playerInventory.some(item =>
    item?.id === 'photo' || item?.id === "Maya's Photo");
  assert.equal(saved.gameProgress?.hasPhoto, hasPhoto,
    'Checkpoint photo flag disagrees with saved inventory');
}
module.exports = { assertPhotoConsistency };
