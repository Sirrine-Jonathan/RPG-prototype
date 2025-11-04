import { Scene } from 'phaser';

export class LibraryScene extends Scene {
    constructor() {
        super({ key: 'LibraryScene' });
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x4a4a4a);
        
        // Title
        this.add.text(width / 2, 80, 'Library', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Back to town button
        this.add.text(50, 50, '← Town', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#16213e',
            padding: { x: 10, y: 5 }
        }).setInteractive()
        .on('pointerdown', () => this.returnToTown());
        
        // Placeholder content
        this.add.text(width / 2, height / 2, 'Library Interior\n\nBooks and NPCs will go here', {
            fontSize: '18px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }
    
    returnToTown() {
        const returnScene = this.registry.get('returnScene') || 'TownScene';
        this.scene.start(returnScene);
    }
}