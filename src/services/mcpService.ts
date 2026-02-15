import { FileData } from '@/types';
import { UtilityTools } from './utilityTools';
import { GeminiService } from './geminiService';
import { TokenOptimizer } from './tokenOptimizer';
import { ErrorHandler, ErrorCode } from './errorHandler';
import { ToolValidator } from './toolValidator';
import { StateTransaction } from './stateTransaction';
import { TelemetryService } from './telemetryService';
import { FilesystemAdapter } from './filesystemAdapter';

export interface McpToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export type McpToolCallbacks = {
  setFiles: (updater: (prev: Record<string, FileData>) => Record<string, FileData>) => void;
  setOpenFiles: (updater: (prev: string[]) => string[]) => void;
  setActiveFile: (file: string | null) => void;
  getActiveFile: () => string | null;
  getOpenFiles: () => string[];
  getTokenUsage?: () => { prompt: number; response: number };
  getSelectedModel?: () => string;
};

export class McpService {
  /**
   * Execute MCP tool with proper validation and error handling
   * Routes through FilesystemAdapter for mode selection
   */
  static async executeTool(
    tool: string,
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Route through adapter for mode selection
    const mode = process.env.ENABLE_FILESYSTEM_MODE === 'true' ? 'filesystem' : 'memory';
    return FilesystemAdapter.execute(tool, args, files, callbacks, mode);
  }

