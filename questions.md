# Questions for Moving Forward

## Story & Game Design Questions

### 1. Player Character Identity
- Should the player character be "Detective Riley" as mentioned in story.md, or a customizable character?
- What's Riley's backstory importance to gameplay vs. just narrative flavor?
- Should we implement the "failed case trauma" motivation mechanically or just in dialogue?

### 2. Evidence Collection Mechanics
- How should evidence be presented visually? (UI overlays, inventory grid, case board?)
- Should evidence have different types (physical, testimonial, photographic) with different mechanics?
- Do we need evidence authentication/verification mechanics, or just collection?

### 3. Puzzle Difficulty & Hints
- How much guidance should NPCs provide for puzzle solutions?
- Should there be a hint system for stuck players?
- Are the 7 puzzles meant to be solved in sequence, or can some be done in parallel?

### 4. NPC Conversation System
- Should conversations be:
  - Free-form AI chat with story awareness?
  - Branching dialogue trees with AI enhancement?
  - Hybrid approach?
- How do we balance AI unpredictability with story consistency?

## Technical Implementation Questions

### 5. Save System Scope
- What exactly needs to be saved? (story progress, NPC relationships, evidence, conversations?)
- Should we support multiple save slots or just auto-save?
- Do we need cloud save functionality for the PWA?

### 6. Mobile UI Priorities
- Which UI elements are most critical for mobile optimization?
- Should we implement gesture controls (swipe, pinch-to-zoom) or stick to tap-only?
- How important is landscape vs. portrait mode support?

### 7. AI Service Configuration
- Should we support multiple LLM providers simultaneously or focus on Ollama?
- How should we handle AI service failures in critical story moments?
- Do we need different AI models for different NPC types (simple vs. complex characters)?

### 8. Performance Targets
- What's the minimum acceptable performance on mobile devices?
- Should we implement level-of-detail systems for NPCs (simpler AI when off-screen)?
- How many concurrent NPCs should the system support?

## Content Creation Questions

### 9. Asset Requirements
- Are the current placeholder graphics sufficient for the full prototype?
- Should we create custom sprites for key story NPCs vs. using generic ones?
- Do we need custom audio/music, or can we use royalty-free assets?

### 10. Level Design Philosophy
- Should locations be realistic (matching real small town layouts) or optimized for gameplay?
- How much environmental storytelling should be built into the level designs?
- Should there be hidden areas that unlock through story progression?

### 11. Dialogue Writing
- Who will write the story-specific dialogue for NPCs?
- Should we create dialogue templates for the AI to use, or let it generate freely?
- How do we maintain character voice consistency across AI-generated responses?

## Testing & Quality Assurance

### 12. Story Testing Approach
- How should we test the complete story flow without playing through manually each time?
- Should we create automated story progression tests?
- What's the process for validating AI-generated content stays on-brand?

### 13. Accessibility Requirements
- What accessibility features are required (screen reader support, colorblind-friendly UI, etc.)?
- Should we implement difficulty options for puzzles?
- Do we need text size scaling beyond standard mobile responsive design?

## Deployment & Distribution

### 14. PWA Features Priority
- Which PWA features are most important (offline play, push notifications, app-like experience)?
- Should the game work completely offline, or just cache assets?
- Do we need app store distribution or just web-based?

### 15. Analytics & Feedback
- What player behavior should we track for improving the experience?
- Should we implement in-game feedback collection?
- How do we measure story engagement and puzzle difficulty?

---

**Please answer these questions to help prioritize development efforts and ensure we're building the right experience.**