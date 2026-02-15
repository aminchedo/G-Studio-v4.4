import { GeminiService } from "./geminiService";
import { Message, ModelId, ToolCall } from "@/types";
import { FatalAIError } from "./fatalAIError";
import { ModelValidationStore } from "./modelValidationStore";
import { DegradedMode } from "./degradedMode";

/**
 * INVARIANT ASSERTION: Verify API Model Test enforcement before any Gemini call
 * This is a fail-fast guard that crashes loudly on invariant violation
 */
function assertAPIModelTestEnforcement(
  apiKey: string,
  requestId: string,
): void {
  // ASSERTION 1: API Model Test must have been executed
  if (!ModelValidationStore.hasTestBeenExecuted(apiKey)) {
    throw FatalAIError.API_TEST_NOT_EXECUTED();
  }

  // ASSERTION 2: Provider must not be exhausted
  if (!DegradedMode.isProviderAvailable("gemini")) {
    throw FatalAIError.PROVIDER_EXHAUSTED();
  }

  // ASSERTION 3: Must have at least one usable model
  const usableModels = ModelValidationStore.getValidatedModels(apiKey);
  if (usableModels.length === 0) {
    throw FatalAIError.ZERO_USABLE_MODELS();
  }

  // ASSERTION 4: requestId must be provided
  if (!requestId) {
    throw new Error(
      "INVARIANT_VIOLATION: requestId is required for all Gemini calls",
    );
  }
}

export enum AgentRole {
  ARCHITECT = "architect",
  CODER = "coder",
  REVIEWER = "reviewer",
  DEBUGGER = "debugger",
  DOCUMENTER = "documenter",
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  color: string;
  icon: string;
  capabilities: string[];
  /** Optional short description for UI (e.g. collaboration panel). */
  description?: string;
}

export const AGENTS: Agent[] = [
  {
    id: "architect",
    name: "Architect",
    role: "Software Architect",
    description: "Designs system architecture and high-level structure.",
    systemPrompt: `You are a Software Architect AI. Your role is to:
- Design system architecture and high-level structure
- Plan component hierarchy and data flow
- Define interfaces and contracts
- Suggest design patterns and best practices
- Create project structure and file organization
- Review architecture decisions for scalability

You focus on the BIG PICTURE. You design before implementation.`,
    color: "indigo",
    icon: "Layers",
    capabilities: ["design", "architecture", "planning", "structure"],
  },
  {
    id: "coder",
    name: "Coder",
    role: "Implementation Engineer",
    description: "Writes clean, efficient code and implements features.",
    systemPrompt: `You are an Implementation Engineer AI. Your role is to:
- Write clean, efficient code
- Implement features according to architecture
- Follow coding best practices
- Write TypeScript/JavaScript/React code
- Use modern ES6+ features
- Ensure type safety with TypeScript

You WRITE CODE. You turn designs into working software.`,
    color: "emerald",
    icon: "Code2",
    capabilities: ["coding", "implementation", "typescript", "react"],
  },
  {
    id: "reviewer",
    name: "Reviewer",
    role: "Code Reviewer",
    description: "Reviews code for quality, security, and best practices.",
    systemPrompt: `You are a Code Reviewer AI. Your role is to:
- Review code for bugs and issues
- Check for security vulnerabilities
- Ensure code quality and maintainability
- Suggest improvements and optimizations
- Verify best practices are followed
- Check for edge cases and error handling

You REVIEW AND IMPROVE. You ensure code quality.`,
    color: "amber",
    icon: "Shield",
    capabilities: ["review", "quality", "security", "optimization"],
  },
  {
    id: "debugger",
    name: "Debugger",
    role: "Debug Specialist",
    description: "Finds and fixes bugs, analyzes errors and stack traces.",
    systemPrompt: `You are a Debugging Specialist AI. Your role is to:
- Find and fix bugs
- Analyze error messages and stack traces
- Debug runtime issues
- Identify logic errors
- Suggest fixes and workarounds
- Test edge cases

You FIND AND FIX BUGS. You solve problems.`,
    color: "red",
    icon: "Bug",
    capabilities: ["debugging", "troubleshooting", "testing", "analysis"],
  },
  {
    id: "documenter",
    name: "Documenter",
    role: "Documentation Specialist",
    description: "Writes documentation, API docs, and usage examples.",
    systemPrompt: `You are a Documentation Specialist AI. Your role is to:
- Write clear documentation
- Create API documentation
- Write code comments
- Generate usage examples
- Create README files
- Document component props and functions

You DOCUMENT. You make code understandable.`,
    color: "purple",
    icon: "FileText",
    capabilities: ["documentation", "comments", "examples", "guides"],
  },
];

