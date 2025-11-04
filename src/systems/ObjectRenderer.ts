import { Scene } from 'phaser';

export class ObjectRenderer {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    createBuilding(x: number, y: number, width: number, height: number, type: 'police' | 'museum' | 'library' | 'park'): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);

        // Building base
        const building = this.scene.add.rectangle(0, 0, width, height, this.getBuildingColor(type));
        building.setStrokeStyle(3, 0x444444);

        // Roof
        const roof = this.scene.add.polygon(0, -height/2 - 10, [
            -width/2 - 5, 0,
            0, -15,
            width/2 + 5, 0
        ], this.getRoofColor(type));
        roof.setStrokeStyle(2, 0x333333);

        // Windows
        const windowSize = Math.min(width/6, height/6);
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                const windowX = (i - 0.5) * width/2;
                const windowY = (j - 0.5) * height/3;
                const window = this.scene.add.rectangle(windowX, windowY, windowSize, windowSize, 0x87CEEB);
                window.setStrokeStyle(1, 0x444444);
                container.add(window);
            }
        }

        // Door
        const door = this.scene.add.rectangle(0, height/2 - 15, width/4, 30, 0x654321);
        door.setStrokeStyle(2, 0x333333);

        // Door handle
        const handle = this.scene.add.circle(width/8 - 5, height/2 - 15, 2, 0xFFD700);

        container.add([building, roof, door, handle]);
        return container;
    }

    createDesk(x: number, y: number, width: number = 80, height: number = 40): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);

        // Desk surface
        const surface = this.scene.add.rectangle(0, 0, width, height, 0x8B4513);
        surface.setStrokeStyle(2, 0x654321);

        // Desk legs
        const legSize = 4;
        const legPositions = [
            [-width/2 + legSize, -height/2 + legSize],
            [width/2 - legSize, -height/2 + legSize],
            [-width/2 + legSize, height/2 - legSize],
            [width/2 - legSize, height/2 - legSize]
        ];

        legPositions.forEach(([legX, legY]) => {
            const leg = this.scene.add.rectangle(legX, legY, legSize, legSize, 0x654321);
            container.add(leg);
        });

        // Desk items (papers, etc.)
        const paper1 = this.scene.add.rectangle(-width/4, -height/4, width/3, height/4, 0xFFFFFF);
        paper1.setStrokeStyle(1, 0xCCCCCC);
        
        const paper2 = this.scene.add.rectangle(width/4, height/4, width/4, height/3, 0xFFFFFF);
        paper2.setStrokeStyle(1, 0xCCCCCC);

        container.add([surface, paper1, paper2]);
        return container;
    }

    createEvidenceLocker(x: number, y: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);

        // Locker body
        const body = this.scene.add.rectangle(0, 0, 60, 80, 0x666666);
        body.setStrokeStyle(3, 0x444444);

        // Lock
        const lock = this.scene.add.circle(0, 10, 6, 0x333333);
        lock.setStrokeStyle(2, 0x222222);

        // Handle
        const handle = this.scene.add.rectangle(0, -10, 20, 4, 0x888888);

        // Evidence tags
        const tag1 = this.scene.add.rectangle(-15, -20, 8, 12, 0xFFFF00);
        const tag2 = this.scene.add.rectangle(15, -25, 8, 12, 0xFF0000);

        container.add([body, lock, handle, tag1, tag2]);
        return container;
    }

    private getBuildingColor(type: string): number {
        switch (type) {
            case 'police': return 0x000080; // Navy blue
            case 'museum': return 0x8B4513; // Saddle brown
            case 'library': return 0x4A4A4A; // Dark gray
            case 'park': return 0x228B22; // Forest green
            default: return 0x696969; // Dim gray
        }
    }

    private getRoofColor(type: string): number {
        switch (type) {
            case 'police': return 0x000060; // Darker navy
            case 'museum': return 0x654321; // Dark brown
            case 'library': return 0x333333; // Darker gray
            case 'park': return 0x006400; // Dark green
            default: return 0x444444; // Dark gray
        }
    }
}