import { GameStateManager, GameFlag } from './GameStateManager';

export class SceneManager {
    private static instance: SceneManager;
    private gameState: GameStateManager;
    
    static getInstance(): SceneManager {
        if (!SceneManager.instance) {
            SceneManager.instance = new SceneManager();
        }
        return SceneManager.instance;
    }
    
    constructor() {
        this.gameState = GameStateManager.getInstance();
    }
    
    // Trigger story events based on player actions
    triggerStoryEvent(eventType: string, context?: any): void {
        console.log(`🎭 Story Event: ${eventType}`, context);
        
        switch (eventType) {
            case 'medical_records_found':
                this.gameState.setFlag(GameFlag.MEDICAL_RECORDS_ACCESSED);
                this.showStoryMessage("You've discovered a pattern of memory loss cases. Something strange is happening in this town.");
                break;
                
            case 'secret_passphrase_learned':
                this.gameState.setFlag(GameFlag.SECRET_PASSPHRASE_LEARNED);
                this.showStoryMessage("'The stones that whisper' - this phrase might unlock something at the museum.");
                break;
                
            case 'museum_basement_accessed':
                this.gameState.setFlag(GameFlag.MUSEUM_BASEMENT_UNLOCKED);
                this.showStoryMessage("A hidden chamber beneath the museum reveals the town's dark secret.");
                break;
                
            case 'ritual_timeline_found':
                this.gameState.setFlag(GameFlag.RITUAL_TIMELINE_DISCOVERED);
                this.showStoryMessage("The ritual is in 3 days! You must act quickly to stop whatever they're planning.");
                break;
                
            case 'sheriff_evidence_found':
                this.gameState.setFlag(GameFlag.SHERIFF_EXPOSED);
                this.showStoryMessage("Sheriff Martinez has been hiding evidence. He's part of the conspiracy!");
                break;
                
            case 'cave_location_revealed':
                this.gameState.setFlag(GameFlag.CAVE_LOCATION_KNOWN);
                this.showStoryMessage("The ancient cave holds the key to everything. The ritual will take place there.");
                break;
        }
    }
    
    private showStoryMessage(message: string): void {
        // Create a simple story notification
        console.log(`📖 STORY: ${message}`);
        
        // TODO: Show in-game notification UI
        // For now, just log to console
    }
    
    // Get available scene transitions based on story progress
    getAvailableScenes(): string[] {
        const scenes = ['town_overworld', 'police_station', 'hospital', 'museum'];
        
        if (this.gameState.isLocationUnlocked('museum_basement')) {
            scenes.push('museum_basement');
        }
        
        if (this.gameState.isLocationUnlocked('cave_exterior')) {
            scenes.push('cave_exterior');
        }
        
        if (this.gameState.isLocationUnlocked('cave_interior')) {
            scenes.push('cave_interior');
        }
        
        return scenes;
    }
    
    // Check if player should be guided to specific location
    getStoryGuidance(): string | null {
        const chapter = this.gameState.getCurrentChapter();
        
        switch (chapter) {
            case 1:
                if (!this.gameState.hasFlag(GameFlag.MEDICAL_RECORDS_ACCESSED)) {
                    return "Visit the hospital to investigate Maya's disappearance.";
                }
                break;
                
            case 2:
                if (!this.gameState.hasFlag(GameFlag.SECRET_PASSPHRASE_LEARNED)) {
                    return "Talk to townspeople about any secret groups or clubs.";
                }
                break;
                
            case 3:
                if (!this.gameState.hasFlag(GameFlag.SOCIETY_MEMBERS_IDENTIFIED)) {
                    return "Search the museum basement for more information about the secret society.";
                }
                break;
                
            case 4:
                if (!this.gameState.hasFlag(GameFlag.SHERIFF_EXPOSED)) {
                    return "Investigate the police station's evidence locker.";
                }
                break;
                
            case 5:
                if (!this.gameState.hasFlag(GameFlag.ENTITY_NATURE_UNDERSTOOD)) {
                    return "Explore the cave to understand what the society is trying to awaken.";
                }
                break;
                
            case 6:
                return "Stop the ritual before it's too late!";
        }
        
        return null;
    }
}