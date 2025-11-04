#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TILE_SIZE = 32;
const OUTPUT_DIR = './public/assets/tiles';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateTile(name, commands) {
    const outputPath = path.join(OUTPUT_DIR, `${name}.png`);
    const fullCommand = `magick -size ${TILE_SIZE}x${TILE_SIZE} ${commands} "${outputPath}"`;
    
    try {
        execSync(fullCommand);
        console.log(`✓ Generated ${name}.png`);
    } catch (error) {
        console.error(`✗ Failed to generate ${name}:`, error.message);
    }
}

// Floor tiles
generateTile('floor_stone', 'xc:gray70 -noise 3 -blur 0x0.5 -modulate 100,20,100');

generateTile('floor_wood', 'xc:#8B4513 -noise 2 -motion-blur 0x3+0 -modulate 100,40,100');

generateTile('floor_carpet', 'xc:#654321 -noise 4 -blur 0x0.3 -modulate 100,60,100');

// Wall tiles
generateTile('wall_brick', 'xc:#8B4513 -noise 3 -blur 0x0.5');

generateTile('wall_stone', 'xc:gray60 -noise 3 -blur 0x0.5');

generateTile('wall_wood', 'xc:#8B4513 -noise 2 -motion-blur 0x2+90 -modulate 100,50,100');

// Object tiles
generateTile('desk', 'xc:#8B4513 -fill #654321 -draw "rectangle 4,20 28,28" -fill #A0522D -draw "rectangle 6,22 26,26" -noise 1');

generateTile('chair', 'xc:transparent -fill #8B4513 -draw "rectangle 12,8 20,24" -draw "rectangle 8,20 24,28" -draw "rectangle 10,6 18,10"');

generateTile('filing_cabinet', 'xc:#696969 -fill #555555 -draw "rectangle 2,2 30,30" -fill #777777 -draw "rectangle 4,6 28,12" -draw "rectangle 4,14 28,20" -draw "rectangle 4,22 28,28"');

generateTile('door', 'xc:#8B4513 -fill #654321 -draw "rectangle 2,2 30,30" -fill #FFD700 -draw "circle 24,16 26,16"');

// Special tiles
generateTile('empty', 'xc:transparent');

generateTile('player', 'xc:transparent -fill #00FF00 -draw "rectangle 8,8 24,24" -stroke white -strokewidth 2 -draw "rectangle 8,8 24,24"');

console.log(`\n🎨 Generated ${fs.readdirSync(OUTPUT_DIR).length} tiles in ${OUTPUT_DIR}`);
console.log('Tiles created:', fs.readdirSync(OUTPUT_DIR).join(', '));