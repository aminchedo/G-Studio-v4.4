import { ModelId, ModelOption } from "./types";
import { FunctionDeclaration, Type } from "@google/genai";

/**
 * Supported models following the @google/genai alias to full model name mapping.
 */
export const SUPPORTED_MODELS: ModelOption[] = [
  {
    id: ModelId.Gemini3FlashPreview,
    name: "Gemini 3.0 Flash",
    description:
      "Fast, low-latency model optimized for high-frequency coding tasks.",
  },
  {
    id: ModelId.Gemini3ProPreview,
    name: "Gemini 3.0 Pro",
    description:
      "Advanced reasoning and complex problem solving. Best for refactoring and upgrades.",
  },
  {
    id: ModelId.GeminiFlashLatest,
    name: "Gemini Flash",
    description: "Balanced performance for general purpose tasks.",
  },
  {
    id: ModelId.GeminiFlashLiteLatest,
    name: "Gemini Flash Lite",
    description: "Cost-effective version for simple queries and boilerplate.",
  },
];

export const INITIAL_SYSTEM_INSTRUCTION = `You are an expert Full-Stack AI Software Engineer. You have direct write access to the user's workspace and full control over the code editor with REAL-TIME editing capabilities. You can code through natural conversation - when the user asks you to code something, use the tools to actually do it, not just describe what you would do.

YOUR CAPABILITIES:
1. **Full Workspace Control**: You can create, edit, move, delete, and read files.
2. **Real-Time Editor Control**: All your edits appear INSTANTLY in the editor. When you modify files, users see changes in real-time.
3. **Advanced Editor Control**: You can open files, search within files, replace text, get file info, and manipulate specific lines.
4. **Deep Reasoning**: Use your internal chain-of-thought to plan complex refactors before executing them.
5. **Shell Execution**: You can run simulated shell commands to inspect the environment.
6. **Project Analysis**: You can analyze the entire project structure, understand dependencies, and make informed decisions.
7. **UI Component Access**: You have full access to Editor, Preview, and Inspector panels. Files you create or modify will automatically appear in these components.

REAL-TIME EDITING:
- When you use 'write_code', 'replace_line', 'insert_at_line', 'delete_line', or 'replace_in_file', changes appear IMMEDIATELY in the editor.
- The editor automatically updates to show your changes in real-time.
- Users can see your code as you write it, making this a true collaborative coding experience.

EDITOR TOOLS:
- **open_file**: Open a file in the editor to make it active and visible. The file will appear in the editor immediately.
- **search_in_file**: Search for text within a specific file and get line numbers. Use this to locate code before editing.
- **replace_in_file**: Replace text in a file (single or all occurrences). Changes appear in real-time.
- **get_file_info**: Get detailed file statistics (lines, characters, language, etc.) to understand file structure.
- **get_line / get_lines**: Read specific line(s) from a file for precise editing.
- **insert_at_line**: Insert new content at a specific line. The new code appears immediately in the editor.
- **replace_line**: Replace a specific line's content. Changes are visible instantly.
- **delete_line**: Delete a specific line from a file. The deletion is immediate.

WORKFLOW FOR PROJECT ANALYSIS:
1. **Start with Overview**: Use 'project_overview' to understand the project structure.
2. **Analyze Key Files**: Use 'read_file' or 'open_file' to examine important files (package.json, main entry points, etc.).
3. **Search for Patterns**: Use 'search_files' to find where specific functions, components, or patterns are used.
4. **Deep Dive**: Use 'search_in_file' to find exact locations in specific files.
5. **Make Changes**: Use appropriate tools (replace_line, insert_at_line, etc.) to make surgical edits.
6. **Verify**: Use 'read_file' or 'get_file_info' to verify your changes.
7. **Format**: Always use 'format_file' after making code changes.

CODING GUIDELINES:
- **Project Integrity**: Before making major changes, use 'project_overview' to understand the structure.
- **Surgical Edits**: 
  - For single line changes: use 'replace_line' or 'delete_line'.
  - For inserting new code: use 'insert_at_line'.
  - For small multi-line changes: use 'replace_in_file' or 'edit_file'.
  - For large rewrites: use 'write_code'.
- **File Navigation**: Use 'open_file' to open files you're working on, then use line-specific tools for precise edits.
- **Search Strategy**: Use 'search_in_file' to find exact locations before making changes.
- **Real-Time Feedback**: Remember that all your edits are visible to the user in real-time. Make changes incrementally and explain what you're doing.
- **Formatting**: Always run 'format_file' after significant code changes to maintain clean code standards.
- **Dependencies**: Check 'package.json' before suggesting new libraries.
- **Upgrades**: When upgrading code, look for modern patterns (e.g., React 19 Hooks, TypeScript best practices).

TOOLS USAGE:
- If a file is open in the editor, it's provided in your context. You don't need to 'read_file' it unless you suspect external changes.
- Use 'open_file' to make a file active in the editor before making edits. This ensures the user sees your work.
- Use 'get_file_info' to understand file structure before editing.
- Use 'search_in_file' to locate specific code patterns.
- Use line-specific tools (get_line, replace_line, insert_at_line, delete_line) for precise, surgical edits that appear in real-time.
- Provide the FULL content when using 'write_code'. Truncated code is considered a bug.
- Use 'search_files' to find where specific functions or components are used across the project.
- After making changes, you can continue the conversation to explain what you did or ask for feedback.

COMMUNICATION:
- Explain your analysis and reasoning as you work.
- Describe what you're doing before making changes.
- After making edits, summarize what changed and why.
- Ask clarifying questions if needed.
- **Remember the full conversation history** - reference previous messages, decisions, and context.
- **Maintain continuity** - build upon previous discussions and decisions.
- **Be aware of context** - remember what files you've worked on, what changes you've made, and what the user has asked for.

CONVERSATION CONTINUITY:
- You have access to the FULL conversation history in every request.
- All previous messages, tool calls, and results are preserved.
- Reference previous parts of the conversation when relevant.
- Build upon previous decisions and context.
- Don't repeat information you've already discussed unless the user asks for it.

CONVERSATION MANAGEMENT:
- **save_conversation**: Save the current conversation to local storage with a name. Use this to preserve important conversations for later recall.
- **load_conversation**: Load a previously saved conversation. This restores the full conversation history, allowing you to continue from where you left off.
- **list_conversations**: List all saved conversations to see what's available. Use this to find conversations you want to load.
- **delete_conversation**: Delete a saved conversation if it's no longer needed.
- Use these tools to maintain continuity across sessions and recall past work. When a user asks about previous work, use list_conversations to find and load relevant conversations.

UTILITY TOOLS (Free, No API Required):
- **calculate**: Perform mathematical calculations (+, -, *, /, sqrt, sin, cos, etc.)
- **get_current_time**: Get current date and time in various formats
- **generate_uuid**: Generate UUIDs (v1 or v4)
- **hash_text**: Generate hash (MD5, SHA-256, SHA-512, SHA-1)
- **base64_encode / base64_decode**: Encode/decode Base64
- **format_json**: Format and validate JSON
- **text_transform**: Transform text (uppercase, lowercase, reverse, capitalize, etc.)
- **generate_random**: Generate random numbers, strings, or passwords
- **color_converter**: Convert colors between hex, RGB, HSL
- **unit_converter**: Convert units (length, weight, temperature)
- **check_quota**: Check Gemini API quota status and usage information
- **token_optimization_tips**: Get comprehensive strategies and best practices to reduce token usage, optimize prompts, minimize API costs, and improve efficiency. Use when user asks about reducing tokens, optimizing API usage, or saving costs.
- **token_optimization_tips**: Get strategies and best practices to reduce token usage and optimize API costs
- **remove_comments**: Remove comments from code files to reduce token usage. Actually reduces code size before sending to API.
- **compress_code**: Compress code by removing comments, extra whitespace. Actually reduces token usage when code is sent to API.
- **optimize_prompt**: Optimize prompt text by removing redundant phrases and verbose expressions. Reduces token count when sending prompts to API.
- **estimate_tokens**: Estimate token count for text or files. Helps understand token usage before sending to API.
- All these tools work locally without any API calls - they're completely free to use (except check_quota which requires API key).

COMPLETE TOOL LIST:
You have access to 65 tools total, including 20 advanced code analysis/generation/refactoring tools and 5 script integration tools. All tools are fully functional:

**File Operations (9 tools)**:
- create_file, write_code, edit_file, read_file, delete_file, move_file, search_files, format_file, project_overview

**Editor Operations (9 tools)**:
- open_file, search_in_file, replace_in_file, get_file_info, get_line, get_lines, insert_at_line, replace_line, delete_line

**Conversation Management (4 tools)**:
- save_conversation, load_conversation, list_conversations, delete_conversation

**Utility Tools (17 tools - Most are Free, No API Required)**:
- calculate, get_current_time, generate_uuid, hash_text, base64_encode, base64_decode, format_json, text_transform, generate_random, color_converter, unit_converter, check_quota, token_optimization_tips, remove_comments, compress_code, optimize_prompt, estimate_tokens

**Code Analysis Tools (5 tools - NEW!)**:
- analyze_code_quality: Get code quality metrics (complexity, maintainability, duplication, security)
- detect_code_smells: Find anti-patterns (long functions, magic numbers, dead code)
- find_dependencies: Analyze imports and detect circular dependencies  
- check_types: Run TypeScript type checking
- lint_code: Run ESLint rules and get violations with fixes

**Code Generation Tools (5 tools - NEW!)**:
- generate_component: Create React/Vue components with TypeScript and styles
- generate_test: Auto-generate unit tests for functions/components
- generate_documentation: Add JSDoc/TSDoc comments automatically
- generate_types: Create TypeScript types from JSON/API responses
- generate_api_client: Generate API client code with type safety

**Refactoring Tools (5 tools - NEW!)**:
- extract_function: Extract code block into new function
- rename_symbol: Rename across entire project with import updates
- optimize_imports: Remove unused, sort, and organize imports
- split_file: Split large files into focused modules
- convert_syntax: Convert between CommonJS/ES6, class/hooks, callbacks/async

**Advanced Operations (5 tools - NEW!)**:
- find_unused_code: Detect dead code and unused functions
- add_error_handling: Auto-add try-catch blocks
- add_logging: Add debug logging to functions
- create_barrel_export: Create index.ts barrel files
- setup_path_aliases: Configure @ aliases in TypeScript

**Runtime (1 tool)**:
- run (supports: ls, pwd, echo, cat, find, grep)

**Script integration (5 tools)**:
- project_analyzer, src_directory_analyzer, file_optimizer, runtime_verification, project_file_comparison

All 65 tools are:
✅ Defined in FILE_TOOLS (available to Gemini API)
✅ Implemented in executeTool function
✅ Fully functional and ready to use
✅ Documented in system instruction

You can call any of these tools directly. They will execute immediately and return results.

CODING THROUGH CONVERSATION:
You can code through natural conversation! Here's how it works:

1. **User asks you to code something** (e.g., "Create a React component", "Add a function to calculate sum", "Fix the bug in App.tsx")
2. **You analyze the request** and decide which tools to use
3. **You call the appropriate tools** (create_file, write_code, edit_file, etc.)
4. **Tools execute immediately** and changes appear in the editor in real-time
5. **You explain what you did** and can continue the conversation

EXAMPLE WORKFLOWS:

**Creating New Code:**
- User: "Create a utility function to format dates"
- You: Use \`create_file\` or \`write_code\` to create the file
- Result: File appears in editor immediately

**Modifying Existing Code:**
- User: "Add error handling to the login function"
- You: Use \`search_in_file\` to find the function, then \`insert_at_line\` or \`replace_line\` to add error handling
- Result: Changes appear in editor in real-time

**Refactoring:**
- User: "Refactor the component to use hooks"
- You: Use \`read_file\` to see current code, then \`write_code\` or \`replace_in_file\` to refactor
- Result: Refactored code appears immediately

**Debugging:**
- User: "Fix the bug where the button doesn't work"
- You: Use \`search_files\` to find the button code, \`read_file\` to see it, then \`edit_file\` or \`replace_line\` to fix
- Result: Fixed code appears in editor

IMPORTANT:
- **Always use tools** - Don't just describe what you would do, actually do it using tools
- **Changes are real-time** - Everything you do appears immediately in the editor
- **Continue conversation** - After making changes, explain what you did and ask if more is needed
- **Be proactive** - If the user asks for something, use the appropriate tools to accomplish it

Begin by greeting the user and summarizing the current project state if files are loaded. Then offer to analyze the project or make improvements. When the user asks you to code something, use the tools to actually do it - don't just describe what you would do.`;

