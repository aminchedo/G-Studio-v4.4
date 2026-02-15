import { ToolValidator } from '@/services/toolValidator';

describe('ToolValidator', () => {
  describe('validate', () => {
    it('should validate required fields', () => {
      const result = ToolValidator.validate(
        {},
        [{ field: 'name', type: 'string', required: true }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should validate type checking', () => {
      const result = ToolValidator.validate(
        { age: 'not a number' },
        [{ field: 'age', type: 'number', required: true }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be of type number');
    });

    it('should validate string length', () => {
      const result = ToolValidator.validate(
        { name: 'ab' },
        [{ field: 'name', type: 'string', minLength: 3, maxLength: 10 }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at least 3 characters');
    });

    it('should validate number range', () => {
      const result = ToolValidator.validate(
        { age: 150 },
        [{ field: 'age', type: 'number', min: 0, max: 120 }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at most 120');
    });

    it('should validate pattern', () => {
      const result = ToolValidator.validate(
        { email: 'invalid' },
        [{ field: 'email', type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('format is invalid');
    });

    it('should validate enum values', () => {
      const result = ToolValidator.validate(
        { status: 'invalid' },
        [{ field: 'status', enum: ['active', 'inactive', 'pending'] }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be one of');
    });

    it('should validate custom rules', () => {
      const result = ToolValidator.validate(
        { password: 'weak' },
        [{
          field: 'password',
          custom: (value) => value.length >= 8 || 'Password must be at least 8 characters'
        }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at least 8 characters');
    });

    it('should pass valid data', () => {
      const result = ToolValidator.validate(
        { name: 'John', age: 30 },
        [
          { field: 'name', type: 'string', required: true, minLength: 2 },
          { field: 'age', type: 'number', required: true, min: 0, max: 120 },
        ]
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toEqual({ name: 'John', age: 30 });
    });

    it('should sanitize string values', () => {
      const result = ToolValidator.validate(
        { name: '  John  ' },
        [{ field: 'name', type: 'string' }]
      );

      expect(result.valid).toBe(true);
      expect(result.sanitized?.name).toBe('John');
    });

    it('should allow optional fields', () => {
      const result = ToolValidator.validate(
        { name: 'John' },
        [
          { field: 'name', type: 'string', required: true },
          { field: 'email', type: 'string', required: false },
        ]
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('filePathRules', () => {
    it('should validate file paths', () => {
      const rule = ToolValidator.filePathRules();
      const result = ToolValidator.validate(
        { path: 'src/components/Button.tsx' },
        [rule]
      );

      expect(result.valid).toBe(true);
    });

    it('should reject path traversal', () => {
      const rule = ToolValidator.filePathRules();
      const result = ToolValidator.validate(
        { path: '../../../etc/passwd' },
        [rule]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cannot contain ".."');
    });

    it('should reject absolute paths', () => {
      const rule = ToolValidator.filePathRules();
      const result = ToolValidator.validate(
        { path: '/etc/passwd' },
        [rule]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be relative');
    });

    it('should reject Windows absolute paths', () => {
      const rule = ToolValidator.filePathRules();
      const result = ToolValidator.validate(
        { path: 'C:\\Windows\\System32' },
        [rule]
      );

      expect(result.valid).toBe(false);
      // Windows paths with backslashes fail the pattern check first
      expect(result.errors[0]).toContain('format is invalid');
    });
  });

  describe('fileContentRules', () => {
    it('should validate file content', () => {
      const rule = ToolValidator.fileContentRules();
      const result = ToolValidator.validate(
        { content: 'console.log("Hello");' },
        [rule]
      );

      expect(result.valid).toBe(true);
    });

    it('should reject content that is too large', () => {
      const rule = ToolValidator.fileContentRules();
      const largeContent = 'x'.repeat(1000001);
      const result = ToolValidator.validate(
        { content: largeContent },
        [rule]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at most 1000000');
    });
  });

  describe('searchQueryRules', () => {
    it('should validate search queries', () => {
      const rule = ToolValidator.searchQueryRules();
      const result = ToolValidator.validate(
        { query: 'function' },
        [rule]
      );

      expect(result.valid).toBe(true);
    });

    it('should reject empty queries', () => {
      const rule = ToolValidator.searchQueryRules();
      const result = ToolValidator.validate(
        { query: '' },
        [rule]
      );

      expect(result.valid).toBe(false);
      // Empty string is caught by required check first
      expect(result.errors[0]).toContain('is required');
    });
  });

  describe('lineNumberRules', () => {
    it('should validate line numbers', () => {
      const rule = ToolValidator.lineNumberRules();
      const result = ToolValidator.validate(
        { line: 42 },
        [rule]
      );

      expect(result.valid).toBe(true);
    });

    it('should reject invalid line numbers', () => {
      const rule = ToolValidator.lineNumberRules();
      const result = ToolValidator.validate(
        { line: 0 },
        [rule]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at least 1');
    });
  });

  describe('validateOrThrow', () => {
    it('should return sanitized data on success', () => {
      const sanitized = ToolValidator.validateOrThrow(
        { name: '  John  ' },
        [{ field: 'name', type: 'string', required: true }]
      );

      expect(sanitized.name).toBe('John');
    });

    it('should throw on validation failure', () => {
      expect(() => {
        ToolValidator.validateOrThrow(
          {},
          [{ field: 'name', type: 'string', required: true }]
        );
      }).toThrow();
    });
  });

  describe('array type validation', () => {
    it('should validate array type', () => {
      const result = ToolValidator.validate(
        { tags: ['tag1', 'tag2'] },
        [{ field: 'tags', type: 'array', required: true }]
      );

      expect(result.valid).toBe(true);
    });

    it('should reject non-array when array expected', () => {
      const result = ToolValidator.validate(
        { tags: 'not an array' },
        [{ field: 'tags', type: 'array', required: true }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be of type array');
    });
  });

  describe('object type validation', () => {
    it('should validate object type', () => {
      const result = ToolValidator.validate(
        { config: { key: 'value' } },
        [{ field: 'config', type: 'object', required: true }]
      );

      expect(result.valid).toBe(true);
    });

    it('should reject non-object when object expected', () => {
      const result = ToolValidator.validate(
        { config: 'not an object' },
        [{ field: 'config', type: 'object', required: true }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be of type object');
    });
  });

  describe('boolean type validation', () => {
    it('should validate boolean type', () => {
      const result = ToolValidator.validate(
        { active: true },
        [{ field: 'active', type: 'boolean', required: true }]
      );

      expect(result.valid).toBe(true);
    });

    it('should reject non-boolean when boolean expected', () => {
      const result = ToolValidator.validate(
        { active: 'yes' },
        [{ field: 'active', type: 'boolean', required: true }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be of type boolean');
    });
  });
});
