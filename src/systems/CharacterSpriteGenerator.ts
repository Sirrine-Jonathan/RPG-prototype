import { Scene } from 'phaser';

export interface CharacterConfig {
    type: 'sheriff' | 'deputy' | 'doctor' | 'civilian' | 'police' | 'hobo';
    skinTone: 'light' | 'medium' | 'dark';
    hairColor: 'brown' | 'black' | 'blonde' | 'gray';
    uniform?: 'police' | 'medical' | 'casual' | 'ragged';
}

export class CharacterSpriteGenerator {
    private scene: Scene;
    private spriteSize = 20;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    generateCharacterSprite(config: CharacterConfig, textureName: string): void {
        const graphics = this.scene.add.graphics();
        const size = this.spriteSize;

        // Clear canvas
        graphics.clear();

        // Get colors based on config
        const colors = this.getCharacterColors(config);

        // Draw character (simple top-down view)
        // Head
        graphics.fillStyle(colors.skin);
        graphics.fillCircle(size/2, size/3, size/6);

        // Hair
        graphics.fillStyle(colors.hair);
        graphics.fillRect(size/2 - size/8, size/3 - size/6, size/4, size/8);

        // Body
        graphics.fillStyle(colors.uniform);
        graphics.fillRect(size/2 - size/6, size/2, size/3, size/2);

        // Arms
        graphics.fillStyle(colors.skin);
        graphics.fillRect(size/6, size/2 + size/8, size/8, size/4);
        graphics.fillRect(size - size/6 - size/8, size/2 + size/8, size/8, size/4);

        // Legs
        graphics.fillStyle(colors.pants);
        graphics.fillRect(size/2 - size/12, size - size/4, size/12, size/6);
        graphics.fillRect(size/2 + size/24, size - size/4, size/12, size/6);

        // Add accessories based on type
        this.addAccessories(graphics, config, colors, size);

        // Generate texture
        graphics.generateTexture(textureName, size, size);
        graphics.destroy();
    }

    private getCharacterColors(config: CharacterConfig) {
        const skinTones = {
            light: 0xFFDBB5,
            medium: 0xD4A574,
            dark: 0x8B4513
        };

        const hairColors = {
            brown: 0x654321,
            black: 0x2F1B14,
            blonde: 0xFAD5A5,
            gray: 0x808080
        };

        const uniformColors = {
            police: 0x000080,    // Navy blue
            medical: 0xFFFFFF,   // White
            casual: 0x4169E1,    // Royal blue
            ragged: 0x654321     // Brown/dirty
        };

        const pantsColors = {
            police: 0x000080,    // Navy blue
            medical: 0x4169E1,   // Blue
            casual: 0x654321,    // Brown
            ragged: 0x2F1B14     // Dark brown/dirty
        };

        return {
            skin: skinTones[config.skinTone],
            hair: hairColors[config.hairColor],
            uniform: uniformColors[config.uniform || 'casual'],
            pants: pantsColors[config.uniform || 'casual']
        };
    }

    private addAccessories(graphics: Phaser.GameObjects.Graphics, config: CharacterConfig, colors: any, size: number): void {
        switch (config.type) {
            case 'sheriff':
                // Badge
                graphics.fillStyle(0xFFD700); // Gold
                graphics.fillRect(size/2 - size/16, size/2 + size/16, size/8, size/12);
                // Hat
                graphics.fillStyle(0x654321); // Brown
                graphics.fillRect(size/2 - size/8, size/3 - size/4, size/4, size/8);
                break;

            case 'deputy':
            case 'police':
                // Badge
                graphics.fillStyle(0xC0C0C0); // Silver
                graphics.fillRect(size/2 - size/16, size/2 + size/16, size/8, size/12);
                break;

            case 'doctor':
                // Stethoscope
                graphics.lineStyle(1, 0x000000);
                graphics.strokeCircle(size/2, size/2 + size/4, size/16);
                // White coat collar
                graphics.fillStyle(0xFFFFFF);
                graphics.fillRect(size/2 - size/8, size/2, size/4, size/16);
                break;

            case 'hobo':
                // Beard
                graphics.fillStyle(colors.hair);
                graphics.fillRect(size/2 - size/12, size/3 + size/12, size/6, size/8);
                // Torn clothing patches
                graphics.fillStyle(0x2F1B14);
                graphics.fillRect(size/2 - size/8, size/2 + size/8, size/16, size/16);
                break;

            case 'civilian':
                // No special accessories
                break;
        }
    }

    // Generate a random character configuration
    generateRandomConfig(): CharacterConfig {
        const types: CharacterConfig['type'][] = ['sheriff', 'deputy', 'doctor', 'civilian'];
        const skinTones: CharacterConfig['skinTone'][] = ['light', 'medium', 'dark'];
        const hairColors: CharacterConfig['hairColor'][] = ['brown', 'black', 'blonde', 'gray'];
        const uniforms: CharacterConfig['uniform'][] = ['police', 'medical', 'casual'];

        const type = Phaser.Utils.Array.GetRandom(types);
        
        return {
            type,
            skinTone: Phaser.Utils.Array.GetRandom(skinTones),
            hairColor: Phaser.Utils.Array.GetRandom(hairColors),
            uniform: type === 'sheriff' || type === 'deputy' ? 'police' : 
                    type === 'doctor' ? 'medical' : 'casual'
        };
    }

    // Generate character based on personality/role
    generateFromPersonality(personality: string, role: string): CharacterConfig {
        const config: CharacterConfig = {
            type: 'civilian',
            skinTone: 'medium',
            hairColor: 'brown'
        };

        // Determine type from role
        if (role.toLowerCase().includes('sheriff')) {
            config.type = 'sheriff';
            config.uniform = 'police';
        } else if (role.toLowerCase().includes('deputy')) {
            config.type = 'deputy';
            config.uniform = 'police';
        } else if (role.toLowerCase().includes('police')) {
            config.type = 'police';
            config.uniform = 'police';
        } else if (role.toLowerCase().includes('doctor') || role.toLowerCase().includes('dr.')) {
            config.type = 'doctor';
            config.uniform = 'medical';
        } else if (role.toLowerCase().includes('hobo') || personality.includes('homeless') || personality.includes('weathered')) {
            config.type = 'hobo';
            config.uniform = 'ragged';
            config.skinTone = 'dark';
            config.hairColor = 'gray';
        }

        // Adjust appearance based on personality
        if (personality.includes('old') || personality.includes('experienced')) {
            config.hairColor = 'gray';
        } else if (personality.includes('young')) {
            config.hairColor = Phaser.Utils.Array.GetRandom(['brown', 'black', 'blonde']);
        }

        return config;
    }
}