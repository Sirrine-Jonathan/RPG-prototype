import { Logger, LogTag } from "../utils/Logger";

export class AIService {
  private static instance: AIService;
  private logger = Logger.getInstance();
  private serverUrl: string;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  constructor() {
    this.serverUrl = 'http://localhost:8080';
  }

  async generateResponseWithTools(messages: any[], tools: any[]): Promise<any> {
    const npcName =
      messages
        .find((m) => m.role === "system")
        ?.content?.match(/You are (\w+)/)?.[1] || "Unknown";

    // Log simplified request
    const simplifiedMessages = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => {
        if (msg.role === "tool") {
          return `tool: ${msg.content}`;
        } else if (msg.tool_calls && msg.tool_calls.length > 0) {
          return `assistant: ${msg.tool_calls
            .map((tc) => tc.function.name)
            .join(", ")}`;
        } else {
          return `${msg.role}: ${msg.content || "(no content)"}`;
        }
      })
      .join("\n");

    this.logger.debug(
      LogTag.LLM_INTERFACE,
      `REQUEST [SIMPLIFIED]: ${npcName}\n\nMessages:\n${simplifiedMessages}`,
      npcName
    );

    try {
      // Validate and clean messages
      const cleanMessages = messages.map((msg) => {
        if (msg.role === "tool") {
          return {
            role: "tool",
            tool_call_id:
              msg.tool_call_id ||
              `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: msg.content || "{}",
          };
        } else if (msg.role === "assistant" && msg.tool_calls) {
          return {
            role: "assistant",
            content: msg.content || null,
            tool_calls: msg.tool_calls.map((tc) => ({
              ...tc,
              function: {
                ...tc.function,
                arguments:
                  typeof tc.function.arguments === "string"
                    ? JSON.parse(tc.function.arguments)
                    : tc.function.arguments,
              },
            })),
          };
        } else {
          return {
            role: msg.role,
            content: msg.content || "",
          };
        }
      });

      console.log(`[LLM_DEBUG] ${npcName}: Making request to server...`);
      const response = await fetch(`${this.serverUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: cleanMessages,
          tools: tools,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const message = data.message;

      // Log response
      if (message?.tool_calls?.[0]) {
        const tool = message.tool_calls[0];
        this.logger.debug(
          LogTag.LLM_INTERFACE,
          `RESPONSE: ${tool.function.name}(${JSON.stringify(
            tool.function.arguments
          )})`,
          npcName
        );
      } else if (message?.content) {
        this.logger.debug(
          LogTag.LLM_INTERFACE,
          `RESPONSE: ${message.content}`,
          npcName
        );
      }

      return message;
    } catch (error) {
      console.error(`[LLM_DEBUG] ${npcName}: Error:`, error);
      this.logger.error(`[${LogTag.LLM_INTERFACE}] ERROR: ${error}`, npcName);
      throw error;
    }
  }
}