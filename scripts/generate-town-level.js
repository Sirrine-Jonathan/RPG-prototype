// Generate town level JSON from logged data
const width = 50;
const height = 38;

// Initialize with grass (frame 0)
const background = Array(height).fill(null).map(() => Array(width).fill(0));

// Road positions (frame 8) - horizontal roads at y: 9, 17-19, 28
// Vertical roads at x: 12, 24-26, 37
const roadPositions = [
  // Horizontal roads
  { y: 9, x: 'all' },
  { y: 17, x: 'all' },
  { y: 18, x: 'all' },
  { y: 19, x: 'all' },
  { y: 28, x: 'all' },
  // Vertical roads
  { x: 12, y: 'all' },
  { x: 24, y: 'all' },
  { x: 25, y: 'all' },
  { x: 26, y: 'all' },
  { x: 37, y: 'all' }
];

// Apply roads
roadPositions.forEach(road => {
  if (road.x === 'all') {
    for (let x = 0; x < width; x++) {
      if (road.y < height) background[road.y][x] = 8;
    }
  } else if (road.y === 'all') {
    for (let y = 0; y < height; y++) {
      if (road.x < width) background[y][road.x] = 8;
    }
  }
});

console.log('Generated background array:');
console.log(JSON.stringify(background, null, 2));
