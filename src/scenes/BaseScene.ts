import { Scene } from 'phaser';
import { ChatInterface } from '../ui/ChatInterface';

export class BaseScene extends Scene {
    protected chatInterface!: ChatInterface;
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private gameArea = { width: 800, height: 600 };

    create() {
        // Set up camera controls
        this.setupCameraControls();
        
        // Get or create singleton chat interface
        this.chatInterface = ChatInterface.getInstance(this);
        
        // Don't set camera bounds initially - will be set in setGameAreaSize
        this.cameras.main.setZoom(1);
        
        // Disable right-click context menu
        this.game.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    private setupCameraControls() {
        // Mouse wheel zoom (smaller steps)
        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
            const camera = this.cameras.main;
            const zoomFactor = deltaY > 0 ? 0.97 : 1.03; // 3% steps instead of 10%
            const newZoom = Phaser.Math.Clamp(camera.zoom * zoomFactor, 0.5, 2);
            camera.setZoom(newZoom);
        });

        // Right mouse button for panning (context menu disabled)
        // Also support middle mouse as alternative
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
                this.isDragging = true;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                // Change cursor to indicate panning mode
                this.game.canvas.style.cursor = 'grabbing';
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && (pointer.rightButtonDown() || pointer.middleButtonDown())) {
                const camera = this.cameras.main;
                const deltaX = (pointer.x - this.dragStartX) / camera.zoom;
                const deltaY = (pointer.y - this.dragStartY) / camera.zoom;
                
                camera.scrollX -= deltaX;
                camera.scrollY -= deltaY;
                
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonReleased() || pointer.middleButtonReleased()) {
                this.isDragging = false;
                this.game.canvas.style.cursor = 'default';
            }
        });

        // Touch controls for mobile
        this.setupTouchControls();

        // Keyboard controls
        this.setupKeyboardControls();
    }

    private setupTouchControls() {
        let initialDistance = 0;
        let initialZoom = 1;
        let touchStartX = 0;
        let touchStartY = 0;
        let isTouchPanning = false;

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.input.activePointer.pointerId !== pointer.pointerId) {
                // Multi-touch detected
                const pointers = this.input.manager.pointers;
                if (pointers.length >= 2) {
                    const pointer1 = pointers[0];
                    const pointer2 = pointers[1];
                    initialDistance = Phaser.Math.Distance.Between(
                        pointer1.x, pointer1.y, pointer2.x, pointer2.y
                    );
                    initialZoom = this.cameras.main.zoom;
                }
            } else if (this.input.manager.pointers.length === 1) {
                // Single touch - check if it's a long press for panning
                touchStartX = pointer.x;
                touchStartY = pointer.y;
                
                this.time.delayedCall(500, () => {
                    if (pointer.isDown && !isTouchPanning) {
                        isTouchPanning = true;
                        this.isDragging = true;
                        this.dragStartX = pointer.x;
                        this.dragStartY = pointer.y;
                    }
                });
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            const pointers = this.input.manager.pointers;
            
            if (pointers.length >= 2) {
                // Pinch to zoom
                const pointer1 = pointers[0];
                const pointer2 = pointers[1];
                const currentDistance = Phaser.Math.Distance.Between(
                    pointer1.x, pointer1.y, pointer2.x, pointer2.y
                );
                
                if (initialDistance > 0) {
                    const zoomFactor = currentDistance / initialDistance;
                    const newZoom = Phaser.Math.Clamp(initialZoom * zoomFactor, 0.5, 2);
                    this.cameras.main.setZoom(newZoom);
                }
            } else if (isTouchPanning && this.isDragging) {
                // Touch pan
                const camera = this.cameras.main;
                const deltaX = (pointer.x - this.dragStartX) / camera.zoom;
                const deltaY = (pointer.y - this.dragStartY) / camera.zoom;
                
                camera.scrollX -= deltaX;
                camera.scrollY -= deltaY;
                
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.input.manager.pointers.length <= 1) {
                initialDistance = 0;
                if (isTouchPanning) {
                    isTouchPanning = false;
                    this.isDragging = false;
                }
            }
        });
    }

    private setupKeyboardControls() {
        // Keyboard zoom controls
        const zoomInKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
        const zoomOutKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS);
        
        // Also support = key for zoom in (no shift needed)
        const zoomInKey2 = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
        
        zoomInKey?.on('down', () => {
            const camera = this.cameras.main;
            camera.setZoom(Phaser.Math.Clamp(camera.zoom * 1.05, 0.5, 2)); // 5% steps for keyboard
        });
        
        zoomInKey2?.on('down', () => {
            const camera = this.cameras.main;
            camera.setZoom(Phaser.Math.Clamp(camera.zoom * 1.05, 0.5, 2)); // 5% steps for keyboard
        });
        
        zoomOutKey?.on('down', () => {
            const camera = this.cameras.main;
            camera.setZoom(Phaser.Math.Clamp(camera.zoom * 0.95, 0.5, 2)); // 5% steps for keyboard
        });

        // Pan camera with WASD (when not typing in chat)
        const panSpeed = 5;
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            // Don't handle keyboard if chat input is focused
            if (document.activeElement?.tagName === 'TEXTAREA' || 
                document.activeElement?.tagName === 'INPUT') {
                return;
            }
            
            const camera = this.cameras.main;
            switch (event.code) {
                case 'KeyW':
                    if (event.ctrlKey) camera.scrollY -= panSpeed;
                    break;
                case 'KeyA':
                    if (event.ctrlKey) camera.scrollX -= panSpeed;
                    break;
                case 'KeyS':
                    if (event.ctrlKey) camera.scrollY += panSpeed;
                    break;
                case 'KeyD':
                    if (event.ctrlKey) camera.scrollX += panSpeed;
                    break;
            }
        });
    }

    protected setGameAreaSize(width: number, height: number) {
        this.gameArea = { width, height };
        
        // Center the camera on the game area
        const camera = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Set camera to center on game area
        camera.centerOn(centerX, centerY);
        
        // Remove bounds so camera can pan freely when zoomed out
        camera.removeBounds();
    }
}