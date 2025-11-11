#!/usr/bin/env node

console.log('\n🎮 RPG Development Environment Starting...\n');

console.log('📍 Services:');
console.log('  • Main App:      http://localhost:4200');
console.log('  • Level Editor:  http://localhost:4200/sandbox/level-editor/');
console.log('  • NPC Sandbox:   http://localhost:4200/sandbox/npc-conversation/');
console.log('  • Ollama API:    http://localhost:11434');
console.log('  • Log Server:    http://localhost:3003');

if (process.argv.includes('--editor')) {
    console.log('\n🛠️  Level Editor Backend: http://localhost:3001');
}

console.log('\n📊 Log Filtering:');
console.log('  • All logs:      GET http://localhost:3003/api/logs');
console.log('  • By tag:        GET http://localhost:3003/api/logs?tag=LLM');
console.log('  • By entity:     GET http://localhost:3003/api/logs?entity=Margaret');
console.log('  • Combined:      GET http://localhost:3003/api/logs?tag=LLM&entity=Assistant&lines=50');

console.log('\n💡 Tips:');
console.log('  • Use Ctrl+C to stop all services');
console.log('  • Check console for any startup errors');
console.log('  • Ollama models: run "ollama list" to see available models');
console.log('  • Game logs are written to game-logs.txt');

console.log('\n🚀 Ready for development!\n');
