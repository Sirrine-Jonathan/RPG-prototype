const fs = require('fs');
const path = require('path');

// Create a simple hospital level
const hospitalLevel = {
  name: "Hospital Interior",
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
      // Hospital entrance portal (returns to town)
      {
        id: 'hospital_exit',
        type: 'portal',
        subtype: 'scene_exit',
        x: 10,
        y: 14, // Bottom center
        properties: {
          portalId: 'hospital_exit',
          targetScene: 'TownScene',
          targetPortalId: 'hospital_return'
        }
      },
      // Spawn point for entering hospital
      {
        id: 'hospital_entrance_spawn',
        type: 'spawn',
        subtype: 'portal',
        x: 10,
        y: 12, // Two tiles north of exit
        properties: {
          spawnId: 'hospital_entrance',
          isDefault: true
        }
      },
      // Hospital NPCs
      {
        id: 'doctor_npc',
        type: 'npc',
        subtype: 'medical',
        x: 5,
        y: 5,
        properties: {
          name: 'Dr. Wilson',
          character: 'alex',
          description: 'The head doctor of the hospital'
        }
      },
      {
        id: 'nurse_npc',
        type: 'npc',
        subtype: 'medical',
        x: 15,
        y: 8,
        properties: {
          name: 'Nurse Sarah',
          character: 'amelia',
          description: 'A caring nurse who helps patients'
        }
      }
    ]
  },
  lastModified: new Date().toISOString()
};

// Save the hospital level
const levelPath = path.join(__dirname, 'levels', 'hospital_interior.json');
fs.writeFileSync(levelPath, JSON.stringify(hospitalLevel, null, 2));

console.log('✅ Created hospital_interior level');
console.log('Hospital has 1 portal and 1 spawn point for bidirectional travel');