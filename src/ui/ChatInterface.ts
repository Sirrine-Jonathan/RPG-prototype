import { Scene } from "phaser";
import { AIService } from "../services/AIService";
import { EventBus } from "../systems/EventBus";
import { InventorySystem } from "../systems/InventorySystem";
import { Logger } from "../utils/Logger";

interface TownMessage {
  type: "speech" | "action" | "note";
  speaker: string;
  content: string;
  timestamp: number;
}

interface AssistantNote {
  note: string;
  timestamp: number;
}

export class ChatInterface {
  private static instance: ChatInterface;
  private scene!: Scene;
  private container!: HTMLDivElement;
  private header!: HTMLDivElement;
  private tabsContainer!: HTMLDivElement;
  private chatTab!: HTMLButtonElement;
  private inventoryTab!: HTMLButtonElement;
  private notesTab!: HTMLButtonElement;
  private minimizeButton!: HTMLButtonElement;
  private messageArea!: HTMLDivElement;
  private inventoryArea!: HTMLDivElement;
  private notesArea!: HTMLDivElement;
  private inputArea!: HTMLDivElement;
  private textarea!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private _aiService!: AIService;

  private townMessages: TownMessage[] = [];
  private assistantNotes: AssistantNote[] = [];
  private activeTab: "chat" | "inventory" | "notes" = "chat";
  private isMinimized: boolean = true;
  private nearbyNPCs: Set<string> = new Set();
  private playerNotes: Array<{
    id: string;
    content: string;
    category: string;
    timestamp: string;
    location: string;
  }> = [];

  constructor(scene: Scene) {
    if (ChatInterface.instance) {
      ChatInterface.instance.scene = scene;
      return ChatInterface.instance;
    }

    this.scene = scene;
    this._aiService = AIService.getInstance();
    this.createUI();
    this.setupEventListeners();

    // Listen for player hearing speech
    const gameManager = (globalThis as any).gameManager;
    if (gameManager && gameManager.eventBus) {
      gameManager.eventBus.subscribe("player-heard", (event: any) =>
        this.onPlayerHeard(event.data)
      );
      gameManager.eventBus.subscribe("assistant-noted", (event: any) =>
        this.onAssistantNoted(event.data)
      );
      gameManager.eventBus.subscribe("player-inventory-updated", (event: any) =>
        this.updateInventoryArea()
      );
      // Listen for messages from QuickSpeechUI
      gameManager.eventBus.subscribe("player_message_sent", (event: any) =>
        this.onPlayerMessageSent(event.data)
      );
    }

    // Listen for object interactions
    this.scene.events.on("town-action", this.onTownAction, this);

    // Listen for notes from NPCs
    this.scene.events.on("update-notes", this.onNotesUpdate, this);

    ChatInterface.instance = this;
  }

  static getInstance(scene?: Scene): ChatInterface {
    if (!ChatInterface.instance && scene) {
      new ChatInterface(scene);
    }
    return ChatInterface.instance;
  }

