// Generate town tile arrays
const width = 50;
const height = 38;

// Initialize with grass (frame 0)
const background = Array(height).fill(null).map(() => Array(width).fill(0));
const collision = Array(height).fill(null).map(() => Array(width).fill(0)); // 0 = walkable

// Add roads (frame 8) based on console data
// Horizontal roads: y = 9, 17, 18, 19, 28
// Vertical roads: x = 12, 24, 25, 26, 37

// Horizontal roads
[9, 17, 18, 19, 28].forEach(y => {
  if (y < height) {
    for (let x = 0; x < width; x++) {
      background[y][x] = 8;
    }
  }
});

// Vertical roads  
[12, 24, 25, 26, 37].forEach(x => {
  if (x < width) {
    for (let y = 0; y < height; y++) {
      background[y][x] = 8;
    }
  }
});

console.log('Background array:');
console.log(JSON.stringify(background));
console.log('\nCollision array:');
console.log(JSON.stringify(collision));
