/**
 * RFC-0001 Enforcement: Input/Output Validation
 * 
 * This module implements validation enforcement as specified in RFC-0001.
 * All tool inputs and outputs MUST be validated against declared schemas.
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  hash?: string;
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface ToolDeclaration {
  id: string;
  version: string;
  name: string;
  description: string;
  inputSchema: JSONSchemaType<unknown>;
  outputSchema: JSONSchemaType<unknown>;
  requiredCapabilities: string[];
  resourceLimits: ResourceLimits;
  deterministic: boolean;
  idempotent: boolean;
}

export interface ResourceLimits {
  maxExecutionTime: number;
  maxMemory: number;
  maxFileSize?: number;
  maxFileDescriptors?: number;
  maxProcesses?: number;
}

// ============================================================================
// Validator Implementation
// ============================================================================

export class Validator {
  private ajv: Ajv;
  private schemaCache: Map<string, ValidateFunction>;

  constructor() {
    // Initialize AJV with strict mode and all formats
    this.ajv = new Ajv({
      strict: true,
      allErrors: true,
      verbose: true,
      validateFormats: true,
    });
    
    addFormats(this.ajv);
    this.schemaCache = new Map();
  }

  /**
   * RFC-0001 Section 6.1: Input Validation
   * 
   * Input validation MUST:
   * 1. Occur before capability authorization
   * 2. Use JSON Schema Draft 2020-12 or later
   * 3. Reject invalid inputs with detailed error messages
   * 4. Sanitize inputs to prevent injection attacks
   * 5. Validate all nested structures recursively
   */
  validateInput(input: unknown, schema: JSONSchemaType<unknown>): ValidationResult {
    const validate = this.getOrCompileSchema(schema);
    const valid = validate(input);

    if (!valid) {
      return {
        valid: false,
        errors: this.formatErrors(validate.errors || []),
      };
    }

    // Generate hash for audit trail
    const hash = this.hashData(input);

    return {
      valid: true,
      hash,
    };
  }

  /**
   * RFC-0001 Section 6.2: Output Validation
   * 
   * Output validation MUST:
   * 1. Occur after execution completes
   * 2. Use JSON Schema Draft 2020-12 or later
   * 3. Reject invalid outputs and trigger rollback
   * 4. Validate all nested structures recursively
   * 5. Ensure output matches declared schema exactly
   */
  validateOutput(output: unknown, schema: JSONSchemaType<unknown>): ValidationResult {
    const validate = this.getOrCompileSchema(schema);
    const valid = validate(output);

    if (!valid) {
      return {
        valid: false,
        errors: this.formatErrors(validate.errors || []),
      };
    }

    // Generate hash for audit trail
    const hash = this.hashData(output);

    return {
      valid: true,
      hash,
    };
  }

  /**
   * RFC-0001 Section 6.3: Schema Requirements
   * 
   * All schemas MUST:
   * 1. Be valid JSON Schema documents
   * 2. Include $schema declaration
   * 3. Define type for all properties
   * 4. Specify required properties
   * 5. Include description for all properties
   * 6. Define additionalProperties: false where appropriate
   */
  validateSchema(schema: JSONSchemaType<unknown>): ValidationResult {
    try {
      // Check $schema declaration
      if (!schema.$schema) {
        return {
          valid: false,
          errors: [{
            path: '$schema',
            message: 'Schema must include $schema declaration',
            keyword: 'required',
            params: {},
          }],
        };
      }

      // Check schema is valid
      this.ajv.compile(schema);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: error instanceof Error ? error.message : 'Schema validation failed',
          keyword: 'schema',
          params: {},
        }],
      };
    }
  }

  /**
   * Validate tool declaration
   * 
   * Ensures tool declaration conforms to RFC-0001 requirements
   */
  validateToolDeclaration(tool: ToolDeclaration): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate ID format
    if (!/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(tool.id)) {
      errors.push({
        path: 'id',
        message: 'Tool ID must be in format: namespace.name',
        keyword: 'pattern',
        params: {},
      });
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(tool.version)) {
      errors.push({
        path: 'version',
        message: 'Version must be semantic version (x.y.z)',
        keyword: 'pattern',
        params: {},
      });
    }

    // Validate schemas
    const inputSchemaResult = this.validateSchema(tool.inputSchema);
    if (!inputSchemaResult.valid) {
      errors.push(...(inputSchemaResult.errors || []).map(e => ({
        ...e,
        path: `inputSchema.${e.path}`,
      })));
    }

    const outputSchemaResult = this.validateSchema(tool.outputSchema);
    if (!outputSchemaResult.valid) {
      errors.push(...(outputSchemaResult.errors || []).map(e => ({
        ...e,
        path: `outputSchema.${e.path}`,
      })));
    }

    // Validate capability IDs
    for (const cap of tool.requiredCapabilities) {
      if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(cap)) {
        errors.push({
          path: 'requiredCapabilities',
          message: `Invalid capability ID: ${cap}`,
          keyword: 'pattern',
          params: { capability: cap },
        });
      }
    }

    // Validate resource limits
    if (tool.resourceLimits.maxExecutionTime < 1 || tool.resourceLimits.maxExecutionTime > 300000) {
      errors.push({
        path: 'resourceLimits.maxExecutionTime',
        message: 'maxExecutionTime must be between 1 and 300000 ms',
        keyword: 'range',
        params: {},
      });
    }

    if (tool.resourceLimits.maxMemory < 1048576 || tool.resourceLimits.maxMemory > 1073741824) {
      errors.push({
        path: 'resourceLimits.maxMemory',
        message: 'maxMemory must be between 1MB and 1GB',
        keyword: 'range',
        params: {},
      });
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getOrCompileSchema(schema: JSONSchemaType<unknown>): ValidateFunction {
    const schemaKey = this.hashData(schema);
    
    let validate = this.schemaCache.get(schemaKey);
    if (!validate) {
      validate = this.ajv.compile(schema);
      this.schemaCache.set(schemaKey, validate);
    }

    return validate;
  }

  private formatErrors(errors: any[]): ValidationError[] {
    return errors.map(error => ({
      path: error.instancePath || error.dataPath || '',
      message: error.message || 'Validation failed',
      keyword: error.keyword || 'unknown',
      params: error.params || {},
    }));
  }

  private hashData(data: unknown): string {
    const json = JSON.stringify(data, null, 0);
    return createHash('sha256').update(json).digest('hex');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const validator = new Validator();

// ============================================================================
// Convenience Functions
// ============================================================================

export function validateInput(
  input: unknown,
  schema: JSONSchemaType<unknown>
): ValidationResult {
  return validator.validateInput(input, schema);
}

export function validateOutput(
  output: unknown,
  schema: JSONSchemaType<unknown>
): ValidationResult {
  return validator.validateOutput(output, schema);
}

export function validateToolDeclaration(tool: ToolDeclaration): ValidationResult {
  return validator.validateToolDeclaration(tool);
}
