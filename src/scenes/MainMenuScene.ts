import { Scene } from "phaser";

export class MainMenuScene extends Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add
      .text(width / 2, height * 0.25, "Whispering Stones", {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    // Menu buttons
    const buttonStyle = {
      fontSize: "24px",
      color: "#ffffff",
      backgroundColor: "#16213e",
      padding: { x: 20, y: 10 },
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

    const settingsBtn = this.add
      .text(width / 2, height * 0.7, "Settings", buttonStyle)
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.openSettings());

    const exitBtn = this.add
      .text(width / 2, height * 0.8, "Exit", buttonStyle)
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.exitGame());

    // Button hover effects
    [newGameBtn, loadGameBtn, settingsBtn, exitBtn].forEach((btn) => {
      btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#0f3460" }));
      btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#16213e" }));
    });
  }

  startNewGame() {
    // TODO: Transition to town/outside scene
    console.log("Starting new game...");
    this.scene.start("TownScene");
  }

  loadGame() {
    // TODO: Implement load game functionality
    console.log("Loading game...");
  }

  openSettings() {
    // TODO: Implement settings scene
    console.log("Opening settings...");
  }

  exitGame() {
    // TODO: Implement exit functionality
    console.log("Exiting game...");
  }
}
