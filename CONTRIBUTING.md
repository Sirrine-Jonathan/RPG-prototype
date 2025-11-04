# Contributing to Whispering Stones RPG

## Development Setup

### Prerequisites
- Node.js 18+ 
- Git

### Installation
```bash
npm install
```

### Ollama Setup for Local LLM Development

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.ai
   ```

2. **Start Ollama Service**
   ```bash
   ollama serve
   ```

3. **Pull Recommended Models**
   ```bash
   # For basic NPCs (faster, less capable)
   ollama pull llama3.2:3b
   
   # For advanced NPCs with tools (slower, more capable)
   ollama pull llama3.2:7b
   
   # Alternative: Smaller model for testing
   ollama pull llama3.2:1b
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```
   LLM_BASE_URL=http://localhost:11434/v1
   LLM_API_KEY=ollama
   LLM_MODEL=llama3.2:3b
   ```

### Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Build for production
npm run build
```

### Project Structure

```
/src/           # Main game implementation
/sandbox/       # Component testing playground
/tests/         # Test files
```

### Sandbox Development

Each game mechanic is developed in isolation in `/sandbox/` before integration:

1. Create component in sandbox
2. Test thoroughly with unit/integration tests
3. Integrate into main game when ready

### Testing Strategy

- Write tests as you develop (TDD approach)
- Unit tests for individual components
- Integration tests for system interactions
- Manual testing for user experience

### LLM Integration Notes

- Always provide template fallbacks
- Handle rate limiting gracefully
- Make AI vs template usage visible to users
- Test both online and offline scenarios