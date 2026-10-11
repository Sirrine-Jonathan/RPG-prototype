export class WinConditionManager {
  private static instance: WinConditionManager;
  private gameWon: boolean = false;
  private requiredEvidence: Set<string> = new Set([
    'mayas_photo',
    'library_clue', 
    'school_clue'
  ]);
  private collectedEvidence: Set<string> = new Set();
  private winOverlay?: HTMLElement;

  static getInstance(): WinConditionManager {
    if (!WinConditionManager.instance) {
      WinConditionManager.instance = new WinConditionManager();
    }
    return WinConditionManager.instance;
  }

  addEvidence(evidenceId: string): void {
    if (!this.requiredEvidence.has(evidenceId)) return;
    this.collectedEvidence.add(evidenceId);
    console.log(`🔍 Evidence collected: ${evidenceId}`);
    this.checkWinCondition();
  }

  private checkWinCondition(): void {
    if (this.gameWon) return;

    const hasAllEvidence = Array.from(this.requiredEvidence).every(
      evidence => this.collectedEvidence.has(evidence)
    );

    if (hasAllEvidence) {
      this.triggerWin();
    }
  }

  private triggerWin(): void {
    this.gameWon = true;
    console.log("🎉 GAME WON! Detective Riley solved Maya's disappearance!");
    
    // Emit win event
    const gameManager = (globalThis as any).gameManager;
    if (gameManager?.eventBus) {
      gameManager.eventBus.emit('game_won', {
        evidence: Array.from(this.collectedEvidence),
        timestamp: Date.now()
      });
    }

    // Show win message
    this.showWinMessage();
  }

  private showWinMessage(): void {
    // Create win overlay
    const winDiv = document.createElement('div');
    winDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      color: white;
      font-size: 24px;
      text-align: center;
    `;
    
    const content = document.createElement('div');
    const heading = document.createElement('h1');
    heading.textContent = '🎉 MYSTERY SOLVED! 🎉';
    const description = document.createElement('p');
    description.textContent = "Detective Riley successfully investigated Maya's disappearance!";
    const evidence = document.createElement('p');
    evidence.textContent = 'Evidence collected: ' + Array.from(this.collectedEvidence).join(', ');
    const button = document.createElement('button');
    button.textContent = 'Continue';
    button.style.cssText = 'margin-top: 20px; padding: 10px 20px; font-size: 16px;';
    button.addEventListener('click', () => winDiv.remove());
    content.append(heading, description, evidence, button);
    winDiv.appendChild(content);
    this.winOverlay?.remove();
    this.winOverlay = winDiv;

    document.body.appendChild(winDiv);
  }

  reset(): void {
    this.collectedEvidence.clear();
    this.gameWon = false;
    this.winOverlay?.remove();
    this.winOverlay = undefined;
  }

  // Checkpoint restoration records state without replaying awards or win events.
  restoreEvidence(evidenceIds: string[]): void {
    this.reset();
    for (const id of evidenceIds) {
      if (this.requiredEvidence.has(id)) this.collectedEvidence.add(id);
    }
    this.gameWon = [...this.requiredEvidence].every(id => this.collectedEvidence.has(id));
  }

  isGameWon(): boolean {
    return this.gameWon;
  }

  getProgress(): { collected: string[], required: string[], percentage: number } {
    const collected = Array.from(this.collectedEvidence);
    const required = Array.from(this.requiredEvidence);
    const percentage = Math.round((collected.length / required.length) * 100);
    
    return { collected, required, percentage };
  }
}
