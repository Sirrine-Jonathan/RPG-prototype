import { Tool } from './BaseActor';
import { InventorySystem, InventoryItem } from '../systems/InventorySystem';

export class Bookshelf {
  public id: string;
  public name: string;
  public x: number;
  public y: number;
  public inventory: string[];
  private searchedBy: Set<string> = new Set(); // Track who has searched this bookshelf
  
  constructor(config: {
    id: string;
    name: string;
    x: number;
    y: number;
    inventory?: string[];
  }) {
    this.id = config.id;
    this.name = config.name;
    this.x = config.x;
    this.y = config.y;
    this.inventory = config.inventory || [];
  }
  
  search(searcherId: string): string[] {
    this.searchedBy.add(searcherId);
    return [...this.inventory];
  }
  
  addItem(item: string): void {
    if (!this.inventory.includes(item)) {
      this.inventory.push(item);
    }
  }
  
  removeItem(item: string): boolean {
    const index = this.inventory.indexOf(item);
    if (index > -1) {
      this.inventory.splice(index, 1);
      return true;
    }
    return false;
  }

  hasSearched(actorId: string): boolean {
    return this.searchedBy.has(actorId);
  }
  
  // Offer tools based on proximity and search status
  getOfferedTools(nearbyActorId?: string): Tool[] {
    const tools: Tool[] = [];

    // Always offer search tool
    tools.push({
      name: 'search_bookshelf',
      description: 'Search this bookshelf for books',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async (params: any) => {
        const searcherId = params.searcherId || nearbyActorId;
        const books = this.search(searcherId);
        const bookList = books.length > 0 ? books.join(', ') : 'no books';
        return { 
          success: true, 
          message: `Found books on ${this.name}: ${bookList}` 
        };
      }
    });

    // If this actor has searched before, offer take/place tools
    if (nearbyActorId && this.hasSearched(nearbyActorId)) {
      tools.push({
        name: 'take_book',
        description: `Take a book from ${this.name}. Available: ${this.inventory.join(', ')}`,
        parameters: {
          type: 'object',
          properties: {
            bookName: { type: 'string', description: 'Name of book to take' }
          },
          required: ['bookName']
        },
        handler: async (params: any) => {
          if (this.inventory.includes(params.bookName)) {
            this.removeItem(params.bookName);
            
            // Add to actor's inventory
            const inventorySystem = InventorySystem.getInstance();
            inventorySystem.addItem(nearbyActorId!, {
              id: `book_${params.bookName.toLowerCase().replace(/\s+/g, '_')}`,
              name: params.bookName,
              description: `A book titled "${params.bookName}"`,
              category: 'book'
            });

            return { success: true, message: `Took "${params.bookName}" from ${this.name}` };
          }
          return { success: false, message: `"${params.bookName}" not found on ${this.name}` };
        }
      });

      tools.push({
        name: 'place_book',
        description: `Place a book on ${this.name}`,
        parameters: {
          type: 'object',
          properties: {
            bookName: { type: 'string', description: 'Name of book to place' }
          },
          required: ['bookName']
        },
        handler: async (params: any) => {
          const inventorySystem = InventorySystem.getInstance();
          const inventory = inventorySystem.getInventory(nearbyActorId!);
          const book = inventory.find(item => item.name === params.bookName && item.category === 'book');
          
          if (book) {
            inventorySystem.removeItem(nearbyActorId!, book.id);
            this.addItem(params.bookName);
            return { success: true, message: `Placed "${params.bookName}" on ${this.name}` };
          }
          return { success: false, message: `Don't have book "${params.bookName}" to place` };
        }
      });
    }

    return tools;
  }
  
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}