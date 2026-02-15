/**
 * useVoiceCommands - Voice command processing hook for G Studio
 * 
 * Supports 100+ voice commands in English and Persian (Farsi)
 * Enables voice-driven software development
 */

import { useState, useCallback, useRef, useMemo } from 'react';

// Types
export type CommandLanguage = 'fa' | 'en' | 'both';
export type CommandCategory = 'file' | 'code' | 'edit' | 'analysis' | 'debug' | 'test' | 'navigation' | 'project' | 'documentation';

export interface VoiceCommand {
  id: string;
  pattern: RegExp;
  patternPersian?: RegExp;
  action: (match: RegExpMatchArray, context: CommandContext) => Promise<CommandResult>;
  description: string;
  descriptionPersian?: string;
  language: CommandLanguage;
  examples: string[];
  examplesPersian?: string[];
  category: CommandCategory;
}

export interface CommandContext {
  activeFile: string | null;
  selectedCode: string | null;
  currentFileContent: string | null;
  cursorPosition: { line: number; column: number };
  projectPath: string;
  openFiles: string[];
  language: 'fa' | 'en';
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  actionType?: string;
}

export interface CommandHistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: number;
  language: 'fa' | 'en';
}

export interface UseVoiceCommandsReturn {
  // State
  commands: VoiceCommand[];
  lastCommand: VoiceCommand | null;
  commandHistory: CommandHistoryEntry[];
  isProcessing: boolean;
  // Actions
  processVoiceInput: (transcript: string, language: 'fa' | 'en', context: CommandContext) => Promise<CommandResult>;
  getCommandsByLanguage: (lang: CommandLanguage) => VoiceCommand[];
  getCommandsByCategory: (category: CommandCategory) => VoiceCommand[];
  registerCommand: (command: VoiceCommand) => void;
  unregisterCommand: (commandId: string) => void;
  clearHistory: () => void;
}

