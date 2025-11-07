// Generate L-shaped road layout for town
const width = 58;
const height = 38;

// Create background layer (grass = 16, road = 4 based on Tileset_1_MV)
const background = Array(height).fill().map(() => Array(width).fill(16)); // Fill with grass

// Create L-shaped road: enter at left (y=20), go to x=15, turn up to y=0
const roadY = 20;
const turnX = 15;

// Horizontal road from x=0 to turnX
for (let x = 0; x <= turnX; x++) {
    background[roadY][x] = 4; // Road tile
    background[roadY - 1][x] = 4; // Make road 2 tiles wide
}

// Vertical road from roadY to y=0
for (let y = 0; y <= roadY; y++) {
    background[y][turnX] = 4; // Road tile
    background[y][turnX + 1] = 4; // Make road 2 tiles wide
}

// Create empty layers for buildings and trees
const buildings = Array(height).fill().map(() => Array(width).fill(0));
const trees = Array(height).fill().map(() => Array(width).fill(0));

// Create collision layer (roads are walkable = 0, everything else = 0 for now)
const collision = Array(height).fill().map(() => Array(width).fill(0));

console.log('Background layer:');
console.log(JSON.stringify(background));
console.log('\nBuildings layer:');
console.log(JSON.stringify(buildings));
console.log('\nTrees layer:');
console.log(JSON.stringify(trees));
console.log('\nCollision layer:');
console.log(JSON.stringify(collision));
