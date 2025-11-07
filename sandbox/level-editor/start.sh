#!/bin/bash

echo "🎮 Starting RPG Level Editor..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting backend server on http://localhost:3001"
echo "🎨 Level Editor will be available at http://localhost:4200/sandbox/level-editor/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
