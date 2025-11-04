import { Scene } from 'phaser';
import { SmartNPC } from '../entities/SmartNPC';
import { AIService } from '../services/AIService';

interface ConversationMessage {
    sender: 'player' | 'npc';
    message: string;
    timestamp: number;
}

interface Conversation {
    npcId: string;
    npcName: string;
    messages: ConversationMessage[];
    lastMessageTime: number;
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
    private conversationList: HTMLDivElement;
    private inventoryArea: HTMLDivElement;
    private messageArea: HTMLDivElement;
    private inputArea: HTMLDivElement;
    private textarea: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;
    private backButton: HTMLButtonElement;
    private aiService: AIService;
    
    public conversations: Map<string, Conversation> = new Map();
    public activeConversation: string | null = null;
    private nearbyNPCs: Set<string> = new Set();
    private currentView: 'list' | 'conversation' = 'list';
    private activeTab: 'chat' | 'inventory' = 'chat';
    private isMinimized: boolean = false;

    constructor(scene: Scene) {
        if (ChatInterface.instance) {
            ChatInterface.instance.scene = scene; // Update scene reference
            return ChatInterface.instance;
        }
        
        this.scene = scene;
        this.aiService = AIService.getInstance();
        this.createUI();
        this.setupEventListeners();
        
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
            width: 350px;
            height: 400px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #555;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            display: flex;
            flex-direction: column;
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

        // Conversation list view
        this.conversationList = document.createElement('div');
        this.conversationList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        `;

        // Message area (hidden initially)
        this.messageArea = document.createElement('div');
        this.messageArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: none;
            background: rgba(20, 20, 20, 0.8);
        `;

        // Input area (hidden initially)
        this.inputArea = document.createElement('div');
        this.inputArea.style.cssText = `
            padding: 10px;
            border-top: 1px solid #555;
            display: none;
        `;

        // Back button
        this.backButton = document.createElement('button');
        this.backButton.style.cssText = `
            margin-bottom: 10px;
            padding: 5px 10px;
            background: #666;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            display: none;
        `;
        this.backButton.textContent = '← Back to Conversations';

        // Textarea
        this.textarea = document.createElement('textarea');
        this.textarea.style.cssText = `
            width: 100%;
            height: 60px;
            background: #222;
            border: 1px solid #555;
            border-radius: 4px;
            color: white;
            padding: 8px;
            resize: none;
            font-size: 14px;
            box-sizing: border-box;
        `;
        this.textarea.placeholder = 'Type your message...';

        // Send button
        this.sendButton = document.createElement('button');
        this.sendButton.style.cssText = `
            margin-top: 8px;
            padding: 8px 16px;
            background: #4a90e2;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px;
        `;
        this.sendButton.textContent = 'Send';

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
        this.container.appendChild(this.backButton);
        this.container.appendChild(this.conversationList);
        this.container.appendChild(this.messageArea);
        this.container.appendChild(this.inventoryArea);
        this.container.appendChild(this.inputArea);
        
        document.body.appendChild(this.container);
        
        this.updateConversationList();
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
        this.backButton.addEventListener('click', () => this.showConversationList());
        
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
            // Disable Phaser keyboard input while typing
            if (this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = false;
            }
        });
        
        this.textarea.addEventListener('blur', () => {
            // Re-enable Phaser keyboard input when done typing
            if (this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = true;
            }
        });
    }

    private async sendMessage() {
        const message = this.textarea.value.trim();
        if (!message || !this.activeConversation) return;

        const conversation = this.conversations.get(this.activeConversation);
        if (!conversation) return;

        // Add player message
        conversation.messages.push({
            sender: 'player',
            message: message,
            timestamp: Date.now()
        });
        conversation.lastMessageTime = Date.now();

        // Show player speech bubble
        this.showPlayerSpeechBubble(message);

        // Find the NPC and send message
        const npc = this.findNPCById(this.activeConversation);
        if (npc) {
            const playerCharacter = {
                id: 'player',
                name: 'Player',
                getPosition: () => ({ x: 0, y: 0 })
            };
            
            console.log(`📤 Sending message to ${npc.name}: "${message}"`);
            
            // Let the NPC handle the conversation - it will generate its own response
            npc.receiveConversationAttempt(playerCharacter);
            npc.sendMessage(message, playerCharacter);
        } else {
            console.error(`❌ Could not find NPC with id: ${this.activeConversation}`);
        }

        this.textarea.value = '';
        this.updateMessageArea();
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
                console.log(`📋 No NPCs found in scene properties. Available properties:`, Object.keys(currentScene).filter(key => key.includes('npc') || key.includes('NPC')));
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
            
            // Create conversation if it doesn't exist
            if (!this.conversations.has(npc.id)) {
                console.log(`Creating new conversation for: ${npc.name} with ID: ${npc.id}`);
                this.conversations.set(npc.id, {
                    npcId: npc.id,
                    npcName: npc.name,
                    messages: [],
                    lastMessageTime: 0
                });
            }
        });
        
        this.updateConversationList();
    }

    private setsEqual(a: Set<string>, b: Set<string>): boolean {
        return a.size === b.size && [...a].every(x => b.has(x));
    }

    public updateConversationList() {
        console.log('Updating conversation list. Total conversations:', this.conversations.size);
        this.conversationList.innerHTML = '<h3 style="color: white; margin: 0 0 15px 0;">Conversations</h3>';
        
        if (this.conversations.size === 0) {
            const noConversations = document.createElement('p');
            noConversations.style.cssText = 'color: #888; font-style: italic;';
            noConversations.textContent = 'No conversations yet. Get close to NPCs to start chatting.';
            this.conversationList.appendChild(noConversations);
            return;
        }

        // Sort conversations by last message time
        const sortedConversations = Array.from(this.conversations.values())
            .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

        console.log('Sorted conversations:', sortedConversations.map(c => c.npcName));

        sortedConversations.forEach(conversation => {
            const conversationDiv = document.createElement('div');
            const isNearby = this.nearbyNPCs.has(conversation.npcId);
            const hasMessages = conversation.messages.length > 0;
            
            console.log(`Creating UI for ${conversation.npcName}, nearby: ${isNearby}`);
            
            conversationDiv.style.cssText = `
                padding: 10px;
                margin-bottom: 8px;
                background: ${isNearby ? 'rgba(74, 144, 226, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
                border: 1px solid ${isNearby ? '#4a90e2' : '#666'};
                border-radius: 4px;
                cursor: pointer;
                color: ${isNearby ? 'white' : '#888'};
            `;

            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'font-weight: bold; margin-bottom: 4px;';
            nameDiv.textContent = conversation.npcName;

            const statusDiv = document.createElement('div');
            statusDiv.style.cssText = 'font-size: 12px;';
            statusDiv.textContent = isNearby ? 'Nearby - Click to chat' : 
                hasMessages ? 'Not nearby - View only' : 'No messages yet';

            if (hasMessages) {
                const lastMessage = conversation.messages[conversation.messages.length - 1];
                const previewDiv = document.createElement('div');
                previewDiv.style.cssText = 'font-size: 11px; color: #bbb; margin-top: 4px;';
                previewDiv.textContent = `${lastMessage.sender === 'player' ? 'You' : conversation.npcName}: ${lastMessage.message.substring(0, 50)}${lastMessage.message.length > 50 ? '...' : ''}`;
                conversationDiv.appendChild(previewDiv);
            }

            conversationDiv.appendChild(nameDiv);
            conversationDiv.appendChild(statusDiv);

            conversationDiv.addEventListener('click', (e) => {
                console.log('Clicked conversation:', conversation.npcId, e);
                e.preventDefault();
                e.stopPropagation();
                this.openConversation(conversation.npcId);
            });

            this.conversationList.appendChild(conversationDiv);
        });
    }

    private openConversation(npcId: string) {
        console.log('Opening conversation with:', npcId);
        console.log('Available conversations:', Array.from(this.conversations.keys()));
        this.activeConversation = npcId;
        this.currentView = 'conversation';
        this.showConversationView();
        this.updateMessageArea();
        
        // Auto-focus the input if NPC is nearby
        if (this.nearbyNPCs.has(npcId)) {
            setTimeout(() => this.textarea.focus(), 100);
        }
    }

    private showConversationView() {
        console.log('Showing conversation view for:', this.activeConversation);
        this.conversationList.style.display = 'none';
        this.messageArea.style.display = 'flex';
        this.messageArea.style.flexDirection = 'column';
        this.inputArea.style.display = this.nearbyNPCs.has(this.activeConversation!) ? 'block' : 'none';
        this.backButton.style.display = 'block';
    }

    private showConversationList() {
        this.activeConversation = null;
        this.currentView = 'list';
        this.conversationList.style.display = 'block';
        this.messageArea.style.display = 'none';
        this.inputArea.style.display = 'none';
        this.backButton.style.display = 'none';
    }

    public updateMessageArea() {
        if (!this.activeConversation) return;

        const conversation = this.conversations.get(this.activeConversation);
        if (!conversation) return;

        this.messageArea.innerHTML = `<h4 style="color: white; margin: 0 0 15px 0;">${conversation.npcName}</h4>`;

        if (conversation.messages.length === 0) {
            const noMessages = document.createElement('p');
            noMessages.style.cssText = 'color: #888; font-style: italic;';
            noMessages.textContent = 'No messages yet. Start the conversation!';
            this.messageArea.appendChild(noMessages);
            return;
        }

        conversation.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                margin-bottom: 10px;
                padding: 8px;
                border-radius: 8px;
                max-width: 80%;
                ${msg.sender === 'player' ? 
                    'background: #4a90e2; color: white; margin-left: auto; text-align: right;' : 
                    'background: #333; color: white; margin-right: auto;'}
            `;

            const senderDiv = document.createElement('div');
            senderDiv.style.cssText = 'font-size: 11px; opacity: 0.7; margin-bottom: 4px;';
            senderDiv.textContent = msg.sender === 'player' ? 'You' : conversation.npcName;

            const textDiv = document.createElement('div');
            textDiv.textContent = msg.message;

            messageDiv.appendChild(senderDiv);
            messageDiv.appendChild(textDiv);
            this.messageArea.appendChild(messageDiv);
        });

        // Scroll to bottom
        this.messageArea.scrollTop = this.messageArea.scrollHeight;
    }

    private toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.container.style.height = '40px';
            this.conversationList.style.display = 'none';
            this.messageArea.style.display = 'none';
            this.inventoryArea.style.display = 'none'; // Hide inventory too
            this.inputArea.style.display = 'none';
            this.backButton.style.display = 'none';
            this.minimizeButton.textContent = '+';
        } else {
            this.container.style.height = '400px';
            // Restore the correct view based on active tab
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
            if (this.currentView === 'list') {
                this.conversationList.style.display = 'block';
                this.messageArea.style.display = 'none';
                this.inputArea.style.display = 'none';
                this.backButton.style.display = 'none';
            } else {
                this.conversationList.style.display = 'none';
                this.messageArea.style.display = 'flex';
                this.messageArea.style.flexDirection = 'column';
                this.inputArea.style.display = this.nearbyNPCs.has(this.activeConversation!) ? 'block' : 'none';
                this.backButton.style.display = 'block';
            }
            this.inventoryArea.style.display = 'none';
        } else {
            this.inventoryTab.style.background = '#4a90e2';
            this.chatTab.style.background = '#666';
            
            // Show inventory UI
            this.conversationList.style.display = 'none';
            this.messageArea.style.display = 'none';
            this.inputArea.style.display = 'none';
            this.backButton.style.display = 'none';
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
