import { Logger, LogTag } from "../utils/Logger";

export interface NPCTool {
  name: string;
  description: string;
  parameters?: any;
}

export class AIService {
  private static instance: AIService;
  private logger = Logger.getInstance();

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  constructor() {}

  async generateResponseWithTools(messages: any[], tools: any[]): Promise<any> {
    const npcName =
      messages
        .find((m) => m.role === "system")
        ?.content?.match(/You are (\w+)/)?.[1] || "Unknown";

    // Log raw request
    this.logger.debug(
      LogTag.LLM_INTERFACE,
      `REQUEST [RAW]: ${npcName}\n\nMessages:\n\n${JSON.stringify(
        messages,
        null,
        2
      )}\n\nTools:\n\n${JSON.stringify(tools, null, 2)}`,
      npcName
    );

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

    const simplifiedTools = tools.map((tool) => tool.function.name).join(", ");

    this.logger.debug(
      LogTag.LLM_INTERFACE,
      // `REQUEST [SIMPLIFIED]: ${npcName}\n\nMessages:\n${simplifiedMessages}\n\nTools:\n${simplifiedTools}`,
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

      const requestBody = {
        model: "qwen2.5:7b",
        messages: cleanMessages,
        tools: tools,
        // Remove tool_choice: "required" - let LLM choose
        stream: false,
        options: {
          temperature: 0.01,
          top_p: 0.7,
          repeat_penalty: 1.1,
        },
      };

      console.log(`[LLM_DEBUG] ${npcName}: Making fetch request to Ollama...`);
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000),
      });

      console.log(
        `[LLM_DEBUG] ${npcName}: Fetch response status: ${response.status}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[LLM_DEBUG] ${npcName}: Response error text:`,
          errorText
        );
        this.logger.error(
          LogTag.LLM_INTERFACE,
          `Response HTTP ${response.status}: ${errorText}`,
          npcName
        );
        throw new Error(
          `[${LogTag.LLM_INTERFACE}] HTTP ${response.status}: ${errorText}`
        );
      }

      console.log(`[LLM_DEBUG] ${npcName}: Parsing JSON response...`);
      const data = await response.json();
      console.log(`[LLM_DEBUG] ${npcName}: JSON parsed successfully`);

      // An empty or malformed successful HTTP response must trigger the same
      // recovery path as a connection failure, rather than silently stalling.
      const message = data?.message;
      const hasContent = typeof message?.content === "string" && message.content.trim().length > 0;
      const hasTools = Array.isArray(message?.tool_calls) && message.tool_calls.length > 0;
      if (
        !message ||
        (message.content != null && typeof message.content !== "string") ||
        (message.tool_calls != null && !Array.isArray(message.tool_calls)) ||
        (hasTools && message.tool_calls.some((tool: any) =>
          typeof tool?.function?.name !== "string" || !tool.function.name.trim()
        )) ||
        (!hasContent && !hasTools)
      ) {
        throw new Error("Invalid response from local AI: expected dialogue or tool calls");
      }

      // Log response - handle both OpenAI format and JSON-in-content format
      if (data.message?.tool_calls?.[0]) {
        // OpenAI format
        const tool = data.message.tool_calls[0];
        this.logger.debug(
          LogTag.LLM_INTERFACE,
          `RESPONSE: ${tool.function.name}(${JSON.stringify(
            tool.function.arguments
          )})`,
          npcName
        );
      } else if (data.message?.content) {
        // Check for JSON tool calls in content
        const jsonMatch = data.message.content.match(
          /\{[^{}]*"name"[^{}]*"parameters"[^{}]*\}/
        );
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.name && parsed.parameters) {
              this.logger.debug(
                LogTag.LLM_INTERFACE,
                `RESPONSE: ${parsed.name}(${JSON.stringify(
                  parsed.parameters
                )})`,
                npcName
              );

              // Convert to OpenAI format for consistent handling
              data.message.tool_calls = [
                {
                  id: `call_${Date.now()}`,
                  function: {
                    name: parsed.name,
                    arguments: parsed.parameters,
                  },
                },
              ];
            }
          } catch (e) {
            this.logger.debug(
              LogTag.LLM_INTERFACE,
              `RESPONSE: ${data.message.content}`,
              npcName
            );
          }
        } else {
          this.logger.debug(
            LogTag.LLM_INTERFACE,
            `RESPONSE: ${data.message.content}`,
            npcName
          );
        }
      } else {
        this.logger.error(
          `[${LogTag.LLM_INTERFACE}] RESPONSE: No tool call received`,
          npcName
        );
        console.log(
          `[LLM_DEBUG] ${npcName}: Full response data:`,
          JSON.stringify(data, null, 2)
        );
      }

      return data.message;
    } catch (error) {
      console.error(`[LLM_DEBUG] ${npcName}: Caught error:`, error);
      this.logger.error(`[${LogTag.LLM_INTERFACE}] ERROR: ${error}`, npcName);
      throw error;
    }
  }
}
