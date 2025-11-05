import { Scene } from 'phaser';
import { SmartNPC } from '../entities/SmartNPC';
import { AIService } from '../services/AIService';

interface TownMessage {
    type: 'speech' | 'action';
    speaker: string;
    content: string;
    timestamp: number;
}

export class ChatInterface {
    private static instance: ChatInterface;
    private scene: Scene;
    private container: HTMLDivElement;
    private header: HTMLDivElement;
    private tabsContainer: HTMLDivElement;
    private chatTab: HTMLButtonElement;
    private inventoryTab: HTMLButtonElement;
    private minimizeButton: HTMLButtonElement;
    private messageArea: HTMLDivElement;
    private inventoryArea: HTMLDivElement;
    private inputArea: HTMLDivElement;
    private textarea: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;
    private aiService: AIService;
    
    private townMessages: TownMessage[] = [];
    private activeTab: 'chat' | 'inventory' = 'chat';
    private isMinimized: boolean = false;
    private nearbyNPCs: Set<string> = new Set();

    constructor(scene: Scene) {
        if (ChatInterface.instance) {
            ChatInterface.instance.scene = scene;
            return ChatInterface.instance;
        }
        
        this.scene = scene;
        this.aiService = AIService.getInstance();
        this.createUI();
        this.setupEventListeners();
        
        // Listen for global town speech
        this.scene.events.on('town-speech', this.onTownSpeech, this);
        
        // Listen for object interactions
        this.scene.events.on('town-action', this.onTownAction, this);
        
        ChatInterface.instance = this;
    }

    static getInstance(scene?: Scene): ChatInterface {
        if (!ChatInterface.instance && scene) {
            new ChatInterface(scene);
        }
        return ChatInterface.instance;
    }

