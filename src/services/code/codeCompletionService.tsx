import * as monaco from "monaco-editor";

export interface CompletionSuggestion {
  label: string;
  kind: monaco.languages.CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  sortText?: string;
}

export interface CodeContext {
  language: string;
  lineContent: string;
  position: { lineNumber: number; column: number };
  model: monaco.editor.ITextModel;
}

export class CodeCompletionService {
  private static reactComponents: CompletionSuggestion[] = [
    {
      label: "useState",
      kind: monaco.languages.CompletionItemKind.Function,
      detail: "React Hook",
      documentation: "Returns a stateful value and a function to update it",
      insertText: "useState(${1:initialValue})",
      sortText: "0",
    },
    {
      label: "useEffect",
      kind: monaco.languages.CompletionItemKind.Function,
      detail: "React Hook",
      documentation:
        "Accepts a function that contains imperative, possibly effectful code",
      insertText: "useEffect(() => {\n  ${1}\n}, [${2}])",
      sortText: "0",
    },
    {
      label: "useCallback",
      kind: monaco.languages.CompletionItemKind.Function,
      detail: "React Hook",
      documentation: "Returns a memoized callback",
      insertText: "useCallback(${1}, [${2}])",
      sortText: "0",
    },
    {
      label: "useMemo",
      kind: monaco.languages.CompletionItemKind.Function,
      detail: "React Hook",
      documentation: "Returns a memoized value",
      insertText: "useMemo(() => ${1}, [${2}])",
      sortText: "0",
    },
    {
      label: "useRef",
      kind: monaco.languages.CompletionItemKind.Function,
      detail: "React Hook",
      documentation: "Returns a mutable ref object",
      insertText: "useRef(${1:initialValue})",
      sortText: "0",
    },
    {
      label: "useContext",
      kind: monaco.languages.CompletionItemKind.Function,
      detail: "React Hook",
      documentation:
        "Accepts a context object and returns the current context value",
      insertText: "useContext(${1:MyContext})",
      sortText: "0",
    },
    {
      label: "useReducer",
      kind: monaco.languages.CompletionItemKind.Function,
      detail: "React Hook",
      documentation: "Alternative to useState for complex state logic",
      insertText: "useReducer(${1:reducer}, ${2:initialState})",
      sortText: "0",
    },
    {
      label: "React.FC",
      kind: monaco.languages.CompletionItemKind.Interface,
      detail: "React Functional Component",
      documentation: "Type for functional components",
      insertText: "React.FC<${1:Props}>",
      sortText: "0",
    },
  ];

  private static commonSnippets: Record<string, CompletionSuggestion[]> = {
    typescript: [
      {
        label: "interface",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Interface declaration",
        insertText: "interface ${1:InterfaceName} {\n  ${2}\n}",
        sortText: "0",
      },
      {
        label: "type",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Type alias",
        insertText: "type ${1:TypeName} = ${2}",
        sortText: "0",
      },
      {
        label: "function",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Function declaration",
        insertText: "function ${1:functionName}(${2}): ${3:void} {\n  ${4}\n}",
        sortText: "0",
      },
      {
        label: "arrow function",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Arrow function",
        insertText: "const ${1:functionName} = (${2}) => {\n  ${3}\n}",
        sortText: "0",
      },
      {
        label: "class",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Class declaration",
        insertText:
          "class ${1:ClassName} {\n  constructor(${2}) {\n    ${3}\n  }\n}",
        sortText: "0",
      },
      {
        label: "try-catch",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Try-catch block",
        insertText: "try {\n  ${1}\n} catch (error) {\n  ${2}\n}",
        sortText: "0",
      },
      {
        label: "async function",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Async function",
        insertText:
          "async function ${1:functionName}(${2}): Promise<${3:void}> {\n  ${4}\n}",
        sortText: "0",
      },
      {
        label: "promise",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Promise",
        insertText: "new Promise((resolve, reject) => {\n  ${1}\n})",
        sortText: "0",
      },
    ],
    javascript: [
      {
        label: "function",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Function declaration",
        insertText: "function ${1:functionName}(${2}) {\n  ${3}\n}",
        sortText: "0",
      },
      {
        label: "arrow function",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Arrow function",
        insertText: "const ${1:functionName} = (${2}) => {\n  ${3}\n}",
        sortText: "0",
      },
      {
        label: "class",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Class declaration",
        insertText:
          "class ${1:ClassName} {\n  constructor(${2}) {\n    ${3}\n  }\n}",
        sortText: "0",
      },
      {
        label: "for loop",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "For loop",
        insertText:
          "for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n  ${3}\n}",
        sortText: "0",
      },
      {
        label: "for...of",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "For...of loop",
        insertText: "for (const ${1:item} of ${2:array}) {\n  ${3}\n}",
        sortText: "0",
      },
      {
        label: "forEach",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "ForEach loop",
        insertText: "${1:array}.forEach((${2:item}) => {\n  ${3}\n})",
        sortText: "0",
      },
      {
        label: "map",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Map function",
        insertText: "${1:array}.map((${2:item}) => ${3})",
        sortText: "0",
      },
      {
        label: "filter",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Filter function",
        insertText: "${1:array}.filter((${2:item}) => ${3})",
        sortText: "0",
      },
      {
        label: "reduce",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Reduce function",
        insertText:
          "${1:array}.reduce((${2:acc}, ${3:item}) => ${4}, ${5:initialValue})",
        sortText: "0",
      },
    ],
    css: [
      {
        label: "flexbox container",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Flexbox container",
        insertText:
          "display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};",
        sortText: "0",
      },
      {
        label: "grid container",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Grid container",
        insertText:
          "display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:1rem};",
        sortText: "0",
      },
      {
        label: "animation",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "CSS animation",
        insertText:
          "animation: ${1:animationName} ${2:1s} ${3:ease-in-out} ${4:infinite};",
        sortText: "0",
      },
      {
        label: "transition",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "CSS transition",
        insertText: "transition: ${1:all} ${2:0.3s} ${3:ease};",
        sortText: "0",
      },
      {
        label: "media query",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Media query",
        insertText: "@media (max-width: ${1:768px}) {\n  ${2}\n}",
        sortText: "0",
      },
    ],
    html: [
      {
        label: "html5",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "HTML5 boilerplate",
        insertText:
          '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:Document}</title>\n</head>\n<body>\n  ${2}\n</body>\n</html>',
        sortText: "0",
      },
      {
        label: "div",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Div element",
        insertText: '<div className="${1}">\n  ${2}\n</div>',
        sortText: "0",
      },
      {
        label: "link",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Link tag",
        insertText: '<link rel="stylesheet" href="${1}">',
        sortText: "0",
      },
      {
        label: "script",
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: "Script tag",
        insertText: '<script src="${1}"></script>',
        sortText: "0",
      },
    ],
  };