export class MultiAgentService {
  private static currentAgents: Set<string> = new Set(["coder"]);

  /** Returns all available agents (read-only). */
  static getAllAgents(): Agent[] {
    return [...AGENTS];
  }

  static setActiveAgents(agentIds: string[]) {
    this.currentAgents = new Set(agentIds);
  }

  static getActiveAgents(): Agent[] {
    return AGENTS.filter((agent) => this.currentAgents.has(agent.id));
  }

  static async orchestrateAgents(
    userMessage: string,
    history: Message[],
    modelId: ModelId,
    apiKey: string,
    files: any,
    requestId?: string,
  ): Promise<{
    responses: Array<{ agent: Agent; content: string; toolCalls?: ToolCall[] }>;
    finalResponse: string;
  }> {
    // CRITICAL: requestId MUST be provided - NO FALLBACK GENERATION
    if (!requestId) {
      throw new Error(
        "CODE_BUG: requestId is required in orchestrateAgents(). It must be generated in UI layer and passed explicitly.",
      );
    }

    // INVARIANT ASSERTION: Verify API Model Test enforcement
    assertAPIModelTestEnforcement(apiKey, requestId);

    const activeAgents = this.getActiveAgents();
    const responses: Array<{
      agent: Agent;
      content: string;
      toolCalls?: ToolCall[];
    }> = [];

    // If only one agent, just run that agent
    if (activeAgents.length === 1) {
      const agent = activeAgents[0];
      const systemPrompt = this.buildSystemPrompt(agent, files);

      let fullContent = "";
      let toolCalls: ToolCall[] = [];

      const stream = GeminiService.streamChat(
        modelId,
        history,
        userMessage,
        undefined,
        systemPrompt,
        apiKey,
        true, // useCache
        true, // useMinimalContext
        false, // apiKeyValidated
        requestId, // CRITICAL: Pass requestId
      );

      for await (const chunk of stream) {
        // CRITICAL: Check for provider limit (quota exhaustion)
        if (chunk.providerLimit) {
          throw FatalAIError.PROVIDER_EXHAUSTED();
        }
        if (chunk.text) fullContent += chunk.text;
        if (chunk.toolCalls) toolCalls.push(...chunk.toolCalls);
      }

      responses.push({ agent, content: fullContent, toolCalls });

      return {
        responses,
        finalResponse: fullContent,
      };
    }

    // Multiple agents: orchestrate workflow
    const workflow = this.determineWorkflow(userMessage, activeAgents);

    let contextSoFar = userMessage;
    let allToolCalls: ToolCall[] = [];

    for (const agent of workflow) {
      const systemPrompt = this.buildSystemPrompt(agent, files, contextSoFar);

      let agentContent = "";
      let agentToolCalls: ToolCall[] = [];

      const agentHistory = [
        ...history,
        {
          id: Math.random().toString(),
          role: "user" as const,
          content: contextSoFar,
          timestamp: Date.now(),
        },
      ];

      const stream = GeminiService.streamChat(
        modelId,
        agentHistory,
        this.getAgentPrompt(agent, userMessage, responses),
        undefined,
        systemPrompt,
        apiKey,
        true, // useCache
        true, // useMinimalContext
        false, // apiKeyValidated
        requestId, // CRITICAL: Pass requestId
      );

      for await (const chunk of stream) {
        // CRITICAL: Check for provider limit (quota exhaustion)
        if (chunk.providerLimit) {
          throw FatalAIError.PROVIDER_EXHAUSTED();
        }
        if (chunk.text) agentContent += chunk.text;
        if (chunk.toolCalls) agentToolCalls.push(...chunk.toolCalls);
      }

      responses.push({
        agent,
        content: agentContent,
        toolCalls: agentToolCalls,
      });
      allToolCalls.push(...agentToolCalls);

      // Build context for next agent
      contextSoFar = this.buildContextForNextAgent(userMessage, responses);
    }

    // Synthesize final response
    const finalResponse = this.synthesizeFinalResponse(responses, userMessage);

    return { responses, finalResponse };
  }

