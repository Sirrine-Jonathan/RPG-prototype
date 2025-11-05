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

        // Register event listeners for this object's tools
        this.registerToolEvents();
    }

    // Called when NPC discovers this object
    onDiscovered(): void {
        this.discovered = true;
        this.sprite.setStrokeStyle(3, 0xffff88); // Thick yellow border for discovered objects
    }

    // Get available tools for NPCs to interact with this object
    abstract getOfferedTools(): NPCTool[];

    // Handle interaction from NPC
    abstract handleInteraction(toolName: string, parameters?: any): InteractionResult;

    // Register event listeners for this object's tools
    protected registerToolEvents(): void {
        const tools = this.getOfferedTools();
        tools.forEach(tool => {
            const eventName = `${tool.name}_${this.id}`;
            this.scene.events.on(eventName, this.handleToolEvent, this);
        });
    }

    private handleToolEvent = (data: { initiator: any; parameters?: any }) => {
        const eventName = this.scene.events.eventNames().find(name => 
            typeof name === 'string' && name.endsWith(`_${this.id}`)
        ) as string;
        
        if (eventName) {
            const toolName = eventName.replace(`_${this.id}`, '');
            
            // Show visual indicator that NPC is interacting
            if (data.initiator && data.initiator.name) {
                this.showActionBubble(`${data.initiator.name} is using ${toolName.replace('_', ' ')}`);
            }
            
            const result = this.handleInteraction(toolName, data.parameters);
            
            // Emit response back to initiator
            this.scene.events.emit(`tool-response-${eventName}`, {
                success: result.success,
                message: result.message,
                target: this.id
            });
        }
    };

    private showActionBubble(text: string): void {
        const bubble = this.scene.add.text(
            this.sprite.x, 
            this.sprite.y - 50, 
            text, 
            {
                fontSize: '10px',
                color: '#000000',
                backgroundColor: '#ffff88',
                padding: { x: 4, y: 2 }
            }
        ).setOrigin(0.5);

        // Auto-hide after 2 seconds
        this.scene.time.delayedCall(2000, () => {
            if (bubble) {
                bubble.destroy();
            }
        });
    }

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
        // Clean up event listeners
        const tools = this.getOfferedTools();
        tools.forEach(tool => {
            const eventName = `${tool.name}_${this.id}`;
            this.scene.events.off(eventName, this.handleToolEvent, this);
        });
        
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

    getOfferedTools(): NPCTool[] {
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