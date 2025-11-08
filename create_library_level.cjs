const fs = require('fs');
const path = require('path');

// Create a simple library level
const libraryLevel = {
  name: "Library Interior",
  width: 20,
  height: 15,
  tileSize: 48,
  layers: {
    background: {
      tileset: "",
      tilesetPath: "",
      data: Array(15).fill(null).map(() => Array(20).fill(-1))
    },
    collision: {
      tileset: "",
      tilesetPath: "",
      data: Array(15).fill(null).map(() => Array(20).fill(-1))
    },
    objects: [
      // Library entrance portal (returns to town)
      {
        id: 'library_exit',
        type: 'portal',
        subtype: 'scene_exit',
        x: 10,
        y: 14, // Bottom center
        properties: {
          portalId: 'library_exit',
          targetScene: 'TownScene',
          targetPortalId: 'library_return'
        }
      },
      // Spawn point for entering library
      {
        id: 'library_entrance_spawn',
        type: 'spawn',
        subtype: 'portal',
        x: 10,
        y: 12, // Two tiles north of exit
        properties: {
          spawnId: 'library_entrance',
          isDefault: true
        }
      },
      // Library NPCs
      {
        id: 'librarian_npc',
        type: 'npc',
        subtype: 'scholar',
        x: 10,
        y: 7,
        properties: {
          name: 'Eleanor Sage',
          character: 'amelia',
          description: 'The town librarian and historian'
        }
      }
    ]
  },
  lastModified: new Date().toISOString()
};

// Save the library level
const levelPath = path.join(__dirname, 'levels', 'library_interior.json');
fs.writeFileSync(levelPath, JSON.stringify(libraryLevel, null, 2));

console.log('✅ Created library_interior level');
console.log('Library has 1 portal and 1 spawn point for bidirectional travel');