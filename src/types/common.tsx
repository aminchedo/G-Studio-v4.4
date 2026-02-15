/**
 * Common Type Definitions
 * Copied from root `types/common.ts` for migration to `src/types/`
 */

/**
 * Generic JSON value type
 */
export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONValue[] 
  | { [key: string]: JSONValue };

/**
 * Generic object type with string keys
 */
export type StringRecord = Record<string, string>;

/**
 * Generic object type with any JSON value
 */
export type JSONRecord = Record<string, JSONValue>;

/**
 * Function that accepts any arguments
 */
export type AnyFunction = (...args: any[]) => any;

/**
 * Async function that accepts any arguments
 */
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

/**
 * Error with additional properties
 */
export interface ExtendedError extends Error {
  code?: string | number;
  status?: number;
  statusCode?: number;
  response?: {
    status?: number;
    statusText?: string;
    data?: any;
  };
  [key: string]: any;
}

/**
 * Console log arguments
 */
export type ConsoleArgs = Array<string | number | boolean | object | null | undefined>;

/**
 * Event handler type
 */
export type EventHandler<T = Event> = (event: T) => void;

/**
 * Callback function type
 */
export type Callback<T = void> = (error?: Error | null, result?: T) => void;

/**
 * Updater function type (for setState)
 */
export type Updater<T> = (prev: T) => T;

/**
 * Setter function type (for setState)
 */
export type Setter<T> = (value: T | Updater<T>) => void;

/**
 * Storage value type
 */
export type StorageValue = string | number | boolean | object | null;

/**
 * Configuration object type
 */
export interface ConfigObject {
  [key: string]: StorageValue | ConfigObject;
}

/**
 * API Response type
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Sort params
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter params
 */
export type FilterParams = Record<string, string | number | boolean | null>;

/**
 * Query params
 */
export interface QueryParams extends PaginationParams, Partial<SortParams> {
  filters?: FilterParams;
  search?: string;
}

/**
 * Type guard for checking if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a function
 */
export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === 'function';
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for checking if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard for checking if error is ExtendedError
 */
export function isExtendedError(error: unknown): error is ExtendedError {
  return error instanceof Error;
}

/**
 * Safe JSON parse with type checking
 */
export function safeJSONParse<T = JSONValue>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJSONStringify(
  value: unknown,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Require at least one property
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/**
 * Require exactly one property
 */
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, never>>;
  }[Keys];

/**
 * Mutable type (removes readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Optional keys
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Required keys
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Primitive types
 */
export type Primitive = string | number | boolean | null | undefined | symbol | bigint;

/**
 * Non-nullable type
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Awaited type (for promises)
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Constructor type
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Abstract constructor type
 */
export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;
