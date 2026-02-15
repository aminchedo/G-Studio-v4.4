/**
 * Type definitions for Prettier
 * Copied from root `types/prettier.d.ts` for migration to `src/types/`
 */

declare module 'prettier' {
  export interface Options {
    parser?: string;
    plugins?: any[];
    printWidth?: number;
    tabWidth?: number;
    useTabs?: boolean;
    semi?: boolean;
    singleQuote?: boolean;
    trailingComma?: 'none' | 'es5' | 'all';
    bracketSpacing?: boolean;
    arrowParens?: 'avoid' | 'always';
    [key: string]: any;
  }

  export function format(source: string, options?: Options): string;
  export function formatWithCursor(source: string, options?: Options): { formatted: string; cursorOffset: number };
  export function check(source: string, options?: Options): boolean;
  export function resolveConfig(filePath: string): Promise<Options | null>;
  export function clearConfigCache(): void;
  export function getSupportInfo(): any;
}

declare module 'prettier/plugins/babel' {
  const plugin: any;
  export default plugin;
}

declare module 'prettier/plugins/estree' {
  const plugin: any;
  export default plugin;
}

declare module 'prettier/plugins/markdown' {
  const plugin: any;
  export default plugin;
}

declare module 'prettier/plugins/typescript' {
  const plugin: any;
  export default plugin;
}

declare module 'prettier/plugins/html' {
  const plugin: any;
  export default plugin;
}

declare module 'prettier/plugins/css' {
  const plugin: any;
  export default plugin;
}
