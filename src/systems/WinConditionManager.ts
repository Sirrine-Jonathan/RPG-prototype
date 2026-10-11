export class WinConditionManager {
  private static instance: WinConditionManager;
  private gameWon: boolean = false;
  private requiredEvidence: Set<string> = new Set([
    'mayas_photo',
    'library_clue', 
    'school_clue'
  ]);
  private collectedEvidence: Set<string> = new Set();

  static getInstance(): WinConditionManager {
    if (!WinConditionManager.instance) {
      WinConditionManager.instance = new WinConditionManager();
    }
    return WinConditionManager.instance;
  }

  addEvidence(evidenceId: string): void {
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
    
    winDiv.innerHTML = `
      <div>
        <h1>🎉 MYSTERY SOLVED! 🎉</h1>
        <p>Detective Riley successfully investigated Maya's disappearance!</p>
        <p>Evidence collected: ${Array.from(this.collectedEvidence).join(', ')}</p>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">
          Continue
        </button>
      </div>
    `;
    
    document.body.appendChild(winDiv);
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