  static registerCompletionProvider(language: string): monaco.IDisposable {
    return monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model, position) => {
        const context: CodeContext = {
          language,
          lineContent: model.getLineContent(position.lineNumber),
          position: {
            lineNumber: position.lineNumber,
            column: position.column,
          },
          model,
        };

        const suggestions = this.getSuggestions(context);

        return {
          suggestions: suggestions.map((s) => ({
            label: s.label,
            kind: s.kind,
            detail: s.detail,
            documentation: s.documentation,
            insertText: s.insertText,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            sortText: s.sortText,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          })),
        };
      },
    });
  }

  private static getSuggestions(context: CodeContext): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];

    // Add language-specific snippets
    const langSnippets = this.commonSnippets[context.language] || [];
    suggestions.push(...langSnippets);

    // Add React suggestions if in TypeScript/JavaScript
    if (
      context.language === "typescript" ||
      context.language === "javascript"
    ) {
      // Check if code contains React imports
      const modelContent = context.model.getValue();
      if (modelContent.includes("react") || modelContent.includes("React")) {
        suggestions.push(...this.reactComponents);
      }

      // Context-aware suggestions
      if (context.lineContent.includes("import")) {
        suggestions.push({
          label: "import React",
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: "React import",
          insertText: "import React from 'react';",
          sortText: "0",
        });
        suggestions.push({
          label: "import useState",
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: "React hooks import",
          insertText: "import { ${1:useState} } from 'react';",
          sortText: "0",
        });
      }

      if (context.lineContent.includes("console.")) {
        suggestions.push({
          label: "log",
          kind: monaco.languages.CompletionItemKind.Method,
          detail: "console.log",
          insertText: "log(${1})",
          sortText: "0",
        });
      }
    }

    return suggestions;
  }

  static registerAllProviders(): monaco.IDisposable[] {
    const languages = ["typescript", "javascript", "css", "html", "json"];
    return languages.map((lang) => this.registerCompletionProvider(lang));
  }

  // Smart auto-completion based on context
  static getSmartSuggestion(context: CodeContext): string | null {
    const { lineContent, language } = context;

    // Detect common patterns
    if (language === "typescript" || language === "javascript") {
      // Auto-close parentheses
      if (lineContent.endsWith("(")) {
        return ")";
      }

      // Auto-close brackets
      if (lineContent.endsWith("[")) {
        return "]";
      }

      // Auto-close braces
      if (lineContent.endsWith("{")) {
        return "\n  \n}";
      }

      // Auto-import suggestions
      if (lineContent.includes("useState") && !lineContent.includes("import")) {
        return "import { useState } from 'react';";
      }
    }

    if (language === "html") {
      // Auto-close tags
      const tagMatch = lineContent.match(/<(\w+)[^>]*>$/);
      if (tagMatch && !lineContent.includes(`</${tagMatch[1]}`)) {
        return `</${tagMatch[1]}>`;
      }
    }

    return null;
  }

  // Format code automatically
  static async formatCode(code: string, language: string): Promise<string> {
    try {
      // Use Prettier for formatting
      const prettier = (await import("prettier")).default;

      let parser: string;
      switch (language) {
        case "typescript":
          parser = "typescript";
          break;
        case "javascript":
          parser = "babel";
          break;
        case "css":
          parser = "css";
          break;
        case "html":
          parser = "html";
          break;
        case "json":
          parser = "json";
          break;
        default:
          return code;
      }

      const formatted = await prettier.format(code, {
        parser,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: "es5",
        printWidth: 100,
      });

      return formatted;
    } catch (error) {
      console.error("Format error:", error);
      return code;
    }
  }

  // Detect language from file extension
  static detectLanguage(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      css: "css",
      scss: "scss",
      html: "html",
      json: "json",
      md: "markdown",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      sql: "sql",
      sh: "shell",
    };

    return languageMap[ext || ""] || "plaintext";
  }
}