  private createUI() {
    console.log("🎯 ChatInterface: Creating UI");
    // Main container
    this.container = document.createElement("div");
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
    this.header = document.createElement("div");
    this.header.style.cssText = `
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

    // Tabs container
    this.tabsContainer = document.createElement("div");
    this.tabsContainer.style.cssText = `
            display: flex;
            gap: 8px;
        `;

    this.chatTab = document.createElement("button");
    this.chatTab.style.cssText = `
            background: #4a90e2;
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
    this.chatTab.textContent = "Chat";

    this.inventoryTab = document.createElement("button");
    this.inventoryTab.style.cssText = `
            background: #666;
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
    this.inventoryTab.textContent = "Inventory";

    this.notesTab = document.createElement("button");
    this.notesTab.style.cssText = `
            background: #666;
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
    this.notesTab.textContent = "Notes";

    this.minimizeButton = document.createElement("button");
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
    this.minimizeButton.textContent = "−";

    this.tabsContainer.appendChild(this.chatTab);
    this.tabsContainer.appendChild(this.inventoryTab);
    this.tabsContainer.appendChild(this.notesTab);
    this.header.appendChild(this.tabsContainer);
    this.header.appendChild(this.minimizeButton);

    // Message area - always visible for town chat
    this.messageArea = document.createElement("div");
    this.messageArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background: rgba(20, 20, 20, 0.8);
        `;

    // Input area - always visible
    this.inputArea = document.createElement("div");
    this.inputArea.style.cssText = `
            padding: 10px;
            border-top: 1px solid #555;
        `;

    // Textarea
    this.textarea = document.createElement("textarea");
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
    this.textarea.placeholder = "Type your message to the town...";

    // Send button
    this.sendButton = document.createElement("button");
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
    this.sendButton.textContent = "Send Message";

    // Inventory area
    this.inventoryArea = document.createElement("div");
    this.inventoryArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: none;
        `;

    // Notes area
    this.notesArea = document.createElement("div");
    this.notesArea.style.cssText = `
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
    this.container.appendChild(this.notesArea);
    this.container.appendChild(this.inputArea);

    document.body.appendChild(this.container);
    console.log(
      "🎯 ChatInterface: UI created and added to DOM, minimized:",
      this.isMinimized
    );

    // Apply minimized state after creation
    if (this.isMinimized) {
      this.container.style.height = "40px";
      this.messageArea.style.display = "none";
      this.inventoryArea.style.display = "none";
      this.inputArea.style.display = "none";
      this.minimizeButton.textContent = "+";
    }

    // Add CSS animations
    if (!document.getElementById("chat-animations")) {
      const style = document.createElement("style");
      style.id = "chat-animations";
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
    this.updateNotesArea();
  }

  private updateNotesArea() {
    this.notesArea.innerHTML =
      '<h3 style="color: white; margin: 0 0 15px 0;">Investigation Notes</h3>';

    // Combine player notes and assistant notes
    const allNotes = [
      ...this.playerNotes.map((note) => ({
        type: "player",
        content: note.content,
        category: note.category,
        timestamp: note.timestamp,
        location: note.location,
      })),
      ...this.assistantNotes.map((note) => ({
        type: "assistant",
        content: note.note,
        category: "Assistant Observation",
        timestamp: new Date(note.timestamp).toLocaleTimeString(),
        location: "Town",
      })),
    ];

    // Sort by timestamp (most recent first)
    allNotes.sort((a, b) => {
      const timeA = a.type === "assistant" ? a.timestamp : a.timestamp;
      const timeB = b.type === "assistant" ? b.timestamp : b.timestamp;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    if (allNotes.length === 0) {
      const noNotes = document.createElement("p");
      noNotes.style.cssText =
        "color: #888; font-style: italic; text-align: center; margin-top: 50px;";
      noNotes.textContent =
        "No notes yet. Your assistant will help you take notes as you investigate.";
      this.notesArea.appendChild(noNotes);
      return;
    }

    allNotes.forEach((note) => {
      const noteDiv = document.createElement("div");
      noteDiv.style.cssText = `
                padding: 12px;
                margin-bottom: 12px;
                background: rgba(100, 100, 100, 0.2);
                border: 1px solid #666;
                border-radius: 8px;
                color: white;
            `;

      const headerDiv = document.createElement("div");
      headerDiv.style.cssText =
        "display: flex; justify-content: space-between; margin-bottom: 8px;";

      const categoryDiv = document.createElement("span");
      categoryDiv.style.cssText = `font-weight: bold; color: ${
        note.type === "assistant" ? "#90EE90" : "#4a90e2"
      };`;
      categoryDiv.textContent = note.category;

      const timeDiv = document.createElement("span");
      timeDiv.style.cssText = "font-size: 11px; color: #888;";
      timeDiv.textContent = note.timestamp;

      headerDiv.appendChild(categoryDiv);
      headerDiv.appendChild(timeDiv);

      const contentDiv = document.createElement("div");
      contentDiv.style.cssText = "line-height: 1.4; margin-bottom: 4px;";
      contentDiv.textContent = note.content;

      const locationDiv = document.createElement("div");
      locationDiv.style.cssText =
        "font-size: 11px; color: #aaa; font-style: italic;";
      locationDiv.textContent = `Location: ${note.location}`;

      noteDiv.appendChild(headerDiv);
      noteDiv.appendChild(contentDiv);
      noteDiv.appendChild(locationDiv);
      this.notesArea.appendChild(noteDiv);
    });
  }

  private setupEventListeners() {
    this.sendButton.addEventListener("click", () => this.sendMessage());
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
      // Prevent Phaser from capturing space key when typing
      if (e.key === " ") {
        e.stopPropagation();
      }
    });

    // Minimize/maximize functionality
    this.minimizeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });

    this.header.addEventListener("click", () => {
      if (this.isMinimized) {
        this.toggleMinimize();
      }
    });

    // Tab switching
    this.chatTab.addEventListener("click", () => this.switchTab("chat"));
    this.inventoryTab.addEventListener("click", () =>
      this.switchTab("inventory")
    );
    this.notesTab.addEventListener("click", () => this.switchTab("notes"));

    // Also prevent space key capture on focus
    this.textarea.addEventListener("focus", () => {
      this.textarea.style.borderColor = "#4a90e2";
      this.textarea.style.boxShadow = "0 0 0 3px rgba(74, 144, 226, 0.2)";
      // Disable Phaser keyboard input while typing
      if (this.scene.input.keyboard) {
        this.scene.input.keyboard.enabled = false;
      }
    });

    this.textarea.addEventListener("blur", () => {
      this.textarea.style.borderColor = "#444";
      this.textarea.style.boxShadow = "none";
      // Re-enable Phaser keyboard input when done typing
      if (this.scene.input.keyboard) {
        this.scene.input.keyboard.enabled = true;
      }
    });

    // Send button hover effects
    this.sendButton.addEventListener("mouseenter", () => {
      this.sendButton.style.transform = "translateY(-2px)";
      this.sendButton.style.boxShadow = "0 6px 16px rgba(74, 144, 226, 0.4)";
    });

    this.sendButton.addEventListener("mouseleave", () => {
      this.sendButton.style.transform = "translateY(0)";
      this.sendButton.style.boxShadow = "0 4px 12px rgba(74, 144, 226, 0.3)";
    });
  }

  private async sendMessage() {
    const message = this.textarea.value.trim();
    if (!message) return;

    // Add to town chat
    this.townMessages.push({
      type: "speech",
      speaker: "Player",
      content: message,
      timestamp: Date.now(),
    });

    console.log(`📨 CONVO Player speaks: "${message}"`);
    Logger.getInstance().playerSpeech("Player", message);

    // Show player speech bubble
    this.showPlayerSpeechBubble(message);

    // Get player position from current scene
    const playerPos = this.getPlayerPosition();

    // Emit player speech event for NPCs to hear
    EventBus.getInstance().emit("player_speech", {
      speaker: "Player",
      speakerId: "player",
      message: message,
      position: playerPos,
      timestamp: Date.now(),
    });

    // Emit global town speech event
    this.scene.events.emit("town-speech", {
      speaker: "Player",
      speakerId: "player",
      message: message,
      position: playerPos,
      timestamp: Date.now(),
    });

    this.textarea.value = "";
    this.updateTownChat();
  }

  private onTownAction = (data: {
    actor: string;
    action: string;
    timestamp: number;
  }) => {
    this.townMessages.push({
      type: "action",
      speaker: data.actor,
      content: data.action,
      timestamp: data.timestamp,
    });

    this.updateTownChat();
  };

  private onPlayerHeard = (data: {
    speaker: string;
    message: string;
    distance: number;
  }) => {
    this.townMessages.push({
      type: "speech",
      speaker: data.speaker,
      content: data.message,
      timestamp: Date.now(),
    });

    // Only log as player speech if it's actually the player
    if (data.speaker === "Player") {
      Logger.getInstance().playerSpeech(data.speaker, data.message);
    }
    this.updateTownChat();
  };

  private onPlayerMessageSent = (data: {
    speaker: string;
    message: string;
    timestamp: number;
  }) => {
    // Add message from QuickSpeechUI to chat history
    this.townMessages.push({
      type: "speech",
      speaker: data.speaker,
      content: data.message,
      timestamp: data.timestamp,
    });

    // Only log as player speech if it's actually the player
    if (data.speaker === "Player") {
      Logger.getInstance().playerSpeech(data.speaker, data.message);
    }
    this.updateTownChat();
  };

  private onAssistantNoted = (data: { note: string; timestamp: number }) => {
    this.assistantNotes.push({
      note: data.note,
      timestamp: data.timestamp,
    });

    // Don't add notes to conversation - they belong in the notes tab only
    this.updateNotesTab();

    this.updateTownChat();
    this.updateNotesArea();
  };

  private updateNotesTab() {
    this.updateNotesArea();
  }

  private onNotesUpdate = (
    notes: Array<{
      id: string;
      content: string;
      category: string;
      timestamp: string;
      location: string;
    }>
  ) => {
    this.playerNotes = notes;
    this.updateNotesArea();
  };

  private updateTownChat() {
    this.messageArea.innerHTML =
      '<h4 style="color: white; margin: 0 0 15px 0; text-align: center; border-bottom: 1px solid #555; padding-bottom: 8px;">Town Chat</h4>';

    if (this.townMessages.length === 0) {
      const noMessages = document.createElement("p");
      noMessages.style.cssText =
        "color: #888; font-style: italic; text-align: center; margin-top: 50px;";
      noMessages.textContent = "No messages yet. Start speaking to the town!";
      this.messageArea.appendChild(noMessages);
      return;
    }

    // Show only last 50 messages for performance
    const recentMessages = this.townMessages.slice(-50);

    recentMessages.forEach((msg, index) => {
      const messageDiv = document.createElement("div");
      const isPlayer = msg.speaker === "Player";

      messageDiv.style.cssText = `
                margin-bottom: 12px;
                padding: 8px 12px;
                border-radius: 12px;
                max-width: 85%;
                position: relative;
                ${
                  isPlayer
                    ? "background: linear-gradient(135deg, #4a90e2, #357abd); color: white; margin-left: auto; box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);"
                    : msg.type === "action"
                    ? "background: #2a2a2a; color: #ccc; font-style: italic; margin: 8px auto; text-align: center; border-left: 3px solid #666;"
                    : "background: linear-gradient(135deg, #333, #444); color: white; margin-right: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);"
                }
                animation: slideIn 0.3s ease-out;
            `;

      if (msg.type === "action") {
        messageDiv.textContent = `${msg.content}`;
      } else {
        // Speaker name
        const speakerDiv = document.createElement("div");
        speakerDiv.style.cssText = `
                    font-size: 11px; 
                    opacity: 0.8; 
                    margin-bottom: 4px; 
                    font-weight: bold;
                    ${isPlayer ? "text-align: right;" : "text-align: left;"}
                `;
        speakerDiv.textContent = isPlayer ? "You" : msg.speaker;

        // Message content
        const contentDiv = document.createElement("div");
        contentDiv.style.cssText = "line-height: 1.4; word-wrap: break-word;";
        contentDiv.textContent = msg.content;

        // Timestamp
        const timeDiv = document.createElement("div");
        timeDiv.style.cssText = `
                    font-size: 10px; 
                    opacity: 0.6; 
                    margin-top: 4px;
                    ${isPlayer ? "text-align: right;" : "text-align: left;"}
                `;
        const time = new Date(msg.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
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
      behavior: "smooth",
    });
  }

  private getPlayerPosition(): { x: number; y: number } {
    // Find the player in the current scene
    const sceneManager = this.scene.scene.manager;
    const activeSceneKey = sceneManager.getScenes(true)[0]?.scene?.key;
    const currentScene = activeSceneKey
      ? sceneManager.getScene(activeSceneKey)
      : this.scene;

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
    const currentScene = activeSceneKey
      ? sceneManager.getScene(activeSceneKey)
      : this.scene;

    if (currentScene && (currentScene as any).player) {
      const player = (currentScene as any).player;

      // Create temporary speech bubble for player
      const playerBubble = currentScene.add
        .text(player.x, player.y - 40, message, {
          fontSize: "14px",
          color: "#000000",
          backgroundColor: "#e3f2fd",
          padding: { x: 8, y: 6 },
          wordWrap: { width: 250 },
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(1000);

      // Auto-hide after 2 seconds
      currentScene.time.delayedCall(2000, () => {
        if (playerBubble) {
          playerBubble.destroy();
        }
      });
    }
  }

  public toggleMinimize() {
    this.isMinimized = !this.isMinimized;

    if (this.isMinimized) {
      this.container.style.height = "40px";
      this.messageArea.style.display = "none";
      this.inventoryArea.style.display = "none";
      this.inputArea.style.display = "none";
      this.minimizeButton.textContent = "+";
    } else {
      this.container.style.height = "450px";
      this.switchTab(this.activeTab);
      this.minimizeButton.textContent = "−";
    }
  }

  private switchTab(tab: "chat" | "inventory" | "notes") {
    this.activeTab = tab;

    // Reset all tabs
    this.chatTab.style.background = "#666";
    this.inventoryTab.style.background = "#666";
    this.notesTab.style.background = "#666";

    // Hide all areas
    this.messageArea.style.display = "none";
    this.inventoryArea.style.display = "none";
    this.notesArea.style.display = "none";
    this.inputArea.style.display = "none";

    if (tab === "chat") {
      this.chatTab.style.background = "#4a90e2";
      this.messageArea.style.display = "flex";
      this.messageArea.style.flexDirection = "column";
      this.inputArea.style.display = "block";
    } else if (tab === "inventory") {
      this.inventoryTab.style.background = "#4a90e2";
      this.inventoryArea.style.display = "block";
    } else if (tab === "notes") {
      this.notesTab.style.background = "#4a90e2";
      this.notesArea.style.display = "block";
    }
  }

  private updateInventoryArea() {
    this.inventoryArea.innerHTML =
      '<h3 style="color: white; margin: 0 0 15px 0;">Player Inventory</h3>';

    const inventorySystem = InventorySystem.getInstance();
    // Use the actual player ID from PersistentPlayer
    const gameManager = (globalThis as any).gameManager;
    const playerId = gameManager?.persistentPlayer?.id || "Detective Riley";
    const playerInventory = inventorySystem.getInventory(playerId);

    if (playerInventory.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.style.cssText =
        "color: #888; font-style: italic; text-align: center; margin-top: 50px;";
      emptyMessage.textContent = "No items in inventory.";
      this.inventoryArea.appendChild(emptyMessage);
      return;
    }

    playerInventory.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.style.cssText = `
        padding: 12px;
        margin-bottom: 8px;
        background: rgba(100, 100, 100, 0.2);
        border: 1px solid #666;
        border-radius: 8px;
        color: white;
      `;

      const nameDiv = document.createElement("div");
      nameDiv.style.cssText = "font-weight: bold; margin-bottom: 4px;";
      nameDiv.textContent = item.name;

      const descDiv = document.createElement("div");
      descDiv.style.cssText = "font-size: 12px; color: #ccc;";
      descDiv.textContent = item.description;

      if (item.category) {
        const categoryDiv = document.createElement("div");
        categoryDiv.style.cssText =
          "font-size: 10px; color: #888; margin-top: 4px;";
        categoryDiv.textContent = `Category: ${item.category}`;
        itemDiv.appendChild(categoryDiv);
      }

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
