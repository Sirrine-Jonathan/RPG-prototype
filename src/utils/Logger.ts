export enum LogTag {
  // Core Systems
  PROXIMITY = "Proximity",
  INVENTORY = "Inventory",
  CONVERSATION = "Conversation",
  TOOLS = "Tools",
  PLAYER_SPEECH = "PlayerSpeech",
  NPC_EVENTS_RAW = "NPCEventsRaw",
  NPC_EVENTS_PROCESSED = "NPCEventsProcessed",

  // AI System
  AI_PROMPT = "AI][Prompt",
  AI_TOOL = "AI][Tool",
  AI_RESPONSE = "AI][Response",
  AI_FALLBACK = "AI][Fallback",

  // Movement per entity
  PLAYER_MOVE = "Player][Move",
  GUIDE_MOVE = "Guide][Move",
  ASSISTANT_MOVE = "Assistant][Move",
  NPC_MOVE = "NPC][Move",

  // NPC Behavior
  NPC_BEHAVIOR = "NPC][Behavior",
  NPC_GOAL = "NPC][Goal",
  NPC_STATE = "NPC][State",

  // LLM Interface (Critical for debugging)
  LLM_REQUEST = "LLM][Request",
  LLM_CONTEXT = "LLM][Context",
  LLM_TOOLS_OFFERED = "LLM][ToolsOffered",
  LLM_RESPONSE_RAW = "LLM][ResponseRaw",
  LLM_TOOL_USED = "LLM][ToolUsed",
  LLM_TOOL_RESULT = "LLM][ToolResult",
  LLM_FOLLOWUP = "LLM][Followup",
  LLM_INTERFACE = "LLM][Interface",

  // Player UI Events
  PLAYER_UI_SPEECH_BUBBLE = "PlayerUI][SpeechBubble",
  PLAYER_UI_CHAT = "PlayerUI][Chat",

  // Game Events
  SCENE = "Scene",
  GAME_STATE = "GameState",
  ERROR = "Error",
  DEBUG = "Debug",
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  tag: LogTag;
  level: LogLevel;
  entity?: string; // NPC name, player, etc
  message: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;
  private backendUrl = "http://localhost:3003/api/logs"; // Configurable
  private currentLogLevel = LogLevel.DEBUG;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private constructor() {
    // Flush logs to backend every 5 seconds
    setInterval(() => this.flushToBackend(), 5000);
  }

  log(
    tag: LogTag,
    message: string,
    entity?: string,
    data?: any,
    level: LogLevel = LogLevel.INFO
  ): void {
    if (level < this.currentLogLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      tag,
      level,
      entity,
      message,
      data,
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Log to console with formatting
    this.logToConsole(entry);
  }

  private logToConsole(entry: LogEntry): void {
    const entityStr = entry.entity ? `][${entry.entity}` : "";
    const tagStr = `[${entry.tag}${entityStr}]`;
    const timeStr = entry.timestamp.split("T")[1].split(".")[0]; // HH:MM:SS
    const fullMessage = `${timeStr} ${tagStr} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, entry.data || "");
        break;
      case LogLevel.INFO:
        console.log(fullMessage, entry.data || "");
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, entry.data || "");
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, entry.data || "");
        break;
    }
  }

  private async flushToBackend(): void {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToSend = [...this.logBuffer];
      this.logBuffer = []; // Clear buffer

      // Use fetch if available, otherwise skip backend logging
      if (typeof fetch !== "undefined") {
        await fetch(this.backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: logsToSend }),
        });
      }
    } catch (error) {
      // Don't log this error to avoid infinite loops
      console.warn("Failed to send logs to backend:", error);
      // Put logs back in buffer (but don't let it grow infinitely)
      if (this.logBuffer.length < this.maxBufferSize / 2) {
        this.logBuffer.unshift(...logsToSend);
      }
    }
  }

  // Convenience methods for common logging patterns
  proximity(entity: string, message: string, data?: any): void {
    this.log(LogTag.PROXIMITY, message, entity, data);
  }

  conversation(entity: string, message: string, data?: any): void {
    this.log(LogTag.CONVERSATION, message, entity, data);
  }

  npcBehavior(entity: string, message: string, data?: any): void {
    this.log(LogTag.NPC_BEHAVIOR, message, entity, data);
  }

  llmRequest(entity: string, message: string, data?: any): void {
    this.log(LogTag.LLM_REQUEST, message, entity, data);
  }

  llmResponse(entity: string, message: string, data?: any): void {
    this.log(LogTag.LLM_RESPONSE_RAW, message, entity, data);
  }

  llmToolUsed(entity: string, toolName: string, params?: any): void {
    this.log(LogTag.LLM_TOOL_USED, `Used tool: ${toolName}`, entity, params);
  }

  llmToolResult(entity: string, toolName: string, result: any): void {
    this.log(
      LogTag.LLM_TOOL_RESULT,
      `Tool result: ${toolName}`,
      entity,
      result
    );
  }

  movement(entity: string, message: string, data?: any): void {
    const tag =
      entity === "player"
        ? LogTag.PLAYER_MOVE
        : entity.toLowerCase().includes("guide")
        ? LogTag.GUIDE_MOVE
        : entity.toLowerCase().includes("assistant")
        ? LogTag.ASSISTANT_MOVE
        : LogTag.NPC_MOVE;
    this.log(tag, message, entity, data);
  }

  tools(entity: string, message: string, data?: any): void {
    this.log(LogTag.TOOLS, message, entity, data);
  }

  inventory(entity: string, message: string, data?: any): void {
    this.log(LogTag.INVENTORY, message, entity, data);
  }

  playerSpeech(speaker: string, message: string, data?: any): void {
    this.log(LogTag.PLAYER_SPEECH, `${speaker}: ${message}`, speaker, data);
  }

  // Player UI visibility logging
  playerUISpeechBubble(speaker: string, message: string, data?: any): void {
    this.log(LogTag.PLAYER_UI_SPEECH_BUBBLE, `Player sees speech bubble: ${speaker} says "${message}"`, "Player", data);
  }

  playerUIChat(speaker: string, message: string, data?: any): void {
    this.log(LogTag.PLAYER_UI_CHAT, `Player sees in chat: ${speaker} says "${message}"`, "Player", data);
  }

  npcEventRaw(entity: string, eventType: string, source: string, data?: any): void {
    this.log(LogTag.NPC_EVENTS_RAW, `Raw event: ${eventType} from ${source}`, entity, data);
  }

  npcEventProcessed(entity: string, eventType: string, data?: any): void {
    this.log(LogTag.NPC_EVENTS_PROCESSED, `Processing event: ${eventType}`, entity, data);
  }

  error(message: string, entity?: string, data?: any): void {
    this.log(LogTag.ERROR, message, entity, data, LogLevel.ERROR);
  }

  debug(tag: LogTag, message: string, entity?: string, data?: any): void {
    this.log(tag, message, entity, data, LogLevel.DEBUG);
  }

  // Filter logs by tag for debugging
  getLogsByTag(tag: LogTag): LogEntry[] {
    return this.logBuffer.filter((entry) => entry.tag === tag);
  }

  getLogsByEntity(entity: string): LogEntry[] {
    return this.logBuffer.filter((entry) => entry.entity === entity);
  }

  // Export logs for analysis
  exportLogs(): string {
    return this.logBuffer
      .map((entry) => {
        const entityStr = entry.entity ? `][${entry.entity}` : "";
        const tagStr = `[${entry.tag}${entityStr}]`;
        return `${entry.timestamp} ${tagStr} ${entry.message}`;
      })
      .join("\n");
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }
}
