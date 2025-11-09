import { EventBus } from '../systems/EventBus';
import { SpeechBubble } from './SpeechBubble';

export class QuickSpeechUI {
    private container?: HTMLDivElement;
    private textarea?: HTMLTextAreaElement;
    private sendButton?: HTMLButtonElement;
    private isVisible: boolean = false;
    private scene?: Phaser.Scene;
    private spaceKey?: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupKeyListener();
    }

    private setupKeyListener(): void {
        if (!this.scene?.input?.keyboard) return;
        
        const spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.on('down', () => {
            if (document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }
            
            if (!this.isVisible && !this.isTypingElsewhere()) {
                this.show();
            }
        });
        
        this.spaceKey = spaceKey;
    }

    private isTypingElsewhere(): boolean {
        const activeElement = document.activeElement;
        return activeElement instanceof HTMLInputElement || 
               activeElement instanceof HTMLTextAreaElement ||
               (activeElement as any)?.contentEditable === 'true';
    }

    private show(): void {
        if (this.isVisible) return;
        
        this.isVisible = true;
        // Remove the spacebar key listener while UI is open
        if (this.spaceKey) {
            this.spaceKey.destroy();
            this.spaceKey = undefined;
        }
        
        if (this.container) {
            // Reuse existing container with a small delay to ensure proper rendering
            setTimeout(() => {
                if (this.container) {
                    this.container.style.display = 'flex';
                    this.container.style.visibility = 'visible';
                    this.container.style.opacity = '1';
                    this.textarea!.value = '';
                    // Force a reflow to ensure styles are applied
                    this.container.offsetHeight;
                    this.textarea!.focus();
                }
            }, 10);
        } else {
            // Create new container
            this.createUI();
        }
    }

    private hide(): void {
        console.log('🎯 QuickSpeechUI.hide() called, isVisible:', this.isVisible);
        if (!this.isVisible) return;
        
        this.isVisible = false;
        // Recreate the spacebar key listener
        setTimeout(() => {
            this.setupKeyListener();
            console.log('🎯 Spacebar key listener recreated');
        }, 50);
        if (this.container) {
            // Blur the textarea before hiding
            if (this.textarea) {
                this.textarea.blur();
            }
            // Hide instead of removing
            this.container.style.display = 'none';
        }
        
        // Ensure focus is cleared
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        console.log('🎯 QuickSpeechUI.hide() completed');
    }

    private createUI(): void {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 20%;
            left: 50%;
            transform: translateX(-50%);
            width: 400px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #555;
            border-radius: 8px;
            padding: 15px;
            z-index: 2000;
            display: flex;
            gap: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        this.textarea = document.createElement('textarea');
        this.textarea.style.cssText = `
            flex: 1;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid #666;
            border-radius: 4px;
            color: white;
            padding: 8px;
            font-family: inherit;
            font-size: 14px;
            resize: none;
            height: 60px;
            outline: none;
        `;
        this.textarea.placeholder = 'Type your message...';
        
        // Disable autocorrect and text processing
        this.textarea.setAttribute('autocomplete', 'off');
        this.textarea.setAttribute('autocorrect', 'off');
        this.textarea.setAttribute('autocapitalize', 'off');
        this.textarea.setAttribute('spellcheck', 'false');
        this.textarea.setAttribute('data-gramm', 'false'); // Disable Grammarly
        this.textarea.setAttribute('data-gramm_editor', 'false');
        this.textarea.setAttribute('data-enable-grammarly', 'false');
        
        // Try to disable iOS text replacement
        this.textarea.style.webkitTextSizeAdjust = 'none';
        (this.textarea as any).inputMode = 'none';

        this.sendButton = document.createElement('button');
        this.sendButton.style.cssText = `
            background: #4a90e2;
            border: none;
            border-radius: 4px;
            color: white;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            height: 60px;
            transition: background 0.2s;
        `;
        this.sendButton.textContent = 'Send';

        // Event listeners
        this.textarea.addEventListener('keydown', (e) => {
            // Only handle spacebar manually, let everything else work normally
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                const start = this.textarea!.selectionStart;
                const end = this.textarea!.selectionEnd;
                const value = this.textarea!.value;
                this.textarea!.value = value.substring(0, start) + ' ' + value.substring(end);
                this.textarea!.selectionStart = this.textarea!.selectionEnd = start + 1;
                return;
            }
            
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'Escape') {
                this.hide();
            }
            
            // Let all other keys (including 'c', arrows, etc.) work normally
        });
        
        this.textarea.addEventListener('input', (e) => {
            // Remove logging
        });

        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.sendButton.addEventListener('mouseenter', () => {
            this.sendButton!.style.background = '#357abd';
        });
        this.sendButton.addEventListener('mouseleave', () => {
            this.sendButton!.style.background = '#4a90e2';
        });

        this.container.appendChild(this.textarea);
        this.container.appendChild(this.sendButton);
        document.body.appendChild(this.container);

        // Auto-focus
        this.textarea.focus();
    }

    private sendMessage(): void {
        if (!this.textarea) return;
        
        const message = this.textarea.value.trim();
        if (!message) return;

        // Fire the same events as ChatInterface
        const eventBus = EventBus.getInstance();
        const playerPos = this.getPlayerPosition();
        
        eventBus.emit('player_speech', {
            speaker: "Player",
            speakerId: "player", 
            message: message,
            position: playerPos,
            timestamp: Date.now()
        });

        // Show speech bubble over player
        this.showPlayerSpeechBubble(message, playerPos);

        console.log(`📨 QUICK SPEECH Player speaks: "${message}"`);
        
        this.hide();
    }

    private showPlayerSpeechBubble(message: string, position: { x: number; y: number }): void {
        if (!this.scene) return;
        
        console.log('🎯 Looking for player sprite...');
        
        // Try different ways to find the player
        let player = this.scene.children.getByName('player') as Phaser.GameObjects.Sprite;
        if (!player) {
            // Look for the sprite that the camera is following
            const camera = this.scene.cameras.main;
            console.log('🎯 Camera follow target:', camera.followTarget);
            if (camera.followTarget) {
                player = camera.followTarget as Phaser.GameObjects.Sprite;
                console.log('🎯 Found player via camera follow target:', player.constructor.name);
            }
        }
        
        if (!player) {
            // Try to find by position (player should be at the position we calculated)
            const sprites = this.scene.children.list.filter(c => c.type === 'Sprite') as Phaser.GameObjects.Sprite[];
            console.log('🎯 Found', sprites.length, 'sprites, looking for one near position:', position);
            player = sprites.find(s => Math.abs(s.x - position.x) < 50 && Math.abs(s.y - position.y) < 50);
            if (player) {
                console.log('🎯 Found player by position match at:', player.x, player.y);
            }
        }
        
        if (!player) {
            console.log('🎯 Player sprite not found, skipping speech bubble');
            return;
        }

        console.log('🎯 Creating speech bubble for player at:', player.x, player.y);
        const speechBubble = new SpeechBubble(this.scene);
        speechBubble.show(player.x, player.y - 50, message, "Player", true, player);
        
        // Auto-hide after 3 seconds
        this.scene.time.delayedCall(3000, () => {
            speechBubble.hide();
        });
    }

    private getPlayerPosition(): { x: number; y: number } {
        // Try to get player position from camera follow target first
        const camera = this.scene!.cameras.main;
        if (camera.followTarget) {
            const target = camera.followTarget as any;
            return { x: target.x, y: target.y };
        }
        
        // Try to find player sprite
        const sprites = this.scene!.children.list.filter(c => c.type === 'Sprite') as Phaser.GameObjects.Sprite[];
        if (sprites.length > 0) {
            // Assume first sprite is player for now
            return { x: sprites[0].x, y: sprites[0].y };
        }
        
        // Fallback to center of scene
        return { x: 1200, y: 900 };
    }
}