  /**
   * Internal tool execution (existing logic preserved)
   * Called by FilesystemAdapter in memory mode
   */
  static async executeToolInternal(
    tool: string,
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      let result: McpToolResult;

      switch (tool) {
        case 'create_file':
          return await this.createFile(args, files, callbacks);
        case 'read_file':
          return await this.readFile(args, files);
        case 'write_code':
          return await this.writeCode(args, files, callbacks);
        case 'edit_file':
          return await this.editFile(args, files, callbacks);
        case 'move_file':
          return await this.moveFile(args, files, callbacks);
        case 'delete_file':
          return await this.deleteFile(args, files, callbacks);
        case 'search_files':
          return await this.searchFiles(args, files);
        case 'run':
          return await this.runCommand(args, files);
        case 'project_overview':
          return await this.projectOverview(files);
        case 'format_file':
          return await this.formatFile(args, files, callbacks);
        case 'open_file':
          return await this.openFile(args, files, callbacks);
        case 'search_in_file':
          return await this.searchInFile(args, files);
        case 'replace_in_file':
          return await this.replaceInFile(args, files, callbacks);
        case 'get_file_info':
          return await this.getFileInfo(args, files, callbacks);
        case 'get_line':
          return await this.getLine(args, files);
        case 'get_lines':
          return await this.getLines(args, files);
        case 'insert_at_line':
          return await this.insertAtLine(args, files, callbacks);
        case 'replace_line':
          return await this.replaceLine(args, files, callbacks);
        case 'delete_line':
          return await this.deleteLine(args, files, callbacks);
        case 'save_conversation':
          return await this.saveConversation(args, callbacks);
        case 'load_conversation':
          return await this.loadConversation(args, callbacks);
        case 'list_conversations':
          return await this.listConversations();
        case 'delete_conversation':
          return await this.deleteConversation(args);
        // Utility Tools
        case 'calculate':
          return UtilityTools.calculate(args.expression || '');
        case 'get_current_time':
          return UtilityTools.getCurrentTime(args.timezone, args.format);
        case 'generate_uuid':
          return UtilityTools.generateUUID(args.version, args.count);
        case 'hash_text':
          return await UtilityTools.hashText(args.text, args.algorithm);
        case 'base64_encode':
          return UtilityTools.base64Encode(args.text);
        case 'base64_decode':
          return UtilityTools.base64Decode(args.text);
        case 'format_json':
          return UtilityTools.formatJSON(args.json, args.indent);
        case 'text_transform':
          return UtilityTools.textTransform(args.text, args.operation);
        case 'generate_random':
          return UtilityTools.generateRandom(args.type, args.min, args.max, args.length, args.includeSpecialChars);
        case 'color_converter':
          return UtilityTools.colorConverter(args.color, args.toFormat);
        case 'unit_converter':
          return UtilityTools.unitConverter(args.value, args.fromUnit, args.toUnit);
        case 'check_quota':
          return await this.checkQuota(callbacks);
        case 'token_optimization_tips':
          return await this.getTokenOptimizationTips(callbacks);
        case 'remove_comments':
          return await this.removeComments(args, files, callbacks);
        case 'compress_code':
          return await this.compressCode(args, files, callbacks);
        case 'optimize_prompt':
          return await this.optimizePrompt(args);
        case 'estimate_tokens':
          return await this.estimateTokens(args, files);
        // ==================== CODE ANALYSIS TOOLS (5) ====================
        case 'analyze_code_quality':
          return await this.analyzeCodeQuality(args, files);
        case 'detect_code_smells':
          return await this.detectCodeSmells(args, files);
        case 'find_dependencies':
          return await this.findDependencies(args, files);
        case 'check_types':
          return await this.checkTypes(args, files);
        case 'lint_code':
          return await this.lintCode(args, files, callbacks);
        // ==================== CODE GENERATION TOOLS (5) ====================
        case 'generate_component':
          return await this.generateComponent(args, files, callbacks);
        case 'generate_test':
          return await this.generateTest(args, files, callbacks);
        case 'generate_documentation':
          return await this.generateDocumentation(args, files, callbacks);
        case 'generate_types':
          return await this.generateTypes(args, files, callbacks);
        case 'generate_api_client':
          return await this.generateApiClient(args, files, callbacks);
        // ==================== REFACTORING TOOLS (5) ====================
        case 'extract_function':
          return await this.extractFunction(args, files, callbacks);
        case 'rename_symbol':
          return await this.renameSymbol(args, files, callbacks);
        case 'optimize_imports':
          return await this.optimizeImports(args, files, callbacks);
        case 'split_file':
          return await this.splitFile(args, files, callbacks);
        case 'convert_syntax':
          return await this.convertSyntax(args, files, callbacks);
        // ==================== ADVANCED OPERATIONS (5) ====================
        case 'find_unused_code':
          return await this.findUnusedCode(args, files);
        case 'add_error_handling':
          return await this.addErrorHandling(args, files, callbacks);
        case 'add_logging':
          return await this.addLogging(args, files, callbacks);
        case 'create_barrel_export':
          return await this.createBarrelExport(args, files, callbacks);
        case 'setup_path_aliases':
          return await this.setupPathAliases(args, files, callbacks);
        default:
          result = {
            success: false,
            message: `Unknown tool: ${tool}`,
            error: 'UNKNOWN_TOOL'
          };
      }

      success = result.success;
      error = result.error;
      return result;
    } catch (err: any) {
      // Use ErrorHandler for standardized error handling
      error = err.message || 'Unknown error';
      const result = ErrorHandler.createToolError(err, tool, args);
      return result;
    } finally {
      // Record telemetry
      const duration = Date.now() - startTime;
      TelemetryService.recordToolExecution(tool, success, duration, error, args);
    }
  }

  private static async createFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', false),
      ToolValidator.filePathRules('filename', false),
      ToolValidator.fileContentRules('content', false),
    ]);

    const path = validated.path || validated.filename;
    const content = validated.content || '';

    if (!path) {
      return { success: false, message: 'Path or filename is required', error: 'MISSING_PATH' };
    }

    // Check if file already exists
    if (files[path]) {
      return { 
        success: false, 
        message: `File ${path} already exists. Use write_code or edit_file to modify it.`, 
        error: 'FILE_EXISTS' 
      };
    }

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      content,
      null, // No old content (new file)
      callbacks.setFiles,
      path.split('.').pop() || 'plaintext'
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to create file ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    // Update UI state
    if (!callbacks.getOpenFiles().includes(path)) {
      callbacks.setOpenFiles(prev => [...prev, path]);
    }
    callbacks.setActiveFile(path);

    return {
      success: true,
      message: `File ${path} created successfully`,
      data: { path, content }
    };
  }

  private static async readFile(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
    ]);

    const path = validated.path;
    const file = files[path];
    
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    return {
      success: true,
      message: `File ${path} read successfully`,
      data: { 
        content: file.content, 
        language: file.language,
        size: file.content.length,
        lines: file.content.split('\n').length,
      }
    };
  }

  private static async writeCode(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', false),
      ToolValidator.filePathRules('filename', false),
      ToolValidator.fileContentRules('content', true),
    ]);

    const path = validated.path || validated.filename;
    const content = validated.content;

    if (!path) {
      return { success: false, message: 'Path or filename is required', error: 'MISSING_PATH' };
    }

    const oldContent = files[path]?.content || null;

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      content,
      oldContent,
      callbacks.setFiles,
      path.split('.').pop() || 'typescript'
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to write file ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    // Update UI state
    if (!callbacks.getOpenFiles().includes(path)) {
      callbacks.setOpenFiles(prev => [...prev, path]);
    }
    callbacks.setActiveFile(path);

    return {
      success: true,
      message: `File ${path} written successfully`,
      data: { path, content, size: content.length }
    };
  }

  private static async moveFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('source', true),
      ToolValidator.filePathRules('destination', true),
    ]);

    const source = validated.source;
    const destination = validated.destination;

    // Check if source exists
    const sourceFile = files[source];
    if (!sourceFile) {
      return { 
        success: false, 
        message: `Source file ${source} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    // Check if destination already exists
    if (files[destination]) {
      return {
        success: false,
        message: `Destination file ${destination} already exists. Delete it first or choose a different name.`,
        error: 'FILE_EXISTS',
      };
    }

    // Use StateTransaction for atomic operation
    const result = await StateTransaction.execute({
      stateUpdate: () => {
        callbacks.setFiles(prev => {
          const next = { ...prev };
          next[destination] = {
            name: destination,
            content: sourceFile.content,
            language: destination.split('.').pop() || sourceFile.language
          };
          delete next[source];
          return next;
        });
      },
      
      dbOperation: async () => {
        // Save new file and delete old file in database
        await databaseService.saveFile({
          path: destination,
          content: sourceFile.content,
          language: destination.split('.').pop() || sourceFile.language,
          timestamp: Date.now(),
        });
        // Note: Database deletion would happen here if supported
        return { source, destination };
      },
      
      rollback: () => {
        // Restore original state
        callbacks.setFiles(prev => {
          const next = { ...prev };
          next[source] = sourceFile;
          delete next[destination];
          return next;
        });
      },
      
      metadata: {
        operation: 'file_move',
        context: { source, destination },
      },
    });

    if (!result.success) {
      return {
        success: false,
        message: `Failed to move file from ${source} to ${destination}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    // Update UI state
    callbacks.setOpenFiles(prev => prev.map(f => f === source ? destination : f));
    if (callbacks.getActiveFile() === source) {
      callbacks.setActiveFile(destination);
    }

    return {
      success: true,
      message: `File moved from ${source} to ${destination}`,
      data: { source, destination }
    };
  }

  private static async deleteFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
    ]);

    const path = validated.path;

    if (!files[path]) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const fileContent = files[path].content;
    const language = files[path].language;

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileDeleteTransaction(
      path,
      fileContent,
      callbacks.setFiles,
      language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to delete file ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    // Update UI state
    callbacks.setOpenFiles(prev => prev.filter(f => f !== path));
    if (callbacks.getActiveFile() === path) {
      callbacks.setActiveFile(null);
    }

    return {
      success: true,
      message: `File ${path} deleted successfully`,
      data: { path }
    };
  }

  private static async searchFiles(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.searchQueryRules('query', true),
      {
        field: 'caseSensitive',
        type: 'boolean',
        required: false,
      },
      {
        field: 'maxResults',
        type: 'number',
        required: false,
        min: 1,
        max: 1000,
      },
    ]);

    const query = validated.query;
    const caseSensitive = validated.caseSensitive ?? false;
    const maxResults = validated.maxResults ?? 100;
    
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    const results: Array<{ path: string; matches: Array<{ line: number; content: string }> }> = [];
    let totalMatches = 0;

    for (const [path, file] of Object.entries(files)) {
      if (totalMatches >= maxResults) break;

      const content = caseSensitive ? file.content : file.content.toLowerCase();
      const pathToSearch = caseSensitive ? path : path.toLowerCase();
      
      if (content.includes(searchQuery) || pathToSearch.includes(searchQuery)) {
        const lines = file.content.split('\n');
        const matches = lines
          .map((line, idx) => ({ line: idx + 1, content: line }))
          .filter(({ content }) => {
            const lineToSearch = caseSensitive ? content : content.toLowerCase();
            return lineToSearch.includes(searchQuery);
          })
          .slice(0, Math.min(10, maxResults - totalMatches));
        
        if (matches.length > 0) {
          results.push({ path, matches });
          totalMatches += matches.length;
        }
      }
    }

    return {
      success: true,
      message: `Found ${results.length} file(s) with ${totalMatches} match(es)`,
      data: { 
        results, 
        fileCount: results.length,
        matchCount: totalMatches,
        query,
        caseSensitive,
      }
    };
  }

  private static async runCommand(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    const command = args.command?.trim() || '';
    if (!command) {
      return { success: false, message: 'Command is required', error: 'MISSING_COMMAND' };
    }

    const [cmd, ...cmdArgs] = command.split(/\s+/);
    const cmdLower = cmd.toLowerCase();

    if (cmdLower === 'ls' || cmdLower === 'dir') {
      const path = cmdArgs[0] || '';
      const fileList = Object.keys(files);
      const filtered = path ? fileList.filter(f => f.startsWith(path)) : fileList;
      return {
        success: true,
        message: `Listed ${filtered.length} file(s)`,
        data: { files: filtered }
      };
    }

    if (cmdLower === 'pwd') {
      return {
        success: true,
        message: 'Current directory',
        data: { path: '/workspace' }
      };
    }

    if (cmdLower === 'cat') {
      const filePath = cmdArgs[0];
      if (!filePath) {
        return { success: false, message: 'File path required for cat', error: 'MISSING_PATH' };
      }
      const file = files[filePath];
      if (!file) {
        return { success: false, message: `File ${filePath} not found`, error: 'FILE_NOT_FOUND' };
      }
      return {
        success: true,
        message: `File ${filePath} content`,
        data: { content: file.content }
      };
    }

    return {
      success: false,
      message: `Command "${cmd}" not supported`,
      error: 'UNSUPPORTED_COMMAND'
    };
  }

  private static async projectOverview(
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    const fileList = Object.keys(files);
    
    if (fileList.length === 0) {
      return {
        success: true,
        message: 'Project is empty - no files found',
        data: { 
          stats: { total: 0, byType: {}, byDirectory: {} },
          files: [],
          totalSize: 0,
          totalLines: 0,
        }
      };
    }

    const stats = {
      total: fileList.length,
      byType: {} as Record<string, number>,
      byDirectory: {} as Record<string, number>,
    };

    let totalSize = 0;
    let totalLines = 0;

    fileList.forEach(path => {
      const ext = path.split('.').pop()?.toLowerCase() || 'unknown';
      const dir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : 'root';
      
      stats.byType[ext] = (stats.byType[ext] || 0) + 1;
      stats.byDirectory[dir] = (stats.byDirectory[dir] || 0) + 1;
      
      const file = files[path];
      totalSize += file.content.length;
      totalLines += file.content.split('\n').length;
    });

    return {
      success: true,
      message: `Project overview: ${stats.total} files, ${totalLines.toLocaleString()} lines, ${(totalSize / 1024).toFixed(2)} KB`,
      data: { 
        stats, 
        files: fileList,
        totalSize,
        totalLines,
        averageFileSize: Math.round(totalSize / stats.total),
        averageLinesPerFile: Math.round(totalLines / stats.total),
      }
    };
  }

  private static async formatFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
    ]);

    const path = validated.path;
    const file = files[path];
    
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    try {
      // Dynamic import for prettier (only when needed)
      const prettier = await import('prettier');
      const parserBabel = await import('prettier/plugins/babel');
      const parserEstree = await import('prettier/plugins/estree');
      const parserMarkdown = await import('prettier/plugins/markdown');

      const ext = path.split('.').pop()?.toLowerCase();
      let parser = null;
      if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') parser = 'babel-ts';
      else if (ext === 'json') parser = 'json';
      else if (ext === 'md' || ext === 'markdown') parser = 'markdown';

      if (!parser) {
        return {
          success: false,
          message: `File format .${ext} is not supported for formatting. Supported: .ts, .tsx, .js, .jsx, .json, .md`,
          error: 'UNSUPPORTED_FORMAT'
        };
      }

      const oldContent = file.content;
      const formatted = await prettier.default.format(oldContent, {
        parser,
        plugins: [parserBabel.default, parserEstree.default, parserMarkdown.default],
        semi: true,
        singleQuote: true,
        printWidth: 100,
        trailingComma: 'es5'
      });

      // Use StateTransaction for atomic operation
      const transaction = StateTransaction.createFileTransaction(
        path,
        formatted,
        oldContent,
        callbacks.setFiles,
        file.language
      );

      const result = await StateTransaction.execute(transaction);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to format file ${path}`,
          error: result.error?.message || 'TRANSACTION_FAILED',
        };
      }

      return {
        success: true,
        message: `File ${path} formatted successfully`,
        data: { path, formatted: true, parser, originalSize: oldContent.length, formattedSize: formatted.length }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error formatting file ${path}: ${error.message}`,
        error: error.message
      };
    }
  }

  private static async openFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
    ]);

    const path = validated.path;
    const file = files[path];
    
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    if (!callbacks.getOpenFiles().includes(path)) {
      callbacks.setOpenFiles(prev => [...prev, path]);
    }
    callbacks.setActiveFile(path);

    return {
      success: true,
      message: `File ${path} opened in editor`,
      data: { 
        path, 
        language: file.language,
        size: file.content.length,
        lines: file.content.split('\n').length,
      }
    };
  }

  private static async searchInFile(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      ToolValidator.searchQueryRules('query', true),
      {
        field: 'caseSensitive',
        type: 'boolean',
        required: false,
      },
      {
        field: 'maxResults',
        type: 'number',
        required: false,
        min: 1,
        max: 1000,
      },
    ]);

    const path = validated.path;
    const query = validated.query;
    const caseSensitive = validated.caseSensitive || false;
    const maxResults = validated.maxResults || 100;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const lines = file.content.split('\n');
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const matches: Array<{ line: number; content: string }> = [];

    for (let idx = 0; idx < lines.length && matches.length < maxResults; idx++) {
      const line = lines[idx];
      const lineToSearch = caseSensitive ? line : line.toLowerCase();
      if (lineToSearch.includes(searchQuery)) {
        matches.push({ line: idx + 1, content: line.trim() });
      }
    }

    return {
      success: true,
      message: `Found ${matches.length} match(es) in ${path}${matches.length >= maxResults ? ' (limited to ' + maxResults + ')' : ''}`,
      data: { 
        path,
        matches, 
        count: matches.length,
        query,
        caseSensitive,
        truncated: matches.length >= maxResults,
      }
    };
  }

  private static async editFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      {
        field: 'target',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 10000,
      },
      {
        field: 'replacement',
        type: 'string',
        required: true,
        maxLength: 10000,
      },
    ]);

    const path = validated.path;
    const target = validated.target;
    const replacement = validated.replacement;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    
    // Check if target exists (exact match)
    if (!oldContent.includes(target)) {
      return {
        success: false,
        message: `Target text not found in file ${path}. The target must match exactly. File has ${oldContent.length} characters.`,
        error: 'TARGET_NOT_FOUND'
      };
    }

    // Replace first occurrence only (edit_file replaces specific substring)
    const newContent = oldContent.replace(target, replacement);

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to edit file ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `File ${path} edited successfully`,
      data: { path, replaced: true, targetLength: target.length, replacementLength: replacement.length }
    };
  }

  private static async replaceInFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      {
        field: 'search',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 10000,
      },
      {
        field: 'replace',
        type: 'string',
        required: true,
        maxLength: 10000,
      },
      {
        field: 'replaceAll',
        type: 'boolean',
        required: false,
      },
    ]);

    const path = validated.path;
    const search = validated.search;
    const replace = validated.replace;
    const replaceAll = validated.replaceAll !== false;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    let newContent = oldContent;
    let count = 0;

    if (replaceAll) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = newContent.match(regex);
      count = matches ? matches.length : 0;
      newContent = newContent.replace(regex, replace);
    } else {
      if (newContent.includes(search)) {
        count = 1;
        newContent = newContent.replace(search, replace);
      }
    }

    if (count === 0) {
      return {
        success: false,
        message: `Search text not found in ${path}. No replacements made.`,
        error: 'SEARCH_NOT_FOUND',
      };
    }

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to replace in file ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Replaced ${count} occurrence(s) in ${path}`,
      data: { count, path, replaceAll }
    };
  }

  private static async getFileInfo(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
    ]);

    const path = validated.path;
    const file = files[path];
    
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const lines = file.content.split('\n');
    const words = file.content.split(/\s+/).filter(w => w.length > 0);
    
    const info = {
      path,
      language: file.language,
      lineCount: lines.length,
      charCount: file.content.length,
      wordCount: words.length,
      isEmpty: file.content.trim().length === 0,
      isOpen: callbacks.getOpenFiles().includes(path),
      isActive: callbacks.getActiveFile() === path,
      averageLineLength: lines.length > 0 ? Math.round(file.content.length / lines.length) : 0,
      longestLine: Math.max(...lines.map(l => l.length), 0),
    };

    return {
      success: true,
      message: `File info for ${path}`,
      data: info
    };
  }

  private static async getLine(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      ToolValidator.lineNumberRules('lineNumber', true),
    ]);

    const path = validated.path;
    const lineNumber = validated.lineNumber;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const lines = file.content.split('\n');
    
    if (lineNumber > lines.length) {
      return {
        success: false,
        message: `Line ${lineNumber} does not exist. File has ${lines.length} lines.`,
        error: 'LINE_OUT_OF_RANGE'
      };
    }

    return {
      success: true,
      message: `Line ${lineNumber} of ${path}`,
      data: { 
        path,
        lineNumber, 
        content: lines[lineNumber - 1],
        totalLines: lines.length,
      }
    };
  }

  private static async getLines(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      ToolValidator.lineNumberRules('startLine', true),
      {
        field: 'endLine',
        type: 'number',
        required: false,
        min: 1,
        max: 1000000,
      },
    ]);

    const path = validated.path;
    const startLine = validated.startLine;
    const endLine = validated.endLine || startLine;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const lines = file.content.split('\n');

    if (startLine > lines.length) {
      return {
        success: false,
        message: `Start line ${startLine} is beyond file length. File has ${lines.length} lines.`,
        error: 'LINE_OUT_OF_RANGE',
      };
    }

    if (endLine < startLine) {
      return {
        success: false,
        message: `End line ${endLine} cannot be before start line ${startLine}.`,
        error: 'INVALID_RANGE',
      };
    }

    const end = Math.min(endLine, lines.length);
    const selectedLines = lines.slice(startLine - 1, end);

    return {
      success: true,
      message: `Lines ${startLine}-${end} of ${path}`,
      data: { 
        path,
        startLine, 
        endLine: end, 
        lines: selectedLines,
        totalLines: lines.length,
        linesReturned: selectedLines.length,
      }
    };
  }

  private static async insertAtLine(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      ToolValidator.lineNumberRules('lineNumber', true),
      {
        field: 'content',
        type: 'string',
        required: true,
        maxLength: 100000,
      },
    ]);

    const path = validated.path;
    const lineNumber = validated.lineNumber;
    const content = validated.content;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    const lines = oldContent.split('\n');

    // Validate line number is within bounds
    if (lineNumber > lines.length + 1) {
      return {
        success: false,
        message: `Line ${lineNumber} is out of range. File has ${lines.length} lines. Use line ${lines.length + 1} to append.`,
        error: 'LINE_OUT_OF_RANGE',
      };
    }

    const newLines = content.split('\n');
    lines.splice(lineNumber - 1, 0, ...newLines);
    const newContent = lines.join('\n');

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to insert at line ${lineNumber} in ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Inserted ${newLines.length} line(s) at line ${lineNumber} in ${path}`,
      data: { lineNumber, insertedLines: newLines.length, path }
    };
  }

  private static async replaceLine(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      ToolValidator.lineNumberRules('lineNumber', true),
      {
        field: 'content',
        type: 'string',
        required: true,
        maxLength: 10000,
      },
    ]);

    const path = validated.path;
    const lineNumber = validated.lineNumber;
    const content = validated.content;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    const lines = oldContent.split('\n');

    if (lineNumber > lines.length) {
      return {
        success: false,
        message: `Line ${lineNumber} does not exist. File has ${lines.length} lines.`,
        error: 'LINE_OUT_OF_RANGE'
      };
    }

    lines[lineNumber - 1] = content;
    const newContent = lines.join('\n');

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to replace line ${lineNumber} in ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Replaced line ${lineNumber} in ${path}`,
      data: { lineNumber, content, path }
    };
  }

  private static async deleteLine(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: any
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('path', true),
      ToolValidator.lineNumberRules('lineNumber', true),
    ]);

    const path = validated.path;
    const lineNumber = validated.lineNumber;

    const file = files[path];
    if (!file) {
      return { 
        success: false, 
        message: `File ${path} not found. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    const lines = oldContent.split('\n');

    if (lineNumber > lines.length) {
      return {
        success: false,
        message: `Line ${lineNumber} does not exist. File has ${lines.length} lines.`,
        error: 'LINE_OUT_OF_RANGE'
      };
    }

    const deletedLine = lines[lineNumber - 1];
    lines.splice(lineNumber - 1, 1);
    const newContent = lines.join('\n');

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      path,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to delete line ${lineNumber} in ${path}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Deleted line ${lineNumber} in ${path}`,
      data: { lineNumber, deletedLine, path }
    };
  }

  // ==================== CONVERSATION MANAGEMENT ====================

  private static async saveConversation(
    args: Record<string, any>,
    callbacks: any
  ): Promise<McpToolResult> {
    const name = args.name;
    const description = args.description || '';

    if (!name) {
      return { success: false, message: 'Conversation name is required', error: 'MISSING_NAME' };
    }

    try {
      // Get current conversation from callbacks or context
      // For now, we'll use localStorage as a simple storage
      const conversations = JSON.parse(localStorage.getItem('saved_conversations') || '[]');
      
      const conversation = {
        id: `conv_${Date.now()}`,
        name,
        description,
        timestamp: Date.now(),
        messages: [] // Would need to get from context
      };

      conversations.push(conversation);
      localStorage.setItem('saved_conversations', JSON.stringify(conversations));

      return {
        success: true,
        message: `Conversation "${name}" saved successfully`,
        data: { id: conversation.id, name, timestamp: conversation.timestamp }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error saving conversation: ${error.message}`,
        error: error.message
      };
    }
  }

  private static async loadConversation(
    args: Record<string, any>,
    callbacks: any
  ): Promise<McpToolResult> {
    const name = args.name;

    if (!name) {
      return { success: false, message: 'Conversation name is required', error: 'MISSING_NAME' };
    }

    try {
      const conversations = JSON.parse(localStorage.getItem('saved_conversations') || '[]');
      const conversation = conversations.find((c: any) => c.name === name);

      if (!conversation) {
        return {
          success: false,
          message: `Conversation "${name}" not found`,
          error: 'CONVERSATION_NOT_FOUND'
        };
      }

      return {
        success: true,
        message: `Conversation "${name}" loaded successfully`,
        data: conversation
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error loading conversation: ${error.message}`,
        error: error.message
      };
    }
  }

  private static async listConversations(): Promise<McpToolResult> {
    try {
      const conversations = JSON.parse(localStorage.getItem('saved_conversations') || '[]');
      
      const list = conversations.map((c: any) => ({
        name: c.name,
        description: c.description,
        timestamp: c.timestamp,
        id: c.id
      }));

      return {
        success: true,
        message: `Found ${list.length} saved conversation(s)`,
        data: { conversations: list, count: list.length }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error listing conversations: ${error.message}`,
        error: error.message
      };
    }
  }

  private static async deleteConversation(
    args: Record<string, any>
  ): Promise<McpToolResult> {
    const name = args.name;

    if (!name) {
      return { success: false, message: 'Conversation name is required', error: 'MISSING_NAME' };
    }

    try {
      const conversations = JSON.parse(localStorage.getItem('saved_conversations') || '[]');
      const filtered = conversations.filter((c: any) => c.name !== name);

      if (filtered.length === conversations.length) {
        return {
          success: false,
          message: `Conversation "${name}" not found`,
          error: 'CONVERSATION_NOT_FOUND'
        };
      }

      localStorage.setItem('saved_conversations', JSON.stringify(filtered));

      return {
        success: true,
        message: `Conversation "${name}" deleted successfully`,
        data: { name }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error deleting conversation: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check Gemini API quota status and current usage
   */
  private static async checkQuota(callbacks?: {
    getTokenUsage?: () => { prompt: number; response: number };
    getSelectedModel?: () => string;
  }): Promise<McpToolResult> {
    try {
      // Get API key from localStorage
      const savedConfig = localStorage.getItem('gstudio_agent_config');
      if (!savedConfig) {
        return {
          success: true,
          message: `⚠️ API key تنظیم نشده است. لطفاً API key خود را در Agent Settings (تب Connection) تنظیم کنید.

📊 محدودیت‌های Free Tier (Gemini 1.5 Flash):
- درخواست در روز (RPD): 1,500 درخواست
- درخواست در دقیقه (RPM): 15 درخواست
- توکن در دقیقه (TPM): 1,000,000 توکن

💡 نکته:
به دلیل ناهماهنگی در نسخه API، مقدار دقیق "باقی‌مانده" را نمی‌توان مستقیماً خواند. اما طبق استاندارد گوگل:
- شما 1,500 درخواست در روز دارید
- تا 1 میلیون توکن در دقیقه می‌توانید مصرف کنید
- برای کارهای معمولی (کدنویسی، گفتگو، تحلیل فایل‌ها)، تقریباً هیچ‌وقت با کمبود توکن مواجه نمی‌شوید

⚠️ توجه: Gemini 1.5 Pro محدودیت‌های کمتری دارد (50 RPD, 2 RPM)

🔗 برای اطلاعات دقیق‌تر quota، به Google Cloud Console مراجعه کنید:
${GeminiService.getQuotaConsoleUrl()}`,
          data: {
            isValid: false,
            message: 'API key not set',
            quotaLimits: {
              requestsPerDay: 1500,
              requestsPerMinute: 15,
              tokensPerMinute: 1000000,
              note: 'Free tier limits for Gemini 1.5 Flash'
            }
          }
        };
      }

      const config = JSON.parse(savedConfig);
      const apiKey = config.apiKey;

      if (!apiKey || apiKey.trim() === '') {
        return {
          success: true,
          message: `⚠️ API key تنظیم نشده است. لطفاً API key خود را در Agent Settings (تب Connection) تنظیم کنید.

📊 محدودیت‌های Free Tier (Gemini 1.5 Flash):
- درخواست در روز (RPD): 1,500 درخواست
- درخواست در دقیقه (RPM): 15 درخواست
- توکن در دقیقه (TPM): 1,000,000 توکن

💡 نکته:
به دلیل ناهماهنگی در نسخه API، مقدار دقیق "باقی‌مانده" را نمی‌توان مستقیماً خواند. اما طبق استاندارد گوگل:
- شما 1,500 درخواست در روز دارید
- تا 1 میلیون توکن در دقیقه می‌توانید مصرف کنید
- برای کارهای معمولی (کدنویسی، گفتگو، تحلیل فایل‌ها)، تقریباً هیچ‌وقت با کمبود توکن مواجه نمی‌شوید

⚠️ توجه: Gemini 1.5 Pro محدودیت‌های کمتری دارد (50 RPD, 2 RPM)

🔗 برای اطلاعات دقیق‌تر quota، به Google Cloud Console مراجعه کنید:
${GeminiService.getQuotaConsoleUrl()}`,
          data: {
            isValid: false,
            message: 'API key not set',
            quotaLimits: {
              requestsPerDay: 1500,
              requestsPerMinute: 15,
              tokensPerMinute: 1000000,
              note: 'Free tier limits for Gemini 1.5 Flash'
            }
          }
        };
      }

      const result = await GeminiService.checkQuota(apiKey);
      const quotaUrl = GeminiService.getQuotaConsoleUrl(apiKey);
      const quotaLimits = result.quotaLimits || {
        requestsPerDay: 1500,
        requestsPerMinute: 15,
        tokensPerMinute: 1000000,
        note: 'Free tier limits (approximate)'
      };

      // Get current session token usage
      const tokenUsage = callbacks?.getTokenUsage?.() || { prompt: 0, response: 0 };
      const totalTokensUsed = tokenUsage.prompt + tokenUsage.response;
      
      // Get current model
      const currentModel = callbacks?.getSelectedModel?.() || 'Unknown';

      if (result.isValid) {
        const usageInfo = result.usageInfo || {};
        
        let message = `✅ API Status: Working correctly\n\n`;
        message += `🤖 مدل فعلی: ${currentModel}\n\n`;
        message += `📊 مصرف توکن در این Session:\n`;
        message += `- Prompt Tokens: ${tokenUsage.prompt.toLocaleString()}\n`;
        message += `- Response Tokens: ${tokenUsage.response.toLocaleString()}\n`;
        message += `- Total Tokens: ${totalTokensUsed.toLocaleString()}\n\n`;
        message += `📊 محدودیت‌های Quota (Free Tier - Gemini 1.5 Flash):\n`;
        message += `- درخواست در روز (RPD): ${quotaLimits.requestsPerDay.toLocaleString()} درخواست\n`;
        message += `- درخواست در دقیقه (RPM): ${quotaLimits.requestsPerMinute} درخواست\n`;
        message += `- توکن در دقیقه (TPM): ${quotaLimits.tokensPerMinute.toLocaleString()} توکن\n\n`;
        message += `💡 نکته مهم:\n`;
        message += `به دلیل ناهماهنگی در نسخه API، مقدار دقیق "باقی‌مانده" را نمی‌توان مستقیماً خواند. اما طبق استاندارد گوگل:\n\n`;
        message += `- شما ${quotaLimits.requestsPerDay.toLocaleString()} درخواست در روز دارید\n`;
        message += `- تا ${quotaLimits.tokensPerMinute.toLocaleString()} توکن در دقیقه می‌توانید مصرف کنید\n\n`;
        message += `این یعنی برای کارهای معمولی (کدنویسی، گفتگو، تحلیل فایل‌ها)، تقریباً هیچ‌وقت با کمبود توکن مواجه نمی‌شوید، مگر اینکه خیلی زیاد و پشت‌سرهم فایل‌های حجیم به من بدهید.\n`;
        
        if (usageInfo.totalTokens) {
          message += `\n📈 آخرین درخواست تست:\n`;
          message += `- Prompt Tokens: ${usageInfo.promptTokens || 0}\n`;
          message += `- Response Tokens: ${usageInfo.candidatesTokens || 0}\n`;
          message += `- Total Tokens: ${usageInfo.totalTokens}\n`;
        }
        
        if (quotaLimits.note) {
          message += `\n⚠️ ${quotaLimits.note}\n`;
        }
        
        message += `\n🔗 برای اطلاعات دقیق‌تر quota و باقی‌مانده، به Google Cloud Console مراجعه کنید:\n${quotaUrl}`;
        
        return {
          success: true,
          message: message,
          data: {
            isValid: result.isValid,
            message: result.message,
            usageInfo: result.usageInfo,
            quotaLimits: quotaLimits,
            quotaConsoleUrl: quotaUrl,
            currentModel: currentModel,
            sessionTokenUsage: tokenUsage,
            totalTokensUsed: totalTokensUsed
          }
        };
      } else {
        let message = `❌ API Status: ${result.message}\n\n`;
        message += `🤖 مدل فعلی: ${currentModel}\n\n`;
        message += `📊 مصرف توکن در این Session:\n`;
        message += `- Prompt Tokens: ${tokenUsage.prompt.toLocaleString()}\n`;
        message += `- Response Tokens: ${tokenUsage.response.toLocaleString()}\n`;
        message += `- Total Tokens: ${totalTokensUsed.toLocaleString()}\n\n`;
        message += `📊 محدودیت‌های Quota (Free Tier - Gemini 1.5 Flash):\n`;
        message += `- درخواست در روز (RPD): ${quotaLimits.requestsPerDay.toLocaleString()} درخواست\n`;
        message += `- درخواست در دقیقه (RPM): ${quotaLimits.requestsPerMinute} درخواست\n`;
        message += `- توکن در دقیقه (TPM): ${quotaLimits.tokensPerMinute.toLocaleString()} توکن\n\n`;
        message += `💡 نکته:\n`;
        message += `به دلیل ناهماهنگی در نسخه API، مقدار دقیق "باقی‌مانده" را نمی‌توان مستقیماً خواند. اما طبق استاندارد گوگل:\n\n`;
        message += `- شما ${quotaLimits.requestsPerDay.toLocaleString()} درخواست در روز دارید\n`;
        message += `- تا ${quotaLimits.tokensPerMinute.toLocaleString()} توکن در دقیقه می‌توانید مصرف کنید\n\n`;
        message += `برای کارهای معمولی (کدنویسی، گفتگو، تحلیل فایل‌ها)، معمولاً مشکلی پیش نمی‌آید.\n`;
        
        if (quotaLimits.note) {
          message += `\n⚠️ ${quotaLimits.note}\n`;
        }
        
        message += `\n🔗 برای بررسی دقیق quota و باقی‌مانده، به Google Cloud Console مراجعه کنید:\n${quotaUrl}`;
        
        return {
          success: true,
          message: message,
          error: 'QUOTA_CHECK_FAILED',
          data: {
            isValid: false,
            message: result.message,
            quotaLimits: quotaLimits,
            quotaConsoleUrl: quotaUrl,
            currentModel: currentModel,
            sessionTokenUsage: tokenUsage,
            totalTokensUsed: totalTokensUsed
          }
        };
      }
    } catch (error: any) {
      return {
        success: true,
        message: `⚠️ خطا در بررسی quota: ${error.message}\n\n📊 محدودیت‌های پیش‌فرض Free Tier (Gemini 1.5 Flash):\n- درخواست در روز: 1,500\n- درخواست در دقیقه: 15\n- توکن در دقیقه: 1,000,000\n\n💡 نکته:\nبه دلیل ناهماهنگی در نسخه API، مقدار دقیق "باقی‌مانده" را نمی‌توان مستقیماً خواند. اما طبق استاندارد گوگل:\n- شما 1,500 درخواست در روز دارید\n- تا 1 میلیون توکن در دقیقه می‌توانید مصرف کنید\n- برای کارهای معمولی (کدنویسی، گفتگو، تحلیل فایل‌ها)، معمولاً مشکلی پیش نمی‌آید\n\n🔗 برای بررسی دقیق quota، به Google Cloud Console مراجعه کنید:\n${GeminiService.getQuotaConsoleUrl()}`,
        error: error.message,
        data: {
          isValid: false,
          message: error.message,
          quotaLimits: {
            requestsPerDay: 1500,
            requestsPerMinute: 15,
            tokensPerMinute: 1000000,
            note: 'Free tier limits (approximate)'
          }
        }
      };
    }
  }

  /**
   * Get comprehensive token optimization tips and strategies
   */
  private static async getTokenOptimizationTips(callbacks?: {
    getTokenUsage?: () => { prompt: number; response: number };
    getSelectedModel?: () => string;
  }): Promise<McpToolResult> {
    try {
      // Get current usage for context
      const tokenUsage = callbacks?.getTokenUsage?.() || { prompt: 0, response: 0 };
      const totalTokensUsed = tokenUsage.prompt + tokenUsage.response;
      const currentModel = callbacks?.getSelectedModel?.() || 'Unknown';

      let message = `💡 راهکارهای کاهش مصرف توکن و بهینه‌سازی API\n\n`;
      message += `📊 وضعیت فعلی:\n`;
      message += `- مدل فعلی: ${currentModel}\n`;
      message += `- توکن‌های مصرف شده در این Session: ${totalTokensUsed.toLocaleString()}\n`;
      message += `  • Prompt: ${tokenUsage.prompt.toLocaleString()}\n`;
      message += `  • Response: ${tokenUsage.response.toLocaleString()}\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `🎯 1. بهینه‌سازی Prompt Engineering\n\n`;
      message += `✅ استفاده از دستورات مختصر و واضح:\n`;
      message += `   • به جای توضیحات طولانی، از دستورات مستقیم استفاده کنید\n`;
      message += `   • از کلمات کلیدی و عبارات دقیق استفاده کنید\n`;
      message += `   • از مثال‌های کوتاه و مرتبط استفاده کنید\n\n`;

      message += `✅ ساختاردهی مناسب Prompt:\n`;
      message += `   • از bullet points به جای پاراگراف‌های طولانی\n`;
      message += `   • از markdown برای ساختاردهی استفاده کنید\n`;
      message += `   • از جداول برای داده‌های ساختاریافته استفاده کنید\n\n`;

      message += `✅ حذف اطلاعات غیرضروری:\n`;
      message += `   • فقط اطلاعات مرتبط با درخواست را ارسال کنید\n`;
      message += `   • از تکرار اطلاعات خودداری کنید\n`;
      message += `   • از context window بهینه استفاده کنید\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `🤖 2. انتخاب مدل مناسب\n\n`;
      message += `✅ استفاده از مدل‌های کوچک‌تر برای کارهای ساده:\n`;
      message += `   • Gemini Flash Lite برای کارهای ساده و boilerplate\n`;
      message += `   • Gemini Flash برای کارهای عمومی\n`;
      message += `   • Gemini Pro فقط برای کارهای پیچیده و reasoning\n\n`;

      message += `✅ مقایسه مدل‌ها:\n`;
      message += `   • Flash Lite: ارزان‌ترین، مناسب برای کارهای ساده\n`;
      message += `   • Flash: متعادل، مناسب برای اکثر کارها\n`;
      message += `   • Pro: گران‌تر، فقط برای کارهای پیچیده\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `🛠️ 3. بهینه‌سازی استفاده از MCP Tools\n\n`;
      message += `✅ استفاده از Tools به جای توضیحات طولانی:\n`;
      message += `   • به جای توضیح دادن، از tools استفاده کنید\n`;
      message += `   • Tools محلی هستند و توکن مصرف نمی‌کنند\n`;
      message += `   • از read_file قبل از edit_file استفاده کنید\n\n`;

      message += `✅ استفاده از Tools برای کارهای تکراری:\n`;
      message += `   • از search_files برای پیدا کردن کد\n`;
      message += `   • از project_overview برای درک ساختار\n`;
      message += `   • از format_file برای فرمت کردن کد\n\n`;

      message += `✅ کاهش تعداد API calls:\n`;
      message += `   • چندین تغییر را در یک request انجام دهید\n`;
      message += `   • از batch operations استفاده کنید\n`;
      message += `   • از caching برای داده‌های تکراری استفاده کنید\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `📝 4. بهینه‌سازی کد و فایل‌ها\n\n`;
      message += `✅ کد تمیز و مختصر:\n`;
      message += `   • حذف کامنت‌های غیرضروری\n`;
      message += `   • استفاده از نام‌های متغیر کوتاه و واضح\n`;
      message += `   • حذف کدهای تکراری (DRY principle)\n\n`;

      message += `✅ فایل‌های کوچک و ماژولار:\n`;
      message += `   • تقسیم فایل‌های بزرگ به فایل‌های کوچک\n`;
      message += `   • استفاده از imports به جای کپی کردن کد\n`;
      message += `   • حذف فایل‌های غیرضروری\n\n`;

      message += `✅ استفاده از Token Sugar techniques:\n`;
      message += `   • جایگزینی الگوهای پرتکرار با کد کوتاه‌تر\n`;
      message += `   • استفاده از helper functions\n`;
      message += `   • استفاده از abstractions مناسب\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `⚡ 5. تکنیک‌های پیشرفته\n\n`;
      message += `✅ KV Caching:\n`;
      message += `   • استفاده از cache برای توکن‌های تکراری\n`;
      message += `   • کاهش محاسبات مجدد\n`;
      message += `   • افزایش سرعت پردازش\n\n`;

      message += `✅ Speculative Decoding:\n`;
      message += `   • پیش‌بینی توکن‌های بعدی\n`;
      message += `   • کاهش تعداد iterations\n`;
      message += `   • بهبود کارایی\n\n`;

      message += `✅ Batching:\n`;
      message += `   • ترکیب چندین درخواست در یک batch\n`;
      message += `   • کاهش overhead\n`;
      message += `   • بهبود throughput\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `📊 6. مانیتورینگ و تحلیل\n\n`;
      message += `✅ ردیابی مصرف توکن:\n`;
      message += `   • استفاده از check_quota برای مانیتورینگ\n`;
      message += `   • تحلیل الگوهای مصرف\n`;
      message += `   • شناسایی نقاط بهینه‌سازی\n\n`;

      message += `✅ بهینه‌سازی مستمر:\n`;
      message += `   • بررسی منظم مصرف توکن\n`;
      message += `   • تست راهکارهای مختلف\n`;
      message += `   • بهبود مستمر prompts\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `💡 7. نکات مهم برای این پروژه\n\n`;
      message += `✅ استفاده از MCP Tools:\n`;
      message += `   • Tools محلی هستند و توکن مصرف نمی‌کنند\n`;
      message += `   • از tools برای کارهای فایل استفاده کنید\n`;
      message += `   • از tools برای utility functions استفاده کنید\n\n`;

      message += `✅ بهینه‌سازی Conversation History:\n`;
      message += `   • حذف پیام‌های قدیمی غیرضروری\n`;
      message += `   • استفاده از save_conversation برای ذخیره\n`;
      message += `   • شروع conversation جدید برای موضوعات جدید\n\n`;

      message += `✅ استفاده از System Instructions:\n`;
      message += `   • System instructions یکبار ارسال می‌شوند\n`;
      message += `   • از system instructions برای قوانین کلی استفاده کنید\n`;
      message += `   • از user messages برای درخواست‌های خاص استفاده کنید\n\n`;

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `🎯 خلاصه توصیه‌ها:\n\n`;
      message += `1. از مدل مناسب استفاده کنید (Flash Lite برای کارهای ساده)\n`;
      message += `2. Prompt های مختصر و واضح بنویسید\n`;
      message += `3. از MCP Tools به جای توضیحات طولانی استفاده کنید\n`;
      message += `4. کد تمیز و ماژولار بنویسید\n`;
      message += `5. مصرف توکن را مانیتور کنید\n`;
      message += `6. بهینه‌سازی مستمر انجام دهید\n\n`;

      message += `📚 منابع بیشتر:\n`;
      message += `- Google Gemini API Documentation\n`;
      message += `- Prompt Engineering Best Practices\n`;
      message += `- Token Optimization Techniques\n`;
      message += `- MCP Tools Documentation\n`;

      return {
        success: true,
        message: message,
        data: {
          currentModel: currentModel,
          sessionTokenUsage: tokenUsage,
          totalTokensUsed: totalTokensUsed,
          tips: {
            promptEngineering: true,
            modelSelection: true,
            mcpTools: true,
            codeOptimization: true,
            advancedTechniques: true,
            monitoring: true,
            projectSpecific: true
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطای غیرمنتظره هنگام دریافت راهکارهای بهینه‌سازی: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Remove comments from code file
   */
  private static async removeComments(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: {
      setFiles: (updater: (prev: Record<string, FileData>) => Record<string, FileData>) => void;
      setOpenFiles: (updater: (prev: string[]) => string[]) => void;
      setActiveFile: (file: string | null) => void;
      getActiveFile: () => string | null;
      getOpenFiles: () => string[];
    }
  ): Promise<McpToolResult> {
    try {
      // Validate inputs
      const validated = ToolValidator.validateOrThrow(args, [
        ToolValidator.filePathRules('path', true),
        {
          field: 'createNewFile',
          type: 'boolean',
          required: false,
        },
      ]);

      const path = validated.path;
      const createNewFile = validated.createNewFile || false;

      const file = files[path];
      if (!file) {
        return {
          success: false,
          message: `File not found: ${path}. Available files: ${Object.keys(files).join(', ') || 'none'}`,
          error: 'FILE_NOT_FOUND'
        };
      }

      const oldContent = file.content;
      const optimized = TokenOptimizer.removeComments(oldContent, file.language);
      const comparison = TokenOptimizer.compareOptimization(oldContent, optimized);
      
      const outputPath = createNewFile ? path.replace(/\.([^.]+)$/, '.min.$1') : path;
      
      // Use StateTransaction for atomic operation
      const transaction: any = {
        stateUpdate: () => {
          const updatedFiles = { ...files };
          updatedFiles[outputPath] = {
            ...file,
            content: optimized,
            path: outputPath
          };
          callbacks.setFiles(() => updatedFiles);
          
          if (createNewFile) {
            callbacks.setOpenFiles(prev => [...prev, outputPath]);
            callbacks.setActiveFile(outputPath);
          }
        },
        
        dbOperation: async () => {
          await databaseService.saveFile({
            path: outputPath,
            content: optimized,
            language: file.language,
            timestamp: Date.now(),
          });
          return { outputPath };
        },
        
        rollback: () => {
          if (createNewFile) {
            // Remove newly created file
            callbacks.setFiles(prev => {
              const next = { ...prev };
              delete next[outputPath];
              return next;
            });
            callbacks.setOpenFiles(prev => prev.filter(f => f !== outputPath));
          } else {
            // Restore original content
            callbacks.setFiles(prev => ({
              ...prev,
              [path]: { ...prev[path], content: oldContent }
            }));
          }
        },
        
        metadata: {
          operation: 'remove_comments',
          context: { path, outputPath, createNewFile },
        },
      };

      const result = await StateTransaction.execute(transaction);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to remove comments from ${path}`,
          error: result.error?.message || 'TRANSACTION_FAILED',
        };
      }

      let message = `✅ Comments removed successfully\n\n`;
      message += `📊 Optimization stats:\n`;
      message += `- Original size: ${comparison.originalSize.toLocaleString()} chars\n`;
      message += `- Optimized size: ${comparison.optimizedSize.toLocaleString()} chars\n`;
      message += `- Size reduction: ${comparison.sizeReduction}%\n`;
      message += `- Estimated original tokens: ${comparison.originalTokens.toLocaleString()}\n`;
      message += `- Estimated optimized tokens: ${comparison.optimizedTokens.toLocaleString()}\n`;
      message += `- Tokens saved: ${comparison.tokensSaved.toLocaleString()} (${comparison.percentageSaved}%)\n\n`;
      message += `📁 File: ${outputPath}`;

      return {
        success: true,
        message: message,
        data: {
          path: outputPath,
          ...comparison
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error removing comments: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Compress code file
   */
  private static async compressCode(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: {
      setFiles: (updater: (prev: Record<string, FileData>) => Record<string, FileData>) => void;
      setOpenFiles: (updater: (prev: string[]) => string[]) => void;
      setActiveFile: (file: string | null) => void;
      getActiveFile: () => string | null;
      getOpenFiles: () => string[];
    }
  ): Promise<McpToolResult> {
    try {
      // Validate inputs
      const validated = ToolValidator.validateOrThrow(args, [
        ToolValidator.filePathRules('path', true),
        {
          field: 'options',
          type: 'object',
          required: false,
        },
      ]);

      const path = validated.path;
      const options = validated.options || {};

      const file = files[path];
      if (!file) {
        return {
          success: false,
          message: `File not found: ${path}. Available files: ${Object.keys(files).join(', ') || 'none'}`,
          error: 'FILE_NOT_FOUND'
        };
      }

      const oldContent = file.content;
      const result = TokenOptimizer.compressCode(oldContent, file.language, options);
      const comparison = TokenOptimizer.compareOptimization(oldContent, result.compressed);
      
      // Use StateTransaction for atomic operation
      const transaction = StateTransaction.createFileTransaction(
        path,
        result.compressed,
        oldContent,
        callbacks.setFiles,
        file.language
      );

      const txResult = await StateTransaction.execute(transaction);

      if (!txResult.success) {
        return {
          success: false,
          message: `Failed to compress code in ${path}`,
          error: txResult.error?.message || 'TRANSACTION_FAILED',
        };
      }

      let message = `✅ Code compressed successfully\n\n`;
      message += `📊 Compression stats:\n`;
      message += `- Original size: ${result.originalSize.toLocaleString()} chars\n`;
      message += `- Compressed size: ${result.compressedSize.toLocaleString()} chars\n`;
      message += `- Reduction: ${result.reduction}%\n`;
      message += `- Estimated original tokens: ${comparison.originalTokens.toLocaleString()}\n`;
      message += `- Estimated compressed tokens: ${comparison.optimizedTokens.toLocaleString()}\n`;
      message += `- Tokens saved: ${comparison.tokensSaved.toLocaleString()} (${comparison.percentageSaved}%)\n\n`;
      message += `⚙️ Options:\n`;
      message += `- Remove comments: ${options.removeComments !== false ? '✅' : '❌'}\n`;
      message += `- Minify: ${options.minify ? '✅' : '❌'}\n`;
      message += `- Deduplicate: ${options.deduplicate ? '✅' : '❌'}\n\n`;
      message += `📁 File: ${path}`;

      return {
        success: true,
        message: message,
        data: {
          path,
          ...result,
          ...comparison
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error compressing code: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Optimize prompt text
   */
  private static async optimizePrompt(args: Record<string, any>): Promise<McpToolResult> {
    try {
      const { prompt } = args;
      
      if (!prompt) {
        return {
          success: false,
          message: 'Prompt is required',
          error: 'MISSING_PROMPT'
        };
      }

      const optimized = TokenOptimizer.optimizePrompt(prompt);
      const comparison = TokenOptimizer.compareOptimization(prompt, optimized);

      let message = `✅ Prompt بهینه شد\n\n`;
      message += `📝 Prompt اصلی:\n${prompt}\n\n`;
      message += `✨ Prompt بهینه:\n${optimized}\n\n`;
      message += `📊 آمار بهینه‌سازی:\n`;
      message += `- اندازه اصلی: ${comparison.originalSize.toLocaleString()} کاراکتر\n`;
      message += `- اندازه بهینه: ${comparison.optimizedSize.toLocaleString()} کاراکتر\n`;
      message += `- کاهش اندازه: ${comparison.sizeReduction}%\n`;
      message += `- توکن‌های تخمینی اصلی: ${comparison.originalTokens.toLocaleString()}\n`;
      message += `- توکن‌های تخمینی بهینه: ${comparison.optimizedTokens.toLocaleString()}\n`;
      message += `- توکن‌های صرفه‌جویی شده: ${comparison.tokensSaved.toLocaleString()} (${comparison.percentageSaved}%)\n`;

      return {
        success: true,
        message: message,
        data: {
          original: prompt,
          optimized: optimized,
          ...comparison
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطا در بهینه‌سازی prompt: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Estimate token count
   */
  private static async estimateTokens(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    try {
      const { text, path } = args;
      
      let content = '';
      let source = '';
      
      if (path) {
        const file = files[path];
        if (!file) {
          return {
            success: false,
            message: `File not found: ${path}`,
            error: 'FILE_NOT_FOUND'
          };
        }
        content = file.content;
        source = `فایل: ${path}`;
      } else if (text) {
        content = text;
        source = 'متن ارائه شده';
      } else {
        return {
          success: false,
          message: 'Either text or path is required',
          error: 'MISSING_INPUT'
        };
      }

      const tokens = TokenOptimizer.estimateTokens(content);
      const chars = content.length;
      const lines = content.split('\n').length;

      let message = `📊 تخمین توکن\n\n`;
      message += `منبع: ${source}\n\n`;
      message += `📈 آمار:\n`;
      message += `- تعداد کاراکتر: ${chars.toLocaleString()}\n`;
      message += `- تعداد خط: ${lines.toLocaleString()}\n`;
      message += `- توکن‌های تخمینی: ${tokens.toLocaleString()}\n\n`;
      message += `💡 نکته: این یک تخمین تقریبی است. توکن‌های واقعی ممکن است متفاوت باشند.`;

      return {
        success: true,
        message: message,
        data: {
          tokens,
          characters: chars,
          lines,
          source: path || 'text'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطا در تخمین توکن: ${error.message}`,
        error: error.message
      };
    }
  }

  // ==================== CODE ANALYSIS TOOLS ====================

  /**
   * Analyze code quality metrics
   */
  private static async analyzeCodeQuality(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'metrics',
        type: 'array',
        required: false,
      },
    ]);

    const filepath = validated.filepath;
    const metrics = validated.metrics || ['complexity', 'maintainability', 'duplication', 'security', 'performance'];

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const content = file.content;
    const lines = content.split('\n');
    const results: Record<string, any> = {};

    // Complexity analysis
    if (metrics.includes('complexity')) {
      const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/g) || []).length;
      const loopCount = (content.match(/for\s*\(|while\s*\(|do\s*{/g) || []).length;
      const conditionCount = (content.match(/if\s*\(|else\s+if|switch\s*\(/g) || []).length;
      const nestedLevel = this.calculateMaxNesting(content);
      
      const complexityScore = Math.max(0, 100 - (functionCount * 2 + loopCount * 3 + conditionCount + nestedLevel * 5));
      
      results.complexity = {
        functions: functionCount,
        loops: loopCount,
        conditions: conditionCount,
        maxNesting: nestedLevel,
        score: Math.round(complexityScore),
        rating: complexityScore > 75 ? 'Excellent' : complexityScore > 50 ? 'Good' : complexityScore > 25 ? 'Fair' : 'Poor'
      };
    }

    // Maintainability analysis
    if (metrics.includes('maintainability')) {
      const totalLines = lines.length;
      const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
      const commentLines = (content.match(/\/\/|\/\*|\*\//g) || []).length;
      const blankLines = totalLines - codeLines - commentLines;
      const avgLineLength = content.length / totalLines;
      const commentRatio = commentLines / Math.max(1, codeLines);
      
      const maintScore = Math.min(100, 
        (commentRatio * 100) * 0.3 + 
        (totalLines < 300 ? 50 : totalLines < 500 ? 30 : 10) + 
        (avgLineLength < 80 ? 20 : 0)
      );
      
      results.maintainability = {
        totalLines,
        codeLines,
        commentLines,
        blankLines,
        avgLineLength: Math.round(avgLineLength),
        commentRatio: Math.round(commentRatio * 100) / 100,
        score: Math.round(maintScore),
        rating: maintScore > 75 ? 'Excellent' : maintScore > 50 ? 'Good' : maintScore > 25 ? 'Fair' : 'Poor'
      };
    }

    // Duplication detection
    if (metrics.includes('duplication')) {
      const duplicates = this.findDuplicateCode(content);
      results.duplication = {
        duplicateBlocks: duplicates.length,
        score: Math.max(0, 100 - duplicates.length * 10),
        issues: duplicates.slice(0, 5) // Top 5 duplicates
      };
    }

    // Security analysis
    if (metrics.includes('security')) {
      const securityIssues = this.findSecurityIssues(content);
      results.security = {
        issuesFound: securityIssues.length,
        score: Math.max(0, 100 - securityIssues.length * 15),
        issues: securityIssues.slice(0, 5)
      };
    }

    // Performance analysis
    if (metrics.includes('performance')) {
      const perfIssues = this.findPerformanceIssues(content);
      results.performance = {
        issuesFound: perfIssues.length,
        score: Math.max(0, 100 - perfIssues.length * 10),
        issues: perfIssues.slice(0, 5)
      };
    }

    // Overall score
    const scores = Object.values(results).map((r: any) => r.score);
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      success: true,
      message: `Code quality analysis complete for ${filepath}`,
      data: {
        filepath,
        metricsAnalyzed: Object.keys(results),
        ...results,
        overall: {
          score: overallScore,
          rating: overallScore > 75 ? 'Excellent' : overallScore > 50 ? 'Good' : overallScore > 25 ? 'Fair' : 'Poor'
        }
      }
    };
  }

  /**
   * Detect code smells and anti-patterns
   */
  private static async detectCodeSmells(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'types',
        type: 'array',
        required: false,
      },
    ]);

    const filepath = validated.filepath;
    const types = validated.types || ['long-functions', 'duplicates', 'magic-numbers', 'dead-code', 'complex-conditions'];

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const content = file.content;
    const lines = content.split('\n');
    const smells: any[] = [];

    // Long functions
    if (types.includes('long-functions')) {
      const functions = this.extractFunctions(content);
      functions.forEach(func => {
        if (func.lines > 50) {
          smells.push({
            type: 'long-function',
            severity: func.lines > 100 ? 'high' : 'medium',
            location: `Line ${func.startLine}`,
            name: func.name,
            issue: `Function is ${func.lines} lines long (max recommended: 50)`,
            suggestion: 'Consider breaking into smaller functions'
          });
        }
      });
    }

    // Magic numbers
    if (types.includes('magic-numbers')) {
      const magicNumbers = content.match(/\b[0-9]+\b(?!\s*[:;)])/g) || [];
      const uniqueNumbers = [...new Set(magicNumbers)].filter(n => n !== '0' && n !== '1');
      
      uniqueNumbers.slice(0, 20).forEach(num => { // Limit to 20
        const lineNumber = lines.findIndex(l => l.includes(num)) + 1;
        smells.push({
          type: 'magic-number',
          severity: 'low',
          location: `Line ${lineNumber}`,
          issue: `Magic number ${num} used without explanation`,
          suggestion: 'Define as named constant'
        });
      });
    }

    // Dead code (unused variables/functions)
    if (types.includes('dead-code')) {
      const declarations = content.match(/(?:const|let|var|function)\s+(\w+)/g) || [];
      declarations.slice(0, 50).forEach(decl => { // Limit to 50
        const name = decl.split(/\s+/)[1];
        const usageCount = (content.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
        
        if (usageCount === 1) { // Only declared, never used
          smells.push({
            type: 'dead-code',
            severity: 'medium',
            location: `Declaration of '${name}'`,
            issue: `Variable/function '${name}' is declared but never used`,
            suggestion: 'Remove unused code'
          });
        }
      });
    }

    // Complex conditions
    if (types.includes('complex-conditions')) {
      lines.forEach((line, idx) => {
        const andCount = (line.match(/&&/g) || []).length;
        const orCount = (line.match(/\|\|/g) || []).length;
        const complexity = andCount + orCount;
        
        if (complexity >= 3) {
          smells.push({
            type: 'complex-condition',
            severity: complexity >= 5 ? 'high' : 'medium',
            location: `Line ${idx + 1}`,
            issue: `Condition has ${complexity} logical operators`,
            suggestion: 'Extract to well-named boolean variables'
          });
        }
      });
    }

    // Duplicates
    if (types.includes('duplicates')) {
      const duplicates = this.findDuplicateCode(content);
      duplicates.forEach(dup => {
        smells.push({
          type: 'duplicate-code',
          severity: 'medium',
          location: `Lines ${dup.lines}`,
          issue: `Code block duplicated ${dup.count} times`,
          suggestion: 'Extract to reusable function'
        });
      });
    }

    return {
      success: true,
      message: `Found ${smells.length} code smell(s) in ${filepath}`,
      data: {
        filepath,
        typesChecked: types,
        totalSmells: smells.length,
        bySeverity: {
          high: smells.filter(s => s.severity === 'high').length,
          medium: smells.filter(s => s.severity === 'medium').length,
          low: smells.filter(s => s.severity === 'low').length,
        },
        smells: smells.slice(0, 50) // Limit to 50
      }
    };
  }

  /**
   * Find and analyze dependencies
   */
  private static async findDependencies(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'deep',
        type: 'boolean',
        required: false,
      },
    ]);

    const filepath = validated.filepath;
    const deep = validated.deep || false;

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const content = file.content;
    
    // Extract imports
    const esImports = [...content.matchAll(/import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g)];
    const requireImports = [...content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
    
    const allImports = [
      ...esImports.map(m => ({ type: 'es6', module: m[1], line: content.substring(0, m.index).split('\n').length })),
      ...requireImports.map(m => ({ type: 'commonjs', module: m[1], line: content.substring(0, m.index).split('\n').length }))
    ];

    // Categorize imports
    const external = allImports.filter(imp => !imp.module.startsWith('.'));
    const internal = allImports.filter(imp => imp.module.startsWith('.'));

    // Find unused imports
    const unused = allImports.filter(imp => {
      const importName = imp.module.split('/').pop()?.replace(/['"]/g, '');
      if (!importName) return false;
      
      const usageCount = (content.match(new RegExp(`\\b${importName}\\b`, 'g')) || []).length;
      return usageCount === 1; // Only in import statement
    });

    // Check for circular dependencies (simplified)
    const circular: any[] = [];
    if (deep && internal.length > 0) {
      internal.forEach(imp => {
        const targetPath = this.resolveImportPath(filepath, imp.module);
        if (files[targetPath]) {
          const targetContent = files[targetPath].content;
          if (targetContent.includes(filepath)) {
            circular.push({ file: filepath, imports: targetPath, circular: true });
          }
        }
      });
    }

    return {
      success: true,
      message: `Found ${allImports.length} dependencies in ${filepath}${unused.length > 0 ? `, ${unused.length} unused` : ''}${circular.length > 0 ? `, ${circular.length} circular` : ''}`,
      data: {
        filepath,
        total: allImports.length,
        external: external.length,
        internal: internal.length,
        unused: unused.length,
        circular: circular.length,
        dependencies: {
          all: allImports.map(imp => ({ module: imp.module, line: imp.line, type: imp.type })),
          external: external.map(imp => imp.module),
          internal: internal.map(imp => imp.module),
          unused: unused.map(imp => ({ module: imp.module, line: imp.line })),
          circular: circular
        }
      }
    };
  }

  /**
   * Check TypeScript types
   */
  private static async checkTypes(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    const { filepath = '', strict = true } = args;

    const filesToCheck = filepath ? [filepath] : Object.keys(files).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    const errors: any[] = [];

    filesToCheck.forEach(file => {
      if (!files[file]) return;
      
      const content = files[file].content;
      const lines = content.split('\n');

      // Check for common type issues
      lines.forEach((line, idx) => {
        // Check for 'any' type
        if (strict && line.match(/:\s*any\b/)) {
          errors.push({
            file,
            line: idx + 1,
            severity: 'warning',
            code: 'TS7006',
            message: "Using 'any' type defeats the purpose of TypeScript",
            suggestion: 'Use specific type or unknown'
          });
        }

        // Check for missing return types
        if (line.match(/function\s+\w+\s*\([^)]*\)\s*{/) && !line.includes(':')) {
          errors.push({
            file,
            line: idx + 1,
            severity: 'warning',
            code: 'TS7010',
            message: 'Function missing return type annotation',
            suggestion: 'Add explicit return type'
          });
        }

        // Check for untyped parameters
        if (line.match(/function\s+\w+\s*\([^:)]+\)/)) {
          errors.push({
            file,
            line: idx + 1,
            severity: 'error',
            code: 'TS7006',
            message: 'Parameter implicitly has an any type',
            suggestion: 'Add type annotation to parameters'
          });
        }
      });
    });

    return {
      success: true,
      message: `Type check complete. Found ${errors.length} issues.`,
      data: {
        filesChecked: filesToCheck.length,
        errors: errors.filter(e => e.severity === 'error').length,
        warnings: errors.filter(e => e.severity === 'warning').length,
        issues: errors.slice(0, 20) // Top 20
      }
    };
  }

  /**
   * Lint code with ESLint-style rules
   */
  private static async lintCode(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    const { filepath, fix = false, rules = [] } = args;

    if (!files[filepath]) {
      return { success: false, message: `File not found: ${filepath}`, error: 'FILE_NOT_FOUND' };
    }

    const content = files[filepath].content;
    const lines = content.split('\n');
    const violations: any[] = [];

    // Check various linting rules
    lines.forEach((line, idx) => {
      // No console.log in production
      if (line.includes('console.log')) {
        violations.push({
          line: idx + 1,
          rule: 'no-console',
          severity: 'warning',
          message: 'Unexpected console statement',
          fixable: fix
        });
      }

      // Prefer const over let
      if (line.match(/\blet\s+\w+\s*=\s*[^=]/)) {
        violations.push({
          line: idx + 1,
          rule: 'prefer-const',
          severity: 'warning',
          message: "Use 'const' instead of 'let' for variables that are never reassigned",
          fixable: fix
        });
      }

      // No var
      if (line.match(/\bvar\s+\w+/)) {
        violations.push({
          line: idx + 1,
          rule: 'no-var',
          severity: 'error',
          message: "Unexpected 'var', use 'let' or 'const' instead",
          fixable: fix
        });
      }

      // Require === instead of ==
      if (line.match(/[^=!]==[^=]/) || line.match(/!=[^=]/)) {
        violations.push({
          line: idx + 1,
          rule: 'eqeqeq',
          severity: 'warning',
          message: 'Expected === instead of ==',
          fixable: fix
        });
      }
    });

    // Apply fixes if requested
    if (fix && violations.some(v => v.fixable)) {
      let fixedContent = content;
      fixedContent = fixedContent.replace(/\bvar\s+/g, 'let ');
      fixedContent = fixedContent.replace(/==/g, '===').replace(/!=/g, '!==');
      
      callbacks.setFiles((prev: Record<string, FileData>) => ({
        ...prev,
        [filepath]: { ...prev[filepath], content: fixedContent }
      }));
    }

    return {
      success: true,
      message: `Lint complete. Found ${violations.length} issues${fix ? ', some auto-fixed' : ''}.`,
      data: {
        violations: violations.length,
        errors: violations.filter(v => v.severity === 'error').length,
        warnings: violations.filter(v => v.severity === 'warning').length,
        fixable: violations.filter(v => v.fixable).length,
        fixed: fix ? violations.filter(v => v.fixable).length : 0,
        issues: violations.slice(0, 20)
      }
    };
  }

  // ==================== CODE GENERATION TOOLS ====================

  /**
   * Generate React/Vue component
   */
  private static async generateComponent(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      {
        field: 'name',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100,
        pattern: /^[A-Z][a-zA-Z0-9]*$/,
        custom: (value: string) => {
          if (!/^[A-Z]/.test(value)) {
            return 'Component name must start with uppercase letter';
          }
          return true;
        },
      },
      {
        field: 'type',
        type: 'string',
        required: false,
        enum: ['react-functional', 'react-class', 'vue'],
      },
      {
        field: 'props',
        type: 'array',
        required: false,
      },
      {
        field: 'withStyles',
        type: 'boolean',
        required: false,
      },
      {
        field: 'withTests',
        type: 'boolean',
        required: false,
      },
    ]);

    const componentName = validated.name;
    const type = validated.type || 'react-functional';
    const props = validated.props || [];
    const withStyles = validated.withStyles !== false;
    const withTests = validated.withTests || false;

    const propsInterface = props.length > 0 ? `interface ${componentName}Props {\n${props.map(p => `  ${p}: any;`).join('\n')}\n}` : '';
    
    let componentCode = '';
    let styleCode = '';
    let testCode = '';

    // Generate React functional component
    if (type === 'react-functional') {
      componentCode = `import React from 'react';
${withStyles ? `import './${componentName}.css';` : ''}
${propsInterface ? `\n${propsInterface}\n` : ''}
const ${componentName}: React.FC${propsInterface ? `<${componentName}Props>` : ''} = (${props.length > 0 ? `{ ${props.join(', ')} }` : ''}) => {
  return (
    <div className="${componentName.toLowerCase()}">
      <h2>${componentName} Component</h2>
      ${props.map(p => `<p>{${p}}</p>`).join('\n      ')}
    </div>
  );
};

export default ${componentName};`;

      if (withStyles) {
        styleCode = `.${componentName.toLowerCase()} {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.${componentName.toLowerCase()} h2 {
  margin: 0 0 10px 0;
  color: #333;
}`;
      }

      if (withTests) {
        testCode = `import { render, screen } from '@testing-library/react';
import ${componentName} from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName} />);
  });

  it('displays the component name', () => {
    render(<${componentName} />);
    expect(screen.getByText('${componentName} Component')).toBeInTheDocument();
  });
});`;
      }
    }

    // Create files
    const basePath = `src/components/${componentName}`;
    const newFiles: Record<string, { path: string; content: string; language: string }> = {
      component: { path: `${basePath}.tsx`, content: componentCode, language: 'typescript' }
    };

    if (withStyles) {
      newFiles.styles = { path: `${basePath}.css`, content: styleCode, language: 'css' };
    }

    if (withTests) {
      newFiles.tests = { path: `${basePath}.test.tsx`, content: testCode, language: 'typescript' };
    }

    // Use StateTransaction sequence for creating multiple files
    const transactions = Object.values(newFiles).map(file => 
      StateTransaction.createFileTransaction(
        file.path,
        file.content,
        null, // New file
        callbacks.setFiles,
        file.language
      )
    );

    const result = await StateTransaction.executeSequence(transactions);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to generate component ${componentName}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    callbacks.setActiveFile(`${basePath}.tsx`);

    return {
      success: true,
      message: `Generated ${componentName} component with ${Object.keys(newFiles).length} file(s)`,
      data: {
        component: `${basePath}.tsx`,
        files: Object.values(newFiles).map(f => f.path),
        props: props.length,
        type,
        withStyles,
        withTests,
      }
    };
  }

  /**
   * Generate unit tests
   */
  private static async generateTest(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'framework',
        type: 'string',
        required: false,
        enum: ['jest', 'vitest', 'mocha'],
      },
      {
        field: 'coverage',
        type: 'string',
        required: false,
        enum: ['basic', 'comprehensive'],
      },
    ]);

    const filepath = validated.filepath;
    const framework = validated.framework || 'jest';
    const coverage = validated.coverage || 'basic';

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const content = file.content;
    const fileName = filepath.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') || 'Unknown';
    
    // Extract functions to test
    const functions = this.extractFunctions(content);
    
    if (functions.length === 0) {
      return {
        success: false,
        message: `No functions found in ${filepath} to generate tests for`,
        error: 'NO_FUNCTIONS_FOUND',
      };
    }
    
    const testCode = `${framework === 'jest' ? "import { describe, it, expect } from '@jest/globals';" : "import { describe, it, expect } from 'vitest';"}
import { ${functions.map(f => f.name).join(', ')} } from './${fileName}';

describe('${fileName}', () => {
${functions.map(func => `  describe('${func.name}', () => {
    it('should execute without errors', () => {
      expect(() => ${func.name}()).not.toThrow();
    });

    ${coverage === 'comprehensive' ? `it('should return expected value', () => {
      const result = ${func.name}();
      expect(result).toBeDefined();
    });

    it('should handle edge cases', () => {
      expect(() => ${func.name}(null)).not.toThrow();
    });` : ''}
  });
`).join('\n')}
});`;

    const testPath = filepath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1');
    
    // Check if test file already exists
    if (files[testPath]) {
      return {
        success: false,
        message: `Test file already exists: ${testPath}. Delete it first or use a different name.`,
        error: 'FILE_EXISTS',
      };
    }

    // Use StateTransaction for atomic file creation
    const transaction = StateTransaction.createFileTransaction(
      testPath,
      testCode,
      null, // New file
      callbacks.setFiles,
      'typescript'
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to generate test file for ${filepath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    callbacks.setActiveFile(testPath);

    return {
      success: true,
      message: `Generated ${functions.length} test case(s) for ${filepath}`,
      data: {
        testFile: testPath,
        testsGenerated: functions.length,
        coverage,
        framework,
        sourceFile: filepath,
      }
    };
  }

  /**
   * Generate JSDoc/TSDoc documentation
   */
  private static async generateDocumentation(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'style',
        type: 'string',
        required: false,
        enum: ['jsdoc', 'tsdoc'],
      },
      {
        field: 'addExamples',
        type: 'boolean',
        required: false,
      },
    ]);

    const filepath = validated.filepath;
    const style = validated.style || 'tsdoc';
    const addExamples = validated.addExamples || false;

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    const lines = oldContent.split('\n');
    let documentedContent = '';
    let docsAdded = 0;

    lines.forEach((line, idx) => {
      // Check if this is a function declaration
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      const arrowMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/);
      
      const match = funcMatch || arrowMatch;
      
      if (match && idx > 0 && !lines[idx - 1].trim().startsWith('/**')) {
        const funcName = match[1];
        const params = match[2].split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p);
        
        const doc = `/**
 * ${funcName.charAt(0).toUpperCase() + funcName.slice(1)} function
 * ${style === 'tsdoc' ? '@remarks' : '@description'} Auto-generated documentation
 * ${params.map(p => `@param ${p} - Parameter description`).join('\n * ')}
 * @returns Return value description
 ${addExamples ? `* @example\n * \`\`\`typescript\n * ${funcName}()\n * \`\`\`` : ''}
 */`;
        
        documentedContent += doc + '\n';
        docsAdded++;
      }
      
      documentedContent += line + '\n';
    });

    if (docsAdded === 0) {
      return {
        success: false,
        message: `No undocumented functions found in ${filepath}`,
        error: 'NO_FUNCTIONS_TO_DOCUMENT',
      };
    }

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      filepath,
      documentedContent.trimEnd(),
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to add documentation to ${filepath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Added ${docsAdded} documentation block(s) to ${filepath}`,
      data: {
        filepath,
        docsAdded,
        style,
        withExamples: addExamples,
      }
    };
  }

  /**
   * Generate TypeScript types from JSON
   */
  private static async generateTypes(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      {
        field: 'source',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100000,
      },
      {
        field: 'name',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100,
        pattern: /^[A-Z][a-zA-Z0-9]*$/,
        custom: (value: string) => {
          if (!/^[A-Z]/.test(value)) {
            return 'Type name must start with uppercase letter';
          }
          return true;
        },
      },
      {
        field: 'outputPath',
        type: 'string',
        required: false,
        maxLength: 500,
      },
      {
        field: 'style',
        type: 'string',
        required: false,
        enum: ['interface', 'type'],
      },
    ]);

    const source = validated.source;
    const name = validated.name;
    const outputPath = validated.outputPath || 'src/types.ts';
    const style = validated.style || 'interface';

    let jsonData: any;
    
    // Try to parse source as JSON
    try {
      jsonData = JSON.parse(source);
    } catch {
      // Maybe it's a file path
      if (files[source]) {
        try {
          jsonData = JSON.parse(files[source].content);
        } catch {
          return { 
            success: false, 
            message: 'Invalid JSON source. Provide valid JSON string or path to JSON file.', 
            error: 'INVALID_JSON' 
          };
        }
      } else {
        return { 
          success: false, 
          message: 'Invalid JSON source. Provide valid JSON string or path to JSON file.', 
          error: 'INVALID_JSON' 
        };
      }
    }

    // Generate TypeScript type
    const generateType = (obj: any, typeName: string): string => {
      const entries = Object.entries(obj).map(([key, value]) => {
        let typeStr: string;
        if (Array.isArray(value)) {
          typeStr = value.length > 0 ? `${typeof value[0]}[]` : 'any[]';
        } else if (value === null) {
          typeStr = 'null';
        } else if (typeof value === 'object') {
          typeStr = '{ [key: string]: any }';
        } else {
          typeStr = typeof value;
        }
        return `  ${key}: ${typeStr};`;
      });

      return `${style} ${typeName} {\n${entries.join('\n')}\n}`;
    };

    const typeDefinition = generateType(jsonData, name);

    // Add to types file
    const oldContent = files[outputPath]?.content || '';
    const newContent = oldContent + (oldContent ? '\n\n' : '') + typeDefinition;

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      outputPath,
      newContent,
      oldContent || null,
      callbacks.setFiles,
      'typescript'
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to generate types in ${outputPath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Generated ${style} ${name} in ${outputPath}`,
      data: {
        typeName: name,
        style,
        outputPath,
        fields: Object.keys(jsonData).length,
        isNewFile: !oldContent,
      }
    };
  }

  /**
   * Generate API client code
   */
  private static async generateApiClient(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      {
        field: 'endpoints',
        type: 'array',
        required: true,
        custom: (value: any[]) => {
          if (value.length === 0) {
            return 'At least one endpoint is required';
          }
          for (const ep of value) {
            if (typeof ep !== 'string' || !ep.includes(' ')) {
              return 'Each endpoint must be a string in format "METHOD /path"';
            }
          }
          return true;
        },
      },
      {
        field: 'baseUrl',
        type: 'string',
        required: false,
        maxLength: 500,
      },
      {
        field: 'outputPath',
        type: 'string',
        required: false,
        maxLength: 500,
      },
      {
        field: 'withFetch',
        type: 'boolean',
        required: false,
      },
    ]);

    const endpoints = validated.endpoints;
    const baseUrl = validated.baseUrl || '';
    const outputPath = validated.outputPath || 'src/api/client.ts';
    const withFetch = validated.withFetch !== false;

    // Check if output file already exists
    if (files[outputPath]) {
      return {
        success: false,
        message: `API client file already exists: ${outputPath}. Delete it first or use a different path.`,
        error: 'FILE_EXISTS',
      };
    }

    const parsedEndpoints = endpoints.map((ep: string) => {
      const [method, path] = ep.split(' ');
      const name = path.split('/').filter(Boolean).join('_').replace(/[{}]/g, '');
      return { method: method.toUpperCase(), path, name };
    });

    const clientCode = `${withFetch ? '' : "import axios from 'axios';"}

const BASE_URL = '${baseUrl}';

${parsedEndpoints.map(ep => `
/**
 * ${ep.method} ${ep.path}
 */
export async function ${ep.method.toLowerCase()}_${ep.name}(params?: any): Promise<any> {
  ${withFetch ? `
  const response = await fetch(\`\${BASE_URL}${ep.path}\`, {
    method: '${ep.method}',
    headers: { 'Content-Type': 'application/json' },
    ${ep.method !== 'GET' ? 'body: JSON.stringify(params)' : ''}
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  return response.json();
  ` : `
  const response = await axios.${ep.method.toLowerCase()}(\`\${BASE_URL}${ep.path}\`, params);
  return response.data;
  `}
}`).join('\n')}

export const apiClient = {
  ${parsedEndpoints.map(ep => `${ep.method.toLowerCase()}_${ep.name}`).join(',\n  ')}
};`;

    // Use StateTransaction for atomic file creation
    const transaction = StateTransaction.createFileTransaction(
      outputPath,
      clientCode,
      null, // New file
      callbacks.setFiles,
      'typescript'
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to generate API client at ${outputPath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    callbacks.setActiveFile(outputPath);

    return {
      success: true,
      message: `Generated API client with ${endpoints.length} endpoint(s)`,
      data: {
        outputPath,
        endpoints: endpoints.length,
        library: withFetch ? 'fetch' : 'axios',
        baseUrl,
        methods: parsedEndpoints.map(ep => `${ep.method} ${ep.path}`),
      }
    };
  }

  // ==================== REFACTORING TOOLS ====================

  /**
   * Extract code block into function
   */
  private static async extractFunction(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      ToolValidator.lineNumberRules('startLine', true),
      ToolValidator.lineNumberRules('endLine', true),
      {
        field: 'functionName',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      },
      {
        field: 'extractToFile',
        type: 'string',
        required: false,
        maxLength: 500,
      },
    ]);

    const filepath = validated.filepath;
    const startLine = validated.startLine;
    const endLine = validated.endLine;
    const functionName = validated.functionName;
    const extractToFile = validated.extractToFile;

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    if (endLine < startLine) {
      return {
        success: false,
        message: `End line ${endLine} cannot be before start line ${startLine}`,
        error: 'INVALID_RANGE',
      };
    }

    const oldContent = file.content;
    const lines = oldContent.split('\n');

    if (startLine > lines.length || endLine > lines.length) {
      return {
        success: false,
        message: `Line range ${startLine}-${endLine} is out of bounds. File has ${lines.length} lines.`,
        error: 'LINE_OUT_OF_RANGE',
      };
    }

    const extractedCode = lines.slice(startLine - 1, endLine).join('\n');
    
    // Simple function wrapper
    const newFunction = `
function ${functionName}() {
${extractedCode}
}`;

    // Replace original code with function call
    const updatedLines = [
      ...lines.slice(0, startLine - 1),
      `  ${functionName}();`,
      ...lines.slice(endLine)
    ];

    if (extractToFile) {
      // Check if target file already exists
      if (files[extractToFile]) {
        return {
          success: false,
          message: `Target file already exists: ${extractToFile}. Delete it first or use a different name.`,
          error: 'FILE_EXISTS',
        };
      }

      // Create new file with function and update source file
      const transactions = [
        StateTransaction.createFileTransaction(
          extractToFile,
          newFunction,
          null,
          callbacks.setFiles,
          'typescript'
        ),
        StateTransaction.createFileTransaction(
          filepath,
          updatedLines.join('\n'),
          oldContent,
          callbacks.setFiles,
          file.language
        ),
      ];

      const result = await StateTransaction.executeSequence(transactions);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to extract function ${functionName}`,
          error: result.error?.message || 'TRANSACTION_FAILED',
        };
      }
    } else {
      // Add function to same file
      const functionInsertPoint = Math.max(0, startLine - 5);
      const finalLines = [
        ...updatedLines.slice(0, functionInsertPoint),
        newFunction,
        ...updatedLines.slice(functionInsertPoint)
      ];

      const transaction = StateTransaction.createFileTransaction(
        filepath,
        finalLines.join('\n'),
        oldContent,
        callbacks.setFiles,
        file.language
      );

      const result = await StateTransaction.execute(transaction);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to extract function ${functionName}`,
          error: result.error?.message || 'TRANSACTION_FAILED',
        };
      }
    }

    return {
      success: true,
      message: `Extracted function ${functionName} from lines ${startLine}-${endLine}`,
      data: {
        functionName,
        extractedLines: endLine - startLine + 1,
        destination: extractToFile || filepath,
        sourceFile: filepath,
      }
    };
  }

  /**
   * Rename symbol across project
   */
  private static async renameSymbol(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'oldName',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      },
      {
        field: 'newName',
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      },
      {
        field: 'scope',
        type: 'string',
        required: false,
        enum: ['file', 'project'],
      },
    ]);

    const filepath = validated.filepath;
    const oldName = validated.oldName;
    const newName = validated.newName;
    const scope = validated.scope || 'file';

    if (!files[filepath]) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    if (oldName === newName) {
      return {
        success: false,
        message: `Old name and new name are the same: ${oldName}`,
        error: 'SAME_NAME',
      };
    }

    const filesToUpdate = scope === 'project' 
      ? Object.keys(files)
      : [filepath];

    let totalReplacements = 0;
    const transactions: any[] = [];

    filesToUpdate.forEach(file => {
      if (!files[file]) return;

      const oldContent = files[file].content;
      const regex = new RegExp(`\\b${oldName}\\b`, 'g');
      const matches = oldContent.match(regex);
      
      if (matches) {
        const newContent = oldContent.replace(regex, newName);
        totalReplacements += matches.length;

        transactions.push(
          StateTransaction.createFileTransaction(
            file,
            newContent,
            oldContent,
            callbacks.setFiles,
            files[file].language
          )
        );
      }
    });

    if (transactions.length === 0) {
      return {
        success: false,
        message: `Symbol '${oldName}' not found in ${scope === 'project' ? 'project' : filepath}`,
        error: 'SYMBOL_NOT_FOUND',
      };
    }

    // Use StateTransaction sequence for multi-file rename
    const result = await StateTransaction.executeSequence(transactions);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to rename '${oldName}' to '${newName}'`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Renamed '${oldName}' to '${newName}' (${totalReplacements} occurrence(s) in ${transactions.length} file(s))`,
      data: {
        oldName,
        newName,
        replacements: totalReplacements,
        filesModified: transactions.length,
        scope
      }
    };
  }

  /**
   * Optimize imports
   */
  private static async optimizeImports(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'removeUnused',
        type: 'boolean',
        required: false,
      },
      {
        field: 'sortStyle',
        type: 'string',
        required: false,
        enum: ['type', 'alphabetical', 'none'],
      },
    ]);

    const filepath = validated.filepath;
    const removeUnused = validated.removeUnused !== false;
    const sortStyle = validated.sortStyle || 'type';

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    const lines = oldContent.split('\n');
    
    // Extract import lines
    const imports: any[] = [];
    const otherLines: string[] = [];
    
    lines.forEach(line => {
      if (line.trim().startsWith('import ')) {
        const match = line.match(/import\s+(?:{([^}]+)}|([^'"]+))\s+from\s+['"]([^'"]+)['"]/);
        if (match) {
          imports.push({
            original: line,
            names: match[1] || match[2],
            module: match[3],
            isExternal: !match[3].startsWith('.')
          });
        }
      } else {
        otherLines.push(line);
      }
    });

    // Remove unused imports if requested
    const filteredImports = removeUnused 
      ? imports.filter(imp => {
          const names = imp.names.split(',').map((n: string) => n.trim());
          return names.some((name: string) => otherLines.join('\n').includes(name));
        })
      : imports;

    // Sort imports
    const sortedImports = [...filteredImports].sort((a, b) => {
      if (sortStyle === 'type') {
        if (a.isExternal !== b.isExternal) return a.isExternal ? -1 : 1;
      }
      return a.module.localeCompare(b.module);
    });

    // Rebuild file
    const newContent = [
      ...sortedImports.map(imp => imp.original),
      '',
      ...otherLines
    ].join('\n');

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      filepath,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to optimize imports in ${filepath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Optimized imports in ${filepath}`,
      data: {
        filepath,
        originalImports: imports.length,
        optimizedImports: sortedImports.length,
        removed: imports.length - sortedImports.length,
        sortStyle
      }
    };
  }

  /**
   * Split large file into modules
   */
  private static async splitFile(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'strategy',
        type: 'string',
        required: false,
        enum: ['by-component', 'by-function', 'by-size'],
      },
      {
        field: 'outputDir',
        type: 'string',
        required: false,
        maxLength: 500,
      },
    ]);

    const filepath = validated.filepath;
    const strategy = validated.strategy || 'by-component';
    const outputDir = validated.outputDir;

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const content = file.content;
    const basePath = outputDir || filepath.substring(0, filepath.lastIndexOf('/'));
    
    // Extract functions/components
    const functions = this.extractFunctions(content);
    const newFiles: Record<string, string> = {};

    if (strategy === 'by-component' || strategy === 'by-function') {
      if (functions.length === 0) {
        return {
          success: false,
          message: `No functions found in ${filepath} to split`,
          error: 'NO_FUNCTIONS_FOUND',
        };
      }
      
      functions.forEach(func => {
        const funcContent = content.substring(func.start, func.end);
        newFiles[`${basePath}/${func.name}.ts`] = funcContent;
      });
    } else if (strategy === 'by-size') {
      const lines = content.split('\n');
      const chunkSize = 100;
      let chunkIndex = 0;
      
      for (let i = 0; i < lines.length; i += chunkSize) {
        newFiles[`${basePath}/part${++chunkIndex}.ts`] = lines.slice(i, i + chunkSize).join('\n');
      }
    }

    // Use StateTransaction sequence for creating multiple files
    const transactions = Object.entries(newFiles).map(([path, fileContent]) => 
      StateTransaction.createFileTransaction(
        path,
        fileContent,
        null, // New file
        callbacks.setFiles,
        'typescript'
      )
    );

    const result = await StateTransaction.executeSequence(transactions);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to split file ${filepath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Split ${filepath} into ${Object.keys(newFiles).length} files`,
      data: {
        originalFile: filepath,
        newFiles: Object.keys(newFiles),
        strategy,
        filesCreated: Object.keys(newFiles).length,
      }
    };
  }

  /**
   * Convert syntax between different styles
   */
  private static async convertSyntax(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'conversion',
        type: 'string',
        required: true,
        enum: ['var-to-const', 'commonjs-to-esm', 'callbacks-to-async'],
      },
      {
        field: 'safe',
        type: 'boolean',
        required: false,
      },
    ]);

    const filepath = validated.filepath;
    const conversion = validated.conversion;
    const safe = validated.safe !== false;

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    let newContent = oldContent;
    let conversions = 0;

    switch (conversion) {
      case 'var-to-const':
        newContent = newContent.replace(/\bvar\s+(\w+)\s*=\s*([^;]+);/g, (_, name, value) => {
          conversions++;
          return `const ${name} = ${value};`;
        });
        break;

      case 'commonjs-to-esm':
        newContent = newContent.replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);/g, (_, name, module) => {
          conversions++;
          return `import ${name} from '${module}';`;
        });
        break;

      case 'callbacks-to-async':
        // This is complex, simplified version
        newContent = newContent.replace(/function\s+(\w+)\s*\(([^)]*),\s*callback\s*\)/g, (_, name, params) => {
          conversions++;
          return `async function ${name}(${params})`;
        });
        break;
    }

    if (conversions === 0) {
      return {
        success: false,
        message: `No instances found to convert in ${filepath} for conversion type '${conversion}'`,
        error: 'NO_CONVERSIONS_FOUND',
      };
    }

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      filepath,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to convert syntax in ${filepath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Converted ${conversions} instance(s) in ${filepath}`,
      data: {
        filepath,
        conversion,
        conversions,
        safe
      }
    };
  }

  // ==================== ADVANCED OPERATIONS ====================

  /**
   * Find unused code in project
   */
  private static async findUnusedCode(
    args: Record<string, any>,
    files: Record<string, FileData>
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      {
        field: 'scope',
        type: 'string',
        required: false,
        enum: ['project', 'file', 'directory'],
      },
      {
        field: 'target',
        type: 'string',
        required: false,
        maxLength: 500,
      },
      {
        field: 'includeTests',
        type: 'boolean',
        required: false,
      },
    ]);

    const scope = validated.scope || 'project';
    const target = validated.target;
    const includeTests = validated.includeTests || false;

    // Validate target is provided when scope requires it
    if ((scope === 'file' || scope === 'directory') && !target) {
      return {
        success: false,
        message: `Target is required when scope is '${scope}'`,
        error: 'MISSING_TARGET',
      };
    }

    // Validate target file exists if scope is 'file'
    if (scope === 'file' && target && !files[target]) {
      return {
        success: false,
        message: `Target file not found: ${target}. Available files: ${Object.keys(files).join(', ') || 'none'}`,
        error: 'FILE_NOT_FOUND',
      };
    }

    const filesToScan = scope === 'file' && target
      ? [target]
      : scope === 'directory' && target
      ? Object.keys(files).filter(f => f.startsWith(target))
      : Object.keys(files);

    if (filesToScan.length === 0) {
      return {
        success: true,
        message: `No files found to scan in scope '${scope}'${target ? ` with target '${target}'` : ''}`,
        data: {
          scope,
          target,
          filesScanned: 0,
          unusedItems: [],
        }
      };
    }

    const unusedItems: any[] = [];

    filesToScan.forEach(file => {
      if (!includeTests && file.includes('.test.')) return;
      
      const content = files[file].content;
      const allContent = Object.values(files).map(f => f.content).join('\n');
      
      // Find exports
      const exports = [...content.matchAll(/export\s+(?:function|const|class)\s+(\w+)/g)];
      
      exports.forEach(match => {
        const name = match[1];
        const usageCount = (allContent.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
        
        if (usageCount === 1) { // Only in declaration
          unusedItems.push({
            file,
            name,
            type: 'export',
            suggestion: 'Remove unused export or make it internal'
          });
        }
      });
    });

    return {
      success: true,
      message: `Found ${unusedItems.length} potentially unused items in ${filesToScan.length} file(s)`,
      data: {
        scope,
        target,
        filesScanned: filesToScan.length,
        unusedItems: unusedItems.slice(0, 50), // Limit to 50 items
        totalUnused: unusedItems.length,
        truncated: unusedItems.length > 50,
      }
    };
  }

  /**
   * Add error handling to functions
   */
  private static async addErrorHandling(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'functions',
        type: 'array',
        required: false,
      },
      {
        field: 'style',
        type: 'string',
        required: false,
        enum: ['try-catch', 'promise'],
      },
    ]);

    const filepath = validated.filepath;
    const functions = validated.functions || [];
    const style = validated.style || 'try-catch';

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    let newContent = oldContent;
    const allFunctions = this.extractFunctions(oldContent);
    
    if (allFunctions.length === 0) {
      return {
        success: false,
        message: `No functions found in ${filepath} to add error handling`,
        error: 'NO_FUNCTIONS_FOUND',
      };
    }

    const targetFunctions = functions.length > 0 
      ? allFunctions.filter(f => functions.includes(f.name))
      : allFunctions;

    if (targetFunctions.length === 0) {
      return {
        success: false,
        message: `Specified functions not found in ${filepath}: ${functions.join(', ')}`,
        error: 'FUNCTIONS_NOT_FOUND',
      };
    }

    targetFunctions.forEach(func => {
      const funcContent = newContent.substring(func.start, func.end);
      
      if (!funcContent.includes('try {')) {
        const wrappedContent = `try {\n${funcContent}\n} catch (error) {\n  console.error('Error in ${func.name}:', error);\n  throw error;\n}`;
        newContent = newContent.substring(0, func.start) + wrappedContent + newContent.substring(func.end);
      }
    });

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      filepath,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to add error handling to ${filepath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: `Added error handling to ${targetFunctions.length} function(s) in ${filepath}`,
      data: {
        filepath,
        functionsModified: targetFunctions.length,
        style,
        functionNames: targetFunctions.map(f => f.name),
      }
    };
  }

  /**
   * Add logging to functions
   */
  private static async addLogging(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    // Validate inputs
    const validated = ToolValidator.validateOrThrow(args, [
      ToolValidator.filePathRules('filepath', true),
      {
        field: 'functions',
        type: 'array',
        required: false,
      },
      {
        field: 'level',
        type: 'string',
        required: false,
        enum: ['basic', 'detailed'],
      },
      {
        field: 'remove',
        type: 'boolean',
        required: false,
      },
    ]);

    const filepath = validated.filepath;
    const functions = validated.functions || [];
    const level = validated.level || 'basic';
    const remove = validated.remove || false;

    const file = files[filepath];
    if (!file) {
      return { 
        success: false, 
        message: `File not found: ${filepath}. Available files: ${Object.keys(files).join(', ') || 'none'}`, 
        error: 'FILE_NOT_FOUND' 
      };
    }

    const oldContent = file.content;
    let newContent = oldContent;
    
    if (remove) {
      // Remove console.log statements
      newContent = newContent.replace(/console\.log\([^)]*\);?\n?/g, '');
      
      if (newContent === oldContent) {
        return {
          success: false,
          message: `No console.log statements found in ${filepath}`,
          error: 'NO_LOGGING_FOUND',
        };
      }
    } else {
      const allFunctions = this.extractFunctions(oldContent);
      
      if (allFunctions.length === 0) {
        return {
          success: false,
          message: `No functions found in ${filepath} to add logging`,
          error: 'NO_FUNCTIONS_FOUND',
        };
      }

      const targetFunctions = functions.length > 0
        ? allFunctions.filter(f => functions.includes(f.name))
        : allFunctions;

      if (targetFunctions.length === 0) {
        return {
          success: false,
          message: `Specified functions not found in ${filepath}: ${functions.join(', ')}`,
          error: 'FUNCTIONS_NOT_FOUND',
        };
      }

      targetFunctions.forEach(func => {
        const lines = newContent.split('\n');
        const funcLine = lines[func.startLine - 1];
        const indent = funcLine.match(/^\s*/)?.[0] || '';
        
        if (level === 'basic') {
          lines.splice(func.startLine, 0, `${indent}  console.log('Entering ${func.name}');`);
        } else if (level === 'detailed') {
          lines.splice(func.startLine, 0, 
            `${indent}  console.log('Entering ${func.name} with params:', arguments);`,
            `${indent}  console.log('Exiting ${func.name}');`
          );
        }
        
        newContent = lines.join('\n');
      });
    }

    // Use StateTransaction for atomic operation
    const transaction = StateTransaction.createFileTransaction(
      filepath,
      newContent,
      oldContent,
      callbacks.setFiles,
      file.language
    );

    const result = await StateTransaction.execute(transaction);

    if (!result.success) {
      return {
        success: false,
        message: `Failed to ${remove ? 'remove' : 'add'} logging in ${filepath}`,
        error: result.error?.message || 'TRANSACTION_FAILED',
      };
    }

    return {
      success: true,
      message: remove ? `Removed logging statements from ${filepath}` : `Added logging to function(s) in ${filepath}`,
      data: {
        filepath,
        level,
        remove,
        functionsModified: remove ? undefined : functions.length || 'all',
      }
    };
  }

  /**
   * Create barrel export file
   */
  private static async createBarrelExport(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    const { directory, pattern = '*.ts', named = true } = args;

    const filesInDir = Object.keys(files).filter(f => 
      f.startsWith(directory) && 
      !f.includes('index.ts') &&
      f.match(new RegExp(pattern.replace('*', '.*')))
    );

    const exports = filesInDir.map(file => {
      const fileName = file.split('/').pop()?.replace(/\.tsx?$/, '');
      return named 
        ? `export * from './${fileName}';`
        : `export { default as ${fileName} } from './${fileName}';`;
    });

    const barrelContent = exports.join('\n');
    const barrelPath = `${directory}/index.ts`;

    callbacks.setFiles((prev: Record<string, FileData>) => ({
      ...prev,
      [barrelPath]: {
        name: 'index.ts',
        content: barrelContent,
        language: 'typescript'
      }
    }));

    callbacks.setActiveFile(barrelPath);

    return {
      success: true,
      message: `Created barrel export in ${barrelPath} with ${filesInDir.length} exports`,
      data: {
        barrelPath,
        exports: filesInDir.length,
        files: filesInDir
      }
    };
  }

  /**
   * Setup TypeScript path aliases
   */
  private static async setupPathAliases(
    args: Record<string, any>,
    files: Record<string, FileData>,
    callbacks: McpToolCallbacks
  ): Promise<McpToolResult> {
    const { aliases, updateImports = true } = args;

    // Update tsconfig.json
    const tsconfigPath = 'tsconfig.json';
    let tsconfig: any = {};

    if (files[tsconfigPath]) {
      try {
        tsconfig = JSON.parse(files[tsconfigPath].content);
      } catch {
        tsconfig = { compilerOptions: {} };
      }
    } else {
      tsconfig = { compilerOptions: {} };
    }

    tsconfig.compilerOptions.baseUrl = '.';
    tsconfig.compilerOptions.paths = aliases;

    callbacks.setFiles((prev: Record<string, FileData>) => ({
      ...prev,
      [tsconfigPath]: {
        name: 'tsconfig.json',
        content: JSON.stringify(tsconfig, null, 2),
        language: 'json'
      }
    }));

    // Update imports if requested
    if (updateImports) {
      Object.entries(aliases).forEach(([alias, paths]) => {
        const aliasPath = (paths as string[])[0].replace('./', '').replace('/*', '');
        
        Object.keys(files).forEach(file => {
          if (!files[file]) return;
          
          let content = files[file].content;
          const regex = new RegExp(`from\\s+['"]\\.\\/${aliasPath}\\/`, 'g');
          content = content.replace(regex, `from '${alias}/`);
          
          if (content !== files[file].content) {
            callbacks.setFiles((prev: Record<string, FileData>) => ({
              ...prev,
              [file]: { ...prev[file], content }
            }));
          }
        });
      });
    }

    return {
      success: true,
      message: `Configured ${Object.keys(aliases).length} path aliases`,
      data: {
        aliases: Object.keys(aliases),
        updatedImports: updateImports
      }
    };
  }

  // ==================== HELPER METHODS ====================

  private static calculateMaxNesting(content: string): number {
    let max = 0;
    let current = 0;
    
    for (let char of content) {
      if (char === '{') {
        current++;
        max = Math.max(max, current);
      } else if (char === '}') {
        current--;
      }
    }
    
    return max;
  }

  private static findDuplicateCode(content: string): any[] {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
    const duplicates: any[] = [];
    const blockSize = 3;
    
    for (let i = 0; i < lines.length - blockSize; i++) {
      const block = lines.slice(i, i + blockSize).join('');
      let count = 0;
      
      for (let j = i + blockSize; j < lines.length - blockSize; j++) {
        const compareBlock = lines.slice(j, j + blockSize).join('');
        if (block === compareBlock) count++;
      }
      
      if (count > 0) {
        duplicates.push({
          lines: `${i + 1}-${i + blockSize}`,
          code: lines[i].substring(0, 50) + '...',
          count: count + 1
        });
      }
    }
    
    return duplicates;
  }

  private static findSecurityIssues(content: string): any[] {
    const issues: any[] = [];
    
    if (content.includes('eval(')) {
      issues.push({ type: 'eval-usage', severity: 'high', message: 'Use of eval() is dangerous' });
    }
    
    if (content.match(/innerHTML\s*=/)) {
      issues.push({ type: 'xss', severity: 'high', message: 'innerHTML can lead to XSS vulnerabilities' });
    }
    
    if (content.includes('password') && !content.includes('hash')) {
      issues.push({ type: 'plain-password', severity: 'medium', message: 'Password might be stored in plain text' });
    }
    
    return issues;
  }

  private static findPerformanceIssues(content: string): any[] {
    const issues: any[] = [];
    
    if (content.includes('for') && content.includes('for') && content.includes('for')) {
      issues.push({ type: 'nested-loops', message: 'Multiple nested loops detected' });
    }
    
    if (content.match(/\.forEach\([^)]+\.forEach/)) {
      issues.push({ type: 'nested-foreach', message: 'Nested forEach can impact performance' });
    }
    
    return issues;
  }

  private static extractFunctions(content: string): any[] {
    const functions: any[] = [];
    const lines = content.split('\n');
    let currentFunc: any = null;
    let braceCount = 0;
    
    lines.forEach((line, idx) => {
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      const arrowMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
      
      if (funcMatch || arrowMatch) {
        currentFunc = {
          name: (funcMatch || arrowMatch)![1],
          startLine: idx + 1,
          start: content.indexOf(line),
          lines: 0
        };
      }
      
      if (currentFunc) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        currentFunc.lines++;
        
        if (braceCount === 0 && currentFunc.lines > 1) {
          currentFunc.end = content.indexOf(line) + line.length;
          functions.push(currentFunc);
          currentFunc = null;
        }
      }
    });
    
    return functions;
  }

  private static resolveImportPath(from: string, to: string): string {
    const fromParts = from.split('/').slice(0, -1);
    const toParts = to.split('/');
    
    toParts.forEach(part => {
      if (part === '..') fromParts.pop();
      else if (part !== '.') fromParts.push(part);
    });
    
    return fromParts.join('/') + '.ts';
  }
}
