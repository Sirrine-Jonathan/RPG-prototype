export interface Point {
  x: number;
  y: number;
}

export interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost
  parent?: PathNode;
}

export class Pathfinding {
  private gridSize: number;
  private mapWidth: number;
  private mapHeight: number;
  private obstacles: Set<string>;

  constructor(gridSize: number = 30, mapWidth: number = 2400, mapHeight: number = 1800) {
    this.gridSize = gridSize;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.obstacles = new Set();
  }

  // Add obstacle at grid position
  addObstacle(x: number, y: number): void {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    this.obstacles.add(`${gridX},${gridY}`);
  }

  // Remove obstacle at grid position
  removeObstacle(x: number, y: number): void {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    this.obstacles.delete(`${gridX},${gridY}`);
  }

  // Check if grid position is walkable
  private isWalkable(gridX: number, gridY: number): boolean {
    // Check bounds
    if (gridX < 0 || gridY < 0 || 
        gridX >= Math.floor(this.mapWidth / this.gridSize) || 
        gridY >= Math.floor(this.mapHeight / this.gridSize)) {
      return false;
    }
    
    // Check obstacles
    return !this.obstacles.has(`${gridX},${gridY}`);
  }

  // Manhattan distance heuristic
  private heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  // Find path from start to end using A*
  findPath(startX: number, startY: number, endX: number, endY: number): Point[] {
    const startGridX = Math.floor(startX / this.gridSize);
    const startGridY = Math.floor(startY / this.gridSize);
    const endGridX = Math.floor(endX / this.gridSize);
    const endGridY = Math.floor(endY / this.gridSize);

    // If start or end is not walkable, return empty path
    if (!this.isWalkable(startGridX, startGridY) || !this.isWalkable(endGridX, endGridY)) {
      return [];
    }

    const openList: PathNode[] = [];
    const closedList: Set<string> = new Set();

    const startNode: PathNode = {
      x: startGridX,
      y: startGridY,
      g: 0,
      h: this.heuristic({ x: startGridX, y: startGridY }, { x: endGridX, y: endGridY }),
      f: 0
    };
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f cost
      let currentNode = openList[0];
      let currentIndex = 0;
      
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < currentNode.f) {
          currentNode = openList[i];
          currentIndex = i;
        }
      }

      // Remove current node from open list and add to closed list
      openList.splice(currentIndex, 1);
      closedList.add(`${currentNode.x},${currentNode.y}`);

      // Check if we reached the goal
      if (currentNode.x === endGridX && currentNode.y === endGridY) {
        const path: Point[] = [];
        let node: PathNode | undefined = currentNode;
        
        while (node) {
          path.unshift({
            x: node.x * this.gridSize + this.gridSize / 2,
            y: node.y * this.gridSize + this.gridSize / 2
          });
          node = node.parent;
        }
        
        return path;
      }

      // Check all neighbors (4-directional movement)
      const neighbors = [
        { x: currentNode.x - 1, y: currentNode.y },
        { x: currentNode.x + 1, y: currentNode.y },
        { x: currentNode.x, y: currentNode.y - 1 },
        { x: currentNode.x, y: currentNode.y + 1 }
      ];

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        // Skip if not walkable or already in closed list
        if (!this.isWalkable(neighbor.x, neighbor.y) || closedList.has(neighborKey)) {
          continue;
        }

        const g = currentNode.g + 1;
        const h = this.heuristic(neighbor, { x: endGridX, y: endGridY });
        const f = g + h;

        // Check if this path to neighbor is better
        const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);
        
        if (!existingNode) {
          // Add new node to open list
          openList.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f,
            parent: currentNode
          });
        } else if (g < existingNode.g) {
          // Update existing node with better path
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = currentNode;
        }
      }
    }

    // No path found
    return [];
  }
}