    private createUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 380px;
            height: 450px;
            background: linear-gradient(145deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 20, 0.95));
            border: 2px solid #555;
            border-radius: 12px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
        `;

        // Header with tabs and minimize button
        this.header = document.createElement('div');
        this.header.style.cssText = `
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // Tabs container
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        this.chatTab = document.createElement('button');
        this.chatTab.style.cssText = `
            background: #4a90e2;
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        this.chatTab.textContent = 'Chat';

        this.inventoryTab = document.createElement('button');
        this.inventoryTab.style.cssText = `
            background: #666;
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        this.inventoryTab.textContent = 'Inventory';

        this.minimizeButton = document.createElement('button');
        this.minimizeButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        this.minimizeButton.textContent = '−';

        this.tabsContainer.appendChild(this.chatTab);
        this.tabsContainer.appendChild(this.inventoryTab);
        this.header.appendChild(this.tabsContainer);
        this.header.appendChild(this.minimizeButton);

        // Message area - always visible for town chat
        this.messageArea = document.createElement('div');
        this.messageArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background: rgba(20, 20, 20, 0.8);
        `;

        // Input area - always visible
        this.inputArea = document.createElement('div');
        this.inputArea.style.cssText = `
            padding: 10px;
            border-top: 1px solid #555;
        `;

        // Textarea
        this.textarea = document.createElement('textarea');
        this.textarea.style.cssText = `
            width: 100%;
            height: 70px;
            background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
            border: 2px solid #444;
            border-radius: 8px;
            color: white;
            padding: 12px;
            resize: none;
            font-size: 14px;
            font-family: inherit;
            box-sizing: border-box;
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
            outline: none;
        `;
        this.textarea.placeholder = 'Type your message to the town...';

        // Send button
        this.sendButton = document.createElement('button');
        this.sendButton.style.cssText = `
            margin-top: 12px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #4a90e2, #357abd);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            font-family: inherit;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        `;
        this.sendButton.textContent = 'Send Message';

        // Inventory area
        this.inventoryArea = document.createElement('div');
        this.inventoryArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: none;
        `;

        // Assemble UI
        this.inputArea.appendChild(this.textarea);
        this.inputArea.appendChild(this.sendButton);
        
        this.container.appendChild(this.header);
        this.container.appendChild(this.messageArea);
        this.container.appendChild(this.inventoryArea);
        this.container.appendChild(this.inputArea);
        
        document.body.appendChild(this.container);
        
        // Add CSS animations
        if (!document.getElementById('chat-animations')) {
            const style = document.createElement('style');
            style.id = 'chat-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.updateTownChat();
        this.updateInventoryArea();
    }

    private setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            // Prevent Phaser from capturing space key when typing
            if (e.key === ' ') {
                e.stopPropagation();
            }
        });
        
        // Minimize/maximize functionality
        this.minimizeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize();
        });
        
        this.header.addEventListener('click', () => {
            if (this.isMinimized) {
                this.toggleMinimize();
            }
        });
        
        // Tab switching
        this.chatTab.addEventListener('click', () => this.switchTab('chat'));
        this.inventoryTab.addEventListener('click', () => this.switchTab('inventory'));
        
        // Also prevent space key capture on focus
        this.textarea.addEventListener('focus', () => {
            this.textarea.style.borderColor = '#4a90e2';
            this.textarea.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.2)';
            // Disable Phaser keyboard input while typing
            if (this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = false;
            }
        });
        
        this.textarea.addEventListener('blur', () => {
            this.textarea.style.borderColor = '#444';
            this.textarea.style.boxShadow = 'none';
            // Re-enable Phaser keyboard input when done typing
            if (this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = true;
            }
        });

        // Send button hover effects
        this.sendButton.addEventListener('mouseenter', () => {
            this.sendButton.style.transform = 'translateY(-2px)';
            this.sendButton.style.boxShadow = '0 6px 16px rgba(74, 144, 226, 0.4)';
        });

        this.sendButton.addEventListener('mouseleave', () => {
            this.sendButton.style.transform = 'translateY(0)';
            this.sendButton.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
        });
    }

    private async sendMessage() {
        const message = this.textarea.value.trim();
        if (!message) return;

        // Add to town chat
        this.townMessages.push({
            type: 'speech',
            speaker: 'Player',
            content: message,
            timestamp: Date.now()
        });

        console.log(`📨 CONVO Player speaks: "${message}"`);
        
        // Show player speech bubble
        this.showPlayerSpeechBubble(message);

        // Get player position from current scene
        const playerPos = this.getPlayerPosition();
        
        // Emit global town speech event
        this.scene.events.emit('town-speech', {
            speaker: "Player",
            speakerId: "player", 
            message: message,
            position: playerPos,
            timestamp: Date.now()
        });

        this.textarea.value = '';
        this.updateTownChat();
    }

    private onTownAction = (data: { actor: string; action: string; timestamp: number }) => {
        this.townMessages.push({
            type: 'action',
            speaker: data.actor,
            content: data.action,
            timestamp: data.timestamp
        });
        
        this.updateTownChat();
    };

    private onTownSpeech = (data: { speaker: string; speakerId: string; message: string; position: { x: number; y: number }; timestamp: number }) => {
        // Don't add player messages twice
        if (data.speakerId === 'player') return;
        
        this.townMessages.push({
            type: 'speech',
            speaker: data.speaker,
            content: data.message,
            timestamp: data.timestamp
        });
        
        this.updateTownChat();
    };

    private updateTownChat() {
        this.messageArea.innerHTML = '<h4 style="color: white; margin: 0 0 15px 0; text-align: center; border-bottom: 1px solid #555; padding-bottom: 8px;">Town Chat</h4>';

        if (this.townMessages.length === 0) {
            const noMessages = document.createElement('p');
            noMessages.style.cssText = 'color: #888; font-style: italic; text-align: center; margin-top: 50px;';
            noMessages.textContent = 'No messages yet. Start speaking to the town!';
            this.messageArea.appendChild(noMessages);
            return;
        }

        // Show only last 50 messages for performance
        const recentMessages = this.townMessages.slice(-50);

        recentMessages.forEach((msg, index) => {
            const messageDiv = document.createElement('div');
            const isPlayer = msg.speaker === 'Player';
            
            messageDiv.style.cssText = `
                margin-bottom: 12px;
                padding: 8px 12px;
                border-radius: 12px;
                max-width: 85%;
                position: relative;
                ${isPlayer ? 
                    'background: linear-gradient(135deg, #4a90e2, #357abd); color: white; margin-left: auto; box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);' : 
                    msg.type === 'action' ?
                    'background: #2a2a2a; color: #ccc; font-style: italic; margin: 8px auto; text-align: center; border-left: 3px solid #666;' :
                    'background: linear-gradient(135deg, #333, #444); color: white; margin-right: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);'
                }
                animation: slideIn 0.3s ease-out;
            `;

            if (msg.type === 'action') {
                messageDiv.textContent = `${msg.content}`;
            } else {
                // Speaker name
                const speakerDiv = document.createElement('div');
                speakerDiv.style.cssText = `
                    font-size: 11px; 
                    opacity: 0.8; 
                    margin-bottom: 4px; 
                    font-weight: bold;
                    ${isPlayer ? 'text-align: right;' : 'text-align: left;'}
                `;
                speakerDiv.textContent = isPlayer ? 'You' : msg.speaker;

                // Message content
                const contentDiv = document.createElement('div');
                contentDiv.style.cssText = 'line-height: 1.4; word-wrap: break-word;';
                contentDiv.textContent = msg.content;

                // Timestamp
                const timeDiv = document.createElement('div');
                timeDiv.style.cssText = `
                    font-size: 10px; 
                    opacity: 0.6; 
                    margin-top: 4px;
                    ${isPlayer ? 'text-align: right;' : 'text-align: left;'}
                `;
                const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                timeDiv.textContent = time;

                messageDiv.appendChild(speakerDiv);
                messageDiv.appendChild(contentDiv);
                messageDiv.appendChild(timeDiv);
            }

            this.messageArea.appendChild(messageDiv);
        });

        // Scroll to bottom smoothly
        this.messageArea.scrollTo({
            top: this.messageArea.scrollHeight,
            behavior: 'smooth'
        });
    }

    private getPlayerPosition(): { x: number; y: number } {
        // Find the player in the current scene
        const sceneManager = this.scene.scene.manager;
        const activeSceneKey = sceneManager.getScenes(true)[0]?.scene?.key;
        const currentScene = activeSceneKey ? sceneManager.getScene(activeSceneKey) : this.scene;
        
        if (currentScene && (currentScene as any).player) {
            const player = (currentScene as any).player;
            return { x: player.x, y: player.y };
        }
        
        // Fallback position
        return { x: 400, y: 300 };
    }

    private showPlayerSpeechBubble(message: string) {
        // Find the player in the current scene
        const sceneManager = this.scene.scene.manager;
        const activeSceneKey = sceneManager.getScenes(true)[0]?.scene?.key;
        const currentScene = activeSceneKey ? sceneManager.getScene(activeSceneKey) : this.scene;
        
        if (currentScene && (currentScene as any).player) {
            const player = (currentScene as any).player;
            
            // Create temporary speech bubble for player
            const playerBubble = currentScene.add.text(player.x, player.y - 40, message, {
                fontSize: '14px',
                color: '#000000',
                backgroundColor: '#e3f2fd',
                padding: { x: 8, y: 6 },
                wordWrap: { width: 250 },
                align: 'center'
            }).setOrigin(0.5).setDepth(1000);
            
            // Auto-hide after 2 seconds
            currentScene.time.delayedCall(2000, () => {
                if (playerBubble) {
                    playerBubble.destroy();
                }
            });
        }
    }

    private findNPCById(npcId: string): SmartNPC | null {
        console.log(`🔍 Looking for NPC with id: "${npcId}"`);
        
        // Check current scene for the NPC - get the ACTIVE scene, not the scene that created ChatInterface
        const sceneManager = this.scene.scene.manager;
        const activeSceneKey = sceneManager.getScenes(true)[0]?.scene?.key; // Get the first active scene
        const currentScene = activeSceneKey ? sceneManager.getScene(activeSceneKey) : this.scene;
        
        console.log(`🎬 ChatInterface created in: ${this.scene.scene.key}`);
        console.log(`🎬 Current active scene: ${activeSceneKey || 'unknown'}`);
        
        if (currentScene) {
            // Try different ways to access NPCs
            let npcs: SmartNPC[] = [];
            
            if ((currentScene as any).npcs) {
                npcs = (currentScene as any).npcs as SmartNPC[];
                console.log(`📋 Found NPCs via .npcs property:`, npcs.map(npc => `${npc.name} (id: "${npc.id}")`));
            } else if ((currentScene as any).npc) {
                // Single NPC (TownScene style)
                npcs = [(currentScene as any).npc as SmartNPC];
                console.log(`📋 Found single NPC via .npc property:`, npcs.map(npc => `${npc.name} (id: "${npc.id}")`));
            } else {
                // Look for any SmartNPC properties in the scene
                const sceneProps = Object.keys(currentScene);
                console.log(`📋 Checking scene properties:`, sceneProps.filter(key => key.includes('npc') || key.includes('NPC') || key.toLowerCase().includes('sheriff') || key.toLowerCase().includes('townsperson')));
                
                for (const prop of sceneProps) {
                    const value = (currentScene as any)[prop];
                    if (value && typeof value === 'object' && value.constructor?.name === 'SmartNPC') {
                        npcs.push(value as SmartNPC);
                        console.log(`📋 Found NPC via property "${prop}":`, value.name, `(id: "${value.id}")`);
                    }
                }
            }
            
            if (npcs.length > 0) {
                // Try exact match first
                let foundNPC = npcs.find(npc => npc.id === npcId);
                
                // If not found, try case-insensitive match
                if (!foundNPC) {
                    foundNPC = npcs.find(npc => npc.id.toLowerCase() === npcId.toLowerCase());
                    if (foundNPC) console.log(`🔍 Found via case-insensitive match: ${foundNPC.name}`);
                }
                
                // If still not found, try partial match on name
                if (!foundNPC) {
                    foundNPC = npcs.find(npc => npc.name.toLowerCase().includes(npcId.toLowerCase()));
                    if (foundNPC) console.log(`🔍 Found via name match: ${foundNPC.name}`);
                }
                
                if (foundNPC) {
                    console.log(`✅ Found NPC: ${foundNPC.name} (id: ${foundNPC.id})`);
                    return foundNPC;
                }
            }
        } else {
            console.log(`📋 Could not access current scene`);
        }
        
        // Fallback for TownScene
        if ((this.scene as any).npc?.id === npcId) {
            return (this.scene as any).npc;
        }
        
        console.log(`❌ Could not find NPC with id: "${npcId}"`);
        return null;
    }

    updateNearbyNPCs(npcs: SmartNPC[]) {
        const newNearbyIds = new Set(npcs.map(npc => npc.id));
        
        // Only update if the nearby NPCs have actually changed
        const currentNearbyIds = new Set(this.nearbyNPCs);
        if (this.setsEqual(newNearbyIds, currentNearbyIds)) {
            return; // No change, don't update
        }
        
        console.log('Updating nearby NPCs:', npcs.map(n => `${n.name} (id: ${n.id})`));
        this.nearbyNPCs.clear();
        npcs.forEach(npc => {
            this.nearbyNPCs.add(npc.id);
        });
    }

    private setsEqual(a: Set<string>, b: Set<string>): boolean {
        return a.size === b.size && [...a].every(x => b.has(x));
    }

    private toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.container.style.height = '40px';
            this.messageArea.style.display = 'none';
            this.inventoryArea.style.display = 'none';
            this.inputArea.style.display = 'none';
            this.minimizeButton.textContent = '+';
        } else {
            this.container.style.height = '450px';
            this.switchTab(this.activeTab);
            this.minimizeButton.textContent = '−';
        }
    }

    private switchTab(tab: 'chat' | 'inventory') {
        this.activeTab = tab;
        
        // Update tab appearance
        if (tab === 'chat') {
            this.chatTab.style.background = '#4a90e2';
            this.inventoryTab.style.background = '#666';
            
            // Show chat UI
            this.messageArea.style.display = 'flex';
            this.messageArea.style.flexDirection = 'column';
            this.inputArea.style.display = 'block';
            this.inventoryArea.style.display = 'none';
        } else {
            this.inventoryTab.style.background = '#4a90e2';
            this.chatTab.style.background = '#666';
            
            // Show inventory UI
            this.messageArea.style.display = 'none';
            this.inputArea.style.display = 'none';
            this.inventoryArea.style.display = 'block';
        }
    }

    private updateInventoryArea() {
        this.inventoryArea.innerHTML = '<h3 style="color: white; margin: 0 0 15px 0;">Inventory</h3>';
        
        // Placeholder inventory items
        const items = [
            { name: 'Old Key', description: 'A rusty key found in the town square', quantity: 1 },
            { name: 'Mysterious Note', description: 'A cryptic message about the whispering stones', quantity: 1 },
            { name: 'Coins', description: 'Local currency', quantity: 25 }
        ];
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                padding: 8px;
                margin-bottom: 8px;
                background: rgba(100, 100, 100, 0.2);
                border: 1px solid #666;
                border-radius: 4px;
                color: white;
            `;
            
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'font-weight: bold; margin-bottom: 4px;';
            nameDiv.textContent = `${item.name} (${item.quantity})`;
            
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size: 12px; color: #ccc;';
            descDiv.textContent = item.description;
            
            itemDiv.appendChild(nameDiv);
            itemDiv.appendChild(descDiv);
            this.inventoryArea.appendChild(itemDiv);
        });
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
