const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '../../public/assets')));

const LEVELS_DIR = path.join(__dirname, '../../levels');
const ASSETS_DIR = path.join(__dirname, '../../public/assets');

// Ensure levels directory exists
if (!fs.existsSync(LEVELS_DIR)) {
    fs.mkdirSync(LEVELS_DIR, { recursive: true });
}

// Get all available tilesets
app.get('/api/assets', (req, res) => {
    try {
        const assets = scanAssets(ASSETS_DIR);
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all levels
app.get('/api/levels', (req, res) => {
    try {
        const levels = fs.readdirSync(LEVELS_DIR)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const levelPath = path.join(LEVELS_DIR, file);
                const stats = fs.statSync(levelPath);
                const levelData = JSON.parse(fs.readFileSync(levelPath, 'utf8'));
                
                return {
                    id: path.basename(file, '.json'),
                    name: levelData.name || path.basename(file, '.json'),
                    width: levelData.width,
                    height: levelData.height,
                    lastModified: stats.mtime,
                    tileset: levelData.tileset ? path.basename(levelData.tileset) : null
                };
            });
        
        res.json(levels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Load specific level
app.get('/api/levels/:id', (req, res) => {
    try {
        const levelPath = path.join(LEVELS_DIR, `${req.params.id}.json`);
        if (!fs.existsSync(levelPath)) {
            return res.status(404).json({ error: 'Level not found' });
        }
        
        const levelData = JSON.parse(fs.readFileSync(levelPath, 'utf8'));
        res.json(levelData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save level
app.post('/api/levels/:id', (req, res) => {
    try {
        const levelPath = path.join(LEVELS_DIR, `${req.params.id}.json`);
        const levelData = {
            ...req.body,
            name: req.body.name || req.params.id,
            lastModified: new Date().toISOString()
        };
        
        fs.writeFileSync(levelPath, JSON.stringify(levelData, null, 2));
        res.json({ success: true, message: 'Level saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete level
app.delete('/api/levels/:id', (req, res) => {
    try {
        const levelPath = path.join(LEVELS_DIR, `${req.params.id}.json`);
        if (fs.existsSync(levelPath)) {
            fs.unlinkSync(levelPath);
        }
        res.json({ success: true, message: 'Level deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function scanAssets(dir, relativePath = '') {
    const assets = [];
    
    try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);
            const itemRelativePath = path.join(relativePath, item);
            
            if (stats.isDirectory()) {
                // Recursively scan subdirectories
                assets.push(...scanAssets(fullPath, itemRelativePath));
            } else if (isImageFile(item)) {
                assets.push({
                    name: item,
                    path: itemRelativePath.replace(/\\/g, '/'), // Normalize path separators
                    fullPath: `/assets/${itemRelativePath.replace(/\\/g, '/')}`,
                    size: stats.size,
                    lastModified: stats.mtime,
                    type: 'image'
                });
            }
        }
    } catch (error) {
        console.error(`Error scanning ${dir}:`, error.message);
    }
    
    return assets;
}

function isImageFile(filename) {
    // Only PNG files for tilesets
    return filename.toLowerCase().endsWith('.png');
}

app.listen(PORT, () => {
    console.log(`Level Editor Server running on http://localhost:${PORT}`);
    console.log(`Assets directory: ${ASSETS_DIR}`);
    console.log(`Levels directory: ${LEVELS_DIR}`);
});
