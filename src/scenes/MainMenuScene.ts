import { Scene } from "phaser";

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
    localStorage.removeItem('whispering_stones_save');
    this.scene.start("NewTownScene"); // Use new architecture
  }

  loadGame() {
    console.log("Loading game...");
    
    // Check if there's a saved game
    const savedGame = localStorage.getItem('whispering_stones_save');
    
    if (savedGame) {
      try {
        const gameState = JSON.parse(savedGame);
        console.log("Loading saved game state:", gameState);
        
        // Start the saved scene
        this.scene.start(gameState.currentScene, { loadedState: gameState });
      } catch (error) {
        console.error("Failed to load game:", error);
        // Fallback to new game
        this.startNewGame();
      }
    } else {
      console.log("No saved game found, creating library test save...");
      // Create a test save state for library scene
      const testSave = {
        currentScene: 'NewLibraryScene',
        playerPosition: { x: 400, y: 300 },
        playerInventory: [
          {
            id: "Maya's Photo",
            name: "Maya's Photo",
            description: "A recent photo of Maya, the missing person. She appears to be a young woman with dark hair, smiling at the camera. In the background, you can clearly see the town library's distinctive arched entrance. Maya is holding what looks like an old book or journal.",
            category: 'evidence'
          }
        ],
        gameProgress: {
          metMargaret: true,
          hasPhoto: true,
          currentObjective: 'investigate_library'
        }
      };
      
      // Save and load the test state
      localStorage.setItem('whispering_stones_save', JSON.stringify(testSave));
      this.scene.start('NewLibraryScene', { loadedState: testSave });
    }
  }
}
