import { Game, AUTO } from "phaser";
import { MainMenuScene } from "./src/scenes/MainMenuScene";
import { TownOverworldScene } from "./src/scenes/TownOverworldScene";
import { HospitalScene } from "./src/scenes/HospitalScene";
import { PoliceStationScene } from "./src/scenes/PoliceStationScene";
import { LibraryScene } from "./src/scenes/LibraryScene";
import { TavernScene } from "./src/scenes/TavernScene";
import { SchoolScene } from "./src/scenes/SchoolScene";
import { GroceryStoreScene } from "./src/scenes/GroceryStoreScene";
import { ArtMuseumScene } from "./src/scenes/ArtMuseumScene";
import { SecurityStationScene } from "./src/scenes/SecurityStationScene";
import { ResearchLabScene } from "./src/scenes/ResearchLabScene";
import { MedicalBayScene } from "./src/scenes/MedicalBayScene";
import { EngineeringBayScene } from "./src/scenes/EngineeringBayScene";
import { TileIndexViewerScene } from "./src/scenes/TileIndexViewerScene";
import { PropsViewerScene } from "./src/scenes/PropsViewerScene";
import { LevelTestScene } from "./src/scenes/LevelTestScene";
import { TownScene } from "./src/scenes/TownScene";

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
    TownOverworldScene,
    HospitalScene,
    PoliceStationScene,
    LibraryScene,
    TavernScene,
    SchoolScene,
    GroceryStoreScene,
    ArtMuseumScene,
    SecurityStationScene,
    ResearchLabScene,
    MedicalBayScene,
    EngineeringBayScene,
    TileIndexViewerScene,
    PropsViewerScene,
    LevelTestScene,
    TownScene,
  ],
};

const game = new Game(config);

// Expose game to window for debugging
(window as any).game = game;

// Handle window resize
window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
