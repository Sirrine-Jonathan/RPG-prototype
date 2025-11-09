import { PersistentNPC } from './PersistentNPC';
import { Tool } from './BaseActor';

/**
 * Margaret Chen - Town Council Leader and Player Guide
 * A unique NPC that helps orient new players to the town
 */
export class GuideNPC extends PersistentNPC {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, {
      id: 'margaret_chen',
      name: 'Margaret Chen',
      spriteKey: 'alex',
      x: x,
      y: y,
      personality: 'Authoritative town leader',
      background: 'Head of City Council who welcomes visitors and provides town information'
    });
  }

  // Override to provide Margaret-specific tools
  protected getPersistentTools(): Tool[] {
    const baseTools = super.getPersistentTools();
    
    // Add Margaret-specific tools
    return [
      ...baseTools,
      {
        name: 'provide_town_info',
        description: 'Share information about the town',
        parameters: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'What aspect of town to discuss' }
          },
          required: ['topic']
        },
        handler: async (params) => this.handleTownInfo(params.topic)
      },
      {
        name: 'offer_directions',
        description: 'Give directions to town locations',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Where to direct them' }
          },
          required: ['location']
        },
        handler: async (params) => this.handleDirections(params.location)
      }
    ];
  }

  // Override system prompt for Margaret-specific context
  protected buildSystemPrompt(): string {
    const basePrompt = super.buildSystemPrompt();
    
    const margaretContext = `
MARGARET CHEN - SPECIFIC CONTEXT:
- You are the Head of City Council and unofficial town greeter
- You know everyone in town and all the important locations
- You're helpful but authoritative - you run things here
- You care about town safety and proper procedures
- You can provide directions to: Library, Tavern, Police Station, Hospital, Town Hall
- You are NOT the player's personal assistant - you are a town official

TOWN INFORMATION:
- Town Name: Millbrook
- Population: ~2,500 residents
- Founded: 1887 as a mill town
- Key Locations: Town Square (where you are), Library, Tavern, Police Station
- Current Issues: Recent strange incidents, need for community vigilance

MARGARET'S GOALS:
- Welcome new visitors and assess their intentions
- Provide helpful information about town services
- Maintain order and ensure everyone follows proper procedures
- Direct people to appropriate locations based on their needs
- Gather information about any unusual activities

BEHAVIORAL GUIDELINES:
- Always introduce yourself as Margaret Chen from the City Council
- Ask visitors about their purpose in town
- Offer specific help based on what they need
- Be professional but warm - you represent the town
- If someone seems lost, offer directions
- If someone mentions problems, direct them to appropriate authorities
- If someone asks about their assistant, you don't know where they are - suggest they look around town`;

    return basePrompt + margaretContext;
  }

  private async handleTownInfo(topic: string): Promise<{ success: boolean; message: string }> {
    console.log(`[GUIDE_NPC] Margaret providing town info about: ${topic}`);
    
    let response = '';
    switch (topic.toLowerCase()) {
      case 'history':
        response = "Millbrook was founded in 1887 around the old mill. We've grown into a thriving community of 2,500 residents.";
        break;
      case 'locations':
        response = "Key spots include our Library, the Tavern for meals, Police Station for safety, and of course Town Hall where I work.";
        break;
      case 'services':
        response = "We have all essential services - police, medical, library, and local businesses. What specifically do you need?";
        break;
      default:
        response = `I'd be happy to tell you about ${topic}. What would you like to know specifically?`;
    }
    
    this.say(response);
    return { success: true, message: `Margaret provided info about ${topic}` };
  }

  private async handleDirections(location: string): Promise<{ success: boolean; message: string }> {
    console.log(`[GUIDE_NPC] Margaret giving directions to: ${location}`);
    
    let directions = '';
    switch (location.toLowerCase()) {
      case 'library':
        directions = "The Library is just west of here. Look for the large brick building with the green door.";
        break;
      case 'tavern':
        directions = "The Tavern is north of the square. You can't miss the wooden sign and warm lights.";
        break;
      case 'police':
      case 'police station':
        directions = "Police Station is east of here, next to the Town Hall. Blue building with the flag.";
        break;
      case 'hospital':
        directions = "Medical services are south of town square. Follow the red cross signs.";
        break;
      default:
        directions = `I'm not sure exactly where ${location} is. Try checking at the Library - they have maps and local information.`;
    }
    
    this.say(directions);
    return { success: true, message: `Margaret gave directions to ${location}` };
  }
}
