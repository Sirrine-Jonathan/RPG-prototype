import { Scene } from 'phaser';
import { NPCTool } from '../services/AIService';

export interface InteractionResult {
    success: boolean;
    message?: string;
    stateChange?: string;
}

export abstract class InteractiveObject {
    public sprite: Phaser.GameObjects.Rectangle;
    public nameText: Phaser.GameObjects.Text;
    public scene: Scene;
    public id: string;
    public name: string;
    public discovered: boolean = false;
    protected state: string = 'default';

    constructor(scene: Scene, x: number, y: number, id: string, name: string, color: number = 0x8b4513) {
        this.scene = scene;
        this.id = id;
        this.name = name;
        
        this.sprite = scene.add.rectangle(x, y, 30, 30, color);
        this.sprite.setStrokeStyle(2, 0xffffff);
        
        this.nameText = scene.add.text(x, y - 25, name, {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);
    }

    // Called when NPC discovers this object
    onDiscovered(): void {
        this.discovered = true;
        this.sprite.setStrokeStyle(3, 0xffff88); // Thick yellow border for discovered objects
    }

    // Get available tools for NPCs to interact with this object
    abstract getAvailableTools(): NPCTool[];

    // Handle interaction from NPC
    abstract handleInteraction(toolName: string, parameters?: any): InteractionResult;

    // Get current state description for NPC context
    getStateDescription(): string {
        return `${this.name} (${this.state})`;
    }

    setState(newState: string): void {
        this.state = newState;
    }

    getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    destroy(): void {
        this.sprite.destroy();
        this.nameText.destroy();
    }
}

// Example implementation
export class Desk extends InteractiveObject {
    private hasEvidence: boolean = true;

    constructor(scene: Scene, x: number, y: number, id: string) {
        super(scene, x, y, id, 'Desk', 0x8b4513);
    }

    getAvailableTools(): NPCTool[] {
        const tools: NPCTool[] = [
            {
                name: 'examine_desk',
                description: 'Look through the desk drawers and surface'
            }
        ];

        if (this.hasEvidence) {
            tools.push({
                name: 'hide_evidence',
                description: 'Hide evidence in the desk drawer'
            });
        }

        return tools;
    }

    handleInteraction(toolName: string, parameters?: any): InteractionResult {
        switch (toolName) {
            case 'examine_desk':
                return {
                    success: true,
                    message: `Examined the ${this.name}. Found some papers and office supplies.`
                };
            
            case 'hide_evidence':
                if (this.hasEvidence) {
                    this.hasEvidence = false;
                    this.setState('evidence_hidden');
                    this.sprite.setStrokeStyle(2, 0x666666); // Gray border when evidence hidden
                    return {
                        success: true,
                        message: 'Evidence hidden in desk drawer',
                        stateChange: 'evidence_hidden'
                    };
                }
                return {
                    success: false,
                    message: 'No evidence to hide'
                };
            
            default:
                return {
                    success: false,
                    message: `Cannot ${toolName} with ${this.name}`
                };
        }
    }
}