// @ts-nocheck
import Phaser from 'phaser';
import { SmartNPC } from '../../src/entities/SmartNPC';

class NPCConversationScene extends Phaser.Scene {
    private alice!: SmartNPC;
    private bob!: SmartNPC;
    private conversationActive = false;
    private conversationTopic = '';
    private logEntries: HTMLElement;

    constructor() {
        super({ key: 'NPCConversationScene' });
        this.logEntries = document.getElementById('logEntries')!;
    }

    create() {
        // Create background
        this.add.rectangle(400, 300, 800, 600, 0x34495e);
        
        // Create two NPCs facing each other
        this.alice = new SmartNPC(
            this, 300, 300, 'alice', 'Alice', 
            'Curious and talkative', 'Local shopkeeper who knows everyone in town'
        );
        
        this.bob = new SmartNPC(
            this, 500, 300, 'bob', 'Bob', 
            'Thoughtful and analytical', 'Town historian with deep knowledge of local events'
        );

        // Position them to face each other
        this.alice.sprite.setTint(0xe74c3c); // Red tint for Alice
        this.bob.sprite.setTint(0x2ecc71);   // Green tint for Bob

        // Add labels
        this.add.text(300, 250, 'Alice', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(500, 250, 'Bob', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);

        // Setup controls
        this.setupControls();
        
        // Add instructions
        this.add.text(400, 100, 'NPC-to-NPC Conversation Sandbox', 
            { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
        this.add.text(400, 130, 'Watch two NPCs have a dynamic conversation about various topics', 
            { fontSize: '14px', color: '#bdc3c7' }).setOrigin(0.5);
    }

    private setupControls() {
        document.getElementById('startConversation')?.addEventListener('click', () => {
            this.startConversation();
        });

        document.getElementById('addTopic')?.addEventListener('click', () => {
            this.addRandomTopic();
        });

        document.getElementById('clearLog')?.addEventListener('click', () => {
            this.clearLog();
        });

        const topicInput = document.getElementById('topicInput') as HTMLInputElement;
        topicInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && topicInput.value.trim()) {
                this.conversationTopic = topicInput.value.trim();
                this.startConversation();
                topicInput.value = '';
            }
        });
    }

    private async startConversation() {
        if (this.conversationActive) return;
        
        this.conversationActive = true;
        const topic = this.conversationTopic || this.getRandomTopic();
        
        this.logEntry('SYSTEM', `Starting conversation about: ${topic}`);
        
        // Simulate a multi-turn conversation
        await this.simulateConversation(topic);
        
        this.conversationActive = false;
    }

    private async simulateConversation(topic: string) {
        const conversationStarters = [
            `Hey Bob, what do you think about ${topic}?`,
            `I've been wondering about ${topic} lately.`,
            `Did you hear anything interesting about ${topic}?`
        ];

        const responses = [
            `That's fascinating, Alice. I think ${topic} is quite complex.`,
            `Well, from what I know about ${topic}, there are several perspectives.`,
            `Interesting you mention ${topic}. I've been researching that recently.`
        ];

        const followUps = [
            `Really? Tell me more about your research.`,
            `What perspectives have you considered?`,
            `I hadn't thought about it that way before.`
        ];

        // Alice starts the conversation
        const starter = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
        await this.npcSpeak('Alice', starter);
        
        await this.delay(2000);
        
        // Bob responds
        const response = responses[Math.floor(Math.random() * responses.length)];
        await this.npcSpeak('Bob', response);
        
        await this.delay(2000);
        
        // Alice follows up
        const followUp = followUps[Math.floor(Math.random() * followUps.length)];
        await this.npcSpeak('Alice', followUp);
        
        await this.delay(2000);
        
        // Bob concludes
        await this.npcSpeak('Bob', `I think we both learned something new about ${topic} today.`);
    }

    private async npcSpeak(npcName: string, message: string) {
        const npc = npcName === 'Alice' ? this.alice : this.bob;
        
        // Show speech bubble (if available)
        if (npc.speechBubble) {
            npc.speechBubble.show(message, 3000);
        }
        
        // Log the conversation
        this.logEntry(npcName, message);
        
        // Add some animation
        this.tweens.add({
            targets: npc.sprite,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            yoyo: true,
            ease: 'Power2'
        });
    }

    private logEntry(speaker: string, message: string) {
        const entry = document.createElement('div');
        entry.className = `conversation-entry ${speaker === 'Alice' ? 'npc-alice' : speaker === 'Bob' ? 'npc-bob' : ''}`;
        entry.innerHTML = `<strong>${speaker}:</strong> ${message}`;
        this.logEntries.appendChild(entry);
        
        // Auto-scroll to bottom
        const log = document.getElementById('conversationLog')!;
        log.scrollTop = log.scrollHeight;
    }

    private addRandomTopic() {
        this.conversationTopic = this.getRandomTopic();
        const input = document.getElementById('topicInput') as HTMLInputElement;
        input.value = this.conversationTopic;
    }

    private getRandomTopic(): string {
        const topics = [
            'the weather patterns this season',
            'the new merchant who arrived yesterday',
            'the strange lights seen near the forest',
            'the upcoming harvest festival',
            'the old legends about the town',
            'the recent changes in trade routes',
            'the mysterious sounds from the caves',
            'the behavior of local wildlife',
            'the condition of the town roads',
            'the stories travelers have been telling'
        ];
        
        return topics[Math.floor(Math.random() * topics.length)];
    }

    private clearLog() {
        this.logEntries.innerHTML = '';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize Phaser game
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2c3e50',
    scene: NPCConversationScene,
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
};

new Phaser.Game(config);
