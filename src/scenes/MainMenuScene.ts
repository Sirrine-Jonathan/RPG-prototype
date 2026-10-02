import { Scene } from "phaser";
import { InventorySystem } from "../systems/InventorySystem";

export class MainMenuScene extends Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);

    // Title
    this.add
      .text(width / 2, height * 0.25, "WHISPERING STONES", {
        fontSize: "48px",
        color: "#00ff00",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.35, "Mystery RPG", {
        fontSize: "24px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Menu buttons
    const buttonStyle = {
      fontSize: "24px",
      color: "#00ff00",
      backgroundColor: "#001100",
      padding: { x: 20, y: 10 },
      fontFamily: "monospace"
    };

    const newGameBtn = this.add
      .text(width / 2, height * 0.5, "New Game", buttonStyle)
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.startNewGame());

    const loadGameBtn = this.add
      .text(width / 2, height * 0.6, "Load Game", buttonStyle)
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.loadGame());

    const levelTestBtn = this.add
      .text(width / 2, height * 0.7, "Level Test", buttonStyle)
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.scene.start('LevelTestScene'));

    // Button hover effects
    [newGameBtn, loadGameBtn, levelTestBtn].forEach((btn) => {
      btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#003300" }));
      btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#001100" }));
    });
  }

  startNewGame() {
    console.log("Starting new game...");
    // Clear any saved game state
    try {
      localStorage.removeItem('whispering_stones_save');
    } catch (error) {
      console.warn('Save storage unavailable; starting without clearing the stored checkpoint.', error);
    }
    InventorySystem.getInstance().reset();
    this.scene.start("NewTownScene"); // Use new architecture
  }

  loadGame() {
    console.log("Loading game...");
    
    // Check if there's a saved game
    let savedGame: string | null;
    try {
      savedGame = localStorage.getItem('whispering_stones_save');
    } catch (error) {
      console.warn('Save storage unavailable; starting a new game.', error);
      this.startNewGame();
      return;
    }
    
    if (savedGame) {
      let gameState: any;
      try {
        gameState = JSON.parse(savedGame);
        // Only these gameplay scenes support checkpoint restoration.
        if (!gameState || !['NewLibraryScene', 'NewTownScene'].includes(gameState.currentScene) ||
            !gameState.playerPosition ||
            !Number.isFinite(gameState.playerPosition.x) ||
            !Number.isFinite(gameState.playerPosition.y) ||
            !Array.isArray(gameState.playerInventory) ||
            !gameState.playerInventory.every((item: any) => item &&
              typeof item.id === 'string' && typeof item.name === 'string' &&
              typeof item.description === 'string')) {
          throw new Error('Unsupported or invalid saved game');
        }
      } catch (error) {
        console.error("Failed to load game:", error);
        // Fallback to new game
        this.startNewGame();
        return;
      }
      // Scene startup failures must not erase a valid checkpoint.
      this.scene.start(gameState.currentScene, { loadedState: gameState });
    } else {
      console.log("No saved game found, starting a new game...");
      this.startNewGame();
    }
  }
}
