// Core application-wide types

export type Theme = "light" | "dark" | "system";

export interface EditorPosition {
  line: number;
  column: number;
}

export interface EditorSelection {
  start: EditorPosition;
  end: EditorPosition;
}

export interface EditorConfig {
  language?: string;
  theme?: string;
  readOnly?: boolean;
  tabSize?: number;
  fontSize?: number;
  wordWrap?: boolean;
  minimap?: boolean;
  lineNumbers?: boolean;
  autoComplete?: boolean;
  formatOnSave?: boolean;
  formatOnPaste?: boolean;
}

export type EditorLanguage =
  | "typescript"
  | "javascript"
  | "html"
  | "css"
  | "json"
  | "markdown"
  | "python"
  | "java"
  | "cpp"
  | "c"
  | "go"
  | "rust"
  | "plaintext";

export type ViewMode = "default" | "split" | "preview" | "chat" | "editor";
