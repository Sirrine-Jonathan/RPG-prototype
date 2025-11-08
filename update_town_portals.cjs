const fs = require('fs');
const path = require('path');

// Load the current town level
const levelPath = path.join(__dirname, 'levels', 'town_overworld.json');
const levelData = JSON.parse(fs.readFileSync(levelPath, 'utf8'));

// Remove old building objects and add portals
levelData.layers.objects = levelData.layers.objects.filter(obj => 
  obj.type !== 'interactive' || obj.subtype !== 'building'
);

// Add portals for each building
const portals = [
  {
    id: 'town_hospital',
    type: 'portal',
    subtype: 'scene_exit',
    x: 37,
    y: 9,
    properties: {
      portalId: 'town_hospital',
      targetScene: 'HospitalScene',
      targetPortalId: 'hospital_entrance'
    }
  },
  {
    id: 'town_police',
    type: 'portal',
    subtype: 'scene_exit',
    x: 12,
    y: 9,
    properties: {
      portalId: 'town_police',
      targetScene: 'PoliceStationScene',
      targetPortalId: 'police_entrance'
    }
  },
  {
    id: 'town_library',
    type: 'portal',
    subtype: 'scene_exit',
    x: 6,
    y: 10,
    properties: {
      portalId: 'town_library',
      targetScene: 'LibraryScene',
      targetPortalId: 'library_entrance'
    }
  },
  {
    id: 'town_school',
    type: 'portal',
    subtype: 'scene_exit',
    x: 12,
    y: 20,
    properties: {
      portalId: 'town_school',
      targetScene: 'SchoolScene',
      targetPortalId: 'school_entrance'
    }
  },
  {
    id: 'town_grocery',
    type: 'portal',
    subtype: 'scene_exit',
    x: 37,
    y: 20,
    properties: {
      portalId: 'town_grocery',
      targetScene: 'GroceryStoreScene',
      targetPortalId: 'grocery_entrance'
    }
  },
  {
    id: 'town_tavern',
    type: 'portal',
    subtype: 'scene_exit',
    x: 43,
    y: 10,
    properties: {
      portalId: 'town_tavern',
      targetScene: 'TavernScene',
      targetPortalId: 'tavern_entrance'
    }
  }
];

// Add spawn points for portal returns
const spawns = [
  {
    id: 'hospital_return',
    type: 'spawn',
    subtype: 'portal',
    x: 37,
    y: 11, // One tile south of hospital portal
    properties: {
      spawnId: 'hospital_return',
      isDefault: false
    }
  },
  {
    id: 'police_return',
    type: 'spawn',
    subtype: 'portal',
    x: 12,
    y: 11, // One tile south of police portal
    properties: {
      spawnId: 'police_return',
      isDefault: false
    }
  },
  {
    id: 'library_return',
    type: 'spawn',
    subtype: 'portal',
    x: 6,
    y: 12, // One tile south of library portal
    properties: {
      spawnId: 'library_return',
      isDefault: false
    }
  }
];

// Add portals and spawns to the level
levelData.layers.objects.push(...portals, ...spawns);

// Update timestamp
levelData.lastModified = new Date().toISOString();

// Save the updated level
fs.writeFileSync(levelPath, JSON.stringify(levelData, null, 2));

console.log('✅ Updated town_overworld with portal system');
console.log(`Added ${portals.length} portals and ${spawns.length} spawn points`);