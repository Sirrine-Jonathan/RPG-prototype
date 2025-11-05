import { Scene } from 'phaser';
import { InteractiveObject, InteractionResult } from './InteractiveObject';
import { NPCTool } from '../services/AIService';

export class WellObject extends InteractiveObject {
  private hasWater: boolean = true;
  private isClean: boolean = true;

  constructor(scene: Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, 'Town Well', 0x4a90e2);
  }

  getOfferedTools(): NPCTool[] {
    const tools: NPCTool[] = [
      { name: 'examine', description: 'Look into the well' },
      { name: 'draw_water', description: 'Draw water from the well' }
    ];

    if (!this.isClean) {
      tools.push({ name: 'clean', description: 'Clean the well' });
    }

    return tools;
  }

  handleInteraction(toolName: string, parameters?: any): InteractionResult {
    switch (toolName) {
      case 'examine':
        // Visual feedback: brief glow effect
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 300,
          yoyo: true,
          ease: 'Power2'
        });
        
        return {
          success: true,
          message: this.isClean ? 
            'The well water looks clear and fresh' : 
            'The well water looks murky and contaminated'
        };
      
      case 'draw_water':
        if (this.hasWater && this.isClean) {
          // Visual: water splash effect
          this.sprite.setTint(0x87ceeb);
          this.scene.time.delayedCall(1000, () => {
            this.sprite.clearTint();
          });
          
          return {
            success: true,
            message: 'Drew fresh water from the well'
          };
        }
        return {
          success: false,
          message: this.hasWater ? 'Water is too dirty to drink' : 'Well is dry'
        };
      
      case 'clean':
        if (!this.isClean) {
          this.isClean = true;
          this.setState('clean');
          this.sprite.setFillStyle(0x4a90e2);
          
          // Visual: cleaning sparkle effect
          this.sprite.setTint(0xffffff);
          this.scene.time.delayedCall(500, () => {
            this.sprite.clearTint();
          });
          
          return {
            success: true,
            message: 'Cleaned the well water'
          };
        }
        return {
          success: false,
          message: 'Well is already clean'
        };
      
      default:
        return { success: false, message: `Cannot ${toolName} with ${this.name}` };
    }
  }
}

export class NoticeBoard extends InteractiveObject {
  private notices: string[] = [
    "Missing cat - reward offered",
    "Town meeting tonight at 7pm", 
    "Strange sounds from the forest"
  ];

  constructor(scene: Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, 'Notice Board', 0x8b4513);
  }

  getOfferedTools(): NPCTool[] {
    return [
      { name: 'read', description: 'Read the notices on the board' },
      { name: 'post_notice', description: 'Post a new notice' }
    ];
  }

  handleInteraction(toolName: string, parameters?: any): InteractionResult {
    switch (toolName) {
      case 'read':
        const notice = Phaser.Utils.Array.GetRandom(this.notices);
        return {
          success: true,
          message: `Read notice: "${notice}"`
        };
      
      case 'post_notice':
        const newNotices = [
          "Seeking information about recent events",
          "Anyone seen unusual activity?",
          "Looking for help with investigation"
        ];
        const newNotice = Phaser.Utils.Array.GetRandom(newNotices);
        this.notices.push(newNotice);
        return {
          success: true,
          message: `Posted notice: "${newNotice}"`
        };
      
      default:
        return { success: false, message: `Cannot ${toolName} with ${this.name}` };
    }
  }
}

export class Barrel extends InteractiveObject {
  private contents: string = 'grain';
  private isOpen: boolean = false;

  constructor(scene: Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, 'Storage Barrel', 0x654321);
  }

  getOfferedTools(): NPCTool[] {
    const tools: NPCTool[] = [
      { name: 'examine', description: 'Look at the barrel' }
    ];

    if (!this.isOpen) {
      tools.push({ name: 'open', description: 'Open the barrel' });
    } else {
      tools.push({ name: 'search', description: 'Search inside the barrel' });
    }

    return tools;
  }

  handleInteraction(toolName: string, parameters?: any): InteractionResult {
    switch (toolName) {
      case 'examine':
        return {
          success: true,
          message: this.isOpen ? 
            `Open barrel containing ${this.contents}` : 
            'A sealed wooden barrel'
        };
      
      case 'open':
        if (!this.isOpen) {
          this.isOpen = true;
          this.setState('open');
          this.sprite.setStrokeStyle(3, 0x00ff00);
          return {
            success: true,
            message: `Opened barrel and found ${this.contents}`
          };
        }
        return {
          success: false,
          message: 'Barrel is already open'
        };
      
      case 'search':
        if (this.isOpen) {
          const findings = ['old coins', 'a mysterious key', 'nothing interesting'];
          const found = Phaser.Utils.Array.GetRandom(findings);
          return {
            success: true,
            message: `Searched barrel and found: ${found}`
          };
        }
        return {
          success: false,
          message: 'Need to open barrel first'
        };
      
      default:
        return { success: false, message: `Cannot ${toolName} with ${this.name}` };
    }
  }
}

export class Bench extends InteractiveObject {
  private isOccupied: boolean = false;

  constructor(scene: Scene, x: number, y: number, id: string) {
    super(scene, x, y, id, 'Town Bench', 0x8b4513);
  }

  getOfferedTools(): NPCTool[] {
    return [
      { name: 'sit', description: 'Sit on the bench and rest' },
      { name: 'examine', description: 'Look at the bench' }
    ];
  }

  handleInteraction(toolName: string, parameters?: any): InteractionResult {
    switch (toolName) {
      case 'sit':
        if (!this.isOccupied) {
          this.isOccupied = true;
          this.setState('occupied');
          
          // Visual: change color and add sitting indicator
          this.sprite.setFillStyle(0x654321);
          this.nameText.setText('Town Bench (Occupied)');
          
          setTimeout(() => {
            this.isOccupied = false;
            this.setState('empty');
            this.sprite.setFillStyle(0x8b4513);
            this.nameText.setText('Town Bench');
          }, 5000);
          
          return {
            success: true,
            message: 'Sat down on the bench to rest'
          };
        }
        return {
          success: false,
          message: 'Bench is currently occupied'
        };
      
      case 'examine':
        // Visual feedback: brief highlight
        this.sprite.setTint(0xffff88);
        this.scene.time.delayedCall(500, () => {
          this.sprite.clearTint();
        });
        
        return {
          success: true,
          message: this.isOccupied ? 
            'A wooden bench, currently occupied' : 
            'A sturdy wooden bench, perfect for resting'
        };
      
      default:
        return { success: false, message: `Cannot ${toolName} with ${this.name}` };
    }
  }
}