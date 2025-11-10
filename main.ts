import { Game, AUTO } from "phaser";
import { MainMenuScene } from "./src/scenes/MainMenuScene";
import { SecurityStationScene } from "./src/scenes/SecurityStationScene";
import { ResearchLabScene } from "./src/scenes/ResearchLabScene";
import { MedicalBayScene } from "./src/scenes/MedicalBayScene";
import { EngineeringBayScene } from "./src/scenes/EngineeringBayScene";
import { TileIndexViewerScene } from "./src/scenes/TileIndexViewerScene";
import { PropsViewerScene } from "./src/scenes/PropsViewerScene";
import { NewTownScene } from "./src/scenes/NewTownScene";
import { NewLibraryScene } from "./src/scenes/NewLibraryScene";
import { GameManager } from "./src/core/GameManager";

const config = {
  type: AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "game-container",
  backgroundColor: "#000000", // Black background
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    MainMenuScene,
    SecurityStationScene,
    ResearchLabScene,
    MedicalBayScene,
    EngineeringBayScene,
    TileIndexViewerScene,
    PropsViewerScene,
    NewTownScene,
    NewLibraryScene,
  ],
};

const game = new Game(config);

// Initialize the new architecture
const gameManager = GameManager.getInstance();
gameManager.initialize(game);

// Expose game to window for debugging
(window as any).game = game;
(window as any).gameManager = gameManager;

// Handle window resize
window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
  gameManager.shutdown();
});
