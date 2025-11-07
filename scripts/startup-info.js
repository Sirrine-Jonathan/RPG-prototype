#!/usr/bin/env node

console.log('\n🎮 RPG Development Environment Starting...\n');

console.log('📍 Services:');
console.log('  • Main App:      http://localhost:4200');
console.log('  • Level Editor:  http://localhost:4200/sandbox/level-editor/');
console.log('  • NPC Sandbox:   http://localhost:4200/sandbox/npc-conversation/');
console.log('  • Ollama API:    http://localhost:11434');

if (process.argv.includes('--editor')) {
    console.log('\n🛠️  Level Editor Backend: http://localhost:3001');
}

console.log('\n💡 Tips:');
console.log('  • Use Ctrl+C to stop all services');
console.log('  • Check console for any startup errors');
console.log('  • Ollama models: run "ollama list" to see available models');

console.log('\n🚀 Ready for development!\n');
