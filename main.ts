import { Game, AUTO } from 'phaser';
import { MainMenuScene } from './src/scenes/MainMenuScene';
import { TownScene } from './src/scenes/TownScene';
import { PoliceStationScene } from './src/scenes/PoliceStationScene';
import { MuseumScene } from './src/scenes/MuseumScene';
import { LibraryScene } from './src/scenes/LibraryScene';
import { ParkScene } from './src/scenes/ParkScene';

const config = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainMenuScene, TownScene, PoliceStationScene, MuseumScene, LibraryScene, ParkScene]
};

const game = new Game(config);

// Expose game to window for debugging
(window as any).game = game;

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});