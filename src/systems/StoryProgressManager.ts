export interface StoryProgress {
  currentChapter: number;
  completedPuzzles: Set<string>;
  unlockedLocations: Set<string>;
  discoveredClues: Set<string>;
}

export class StoryProgressManager {
  private static instance: StoryProgressManager;
  private progress: StoryProgress;

  private constructor() {
    this.progress = {
      currentChapter: 1,
      completedPuzzles: new Set(),
      unlockedLocations: new Set(['police_station', 'hospital', 'school', 'grocery_store', 'museum_lobby']),
      discoveredClues: new Set()
    };
  }

  static getInstance(): StoryProgressManager {
    if (!StoryProgressManager.instance) {
      StoryProgressManager.instance = new StoryProgressManager();
    }
    return StoryProgressManager.instance;
  }

  completePuzzle(puzzleId: string): void {
    this.progress.completedPuzzles.add(puzzleId);
    this.checkChapterProgression();
  }

  unlockLocation(locationId: string): void {
    this.progress.unlockedLocations.add(locationId);
  }

  isLocationUnlocked(locationId: string): boolean {
    return this.progress.unlockedLocations.has(locationId);
  }

  getCurrentChapter(): number {
    return this.progress.currentChapter;
  }

  private checkChapterProgression(): void {
    const puzzles = this.progress.completedPuzzles;
    
    if (puzzles.has('medical_records') && this.progress.currentChapter === 1) {
      this.progress.currentChapter = 2;
      this.unlockLocation('museum_basement');
    }
    
    if (puzzles.has('secret_society') && this.progress.currentChapter === 2) {
      this.progress.currentChapter = 3;
    }
    
    if (puzzles.has('atm_code') && puzzles.has('school_lab') && this.progress.currentChapter === 3) {
      this.progress.currentChapter = 4;
    }
    
    if (puzzles.has('evidence_locker') && puzzles.has('security_footage') && this.progress.currentChapter === 4) {
      this.progress.currentChapter = 5;
      this.unlockLocation('cave_exterior');
    }
    
    if (puzzles.has('symbol_translation') && this.progress.currentChapter === 5) {
      this.progress.currentChapter = 6;
      this.unlockLocation('cave_interior');
    }
  }
}
