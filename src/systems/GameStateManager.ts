export enum GameFlag {
    // Chapter 1 - First Disappearance
    MAYA_MISSING = "maya_missing",
    MEDICAL_RECORDS_ACCESSED = "medical_records_accessed",
    
    // Chapter 2 - Secret Network
    SECRET_PASSPHRASE_LEARNED = "secret_passphrase_learned",
    MUSEUM_BASEMENT_UNLOCKED = "museum_basement_unlocked",
    
    // Chapter 3 - Deeper Investigation
    RITUAL_TIMELINE_DISCOVERED = "ritual_timeline_discovered",
    SOCIETY_MEMBERS_IDENTIFIED = "society_members_identified",
    
    // Chapter 4 - Conspiracy
    SHERIFF_EXPOSED = "sheriff_exposed",
    CAVE_LOCATION_KNOWN = "cave_location_known",
    
    // Chapter 5 - Ancient Truth
    ENTITY_NATURE_UNDERSTOOD = "entity_nature_understood",
    
    // Chapter 6 - Final Confrontation
    RITUAL_IN_PROGRESS = "ritual_in_progress"
}

export class GameStateManager {
    private static instance: GameStateManager;
    private flags: Set<GameFlag> = new Set();
    private currentChapter: number = 1;
    
    static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }
    
    setFlag(flag: GameFlag): void {
        this.flags.add(flag);
        this.checkChapterProgression();
    }
    
    hasFlag(flag: GameFlag): boolean {
        return this.flags.has(flag);
    }
    
    getCurrentChapter(): number {
        return this.currentChapter;
    }
    
    private checkChapterProgression(): void {
        // Chapter 2: Secret Network
        if (this.hasFlag(GameFlag.MEDICAL_RECORDS_ACCESSED) && this.currentChapter === 1) {
            this.currentChapter = 2;
            console.log("📖 Story Progress: Chapter 2 - The Secret Network");
        }
        
        // Chapter 3: Deeper Investigation  
        if (this.hasFlag(GameFlag.MUSEUM_BASEMENT_UNLOCKED) && this.currentChapter === 2) {
            this.currentChapter = 3;
            console.log("📖 Story Progress: Chapter 3 - Deeper Investigation");
        }
        
        // Chapter 4: Conspiracy
        if (this.hasFlag(GameFlag.SOCIETY_MEMBERS_IDENTIFIED) && this.currentChapter === 3) {
            this.currentChapter = 4;
            console.log("📖 Story Progress: Chapter 4 - The Conspiracy Deepens");
        }
        
        // Chapter 5: Ancient Truth
        if (this.hasFlag(GameFlag.CAVE_LOCATION_KNOWN) && this.currentChapter === 4) {
            this.currentChapter = 5;
            console.log("📖 Story Progress: Chapter 5 - The Ancient Truth");
        }
        
        // Chapter 6: Final Confrontation
        if (this.hasFlag(GameFlag.ENTITY_NATURE_UNDERSTOOD) && this.currentChapter === 5) {
            this.currentChapter = 6;
            console.log("📖 Story Progress: Chapter 6 - Race Against Time");
        }
    }
    
    // Check if location should be accessible
    isLocationUnlocked(location: string): boolean {
        switch (location) {
            case 'hospital_database':
                return this.hasFlag(GameFlag.MEDICAL_RECORDS_ACCESSED);
            case 'museum_basement':
                return this.hasFlag(GameFlag.MUSEUM_BASEMENT_UNLOCKED);
            case 'cave_exterior':
                return this.hasFlag(GameFlag.CAVE_LOCATION_KNOWN);
            case 'cave_interior':
                return this.hasFlag(GameFlag.ENTITY_NATURE_UNDERSTOOD);
            default:
                return true; // Basic locations always accessible
        }
    }
    
    // Get NPC behavior context based on story state
    getNPCContext(npcName: string): any {
        const context: any = {
            chapter: this.currentChapter,
            trustLevel: 'neutral'
        };
        
        // Sheriff Martinez - becomes hostile when exposed
        if (npcName.toLowerCase().includes('sheriff') || npcName.toLowerCase().includes('martinez')) {
            if (this.hasFlag(GameFlag.SHERIFF_EXPOSED)) {
                context.trustLevel = 'hostile';
                context.behavior = 'evasive';
                context.goals = ['Hide evidence', 'Mislead investigation', 'Protect society members'];
            } else if (this.hasFlag(GameFlag.SOCIETY_MEMBERS_IDENTIFIED)) {
                context.trustLevel = 'suspicious';
                context.behavior = 'defensive';
                context.goals = ['Avoid suspicion', 'Gather information about investigation'];
            } else {
                context.goals = ['Investigate disappearance', 'Maintain order', 'Help newcomers'];
            }
        }
        
        // Dr. Thompson - becomes ally when coercion revealed
        if (npcName.toLowerCase().includes('thompson') || npcName.toLowerCase().includes('doctor')) {
            if (this.hasFlag(GameFlag.CAVE_LOCATION_KNOWN)) {
                context.trustLevel = 'ally';
                context.behavior = 'helpful';
                context.goals = ['Reveal truth about coercion', 'Help investigation', 'Protect patients'];
            } else {
                context.goals = ['Research unusual symptoms', 'Seek collaboration', 'Maintain medical ethics'];
            }
        }
        
        return context;
    }
}