export const FILE_TOOLS: FunctionDeclaration[] = [
  {
    name: "create_file",
    description:
      "Create a new file with content. Path must include directory (e.g., src/utils/helper.ts).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Full path of the new file." },
        content: {
          type: Type.STRING,
          description: "Full content of the file.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "write_code",
    description:
      "Write or overwrite a file's entire content. Use this for significant updates or new files.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filename: { type: Type.STRING, description: "Path to the file." },
        content: {
          type: Type.STRING,
          description: "The complete file content.",
        },
      },
      required: ["filename", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Replace a specific substring in a file. The target must be unique and match exactly.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
        target: {
          type: Type.STRING,
          description: "The exact text to find and replace.",
        },
        replacement: {
          type: Type.STRING,
          description: "The new text to insert.",
        },
      },
      required: ["path", "target", "replacement"],
    },
  },
  {
    name: "read_file",
    description: "Read a file's content from the disk.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "File path." },
      },
      required: ["path"],
    },
  },
  {
    name: "delete_file",
    description: "Remove a file from the workspace.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "File path." },
      },
      required: ["path"],
    },
  },
  {
    name: "move_file",
    description: "Rename or move a file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        source: { type: Type.STRING, description: "Original path." },
        destination: { type: Type.STRING, description: "New path." },
      },
      required: ["source", "destination"],
    },
  },
  {
    name: "search_files",
    description: "Search for a pattern/string across the whole project.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Text to search for." },
      },
      required: ["query"],
    },
  },
  {
    name: "format_file",
    description: "Run Prettier formatting on a specific file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "File path." },
      },
      required: ["path"],
    },
  },
  {
    name: "project_overview",
    description: "List all files in the project to understand the structure.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "run",
    description: "Run simulated shell commands (ls, pwd, echo, cat).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: "The command string." },
      },
      required: ["command"],
    },
  },
  {
    name: "open_file",
    description:
      "Open a file in the editor. This makes it the active file and displays it in the editor.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file to open." },
      },
      required: ["path"],
    },
  },
  {
    name: "search_in_file",
    description:
      "Search for text within a specific file. Returns line numbers and context of matches.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Path to the file to search in.",
        },
        query: { type: Type.STRING, description: "Text to search for." },
        caseSensitive: {
          type: Type.BOOLEAN,
          description:
            "Whether search should be case sensitive. Default: false.",
        },
      },
      required: ["path", "query"],
    },
  },
  {
    name: "replace_in_file",
    description:
      "Replace all occurrences of a pattern in a specific file. Returns number of replacements made.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
        search: { type: Type.STRING, description: "Text to find and replace." },
        replace: { type: Type.STRING, description: "Replacement text." },
        replaceAll: {
          type: Type.BOOLEAN,
          description:
            "Replace all occurrences (true) or just first (false). Default: true.",
        },
      },
      required: ["path", "search", "replace"],
    },
  },
  {
    name: "get_file_info",
    description:
      "Get detailed information about a file: line count, character count, language, size, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
      },
      required: ["path"],
    },
  },
  {
    name: "get_line",
    description: "Get the content of a specific line number from a file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
        lineNumber: {
          type: Type.NUMBER,
          description: "Line number (1-indexed).",
        },
      },
      required: ["path", "lineNumber"],
    },
  },
  {
    name: "get_lines",
    description:
      "Get content of multiple lines from a file (range or specific lines).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
        startLine: {
          type: Type.NUMBER,
          description: "Start line number (1-indexed).",
        },
        endLine: {
          type: Type.NUMBER,
          description:
            "End line number (1-indexed). If not provided, returns only startLine.",
        },
      },
      required: ["path", "startLine"],
    },
  },
  {
    name: "insert_at_line",
    description:
      "Insert text at a specific line number in a file. The new text is inserted before the existing line.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
        lineNumber: {
          type: Type.NUMBER,
          description: "Line number where to insert (1-indexed).",
        },
        content: {
          type: Type.STRING,
          description: "Text to insert (can be multiple lines).",
        },
      },
      required: ["path", "lineNumber", "content"],
    },
  },
  {
    name: "replace_line",
    description: "Replace the content of a specific line in a file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
        lineNumber: {
          type: Type.NUMBER,
          description: "Line number to replace (1-indexed).",
        },
        content: {
          type: Type.STRING,
          description: "New content for the line.",
        },
      },
      required: ["path", "lineNumber", "content"],
    },
  },
  {
    name: "delete_line",
    description: "Delete a specific line from a file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file." },
        lineNumber: {
          type: Type.NUMBER,
          description: "Line number to delete (1-indexed).",
        },
      },
      required: ["path", "lineNumber"],
    },
  },
  {
    name: "save_conversation",
    description:
      "Save the current conversation to local storage. Conversations are saved with a name/title for easy retrieval later.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description:
            "Name or title for this conversation (e.g., 'Project Analysis', 'Bug Fix Session').",
        },
        description: {
          type: Type.STRING,
          description: "Optional description of the conversation.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "load_conversation",
    description:
      "Load a previously saved conversation from local storage. This allows you to recall past conversations and continue from where you left off.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the conversation to load.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_conversations",
    description:
      "List all saved conversations with their names, descriptions, and timestamps. Use this to find conversations you want to load.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "delete_conversation",
    description: "Delete a saved conversation from local storage.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the conversation to delete.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "calculate",
    description:
      "Perform mathematical calculations. Supports basic operations (+, -, *, /), parentheses, and common functions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        expression: {
          type: Type.STRING,
          description:
            "Mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)', 'sin(30)').",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "get_current_time",
    description:
      "Get the current date and time in various formats. No API required - uses local system time.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        timezone: {
          type: Type.STRING,
          description:
            "Optional timezone (e.g., 'UTC', 'America/New_York'). Defaults to local timezone.",
        },
        format: {
          type: Type.STRING,
          description:
            "Output format: 'iso', 'unix', 'readable', or 'custom'. Default: 'readable'.",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_uuid",
    description:
      "Generate a UUID (Universally Unique Identifier). No API required - generates locally.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        version: {
          type: Type.NUMBER,
          description:
            "UUID version (4 for random, 1 for time-based). Default: 4.",
        },
        count: {
          type: Type.NUMBER,
          description: "Number of UUIDs to generate. Default: 1.",
        },
      },
      required: [],
    },
  },
  {
    name: "hash_text",
    description:
      "Generate hash of text using various algorithms (MD5, SHA-256, SHA-512, etc.). No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Text to hash." },
        algorithm: {
          type: Type.STRING,
          description:
            "Hash algorithm: 'md5', 'sha256', 'sha512', 'sha1'. Default: 'sha256'.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "base64_encode",
    description: "Encode text to Base64. No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Text to encode." },
      },
      required: ["text"],
    },
  },
  {
    name: "base64_decode",
    description: "Decode Base64 text. No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Base64 text to decode." },
      },
      required: ["text"],
    },
  },
  {
    name: "format_json",
    description: "Format and validate JSON. No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        json: { type: Type.STRING, description: "JSON string to format." },
        indent: {
          type: Type.NUMBER,
          description: "Indentation spaces. Default: 2.",
        },
      },
      required: ["json"],
    },
  },
  {
    name: "text_transform",
    description:
      "Transform text (uppercase, lowercase, reverse, capitalize, etc.). No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Text to transform." },
        operation: {
          type: Type.STRING,
          description:
            "Operation: 'uppercase', 'lowercase', 'reverse', 'capitalize', 'title', 'trim', 'remove-spaces'. Default: 'uppercase'.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "generate_random",
    description:
      "Generate random numbers, strings, or passwords. No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description:
            "Type: 'number', 'string', 'password'. Default: 'number'.",
        },
        min: {
          type: Type.NUMBER,
          description: "Minimum value (for numbers). Default: 0.",
        },
        max: {
          type: Type.NUMBER,
          description: "Maximum value (for numbers). Default: 100.",
        },
        length: {
          type: Type.NUMBER,
          description: "Length (for strings/passwords). Default: 10.",
        },
        includeSpecialChars: {
          type: Type.BOOLEAN,
          description: "Include special characters in password. Default: true.",
        },
      },
      required: [],
    },
  },
  {
    name: "color_converter",
    description:
      "Convert colors between formats (hex, rgb, hsl). No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        color: {
          type: Type.STRING,
          description:
            "Color value (e.g., '#FF0000', 'rgb(255,0,0)', 'hsl(0,100%,50%)').",
        },
        toFormat: {
          type: Type.STRING,
          description: "Target format: 'hex', 'rgb', 'hsl'. Default: 'hex'.",
        },
      },
      required: ["color"],
    },
  },
  {
    name: "unit_converter",
    description:
      "Convert units (length, weight, temperature, etc.). No API required.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER, description: "Value to convert." },
        fromUnit: {
          type: Type.STRING,
          description:
            "Source unit (e.g., 'km', 'm', 'kg', 'lb', 'celsius', 'fahrenheit').",
        },
        toUnit: { type: Type.STRING, description: "Target unit." },
      },
      required: ["value", "fromUnit", "toUnit"],
    },
  },
  {
    name: "check_quota",
    description:
      "Check Gemini API quota status, usage information, and daily limits. Returns API status, quota limits (RPD: 1500, RPM: 15, TPM: 1M for Free Tier), and usage info. Use this when user asks about API quota, remaining tokens, daily limits, or API usage. Free tier limits: 1500 requests/day, 15 requests/minute, 1M tokens/minute for Gemini 1.5 Flash. Gemini 1.5 Pro has lower limits (50 RPD, 2 RPM).",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "token_optimization_tips",
    description:
      "Get comprehensive tips and strategies to reduce token usage in Gemini API calls. Returns best practices for prompt engineering, model selection, code optimization, and MCP tool usage to minimize token consumption and API costs. Use this when user asks about reducing token usage, optimizing prompts, saving API costs, or improving efficiency.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "remove_comments",
    description:
      "Remove comments from code files to reduce token usage. Supports JavaScript, TypeScript, HTML, CSS, Python, and other languages. This tool actually reduces the code size before sending to API, saving tokens. Use when you need to process code files with many comments.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Path to the file to remove comments from.",
        },
        createNewFile: {
          type: Type.BOOLEAN,
          description:
            "If true, creates a new file with .min suffix. If false, overwrites original file.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "compress_code",
    description:
      "Compress code by removing comments, extra whitespace, and optimizing structure. This actually reduces token usage when code is sent to API. Returns compression statistics. Use to optimize code files before processing.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Path to the file to compress.",
        },
        options: {
          type: Type.OBJECT,
          description:
            "Compression options: removeComments (default true), minify (default false - can break code), deduplicate (default false - can remove important code)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "optimize_prompt",
    description:
      "Optimize a prompt text by removing redundant phrases, verbose expressions, and unnecessary words. This reduces token count when sending prompts to API. Returns optimized prompt and statistics. Use before sending long prompts to API.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "The prompt text to optimize.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "estimate_tokens",
    description:
      "Estimate token count for a given text or file. Helps understand token usage before sending to API. Returns estimated tokens and character count.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description:
            "Text to estimate tokens for. If path is provided, this is ignored.",
        },
        path: {
          type: Type.STRING,
          description: "Path to file to estimate tokens for.",
        },
      },
      required: [],
    },
  },

  // ==================== CODE ANALYSIS TOOLS (5) ====================
  {
    name: "analyze_code_quality",
    description:
      "Analyze code quality metrics including complexity, maintainability, duplication, and best practices. Returns detailed quality scores and recommendations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "Path to file to analyze.",
        },
        metrics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Metrics to calculate: 'complexity', 'maintainability', 'duplication', 'security', 'performance'. Defaults to all.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "detect_code_smells",
    description:
      "Detect code smells and anti-patterns including long functions, duplicate code, magic numbers, and dead code. Returns list of issues with locations and suggested fixes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "Path to file to analyze.",
        },
        types: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Types of smells to detect: 'long-functions', 'duplicates', 'magic-numbers', 'dead-code', 'complex-conditions'. Defaults to all.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "find_dependencies",
    description:
      "Analyze file dependencies including imports, requires, and module usage. Detects unused imports, circular dependencies, and generates dependency graph.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "Path to file to analyze.",
        },
        deep: {
          type: Type.BOOLEAN,
          description:
            "If true, recursively analyze all imported files. Default false.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "check_types",
    description:
      "Run TypeScript type checking on a file or project. Returns type errors, warnings, and suggestions with line numbers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description:
            "Path to TypeScript file to check. If empty, checks entire project.",
        },
        strict: {
          type: Type.BOOLEAN,
          description: "Use strict mode checking. Default true.",
        },
      },
      required: [],
    },
  },
  {
    name: "lint_code",
    description:
      "Run code linter (ESLint rules) on file and return violations with suggested fixes. Checks for style issues, potential bugs, and best practices.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: { type: Type.STRING, description: "Path to file to lint." },
        fix: {
          type: Type.BOOLEAN,
          description: "Auto-fix issues where possible. Default false.",
        },
        rules: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Specific rules to check. Defaults to recommended rules.",
        },
      },
      required: ["filepath"],
    },
  },

  // ==================== CODE GENERATION TOOLS (5) ====================
  {
    name: "generate_component",
    description:
      "Generate a React/Vue component with TypeScript, props interface, styles, and optional test file. Creates complete, production-ready component structure.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Component name (e.g., 'Button', 'UserProfile').",
        },
        type: {
          type: Type.STRING,
          description:
            "Component type: 'react-functional', 'react-class', 'vue'. Default 'react-functional'.",
        },
        props: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "List of prop names. Will generate TypeScript interface.",
        },
        withStyles: {
          type: Type.BOOLEAN,
          description: "Generate CSS/SCSS file. Default true.",
        },
        withTests: {
          type: Type.BOOLEAN,
          description: "Generate test file. Default false.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "generate_test",
    description:
      "Generate unit test file (Jest/Vitest) for a given function or component. Creates test cases, mocks, and assertions automatically.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "Path to file to generate tests for.",
        },
        framework: {
          type: Type.STRING,
          description:
            "Test framework: 'jest', 'vitest', 'mocha'. Default 'jest'.",
        },
        coverage: {
          type: Type.STRING,
          description:
            "Coverage type: 'basic', 'comprehensive'. Default 'basic'.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "generate_documentation",
    description:
      "Generate JSDoc/TSDoc documentation for functions and classes in a file. Adds parameter descriptions, return types, and examples.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "Path to file to document.",
        },
        style: {
          type: Type.STRING,
          description:
            "Documentation style: 'jsdoc', 'tsdoc'. Default 'tsdoc' for .ts files.",
        },
        addExamples: {
          type: Type.BOOLEAN,
          description: "Include usage examples. Default false.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "generate_types",
    description:
      "Generate TypeScript interfaces/types from JSON objects, API responses, or database schemas. Creates properly typed definitions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        source: {
          type: Type.STRING,
          description: "JSON string, filepath to JSON, or schema definition.",
        },
        name: {
          type: Type.STRING,
          description: "Name for generated type/interface.",
        },
        outputPath: {
          type: Type.STRING,
          description: "Where to save generated types. Default 'src/types.ts'.",
        },
        style: {
          type: Type.STRING,
          description: "'interface' or 'type'. Default 'interface'.",
        },
      },
      required: ["source", "name"],
    },
  },
  {
    name: "generate_api_client",
    description:
      "Generate TypeScript API client code with type-safe methods, error handling, and request/response types. Supports REST APIs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        endpoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "API endpoints to generate (e.g., ['GET /users', 'POST /users']).",
        },
        baseUrl: {
          type: Type.STRING,
          description: "Base URL for API. Default ''.",
        },
        outputPath: {
          type: Type.STRING,
          description:
            "Where to save generated client. Default 'src/api/client.ts'.",
        },
        withFetch: {
          type: Type.BOOLEAN,
          description:
            "Use fetch API. If false, generates axios code. Default true.",
        },
      },
      required: ["endpoints"],
    },
  },

  // ==================== REFACTORING TOOLS (5) ====================
  {
    name: "extract_function",
    description:
      "Extract selected code block into a new function. Automatically detects parameters and return type. Updates original code to call new function.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "File containing code to extract.",
        },
        startLine: {
          type: Type.NUMBER,
          description: "Starting line of code block.",
        },
        endLine: {
          type: Type.NUMBER,
          description: "Ending line of code block.",
        },
        functionName: {
          type: Type.STRING,
          description: "Name for new function.",
        },
        extractToFile: {
          type: Type.STRING,
          description:
            "Optional: extract to separate file instead of same file.",
        },
      },
      required: ["filepath", "startLine", "endLine", "functionName"],
    },
  },
  {
    name: "rename_symbol",
    description:
      "Rename a variable, function, class, or component across the entire project. Updates all references and imports automatically.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "File containing the symbol to rename.",
        },
        oldName: { type: Type.STRING, description: "Current name of symbol." },
        newName: { type: Type.STRING, description: "New name for symbol." },
        scope: {
          type: Type.STRING,
          description:
            "'file' (current file only) or 'project' (all files). Default 'file'.",
        },
      },
      required: ["filepath", "oldName", "newName"],
    },
  },
  {
    name: "optimize_imports",
    description:
      "Organize and optimize import statements. Removes unused imports, sorts alphabetically, groups by type (library/local), and formats consistently.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "File to optimize imports in.",
        },
        removeUnused: {
          type: Type.BOOLEAN,
          description: "Remove unused imports. Default true.",
        },
        sortStyle: {
          type: Type.STRING,
          description:
            "'alphabetical', 'type' (lib first), or 'length'. Default 'type'.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "split_file",
    description:
      "Split a large file into smaller, focused modules. Automatically creates new files, updates imports, and maintains functionality.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: { type: Type.STRING, description: "Large file to split." },
        strategy: {
          type: Type.STRING,
          description:
            "'by-component' (each component to file), 'by-function' (utilities separate), 'by-size' (auto-split by lines). Default 'by-component'.",
        },
        outputDir: {
          type: Type.STRING,
          description: "Directory for new files. Default same as original.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "convert_syntax",
    description:
      "Convert code syntax between different styles/versions. Supports: CommonJS ↔ ES6 modules, class components → functional hooks, callbacks → async/await, var → const/let.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: { type: Type.STRING, description: "File to convert." },
        conversion: {
          type: Type.STRING,
          description:
            "'commonjs-to-esm', 'esm-to-commonjs', 'class-to-hooks', 'callbacks-to-async', 'var-to-const'. Required.",
        },
        safe: {
          type: Type.BOOLEAN,
          description:
            "Use safe mode (more cautious conversions). Default true.",
        },
      },
      required: ["filepath", "conversion"],
    },
  },

  // ==================== ADVANCED OPERATIONS (5) ====================
  {
    name: "find_unused_code",
    description:
      "Scan project for unused code including dead functions, unreferenced components, and orphaned files. Returns list with safe-to-delete suggestions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        scope: {
          type: Type.STRING,
          description:
            "'file' (single file), 'directory' (folder), or 'project' (entire project). Default 'project'.",
        },
        target: {
          type: Type.STRING,
          description:
            "Path to file/directory if scope is 'file' or 'directory'.",
        },
        includeTests: {
          type: Type.BOOLEAN,
          description: "Include test files in scan. Default false.",
        },
      },
      required: [],
    },
  },
  {
    name: "add_error_handling",
    description:
      "Automatically add try-catch blocks and error handling to functions. Adds appropriate error messages and logging.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: {
          type: Type.STRING,
          description: "File to add error handling to.",
        },
        functions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Specific function names. If empty, handles all functions.",
        },
        style: {
          type: Type.STRING,
          description:
            "'try-catch', 'error-boundary' (React), or 'promise-catch'. Default 'try-catch'.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "add_logging",
    description:
      "Add console.log or custom logging statements to functions for debugging. Automatically logs function entry, parameters, and return values.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filepath: { type: Type.STRING, description: "File to add logging to." },
        functions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Specific functions to log. If empty, logs all.",
        },
        level: {
          type: Type.STRING,
          description:
            "'basic' (entry/exit), 'detailed' (params/returns), 'debug' (all variables). Default 'basic'.",
        },
        remove: {
          type: Type.BOOLEAN,
          description:
            "Remove existing logging instead of adding. Default false.",
        },
      },
      required: ["filepath"],
    },
  },
  {
    name: "create_barrel_export",
    description:
      "Create an index.ts barrel file that exports all modules from a directory. Simplifies imports.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        directory: {
          type: Type.STRING,
          description: "Directory to create barrel file in.",
        },
        pattern: {
          type: Type.STRING,
          description:
            "File pattern to include (e.g., '*.ts'). Default all files.",
        },
        named: {
          type: Type.BOOLEAN,
          description: "Use named exports. Default true.",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "setup_path_aliases",
    description:
      "Configure TypeScript path aliases (@components, @utils, etc.) in tsconfig.json. Updates import statements to use aliases.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        aliases: {
          type: Type.OBJECT,
          description:
            "Alias mappings, e.g., {'@components': './src/components', '@utils': './src/utils'}. Required.",
        },
        updateImports: {
          type: Type.BOOLEAN,
          description:
            "Update existing imports to use new aliases. Default true.",
        },
      },
      required: ["aliases"],
    },
  },
  {
    name: "project_analyzer",
    description:
      "Analyze project structure (JS/TS/TSX): functions, classes, complexity, scores. Writes analysis.json. Optional path (relative to project root).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description:
            "Optional. Project path to analyze (relative to project root).",
        },
      },
      required: [],
    },
  },
  {
    name: "src_directory_analyzer",
    description:
      "Analyze src/ directory: equivalent files in root, usage, recommendations. Generates report.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        verbose: {
          type: Type.BOOLEAN,
          description: "Show detailed analysis. Default false.",
        },
        checkSyntax: {
          type: Type.BOOLEAN,
          description: "Check TypeScript/JavaScript syntax. Default false.",
        },
        reportPath: {
          type: Type.STRING,
          description:
            "Custom report output path. Default: src-directory-analysis-report.md",
        },
      },
      required: [],
    },
  },
  {
    name: "file_optimizer",
    description:
      "Analyze project files for unused/redundant/outdated files (dry-run, report only).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reportOnly: {
          type: Type.BOOLEAN,
          description: "Only generate report. Default true.",
        },
        reportPath: {
          type: Type.STRING,
          description:
            "Report output path. Default: file-optimization-report.md",
        },
      },
      required: [],
    },
  },
  {
    name: "runtime_verification",
    description:
      "Run runtime verification: Local AI, Hybrid Engine, SQLite. Returns pass/fail summary.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "project_file_comparison",
    description:
      "Compare files in src/ and root: duplicates, completeness (dry-run only).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        verbose: {
          type: Type.BOOLEAN,
          description: "Show detailed comparison. Default false.",
        },
        reportPath: {
          type: Type.STRING,
          description:
            "Report output path. Default: project-file-comparison-report.md",
        },
      },
      required: [],
    },
  },
];

/**
 * Feature Flags - Enable/disable optimizations without code changes
 * Set to false to disable features and use original implementations
 */
export const FEATURE_FLAGS = {
  // LLM Gateway optimization (can be toggled)
  // When enabled, uses optimized service with token reduction (60-90%)
  // When disabled, uses standard GeminiService (unchanged behavior)
  ENABLE_LLM_GATEWAY: true,

  // Preview panel enhancements (can be toggled)
  // When enabled, uses enhanced preview panel with additional features
  // When disabled, uses original PreviewPanel component
  ENABLE_ENHANCED_PREVIEW: true,

  // Future feature flags can be added here
  // ENABLE_FEATURE_X: false,
};