  private static determineWorkflow(
    userMessage: string,
    activeAgents: Agent[],
  ): Agent[] {
    const msg = userMessage.toLowerCase();

    // Check what type of task this is
    const isDesignTask =
      msg.includes("design") ||
      msg.includes("architect") ||
      msg.includes("plan") ||
      msg.includes("structure");
    const isCodeTask =
      msg.includes("implement") ||
      msg.includes("code") ||
      msg.includes("write") ||
      msg.includes("create");
    const isReviewTask =
      msg.includes("review") ||
      msg.includes("check") ||
      msg.includes("improve");
    const isDebugTask =
      msg.includes("debug") ||
      msg.includes("fix") ||
      msg.includes("error") ||
      msg.includes("bug");
    const isDocTask =
      msg.includes("document") ||
      msg.includes("comment") ||
      msg.includes("explain");

    const hasArchitect = activeAgents.some((a) => a.id === "architect");
    const hasCoder = activeAgents.some((a) => a.id === "coder");
    const hasReviewer = activeAgents.some((a) => a.id === "reviewer");
    const hasDebugger = activeAgents.some((a) => a.id === "debugger");
    const hasDocumenter = activeAgents.some((a) => a.id === "documenter");

    const workflow: Agent[] = [];

    // Design -> Code -> Review workflow
    if (isDesignTask || (isCodeTask && hasArchitect)) {
      if (hasArchitect)
        workflow.push(AGENTS.find((a) => a.id === "architect")!);
      if (hasCoder) workflow.push(AGENTS.find((a) => a.id === "coder")!);
      if (hasReviewer) workflow.push(AGENTS.find((a) => a.id === "reviewer")!);
    }
    // Code -> Review workflow
    else if (isCodeTask) {
      if (hasCoder) workflow.push(AGENTS.find((a) => a.id === "coder")!);
      if (hasReviewer) workflow.push(AGENTS.find((a) => a.id === "reviewer")!);
    }
    // Review workflow
    else if (isReviewTask) {
      if (hasReviewer) workflow.push(AGENTS.find((a) => a.id === "reviewer")!);
    }
    // Debug workflow
    else if (isDebugTask) {
      if (hasDebugger) workflow.push(AGENTS.find((a) => a.id === "debugger")!);
      if (hasCoder) workflow.push(AGENTS.find((a) => a.id === "coder")!);
    }
    // Document workflow
    else if (isDocTask) {
      if (hasDocumenter)
        workflow.push(AGENTS.find((a) => a.id === "documenter")!);
    }
    // Default: use all active agents in logical order
    else {
      if (hasArchitect)
        workflow.push(AGENTS.find((a) => a.id === "architect")!);
      if (hasCoder) workflow.push(AGENTS.find((a) => a.id === "coder")!);
      if (hasReviewer) workflow.push(AGENTS.find((a) => a.id === "reviewer")!);
      if (hasDebugger) workflow.push(AGENTS.find((a) => a.id === "debugger")!);
      if (hasDocumenter)
        workflow.push(AGENTS.find((a) => a.id === "documenter")!);
    }

    return workflow.length > 0 ? workflow : activeAgents;
  }

