import React, { useState, useRef, useEffect } from "react";
import { Send, Code, Loader2, Terminal, Sparkles, Wrench } from "lucide-react";

// Types
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  codeBlocks?: CodeBlock[];
}

interface ToolCall {
  tool: string;
  params: any;
  result?: any;
  status: "pending" | "success" | "error";
}

interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  category: "memory" | "git" | "design" | "file" | "other";
}

// MCP Tools Integration Layer
class MCPToolsManager {
  private tools: Map<string, MCPTool> = new Map();
  private serverConnections: Map<string, any> = new Map();

  constructor() {
    this.initializeTools();
  }

  private initializeTools() {
    // Memory tools
    this.registerTool({
      name: "memory_store",
      description: "Store information in long-term memory",
      category: "memory",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["key", "value"],
      },
    });

    this.registerTool({
      name: "memory_retrieve",
      description: "Retrieve stored information by key",
      category: "memory",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
        },
        required: ["key"],
      },
    });

    this.registerTool({
      name: "memory_search",
      description: "Search through stored memories",
      category: "memory",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    });

    // Git tools
    this.registerTool({
      name: "git_status",
      description: "Get repository status",
      category: "git",
      inputSchema: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["full", "short"] },
        },
      },
    });

    this.registerTool({
      name: "git_diff",
      description: "View file changes",
      category: "git",
      inputSchema: {
        type: "object",
        properties: {
          staged: { type: "boolean" },
          file: { type: "string" },
        },
      },
    });

    this.registerTool({
      name: "git_commit",
      description: "Commit changes",
      category: "git",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
          all: { type: "boolean" },
        },
        required: ["message"],
      },
    });

    // Design tools
    this.registerTool({
      name: "generate_color_palette",
      description: "Generate harmonious color palettes",
      category: "design",
      inputSchema: {
        type: "object",
        properties: {
          base_color: { type: "string" },
          scheme: {
            type: "string",
            enum: [
              "complementary",
              "analogous",
              "triadic",
              "tetradic",
              "monochromatic",
              "split-complementary",
            ],
          },
          count: { type: "number" },
        },
        required: ["base_color", "scheme"],
      },
    });
  }

  registerTool(tool: MCPTool) {
    this.tools.set(tool.name, tool);
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): MCPTool[] {
    return this.getTools().filter((t) => t.category === category);
  }

  async callTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Call MCP server via IPC/HTTP
    try {
      const response = await this.invokeMCPServer(toolName, params);
      return response;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  private async invokeMCPServer(toolName: string, params: any): Promise<any> {
    // This would connect to the actual MCP server
    // For now, we'll simulate the call
    console.log(`Calling MCP tool: ${toolName}`, params);

    // In production, this would be:
    // return await window.electron.invokeMCP(toolName, params);

    // Simulated response
    return {
      success: true,
      result: `Simulated result for ${toolName}`,
      data: params,
    };
  }
}

// Gemini API Integration
class GeminiAPI {
  private apiKey: string;
  private model: string;
  private mcpTools: MCPToolsManager;

  constructor(apiKey: string, mcpTools: MCPToolsManager) {
    this.apiKey = apiKey;
    this.model = "gemini-2.0-flash-exp"; // Latest model
    this.mcpTools = mcpTools;
  }

