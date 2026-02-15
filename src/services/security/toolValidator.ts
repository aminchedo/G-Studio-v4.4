/**
 * ToolValidator - Input validation for MCP tools
 * 
 * Purpose: Standardize and strengthen tool input validation
 * - Type checking
 * - Required field validation
 * - Format validation
 * - Range validation
 * 
 * Usage: Validate tool arguments before execution
 */

import { ErrorHandler, ErrorCode } from '../errorHandler';

export interface ValidationRule {
  field: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Record<string, any>;
}

export class ToolValidator {
  /**
   * Validate tool arguments against rules
   */
  static validate(
    args: Record<string, any>,
    rules: ValidationRule[]
  ): ValidationResult {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    for (const rule of rules) {
      const value = args[rule.field];
      const fieldErrors = this.validateField(rule.field, value, rule);
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      } else {
        // Sanitize and add to result
        sanitized[rule.field] = this.sanitizeValue(value, rule);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined,
    };
  }

  /**
   * Validate a single field
   */
  private static validateField(
    field: string,
    value: any,
    rule: ValidationRule
  ): string[] {
    const errors: string[] = [];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      return errors; // Stop validation if required field is missing
    }

    // Skip further validation if value is not provided and not required
    if (value === undefined || value === null) {
      return errors;
    }

    // Type check
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${field} must be of type ${rule.type}, got ${actualType}`);
        return errors; // Stop validation if type is wrong
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} must be at most ${rule.max}`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : `${field} validation failed`);
      }
    }

    return errors;
  }

  /**
   * Sanitize value based on type
   */
  private static sanitizeValue(value: any, rule: ValidationRule): any {
    if (value === undefined || value === null) {
      return value;
    }

    // Trim strings
    if (typeof value === 'string') {
      return value.trim();
    }

    return value;
  }

  /**
   * Common validation rules for file paths
   */
  static filePathRules(fieldName: string = 'path', required: boolean = true): ValidationRule {
    return {
      field: fieldName,
      type: 'string',
      required,
      minLength: 1,
      maxLength: 500,
      pattern: /^[a-zA-Z0-9_\-./\\]+$/,
      custom: (value: string) => {
        // Prevent path traversal
        if (value.includes('..')) {
          return 'Path cannot contain ".."';
        }
        // Prevent absolute paths
        if (value.startsWith('/') || /^[a-zA-Z]:/.test(value)) {
          return 'Path must be relative';
        }
        return true;
      },
    };
  }

  /**
   * Common validation rules for file content
   */
  static fileContentRules(fieldName: string = 'content', required: boolean = true): ValidationRule {
    return {
      field: fieldName,
      type: 'string',
      required,
      maxLength: 1000000, // 1MB max
    };
  }

  /**
   * Common validation rules for search queries
   */
  static searchQueryRules(fieldName: string = 'query', required: boolean = true): ValidationRule {
    return {
      field: fieldName,
      type: 'string',
      required,
      minLength: 1,
      maxLength: 1000,
    };
  }

  /**
   * Common validation rules for line numbers
   */
  static lineNumberRules(fieldName: string = 'line', required: boolean = true): ValidationRule {
    return {
      field: fieldName,
      type: 'number',
      required,
      min: 1,
      max: 1000000,
    };
  }

  /**
   * Validate and return result or throw error
   */
  static validateOrThrow(
    args: Record<string, any>,
    rules: ValidationRule[]
  ): Record<string, any> {
    const result = this.validate(args, rules);
    
    if (!result.valid) {
      const error = new Error(result.errors.join('; '));
      throw ErrorHandler.handle(error, 'TOOL_EXECUTION', {
        code: ErrorCode.TOOL_INVALID_ARGS,
        context: { errors: result.errors },
      });
    }

    return result.sanitized!;
  }
}
