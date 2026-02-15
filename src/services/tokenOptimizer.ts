/**
 * Token Optimizer Service
 * ابزارهای عملی برای کاهش مصرف توکن قبل از ارسال به API
 */

export class TokenOptimizer {
  /**
   * حذف کامنت‌ها از کد (JavaScript, TypeScript, CSS, HTML)
   */
  static removeComments(code: string, language?: string): string {
    let result = code;
    
    // Detect language from code if not provided
    if (!language) {
      if (code.includes('//') || code.includes('/*')) {
        language = 'javascript';
      } else if (code.includes('<!--')) {
        language = 'html';
      } else if (code.includes('/*')) {
        language = 'css';
      }
    }

    // JavaScript/TypeScript comments
    if (language === 'javascript' || language === 'typescript' || language === 'js' || language === 'ts') {
      // Remove single-line comments (// ...)
      result = result.replace(/\/\/.*$/gm, '');
      
      // Remove multi-line comments (/* ... */)
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    
    // HTML comments
    if (language === 'html' || language === 'htm') {
      result = result.replace(/<!--[\s\S]*?-->/g, '');
    }
    
    // CSS comments
    if (language === 'css') {
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    
    // Python comments
    if (language === 'python' || language === 'py') {
      result = result.replace(/#.*$/gm, '');
    }
    
    // Clean up extra blank lines
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return result.trim();
  }

  /**
   * فشرده‌سازی کد (minification)
   */
  static minifyCode(code: string, language?: string): string {
    let result = code;
    
    // Remove comments first
    result = this.removeComments(result, language);
    
    // Remove extra whitespace
    result = result.replace(/\s+/g, ' ');
    
    // Remove whitespace around operators and brackets (careful with strings)
    result = result.replace(/\s*([{}();,=+\-*/])\s*/g, '$1');
    
    // Remove leading/trailing whitespace from lines
    result = result.split('\n').map(line => line.trim()).join('\n');
    
    // Remove empty lines
    result = result.replace(/^\s*[\r\n]/gm, '');
    
    return result.trim();
  }

  /**
   * بهینه‌سازی Prompt (حذف کلمات غیرضروری، کوتاه‌سازی)
   */
  static optimizePrompt(prompt: string): string {
    let result = prompt;
    
    // Remove redundant phrases
    const redundantPhrases = [
      /please\s+can\s+you/gi,
      /i\s+would\s+like\s+you\s+to/gi,
      /could\s+you\s+please/gi,
      /i\s+want\s+you\s+to/gi,
      /it\s+would\s+be\s+great\s+if/gi,
      /i\s+need\s+you\s+to/gi
    ];
    
    redundantPhrases.forEach(regex => {
      result = result.replace(regex, '');
    });
    
    // Replace verbose phrases with concise ones
    const replacements: [RegExp, string][] = [
      [/create\s+a\s+new\s+/gi, 'create '],
      [/make\s+sure\s+that/gi, 'ensure '],
      [/i\s+think\s+that/gi, ''],
      [/in\s+order\s+to/gi, 'to '],
      [/due\s+to\s+the\s+fact\s+that/gi, 'because '],
      [/at\s+this\s+point\s+in\s+time/gi, 'now '],
      [/for\s+the\s+purpose\s+of/gi, 'for ']
    ];
    
    replacements.forEach(([regex, replacement]) => {
      result = result.replace(regex, replacement);
    });
    
    // Remove extra spaces
    result = result.replace(/\s+/g, ' ').trim();
    
    // Remove redundant punctuation
    result = result.replace(/[.,;]{2,}/g, '.');
    
    return result;
  }

  /**
   * حذف کدهای تکراری (basic deduplication)
   */
  static deduplicateCode(code: string): string {
    const lines = code.split('\n');
    const seen = new Set<string>();
    const result: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        result.push(line);
        continue;
      }
      
      // Create a normalized version (remove variable names, keep structure)
      const normalized = trimmed
        .replace(/\b\w+\b/g, 'VAR') // Replace words with VAR
        .replace(/\d+/g, 'NUM') // Replace numbers
        .replace(/['"]/g, 'STR'); // Replace strings
      
      // If we've seen this pattern before, skip it (but keep first occurrence)
      if (seen.has(normalized)) {
        continue;
      }
      
      seen.add(normalized);
      result.push(line);
    }
    
    return result.join('\n');
  }

  /**
   * فشرده‌سازی کامل کد (ترکیب همه روش‌ها)
   */
  static compressCode(code: string, language?: string, options?: {
    removeComments?: boolean;
    minify?: boolean;
    deduplicate?: boolean;
  }): { compressed: string; originalSize: number; compressedSize: number; reduction: number } {
    const originalSize = code.length;
    let result = code;
    
    const opts = {
      removeComments: true,
      minify: false, // Minify can break code, use carefully
      deduplicate: false, // Deduplication can be risky
      ...options
    };
    
    if (opts.removeComments) {
      result = this.removeComments(result, language);
    }
    
    if (opts.deduplicate) {
      result = this.deduplicateCode(result);
    }
    
    if (opts.minify) {
      result = this.minifyCode(result, language);
    }
    
    const compressedSize = result.length;
    const reduction = originalSize > 0 
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100) 
      : 0;
    
    return {
      compressed: result,
      originalSize,
      compressedSize,
      reduction
    };
  }

  /**
   * بهینه‌سازی فایل کامل
   */
  static optimizeFile(content: string, filename: string): {
    optimized: string;
    originalSize: number;
    optimizedSize: number;
    reduction: number;
    stats: {
      commentsRemoved: boolean;
      minified: boolean;
      deduplicated: boolean;
    };
  } {
    const language = this.detectLanguage(filename);
    const originalSize = content.length;
    
    // Remove comments (safe operation)
    let optimized = this.removeComments(content, language);
    const commentsRemoved = optimized.length < originalSize;
    
    // Don't minify by default (can break code)
    // Don't deduplicate by default (can remove important code)
    
    const optimizedSize = optimized.length;
    const reduction = originalSize > 0 
      ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) 
      : 0;
    
    return {
      optimized,
      originalSize,
      optimizedSize,
      reduction,
      stats: {
        commentsRemoved,
        minified: false,
        deduplicated: false
      }
    };
  }

  /**
   * تشخیص زبان از نام فایل
   */
  private static detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'css',
      'sass': 'css',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin'
    };
    
    return languageMap[ext] || 'javascript';
  }

  /**
   * تخمین تعداد توکن (تقریبی)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    // For code, it's usually ~3-5 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * مقایسه قبل و بعد از بهینه‌سازی
   */
  static compareOptimization(original: string, optimized: string): {
    originalTokens: number;
    optimizedTokens: number;
    tokensSaved: number;
    percentageSaved: number;
    originalSize: number;
    optimizedSize: number;
    sizeReduction: number;
  } {
    const originalTokens = this.estimateTokens(original);
    const optimizedTokens = this.estimateTokens(optimized);
    const tokensSaved = originalTokens - optimizedTokens;
    const percentageSaved = originalTokens > 0 
      ? Math.round((tokensSaved / originalTokens) * 100) 
      : 0;
    
    const originalSize = original.length;
    const optimizedSize = optimized.length;
    const sizeReduction = originalSize > 0 
      ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) 
      : 0;
    
    return {
      originalTokens,
      optimizedTokens,
      tokensSaved,
      percentageSaved,
      originalSize,
      optimizedSize,
      sizeReduction
    };
  }
}