  async chat(messages: Message[], systemPrompt?: string): Promise<any> {
    const tools = this.mcpTools.getTools();

    // Convert MCP tools to Gemini function calling format
    const geminiTools = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));

    const requestBody = {
      contents: this.formatMessages(messages),
      tools: [{ function_declarations: geminiTools }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      systemInstruction: systemPrompt || this.getDefaultSystemPrompt(),
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }

  private formatMessages(messages: Message[]): any[] {
    return messages
      .filter((m) => m.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));
  }

  private parseResponse(data: any): any {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error("No response from Gemini");
    }

    const content = candidate.content;
    const functionCalls = content.parts?.filter((p: any) => p.functionCall);
    const textParts = content.parts?.filter((p: any) => p.text);

    return {
      text: textParts?.map((p: any) => p.text).join("\n") || "",
      functionCalls: functionCalls?.map((p: any) => p.functionCall) || [],
      finishReason: candidate.finishReason,
    };
  }

  private getDefaultSystemPrompt(): string {
    return `You are an expert coding assistant integrated into an IDE called G-Studio. Your role is to write, review, and improve code through natural conversation.

Core Capabilities:
- Write production-quality code in any language
- Explain complex concepts clearly
- Debug and fix issues
- Suggest optimizations and best practices
- Use MCP tools for memory, git operations, and design tasks

Available MCP Tools:
${this.mcpTools
  .getTools()
  .map((t) => `- ${t.name}: ${t.description}`)
  .join("\n")}

Guidelines:
1. Always respond in the same language as the user's message (if they write in Persian/Farsi, respond only in Persian; if in English, respond only in English). Do not mix languages in one reply.
2. Always provide complete, runnable code
3. Include comments for complex logic
4. Follow language-specific best practices
5. Use MCP tools when appropriate (storing context, git operations, etc.)
6. Format code blocks with language tags
7. Ask clarifying questions when requirements are unclear

When writing code:
- Structure: Provide filename and full code
- Quality: Production-ready, not pseudocode
- Completeness: Include imports, error handling, types
- Documentation: Add docstrings and comments

You can use memory tools to remember user preferences, project context, and frequently used patterns.`;
  }
}

// Main Component props (for IntegratedConversationalIDE: voice → code, TTS)
interface ConversationalCodeInterfaceProps {
  onAIResponse?: (text: string) => void;
  externalInput?: string;
  /** When app already has API key (e.g. from Settings), pass it so Vcode works without re-entering */
  initialApiKey?: string;
}

export const ConversationalCodeInterface: React.FC<
  ConversationalCodeInterfaceProps
