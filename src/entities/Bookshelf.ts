import { Tool } from './BaseActor';

export class Bookshelf {
  public id: string;
  public name: string;
  public x: number;
  public y: number;
  public inventory: string[];
  
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
  
  search(): string[] {
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
  
  // Offer search tool to nearby NPCs
  getOfferedTools(): Tool[] {
    return [{
      name: 'search_bookshelf',
      description: 'Search this bookshelf for books',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        const books = this.search();
        const bookList = books.length > 0 ? books.join(', ') : 'no books';
        return { 
          success: true, 
          message: `Found books on ${this.name}: ${bookList}` 
        };
      }
    }];
  }
  
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}