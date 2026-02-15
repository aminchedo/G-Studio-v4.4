/**
 * Utility Tools Service - Free tools that don't require API
 */

import { ToolValidator } from './security/toolValidator';

export interface UtilityToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class UtilityTools {
  static calculate(expression: string): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ expression }, [
        {
          field: 'expression',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 1000,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const expr = validated.sanitized!['expression'];

      // Sanitize expression for safety
      const sanitized = expr.replace(/[^0-9+\-*/().\s,sqrt|sin|cos|tan|log|ln|pi|e]/gi, '');
      
      if (sanitized.length === 0) {
        return {
          success: false,
          message: 'Expression contains no valid mathematical operations',
          error: 'INVALID_EXPRESSION',
        };
      }

      // Replace common functions
      let processed = sanitized
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/pi/g, 'Math.PI')
        .replace(/e\b/g, 'Math.E');
      
      // Evaluate safely
      const result = Function(`"use strict"; return (${processed})`)();
      
      if (!isFinite(result)) {
        return {
          success: false,
          message: 'Calculation resulted in infinity or NaN',
          error: 'INVALID_RESULT',
        };
      }

      return {
        success: true,
        message: `Calculation result: ${result}`,
        data: { expression: expr, result }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error calculating: ${error.message}`,
        error: error.message
      };
    }
  }

  static getCurrentTime(timezone?: string, format: string = 'readable'): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ format, timezone }, [
        {
          field: 'format',
          type: 'string',
          required: false,
          enum: ['iso', 'unix', 'readable'],
        },
        {
          field: 'timezone',
          type: 'string',
          required: false,
          maxLength: 100,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const fmt = validated.sanitized!['format'] || 'readable';
      const now = new Date();
      let result: any = {};

      switch (fmt) {
        case 'iso':
          result.value = now.toISOString();
          break;
        case 'unix':
          result.value = Math.floor(now.getTime() / 1000);
          break;
        case 'readable':
        default:
          result.value = now.toLocaleString();
      }

      result.timestamp = now.getTime();
      result.year = now.getFullYear();
      result.month = now.getMonth() + 1;
      result.day = now.getDate();
      result.hour = now.getHours();
      result.minute = now.getMinutes();
      result.second = now.getSeconds();
      result.format = fmt;

      return {
        success: true,
        message: `Current time: ${result.value}`,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error getting time: ${error.message}`,
        error: error.message
      };
    }
  }

  static generateUUID(version: number = 4, count: number = 1): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ version, count }, [
        {
          field: 'version',
          type: 'number',
          required: false,
          enum: [1, 4],
        },
        {
          field: 'count',
          type: 'number',
          required: false,
          min: 1,
          max: 100,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const ver = validated.sanitized!['version'] || 4;
      const cnt = validated.sanitized!['count'] || 1;

      const generate = () => {
        if (ver === 4) {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        } else {
          // Simple UUID v1-like (time-based)
          const timestamp = Date.now();
          return `${timestamp.toString(16)}-xxxx-1xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
      };

      const uuids = Array.from({ length: cnt }, () => generate());

      return {
        success: true,
        message: `Generated ${cnt} UUID(s) version ${ver}`,
        data: { uuids, count: cnt, version: ver }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error generating UUID: ${error.message}`,
        error: error.message
      };
    }
  }

  static hashText(text: string, algorithm: string = 'sha256'): Promise<UtilityToolResult> {
    try {
      // Validate input
      const validated = ToolValidator.validate({ text, algorithm }, [
        {
          field: 'text',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100000,
        },
        {
          field: 'algorithm',
          type: 'string',
          required: false,
          enum: ['md5', 'sha1', 'sha256', 'sha384', 'sha512'],
        },
      ]);

      if (!validated.valid) {
        return Promise.resolve({
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        });
      }

      const txt = validated.sanitized!['text'];
      const algo = (validated.sanitized!['algorithm'] || 'sha256').toLowerCase();

      // Use Web Crypto API for hashing
      const encoder = new TextEncoder();
      const data = encoder.encode(txt);

      return crypto.subtle.digest(algo.toUpperCase().replace('SHA', 'SHA-'), data)
        .then(hashBuffer => {
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          return {
            success: true,
            message: `${algo.toUpperCase()} hash generated`,
            data: { text: txt, algorithm: algo, hash: hashHex, length: hashHex.length }
          };
        })
        .catch(() => {
          // Fallback for MD5 (not in Web Crypto API)
          if (algo === 'md5') {
            // Simple MD5-like hash (not cryptographically secure)
            let hash = 0;
            for (let i = 0; i < txt.length; i++) {
              const char = txt.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            const md5Hash = Math.abs(hash).toString(16).padStart(32, '0');
            return {
              success: true,
              message: `MD5 hash generated (simple version)`,
              data: { text: txt, algorithm: 'md5', hash: md5Hash, length: md5Hash.length }
            };
          }
          throw new Error(`Algorithm ${algo} not supported`);
        });
    } catch (error: any) {
      return Promise.resolve({
        success: false,
        message: `Error hashing: ${error.message}`,
        error: error.message
      });
    }
  }

  static base64Encode(text: string): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ text }, [
        {
          field: 'text',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100000,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const txt = validated.sanitized!['text'];
      const encoded = btoa(unescape(encodeURIComponent(txt)));
      
      return {
        success: true,
        message: `Base64 encoded`,
        data: { original: txt, encoded, length: encoded.length }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error encoding: ${error.message}`,
        error: error.message
      };
    }
  }

  static base64Decode(text: string): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ text }, [
        {
          field: 'text',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 200000,
          pattern: /^[A-Za-z0-9+/=]+$/,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const txt = validated.sanitized!['text'];
      const decoded = decodeURIComponent(escape(atob(txt)));
      
      return {
        success: true,
        message: `Base64 decoded`,
        data: { encoded: txt, decoded, length: decoded.length }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error decoding: ${error.message}. Ensure input is valid Base64.`,
        error: error.message
      };
    }
  }

  static formatJSON(json: string, indent: number = 2): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ json, indent }, [
        {
          field: 'json',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100000,
        },
        {
          field: 'indent',
          type: 'number',
          required: false,
          min: 0,
          max: 10,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const jsonStr = validated.sanitized!['json'];
      const ind = validated.sanitized!['indent'] || 2;

      const parsed = JSON.parse(jsonStr);
      const formatted = JSON.stringify(parsed, null, ind);
      
      return {
        success: true,
        message: `JSON formatted successfully`,
        data: { formatted, valid: true, indent: ind, size: formatted.length }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Invalid JSON: ${error.message}`,
        error: error.message
      };
    }
  }

  static textTransform(text: string, operation: string = 'uppercase'): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ text, operation }, [
        {
          field: 'text',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100000,
        },
        {
          field: 'operation',
          type: 'string',
          required: false,
          enum: ['uppercase', 'lowercase', 'reverse', 'capitalize', 'title', 'trim', 'remove-spaces'],
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const txt = validated.sanitized!['text'];
      const op = (validated.sanitized!['operation'] || 'uppercase').toLowerCase();

      let transformed = '';
      switch (op) {
        case 'uppercase':
          transformed = txt.toUpperCase();
          break;
        case 'lowercase':
          transformed = txt.toLowerCase();
          break;
        case 'reverse':
          transformed = txt.split('').reverse().join('');
          break;
        case 'capitalize':
          transformed = txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
          break;
        case 'title':
          transformed = txt.replace(/\w\S*/g, (word: string) => 
            word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
          );
          break;
        case 'trim':
          transformed = txt.trim();
          break;
        case 'remove-spaces':
          transformed = txt.replace(/\s+/g, '');
          break;
        default:
          transformed = txt.toUpperCase();
      }

      return {
        success: true,
        message: `Text transformed: ${op}`,
        data: { original: txt, transformed, operation: op, originalLength: txt.length, transformedLength: transformed.length }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error transforming: ${error.message}`,
        error: error.message
      };
    }
  }

  static generateRandom(
    type: string = 'number',
    min: number = 0,
    max: number = 100,
    length: number = 10,
    includeSpecialChars: boolean = true
  ): UtilityToolResult {
    try {
      // Validate inputs
      const validated = ToolValidator.validate({ type, min, max, length, includeSpecialChars }, [
        {
          field: 'type',
          type: 'string',
          required: false,
          enum: ['number', 'string', 'password'],
        },
        {
          field: 'min',
          type: 'number',
          required: false,
        },
        {
          field: 'max',
          type: 'number',
          required: false,
        },
        {
          field: 'length',
          type: 'number',
          required: false,
          min: 1,
          max: 10000,
        },
        {
          field: 'includeSpecialChars',
          type: 'boolean',
          required: false,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const t = validated.sanitized!['type'] || 'number';
      const minVal = validated.sanitized!['min'] ?? 0;
      const maxVal = validated.sanitized!['max'] ?? 100;
      const len = validated.sanitized!['length'] ?? 10;
      const includeSpec = validated.sanitized!['includeSpecialChars'] ?? true;

      // Additional business logic validation
      if (t === 'number' && minVal > maxVal) {
        return {
          success: false,
          message: 'Error: min value cannot be greater than max value',
          error: 'INVALID_RANGE'
        };
      }

      let result: any = {};

      if (t === 'number') {
        const randomNum = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        result.value = randomNum;
        result.min = minVal;
        result.max = maxVal;
      } else if (t === 'string' || t === 'password') {
        const chars = includeSpec
          ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
          : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        result.value = Array.from({ length: len }, () =>
          chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
        result.length = len;
        result.includeSpecialChars = includeSpec;
      }

      return {
        success: true,
        message: `Generated random ${t}`,
        data: { ...result, type: t }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error generating random: ${error.message}`,
        error: error.message
      };
    }
  }

  static colorConverter(color: string, toFormat: string = 'hex'): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ color, toFormat }, [
        {
          field: 'color',
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 50,
        },
        {
          field: 'toFormat',
          type: 'string',
          required: false,
          enum: ['hex', 'rgb', 'hsl'],
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const col = validated.sanitized!['color'];
      const fmt = validated.sanitized!['toFormat'] || 'hex';

      // Parse input color
      let r = 0, g = 0, b = 0;

      if (col.startsWith('#')) {
        // Hex
        const hex = col.slice(1);
        if (hex.length !== 6 && hex.length !== 3) {
          return {
            success: false,
            message: 'Invalid hex color format. Use #RRGGBB or #RGB',
            error: 'INVALID_COLOR_FORMAT',
          };
        }
        const fullHex = hex.length === 3 ? hex.split('').map((c: string) => c + c).join('') : hex;
        r = parseInt(fullHex.slice(0, 2), 16);
        g = parseInt(fullHex.slice(2, 4), 16);
        b = parseInt(fullHex.slice(4, 6), 16);
      } else if (col.startsWith('rgb')) {
        // RGB
        const match = col.match(/\d+/g);
        if (!match || match.length < 3) {
          return {
            success: false,
            message: 'Invalid RGB color format. Use rgb(r, g, b)',
            error: 'INVALID_COLOR_FORMAT',
          };
        }
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      } else {
        return {
          success: false,
          message: 'Unsupported color format. Use hex (#RRGGBB) or rgb(r, g, b)',
          error: 'UNSUPPORTED_FORMAT',
        };
      }

      // Validate RGB values
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        return {
          success: false,
          message: 'RGB values must be between 0 and 255',
          error: 'INVALID_RGB_VALUES',
        };
      }

      let converted = '';
      if (fmt === 'hex') {
        converted = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      } else if (fmt === 'rgb') {
        converted = `rgb(${r}, ${g}, ${b})`;
      } else if (fmt === 'hsl') {
        // Convert RGB to HSL
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
            case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
            case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
          }
        }

        converted = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      }

      return {
        success: true,
        message: `Color converted to ${fmt}`,
        data: { original: col, converted, format: fmt, rgb: { r, g, b } }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error converting color: ${error.message}`,
        error: error.message
      };
    }
  }

  static unitConverter(value: number, fromUnit: string, toUnit: string): UtilityToolResult {
    try {
      // Validate input
      const validated = ToolValidator.validate({ value, fromUnit, toUnit }, [
        {
          field: 'value',
          type: 'number',
          required: true,
        },
        {
          field: 'fromUnit',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 20,
        },
        {
          field: 'toUnit',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 20,
        },
      ]);

      if (!validated.valid) {
        return {
          success: false,
          message: `Validation error: ${validated.errors.join('; ')}`,
          error: 'VALIDATION_ERROR',
        };
      }

      const val = validated.sanitized!['value'];
      const from = validated.sanitized!['fromUnit'].toLowerCase();
      const to = validated.sanitized!['toUnit'].toLowerCase();

      // Conversion factors
      const conversions: Record<string, Record<string, number>> = {
        length: {
          'km': 1000, 'm': 1, 'cm': 0.01, 'mm': 0.001,
          'mi': 1609.34, 'ft': 0.3048, 'in': 0.0254, 'yd': 0.9144
        },
        weight: {
          'kg': 1, 'g': 0.001, 'mg': 0.000001,
          'lb': 0.453592, 'oz': 0.0283495, 'ton': 1000
        },
        temperature: {
          'celsius': 1, 'fahrenheit': 1, 'kelvin': 1
        }
      };

      // Determine category
      let category = 'length';
      if (['kg', 'g', 'mg', 'lb', 'oz', 'ton'].includes(from)) {
        category = 'weight';
      } else if (['celsius', 'fahrenheit', 'kelvin'].includes(from)) {
        category = 'temperature';
      }

      // Validate units are in same category
      if (category !== 'temperature') {
        const categoryData = conversions[category];
        if (!categoryData || !categoryData[from] || !categoryData[to]) {
          return {
            success: false,
            message: `Unsupported unit conversion from '${from}' to '${to}'. Units must be in the same category.`,
            error: 'UNSUPPORTED_UNITS',
          };
        }
      }

      let result = 0;

      if (category === 'temperature') {
        // Temperature conversion
        let celsius = val;

        if (from === 'fahrenheit') celsius = (val - 32) * 5 / 9;
        else if (from === 'kelvin') celsius = val - 273.15;

        if (to === 'fahrenheit') result = celsius * 9 / 5 + 32;
        else if (to === 'kelvin') result = celsius + 273.15;
        else result = celsius;
      } else {
        // Length or weight conversion
        const categoryData = conversions[category];
        if (!categoryData) {
          return {
            success: false,
            message: `Invalid category: ${category}`,
            error: 'INVALID_CATEGORY',
          };
        }
        const fromFactor = categoryData[from];
        const toFactor = categoryData[to];
        if (fromFactor === undefined || toFactor === undefined) {
          return {
            success: false,
            message: `Invalid units: ${from} or ${to}`,
            error: 'INVALID_UNITS',
          };
        }
        result = (val * fromFactor) / toFactor;
      }

      return {
        success: true,
        message: `${val} ${from} = ${result.toFixed(4)} ${to}`,
        data: { value: val, fromUnit: from, toUnit: to, result: parseFloat(result.toFixed(4)), category }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error converting: ${error.message}`,
        error: error.message
      };
    }
  }
}
