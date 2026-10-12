import { InventoryItem, InventorySystem } from './InventorySystem';

export function investigationObjective(items: InventoryItem[]): string {
  const ids = new Set(items.map(item => item.id));
  if (!ids.has('mayas_photo') && !ids.has("Maya's Photo")) return 'meet_grace';
  if (!ids.has('library_clue')) return 'investigate_library';
  if (!ids.has('school_clue')) return 'interview_teacher';
  return 'evidence_complete';
}

export function saveEvidenceCheckpoint(scene: any): boolean {
  const player = scene.gameManager.entityManager.getPlayer();
  if (!player) return false;
  const items = InventorySystem.getInstance().getInventory(player.id);
  const objective = investigationObjective(items);
  try {
    localStorage.setItem('whispering_stones_save', JSON.stringify({
      currentScene: scene.scene?.key || 'NewTownScene',
      playerPosition: player.getPosition(), playerInventory: items,
      gameProgress: { hasPhoto: items.some(item => item.id === 'mayas_photo' || item.id === "Maya's Photo"), currentObjective: objective },
      timestamp: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('🏘️ Auto-save failed; progress was not saved', error);
    return false;
  }
}

/** Scene-owned timers stop on shutdown. Never mark a failed write as saved. */
export function watchEvidenceCheckpoint(scene: any, save = () => saveEvidenceCheckpoint(scene)): void {
  let savedInventory: string | undefined;
  const poll = () => {
    const player = scene.gameManager.entityManager.getPlayer();
    const items = player ? InventorySystem.getInstance().getInventory(player.id) : [];
    const fingerprint = JSON.stringify(items);
    let delay = 2000;
    if (player && (items.length || savedInventory !== undefined) && fingerprint !== savedInventory) {
      if (save()) savedInventory = fingerprint;
      else delay = 30000;
    }
    scene.time.delayedCall(delay, poll);
  };
  scene.time.delayedCall(5000, poll);
}