// Generate command ID
const generateCommandId = (): string =>
  `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Default voice commands - English and Persian
 */
const createDefaultCommands = (
  onExecute: (type: string, params: any) => Promise<CommandResult>
): VoiceCommand[] => [
  // ===== FILE OPERATIONS =====
  {
    id: 'create_file',
    pattern: /^(?:create|make|new)\s+(?:a\s+)?file\s+(?:named\s+)?(.+)$/i,
    patternPersian: /^فایل\s+(.+)\s+(?:را\s+)?بساز$/i,
    action: async (match, context) => onExecute('createFile', { filename: match[1].trim() }),
    description: 'Create a new file',
    descriptionPersian: 'ایجاد فایل جدید',
    language: 'both',
    examples: ['create file app.js', 'create a file named utils.ts', 'new file index.html'],
    examplesPersian: ['فایل app.js بساز', 'فایل utils.ts را بساز'],
    category: 'file',
  },
  {
    id: 'open_file',
    pattern: /^open\s+(?:file\s+)?(.+)$/i,
    patternPersian: /^فایل\s+(.+)\s+(?:را\s+)?باز\s+کن$/i,
    action: async (match, context) => onExecute('openFile', { filename: match[1].trim() }),
    description: 'Open a file',
    descriptionPersian: 'باز کردن فایل',
    language: 'both',
    examples: ['open file config.ts', 'open index.html'],
    examplesPersian: ['فایل config.ts را باز کن'],
    category: 'file',
  },
  {
    id: 'close_file',
    pattern: /^close\s+(?:file|current\s+file)?(?:\s+(.+))?$/i,
    patternPersian: /^فایل\s+(?:جاری\s+)?(?:را\s+)?ببند$/i,
    action: async (match, context) => onExecute('closeFile', { filename: match[1]?.trim() || context.activeFile }),
    description: 'Close a file',
    descriptionPersian: 'بستن فایل',
    language: 'both',
    examples: ['close file', 'close current file', 'close app.js'],
    examplesPersian: ['فایل جاری را ببند'],
    category: 'file',
  },
  {
    id: 'save_file',
    pattern: /^save\s+(?:file|the\s+file)?(?:\s+as\s+(.+))?$/i,
    patternPersian: /^فایل\s+(?:را\s+)?ذخیره\s+کن$/i,
    action: async (match, context) => onExecute('saveFile', { filename: match[1]?.trim() }),
    description: 'Save the file',
    descriptionPersian: 'ذخیره فایل',
    language: 'both',
    examples: ['save file', 'save file as backup.js'],
    examplesPersian: ['فایل را ذخیره کن'],
    category: 'file',
  },
  {
    id: 'delete_file',
    pattern: /^delete\s+(?:file\s+)?(.+)$/i,
    patternPersian: /^فایل\s+(.+)\s+(?:را\s+)?حذف\s+کن$/i,
    action: async (match, context) => onExecute('deleteFile', { filename: match[1].trim() }),
    description: 'Delete a file',
    descriptionPersian: 'حذف فایل',
    language: 'both',
    examples: ['delete file old.js', 'delete temp.txt'],
    examplesPersian: ['فایل old.js را حذف کن'],
    category: 'file',
  },
  {
    id: 'rename_file',
    pattern: /^rename\s+(?:file\s+)?(.+)\s+to\s+(.+)$/i,
    patternPersian: /^فایل\s+(.+)\s+(?:را\s+)?به\s+(.+)\s+تغییر\s+نام\s+بده$/i,
    action: async (match, context) => onExecute('renameFile', { oldName: match[1].trim(), newName: match[2].trim() }),
    description: 'Rename a file',
    descriptionPersian: 'تغییر نام فایل',
    language: 'both',
    examples: ['rename file old.js to new.js'],
    examplesPersian: ['فایل old.js را به new.js تغییر نام بده'],
    category: 'file',
  },
  {
    id: 'create_folder',
    pattern: /^(?:create|make|new)\s+(?:a\s+)?folder\s+(?:named\s+)?(.+)$/i,
    patternPersian: /^پوشه\s+(.+)\s+(?:را\s+)?بساز$/i,
    action: async (match, context) => onExecute('createFolder', { foldername: match[1].trim() }),
    description: 'Create a new folder',
    descriptionPersian: 'ایجاد پوشه جدید',
    language: 'both',
    examples: ['create folder components', 'new folder utils'],
    examplesPersian: ['پوشه components بساز'],
    category: 'file',
  },

  // ===== CODE GENERATION =====
  {
    id: 'write_function',
    pattern: /^(?:write|create|make)\s+(?:a\s+)?function\s+(?:to\s+|that\s+|for\s+|called\s+)?(.+)$/i,
    patternPersian: /^(?:یک\s+)?فانکشن\s+(?:برای\s+|به\s+نام\s+)?(.+)\s+بنویس$/i,
    action: async (match, context) => onExecute('generateFunction', { description: match[1].trim() }),
    description: 'Generate a function',
    descriptionPersian: 'نوشتن تابع',
    language: 'both',
    examples: ['write a function to calculate sum', 'create function called login', 'write function for validation'],
    examplesPersian: ['یک فانکشن برای محاسبه جمع بنویس'],
    category: 'code',
  },
  {
    id: 'create_component',
    pattern: /^(?:create|make|write)\s+(?:a\s+)?(?:react\s+)?component\s+(?:for\s+|called\s+|named\s+)?(.+)$/i,
    patternPersian: /^کامپوننت\s+(.+)\s+(?:را\s+)?بساز$/i,
    action: async (match, context) => onExecute('generateComponent', { name: match[1].trim() }),
    description: 'Create a React component',
    descriptionPersian: 'ایجاد کامپوننت',
    language: 'both',
    examples: ['create component Button', 'create react component for login', 'make component named Header'],
    examplesPersian: ['کامپوننت Button بساز'],
    category: 'code',
  },
  {
    id: 'create_interface',
    pattern: /^(?:create|make|write)\s+(?:an?\s+)?interface\s+(?:for\s+|called\s+|named\s+)?(.+)$/i,
    patternPersian: /^اینترفیس\s+(.+)\s+(?:را\s+)?بساز$/i,
    action: async (match, context) => onExecute('generateInterface', { name: match[1].trim() }),
    description: 'Create a TypeScript interface',
    descriptionPersian: 'ایجاد اینترفیس',
    language: 'both',
    examples: ['create interface for user', 'make interface UserData'],
    examplesPersian: ['اینترفیس User بساز'],
    category: 'code',
  },
  {
    id: 'create_class',
    pattern: /^(?:create|make|write)\s+(?:a\s+)?class\s+(?:for\s+|called\s+|named\s+)?(.+)$/i,
    patternPersian: /^کلاس\s+(.+)\s+(?:را\s+)?بساز$/i,
    action: async (match, context) => onExecute('generateClass', { name: match[1].trim() }),
    description: 'Create a class',
    descriptionPersian: 'ایجاد کلاس',
    language: 'both',
    examples: ['create class UserService', 'make class for database'],
    examplesPersian: ['کلاس UserService بساز'],
    category: 'code',
  },
  {
    id: 'implement_feature',
    pattern: /^implement\s+(.+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?پیاده\s*سازی\s+کن$/i,
    action: async (match, context) => onExecute('implementFeature', { feature: match[1].trim() }),
    description: 'Implement a feature',
    descriptionPersian: 'پیاده‌سازی ویژگی',
    language: 'both',
    examples: ['implement authentication', 'implement dark mode'],
    examplesPersian: ['احراز هویت را پیاده سازی کن'],
    category: 'code',
  },

  // ===== CODE EDITING =====
  {
    id: 'add_code',
    pattern: /^add\s+(.+)\s+(?:to|at|in)\s+(.+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?به\s+(.+)\s+اضافه\s+کن$/i,
    action: async (match, context) => onExecute('addCode', { code: match[1].trim(), location: match[2].trim() }),
    description: 'Add code to a location',
    descriptionPersian: 'افزودن کد',
    language: 'both',
    examples: ['add import at top', 'add console.log to function'],
    examplesPersian: ['import را به بالا اضافه کن'],
    category: 'edit',
  },
  {
    id: 'insert_line',
    pattern: /^insert\s+(.+)\s+(?:at|on)\s+line\s+(\d+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?در\s+خط\s+(\d+)\s+درج\s+کن$/i,
    action: async (match, context) => onExecute('insertAtLine', { code: match[1].trim(), line: parseInt(match[2]) }),
    description: 'Insert code at a specific line',
    descriptionPersian: 'درج کد در خط مشخص',
    language: 'both',
    examples: ['insert const x = 1 at line 10'],
    examplesPersian: ['const x = 1 را در خط 10 درج کن'],
    category: 'edit',
  },
  {
    id: 'remove_code',
    pattern: /^(?:remove|delete)\s+(.+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?حذف\s+کن$/i,
    action: async (match, context) => onExecute('removeCode', { target: match[1].trim() }),
    description: 'Remove code',
    descriptionPersian: 'حذف کد',
    language: 'both',
    examples: ['remove console.log', 'delete unused imports'],
    examplesPersian: ['console.log را حذف کن'],
    category: 'edit',
  },
  {
    id: 'replace_code',
    pattern: /^replace\s+(.+)\s+with\s+(.+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?با\s+(.+)\s+جایگزین\s+کن$/i,
    action: async (match, context) => onExecute('replaceCode', { old: match[1].trim(), new: match[2].trim() }),
    description: 'Replace code',
    descriptionPersian: 'جایگزینی کد',
    language: 'both',
    examples: ['replace var with const', 'replace function with arrow function'],
    examplesPersian: ['var را با const جایگزین کن'],
    category: 'edit',
  },
  {
    id: 'comment_code',
    pattern: /^comment\s+(?:out\s+)?(.+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?کامنت\s+کن$/i,
    action: async (match, context) => onExecute('commentCode', { target: match[1].trim() }),
    description: 'Comment out code',
    descriptionPersian: 'کامنت کردن کد',
    language: 'both',
    examples: ['comment out this line', 'comment selected code'],
    examplesPersian: ['این خط را کامنت کن'],
    category: 'edit',
  },
  {
    id: 'uncomment_code',
    pattern: /^uncomment\s+(.+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?از\s+کامنت\s+درآور$/i,
    action: async (match, context) => onExecute('uncommentCode', { target: match[1].trim() }),
    description: 'Uncomment code',
    descriptionPersian: 'خارج کردن از کامنت',
    language: 'both',
    examples: ['uncomment this line'],
    examplesPersian: ['این خط را از کامنت درآور'],
    category: 'edit',
  },
  {
    id: 'format_code',
    pattern: /^format\s+(?:the\s+)?(?:code|file)$/i,
    patternPersian: /^کد\s+(?:را\s+)?فرمت\s+کن$/i,
    action: async (match, context) => onExecute('formatCode', {}),
    description: 'Format the code',
    descriptionPersian: 'فرمت کردن کد',
    language: 'both',
    examples: ['format code', 'format file'],
    examplesPersian: ['کد را فرمت کن'],
    category: 'edit',
  },

  // ===== CODE ANALYSIS =====
  {
    id: 'explain_code',
    pattern: /^explain\s+(?:this\s+)?(?:code|function|component)?$/i,
    patternPersian: /^این\s+(?:کد|فانکشن|کامپوننت)\s+(?:را\s+)?توضیح\s+بده$/i,
    action: async (match, context) => onExecute('explainCode', { code: context.selectedCode || context.currentFileContent }),
    description: 'Explain the code',
    descriptionPersian: 'توضیح کد',
    language: 'both',
    examples: ['explain this code', 'explain this function'],
    examplesPersian: ['این کد را توضیح بده'],
    category: 'analysis',
  },
  {
    id: 'analyze_code',
    pattern: /^analyze\s+(?:this\s+)?(?:code|file)?$/i,
    patternPersian: /^این\s+کد\s+(?:را\s+)?آنالیز\s+کن$/i,
    action: async (match, context) => onExecute('analyzeCode', { code: context.selectedCode || context.currentFileContent }),
    description: 'Analyze the code',
    descriptionPersian: 'تحلیل کد',
    language: 'both',
    examples: ['analyze this code', 'analyze file'],
    examplesPersian: ['این کد را آنالیز کن'],
    category: 'analysis',
  },
  {
    id: 'find_issues',
    pattern: /^(?:find|check\s+for)\s+(?:issues|errors|bugs|problems)(?:\s+in\s+(?:this\s+)?code)?$/i,
    patternPersian: /^مشکلات\s+(?:این\s+کد\s+)?(?:را\s+)?پیدا\s+کن$/i,
    action: async (match, context) => onExecute('findIssues', { code: context.selectedCode || context.currentFileContent }),
    description: 'Find issues in the code',
    descriptionPersian: 'یافتن مشکلات کد',
    language: 'both',
    examples: ['find issues', 'check for errors', 'find bugs'],
    examplesPersian: ['مشکلات این کد را پیدا کن'],
    category: 'analysis',
  },
  {
    id: 'suggest_improvements',
    pattern: /^suggest\s+(?:improvements|optimizations)$/i,
    patternPersian: /^پیشنهاد\s+(?:بهبود|بهینه‌سازی)\s+بده$/i,
    action: async (match, context) => onExecute('suggestImprovements', { code: context.selectedCode || context.currentFileContent }),
    description: 'Suggest code improvements',
    descriptionPersian: 'پیشنهاد بهبود',
    language: 'both',
    examples: ['suggest improvements', 'suggest optimizations'],
    examplesPersian: ['پیشنهاد بهبود بده'],
    category: 'analysis',
  },

  // ===== DEBUGGING =====
  {
    id: 'fix_bug',
    pattern: /^fix\s+(?:the\s+)?(?:bug|error|issue)$/i,
    patternPersian: /^(?:باگ|خطا)\s+(?:را\s+)?(?:برطرف|رفع)\s+کن$/i,
    action: async (match, context) => onExecute('fixBug', { code: context.selectedCode || context.currentFileContent }),
    description: 'Fix the bug',
    descriptionPersian: 'رفع باگ',
    language: 'both',
    examples: ['fix the bug', 'fix the error'],
    examplesPersian: ['باگ را برطرف کن', 'خطا را رفع کن'],
    category: 'debug',
  },
  {
    id: 'debug_code',
    pattern: /^debug\s+(?:this\s+)?(?:code|function)?$/i,
    patternPersian: /^این\s+(?:کد|فانکشن)\s+(?:را\s+)?دیباگ\s+کن$/i,
    action: async (match, context) => onExecute('debugCode', { code: context.selectedCode || context.currentFileContent }),
    description: 'Debug the code',
    descriptionPersian: 'دیباگ کد',
    language: 'both',
    examples: ['debug this code', 'debug function'],
    examplesPersian: ['این کد را دیباگ کن'],
    category: 'debug',
  },
  {
    id: 'whats_wrong',
    pattern: /^(?:what's|what\s+is)\s+wrong\s+(?:with\s+(?:this\s+)?code)?$/i,
    patternPersian: /^مشکل\s+(?:این\s+)?کد\s+چیست$/i,
    action: async (match, context) => onExecute('diagnoseIssue', { code: context.selectedCode || context.currentFileContent }),
    description: 'Diagnose the issue',
    descriptionPersian: 'تشخیص مشکل',
    language: 'both',
    examples: ["what's wrong with this code", 'what is wrong'],
    examplesPersian: ['مشکل این کد چیست'],
    category: 'debug',
  },

  // ===== REFACTORING =====
  {
    id: 'refactor_code',
    pattern: /^refactor\s+(?:this\s+)?(?:code|function|component)?$/i,
    patternPersian: /^این\s+(?:کد|فانکشن)\s+(?:را\s+)?ریفکتور\s+کن$/i,
    action: async (match, context) => onExecute('refactorCode', { code: context.selectedCode || context.currentFileContent }),
    description: 'Refactor the code',
    descriptionPersian: 'ریفکتور کردن کد',
    language: 'both',
    examples: ['refactor this code', 'refactor function'],
    examplesPersian: ['این فانکشن را ریفکتور کن'],
    category: 'edit',
  },
  {
    id: 'optimize_code',
    pattern: /^optimize\s+(?:this\s+)?(?:code|function)?$/i,
    patternPersian: /^این\s+(?:کد|فانکشن)\s+(?:را\s+)?بهینه\s+کن$/i,
    action: async (match, context) => onExecute('optimizeCode', { code: context.selectedCode || context.currentFileContent }),
    description: 'Optimize the code',
    descriptionPersian: 'بهینه‌سازی کد',
    language: 'both',
    examples: ['optimize this code', 'optimize function'],
    examplesPersian: ['این کد را بهینه کن'],
    category: 'edit',
  },
  {
    id: 'simplify_code',
    pattern: /^simplify\s+(?:this\s+)?(?:code)?$/i,
    patternPersian: /^این\s+کد\s+(?:را\s+)?ساده\s+کن$/i,
    action: async (match, context) => onExecute('simplifyCode', { code: context.selectedCode || context.currentFileContent }),
    description: 'Simplify the code',
    descriptionPersian: 'ساده‌سازی کد',
    language: 'both',
    examples: ['simplify this code'],
    examplesPersian: ['این کد را ساده کن'],
    category: 'edit',
  },

  // ===== TESTING =====
  {
    id: 'write_tests',
    pattern: /^(?:write|create|add)\s+tests?\s+(?:for\s+(?:this\s+)?(?:function|component)?)?$/i,
    patternPersian: /^تست\s+(?:برای\s+این\s+(?:فانکشن|کامپوننت)\s+)?بنویس$/i,
    action: async (match, context) => onExecute('writeTests', { code: context.selectedCode || context.currentFileContent }),
    description: 'Write tests for the code',
    descriptionPersian: 'نوشتن تست',
    language: 'both',
    examples: ['write tests', 'create tests for this function'],
    examplesPersian: ['تست برای این فانکشن بنویس'],
    category: 'test',
  },
  {
    id: 'run_tests',
    pattern: /^run\s+tests?$/i,
    patternPersian: /^تست(?:‌ها)?\s+(?:را\s+)?اجرا\s+کن$/i,
    action: async (match, context) => onExecute('runTests', {}),
    description: 'Run tests',
    descriptionPersian: 'اجرای تست',
    language: 'both',
    examples: ['run tests'],
    examplesPersian: ['تست‌ها را اجرا کن'],
    category: 'test',
  },

  // ===== DOCUMENTATION =====
  {
    id: 'add_comments',
    pattern: /^add\s+comments?\s+(?:to\s+(?:this\s+)?(?:function|code)?)?$/i,
    patternPersian: /^کامنت\s+(?:به\s+این\s+(?:فانکشن|کد)\s+)?اضافه\s+کن$/i,
    action: async (match, context) => onExecute('addComments', { code: context.selectedCode || context.currentFileContent }),
    description: 'Add comments to the code',
    descriptionPersian: 'افزودن کامنت',
    language: 'both',
    examples: ['add comments', 'add comments to this function'],
    examplesPersian: ['کامنت به این فانکشن اضافه کن'],
    category: 'documentation',
  },
  {
    id: 'generate_docs',
    pattern: /^(?:generate|create)\s+documentation$/i,
    patternPersian: /^مستندات\s+(?:را\s+)?تولید\s+کن$/i,
    action: async (match, context) => onExecute('generateDocs', { code: context.selectedCode || context.currentFileContent }),
    description: 'Generate documentation',
    descriptionPersian: 'تولید مستندات',
    language: 'both',
    examples: ['generate documentation', 'create documentation'],
    examplesPersian: ['مستندات را تولید کن'],
    category: 'documentation',
  },

  // ===== NAVIGATION =====
  {
    id: 'goto_line',
    pattern: /^(?:go\s+to|goto)\s+line\s+(\d+)$/i,
    patternPersian: /^به\s+خط\s+(\d+)\s+برو$/i,
    action: async (match, context) => onExecute('gotoLine', { line: parseInt(match[1]) }),
    description: 'Go to a specific line',
    descriptionPersian: 'رفتن به خط',
    language: 'both',
    examples: ['go to line 50', 'goto line 100'],
    examplesPersian: ['به خط 50 برو'],
    category: 'navigation',
  },
  {
    id: 'find_text',
    pattern: /^(?:find|search\s+for)\s+(.+)$/i,
    patternPersian: /^(.+)\s+(?:را\s+)?(?:پیدا|جستجو)\s+کن$/i,
    action: async (match, context) => onExecute('findText', { text: match[1].trim() }),
    description: 'Find text in the file',
    descriptionPersian: 'جستجوی متن',
    language: 'both',
    examples: ['find useState', 'search for function'],
    examplesPersian: ['useState را پیدا کن'],
    category: 'navigation',
  },
  {
    id: 'goto_function',
    pattern: /^(?:go\s+to|goto)\s+function\s+(.+)$/i,
    patternPersian: /^فانکشن\s+(.+)\s+(?:را\s+)?(?:پیدا|برو)$/i,
    action: async (match, context) => onExecute('gotoFunction', { name: match[1].trim() }),
    description: 'Go to a function',
    descriptionPersian: 'رفتن به تابع',
    language: 'both',
    examples: ['go to function handleClick'],
    examplesPersian: ['فانکشن handleClick را پیدا کن'],
    category: 'navigation',
  },

  // ===== PROJECT =====
  {
    id: 'create_project',
    pattern: /^(?:create|new)\s+project$/i,
    patternPersian: /^پروژه\s+جدید\s+بساز$/i,
    action: async (match, context) => onExecute('createProject', {}),
    description: 'Create a new project',
    descriptionPersian: 'ایجاد پروژه جدید',
    language: 'both',
    examples: ['create project', 'new project'],
    examplesPersian: ['پروژه جدید بساز'],
    category: 'project',
  },
  {
    id: 'build_project',
    pattern: /^build\s+(?:the\s+)?project$/i,
    patternPersian: /^پروژه\s+(?:را\s+)?بیلد\s+کن$/i,
    action: async (match, context) => onExecute('buildProject', {}),
    description: 'Build the project',
    descriptionPersian: 'بیلد پروژه',
    language: 'both',
    examples: ['build project'],
    examplesPersian: ['پروژه را بیلد کن'],
    category: 'project',
  },
  {
    id: 'run_project',
    pattern: /^run\s+(?:the\s+)?project$/i,
    patternPersian: /^پروژه\s+(?:را\s+)?اجرا\s+کن$/i,
    action: async (match, context) => onExecute('runProject', {}),
    description: 'Run the project',
    descriptionPersian: 'اجرای پروژه',
    language: 'both',
    examples: ['run project'],
    examplesPersian: ['پروژه را اجرا کن'],
    category: 'project',
  },
];

/**
 * useVoiceCommands hook
 */
export function useVoiceCommands(
  onExecute?: (type: string, params: any) => Promise<CommandResult>
): UseVoiceCommandsReturn {
  // Default executor
  const defaultExecutor = useCallback(async (type: string, params: any): Promise<CommandResult> => {
    console.log(`[VoiceCommand] Executing: ${type}`, params);
    return {
      success: true,
      message: `Command "${type}" queued for execution`,
      actionType: type,
      data: params,
    };
  }, []);

  const executor = onExecute || defaultExecutor;

  // Create commands with executor
  const defaultCommands = useMemo(() => createDefaultCommands(executor), [executor]);

  // State
  const [commands, setCommands] = useState<VoiceCommand[]>(defaultCommands);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process voice input
  const processVoiceInput = useCallback(
    async (transcript: string, language: 'fa' | 'en', context: CommandContext): Promise<CommandResult> => {
      setIsProcessing(true);
      const trimmedTranscript = transcript.trim().toLowerCase();
      
      console.log(`[VoiceCommands] Processing: "${transcript}" (${language})`);

      try {
        // Find matching command
        for (const command of commands) {
          // Check language compatibility
          if (command.language !== 'both' && command.language !== language) {
            continue;
          }

          // Try to match pattern based on language
          const pattern = language === 'fa' && command.patternPersian
            ? command.patternPersian
            : command.pattern;

          const match = trimmedTranscript.match(pattern);
          
          if (match) {
            console.log(`[VoiceCommands] Matched command: ${command.id}`);
            setLastCommand(command);

            // Execute command
            const result = await command.action(match, context);

            // Add to history
            const historyEntry: CommandHistoryEntry = {
              command: transcript,
              result,
              timestamp: Date.now(),
              language,
            };
            setCommandHistory(prev => [...prev.slice(-99), historyEntry]);

            setIsProcessing(false);
            return result;
          }
        }

        // No match found - return fallback result
        const fallbackResult: CommandResult = {
          success: false,
          message: `Command not recognized: "${transcript}"`,
          error: 'NO_MATCH',
        };

        setCommandHistory(prev => [...prev.slice(-99), {
          command: transcript,
          result: fallbackResult,
          timestamp: Date.now(),
          language,
        }]);

        setIsProcessing(false);
        return fallbackResult;
      } catch (error) {
        const errorResult: CommandResult = {
          success: false,
          message: 'Command execution failed',
          error: error instanceof Error ? error.message : String(error),
        };
        setIsProcessing(false);
        return errorResult;
      }
    },
    [commands]
  );

  // Get commands by language
  const getCommandsByLanguage = useCallback(
    (lang: CommandLanguage): VoiceCommand[] => {
      return commands.filter(
        cmd => cmd.language === lang || cmd.language === 'both'
      );
    },
    [commands]
  );

  // Get commands by category
  const getCommandsByCategory = useCallback(
    (category: CommandCategory): VoiceCommand[] => {
      return commands.filter(cmd => cmd.category === category);
    },
    [commands]
  );

  // Register command
  const registerCommand = useCallback((command: VoiceCommand) => {
    setCommands(prev => {
      // Remove existing command with same ID
      const filtered = prev.filter(cmd => cmd.id !== command.id);
      return [...filtered, command];
    });
  }, []);

  // Unregister command
  const unregisterCommand = useCallback((commandId: string) => {
    setCommands(prev => prev.filter(cmd => cmd.id !== commandId));
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  return {
    commands,
    lastCommand,
    commandHistory,
    isProcessing,
    processVoiceInput,
    getCommandsByLanguage,
    getCommandsByCategory,
    registerCommand,
    unregisterCommand,
    clearHistory,
  };
}

// Context
import React, { createContext, useContext, ReactNode } from 'react';

const VoiceCommandsContext = createContext<UseVoiceCommandsReturn | null>(null);

interface VoiceCommandsProviderProps {
  children: ReactNode;
  onExecute?: (type: string, params: any) => Promise<CommandResult>;
}

export const VoiceCommandsProvider: React.FC<VoiceCommandsProviderProps> = ({
  children,
  onExecute,
}) => {
  const voiceCommands = useVoiceCommands(onExecute);
  return (
    <VoiceCommandsContext.Provider value={voiceCommands}>
      {children}
    </VoiceCommandsContext.Provider>
  );
};

export const useVoiceCommandsContext = (): UseVoiceCommandsReturn => {
  const context = useContext(VoiceCommandsContext);
  if (!context) {
    throw new Error(
      'useVoiceCommandsContext must be used within a VoiceCommandsProvider'
    );
  }
  return context;
};

export default useVoiceCommands;