> = ({ onAIResponse, externalInput, initialApiKey }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mcpToolsRef = useRef(new MCPToolsManager());
  const geminiAPIRef = useRef<GeminiAPI | null>(null);

  useEffect(() => {
    // Prefer key from parent (app Settings / AI Settings Hub), then localStorage
    const fromParent = initialApiKey?.trim();
    if (fromParent) {
      setApiKey(fromParent);
      initializeGemini(fromParent);
      return;
    }
    let savedKey = localStorage.getItem("gemini_api_key");
    if (!savedKey?.trim()) {
      try {
        const raw = localStorage.getItem("gstudio_ai_config");
        if (raw) {
          const parsed = JSON.parse(raw);
          savedKey = parsed?.apiKey;
        }
      } catch {
        // ignore
      }
    }
    if (savedKey?.trim()) {
      setApiKey(savedKey.trim());
      initializeGemini(savedKey.trim());
    }
  }, [initialApiKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // When voice transcript is sent from IntegratedConversationalIDE, put it in the input
  useEffect(() => {
    if (externalInput && externalInput.trim()) {
      setInput((prev) =>
        prev ? prev + " " + externalInput.trim() : externalInput.trim(),
      );
    }
  }, [externalInput]);

  const initializeGemini = (key: string) => {
    geminiAPIRef.current = new GeminiAPI(key, mcpToolsRef.current);
    setIsConfigured(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSaveApiKey = () => {
    if (apiKey) {
      localStorage.setItem("gemini_api_key", apiKey);
      initializeGemini(apiKey);
      addSystemMessage("✓ Gemini API configured successfully");
    }
  };

  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role: "system",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const extractCodeBlocks = (text: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || "text",
        code: match[2].trim(),
      });
    }

    return blocks;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !geminiAPIRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call Gemini with full context
      const response = await geminiAPIRef.current.chat([
        ...messages,
        userMessage,
      ]);

      // Handle function/tool calls
      const toolCalls: ToolCall[] = [];
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const funcCall of response.functionCalls) {
          setActiveTools((prev) => [...prev, funcCall.name]);

          try {
            const result = await mcpToolsRef.current.callTool(
              funcCall.name,
              funcCall.args,
            );

            toolCalls.push({
              tool: funcCall.name,
              params: funcCall.args,
              result,
              status: "success",
            });
          } catch (error) {
            toolCalls.push({
              tool: funcCall.name,
              params: funcCall.args,
              result: error,
              status: "error",
            });
          }

          setActiveTools((prev) => prev.filter((t) => t !== funcCall.name));
        }

        // If tools were called, make another call with results
        if (toolCalls.length > 0) {
          // Add tool results to context and get final response
          const toolResultsMessage = `Tool execution results:\n${toolCalls
            .map((tc) => `${tc.tool}: ${JSON.stringify(tc.result)}`)
            .join("\n")}`;

          const finalResponse = await geminiAPIRef.current.chat([
            ...messages,
            userMessage,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: toolResultsMessage,
              timestamp: new Date(),
            },
          ]);

          response.text = finalResponse.text;
        }
      }

      // Extract code blocks
      const codeBlocks = extractCodeBlocks(response.text);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.text,
        timestamp: new Date(),
        toolCalls,
        codeBlocks,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onAIResponse?.(response.text);
    } catch (error) {
      console.error("Error sending message:", error);
      addSystemMessage(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addSystemMessage("✓ Code copied to clipboard");
  };

  const applyCode = (code: string, language: string) => {
    // This would integrate with the IDE's file system
    console.log("Applying code:", { language, code });
    addSystemMessage(`✓ Code applied (${language})`);
  };

  // API Key Configuration View
  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-gray-800 p-6">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">
              Configure Gemini API
            </h2>
          </div>

          <p className="text-gray-300 mb-6">
            Enter your Google Gemini API key to enable conversational code
            writing with full MCP tools access.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Save & Continue
            </button>

            <p className="text-xs text-gray-400">
              Get your API key from{" "}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              Available MCP Tools:
            </h3>
            <ul className="text-xs text-gray-400 space-y-1">
              {mcpToolsRef.current.getTools().map((tool) => (
                <li key={tool.name} className="flex items-center gap-2">
                  <Wrench className="w-3 h-3" />
                  <span>{tool.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold text-white">
              Conversational Code Writer
            </h1>
            <span className="px-2 py-1 bg-purple-900 text-purple-300 text-xs rounded-full">
              Gemini 2.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTools.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Using: {activeTools.join(", ")}</span>
              </div>
            )}
            <button
              onClick={() => {
                localStorage.removeItem("gemini_api_key");
                setIsConfigured(false);
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Reconfigure
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Code className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Ready to Write Code
            </h2>
            <p className="text-gray-400 max-w-md">
              Describe what you want to build, and I'll write the code for you.
              I have full access to memory, git, and design tools.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-2xl">
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-left">
                <p className="text-sm text-gray-300">
                  "Create a React component for user authentication"
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-left">
                <p className="text-sm text-gray-300">
                  "Write a Python API client with error handling"
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-left">
                <p className="text-sm text-gray-300">
                  "Generate a color palette for my app using #3498db"
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-left">
                <p className="text-sm text-gray-300">
                  "Show me the git status and create a commit"
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-purple-600 text-white"
                  : message.role === "system"
                    ? "bg-gray-800 text-gray-300 border border-gray-700"
                    : "bg-gray-800 text-gray-100 border border-gray-700"
              }`}
            >
              {/* Message content */}
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>

              {/* Tool calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.toolCalls.map((tc, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-900 p-3 rounded border border-gray-600"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-300">
                          {tc.tool}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            tc.status === "success"
                              ? "bg-green-900 text-green-300"
                              : "bg-red-900 text-red-300"
                          }`}
                        >
                          {tc.status}
                        </span>
                      </div>
                      <pre className="text-xs text-gray-400 overflow-x-auto">
                        {JSON.stringify(tc.params, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Code blocks */}
              {message.codeBlocks && message.codeBlocks.length > 0 && (
                <div className="mt-3 space-y-3">
                  {message.codeBlocks.map((block, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-950 rounded-lg overflow-hidden border border-gray-700"
                    >
                      <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-700">
                        <span className="text-xs font-medium text-gray-400">
                          {block.language}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyCode(block.code)}
                            className="text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() =>
                              applyCode(block.code, block.language)
                            }
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                      <pre className="p-4 overflow-x-auto text-sm text-gray-300">
                        <code>{block.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-400 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Writing code...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what code you want to write..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white p-3 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Press Enter to send • Shift+Enter for new line • Full MCP tools access
          enabled
        </div>
      </div>
    </div>
  );
};

export default ConversationalCodeInterface;