  private static buildSystemPrompt(
    agent: Agent,
    files: any,
    context?: string,
  ): string {
    let prompt = agent.systemPrompt;

    prompt +=
      "\n\nYou are part of a MULTI-AGENT TEAM. Work with other agents to complete tasks.";
    prompt += "\n\nYour role: " + agent.role;
    prompt += "\nYour capabilities: " + agent.capabilities.join(", ");

    if (context) {
      prompt += "\n\nCONTEXT FROM PREVIOUS AGENTS:\n" + context;
    }

    const projectFiles = Object.keys(files || {});
    if (projectFiles.length > 0) {
      prompt +=
        "\n\nCURRENT PROJECT FILES:\n" + projectFiles.slice(0, 20).join(", ");
    }

    prompt += "\n\nUI COMPONENTS AVAILABLE:";
    prompt +=
      "\n- **Editor**: Full code editor with syntax highlighting, tabs, and real-time editing. All files you create/edit appear here.";
    prompt +=
      "\n- **Preview**: Live preview pane for HTML/React files. You can create previewable content that renders here.";
    prompt +=
      "\n- **Inspector**: File and project information panel showing file stats, project overview, and metadata.";
    prompt +=
      "\n\nIMPORTANT: Use the available tools to accomplish your tasks. All tools are functional. Files you work with will automatically appear in Editor, Preview, and Inspector.";

    return prompt;
  }

  private static getAgentPrompt(
    agent: Agent,
    userMessage: string,
    previousResponses: any[],
  ): string {
    if (previousResponses.length === 0) {
      return userMessage;
    }

    let prompt = `User request: ${userMessage}\n\n`;
    prompt += `Previous agents have already contributed:\n\n`;

    previousResponses.forEach(({ agent: prevAgent, content }) => {
      prompt += `[${prevAgent.name}]: ${content.substring(0, 500)}${content.length > 500 ? "..." : ""}\n\n`;
    });

    prompt += `Now it's your turn as ${agent.name}. ${this.getAgentInstruction(agent)}`;

    return prompt;
  }

  private static getAgentInstruction(agent: Agent): string {
    switch (agent.id) {
      case "architect":
        return "Design the high-level architecture and structure.";
      case "coder":
        return "Implement the code based on the architecture.";
      case "reviewer":
        return "Review the implementation and suggest improvements.";
      case "debugger":
        return "Find and fix any bugs or issues.";
      case "documenter":
        return "Document the code and create usage examples.";
      default:
        return "Complete your part of the task.";
    }
  }

  private static buildContextForNextAgent(
    userMessage: string,
    responses: any[],
  ): string {
    let context = `Original request: ${userMessage}\n\n`;
    context += `Work completed so far:\n\n`;

    responses.forEach(({ agent, content }) => {
      context += `[${agent.name}]:\n${content}\n\n`;
    });

    return context;
  }

  private static synthesizeFinalResponse(
    responses: any[],
    userMessage: string,
  ): string {
    if (responses.length === 1) {
      return responses[0].content;
    }

    let final = "# Multi-Agent Collaboration Result\n\n";
    final += `**Task**: ${userMessage}\n\n`;
    final += `**Agents involved**: ${responses.map((r) => r.agent.name).join(", ")}\n\n`;
    final += "---\n\n";

    responses.forEach(({ agent, content }) => {
      final += `## ${agent.icon} ${agent.name} (${agent.role})\n\n`;
      final += content + "\n\n";
      final += "---\n\n";
    });

    final += "## Summary\n\n";
    final += `✅ Task completed with ${responses.length} specialized agents working together.\n`;
    final += `Each agent contributed their expertise to deliver a comprehensive solution.`;

    return final;
  }
}
