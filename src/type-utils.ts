/**
 * Type utilities for improved TypeScript type safety
 */

/**
 * Ensures that a value is not null or undefined
 * @param value The value to check
 * @param errorMessage Optional error message
 * @returns The non-null value
 * @throws Error if the value is null or undefined
 */
export function assertNonNullable<T>(
  value: T,
  errorMessage = 'Value is null or undefined'
): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
  return value as NonNullable<T>;
}

/**
 * Type guard to check if a value is a Record (object)
 * @param value The value to check
 * @returns True if the value is a Record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is an array of a specific type
 * @param value The value to check
 * @param itemGuard Type guard function for array items
 * @returns True if the value is an array of the specified type
 */
export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(item => itemGuard(item));
}

/**
 * Type guard to check if a value is a string
 * @param value The value to check
 * @returns True if the value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 * @param value The value to check
 * @returns True if the value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 * @param value The value to check
 * @returns True if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is a Date
 * @param value The value to check
 * @returns True if the value is a Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Safely access a property of an object with type checking
 * @param obj The object to access
 * @param key The property key
 * @param typeGuard Type guard function for the property value
 * @returns The property value if it exists and passes the type guard, undefined otherwise
 */
export function getTypedProperty<T>(
  obj: unknown,
  key: string,
  typeGuard: (value: unknown) => value is T
): T | undefined {
  if (isRecord(obj) && key in obj) {
    const value = obj[key];
    if (typeGuard(value)) {
      return value;
    }
  }
  return undefined;
}

/**
 * Safely cast a value to a specific type
 * @param value The value to cast
 * @param typeGuard Type guard function for the value
 * @param defaultValue Optional default value to return if the cast fails
 * @returns The cast value or the default value
 */
export function safeCast<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  defaultValue?: T
): T | undefined {
  return typeGuard(value) ? value : defaultValue;
}

/**
 * Create a type-safe record from an object with unknown properties
 * @param obj The object to convert
 * @param keyGuard Type guard function for the keys
 * @param valueGuard Type guard function for the values
 * @returns A type-safe record
 */
export function createTypedRecord<K extends string, V>(
  obj: unknown,
  keyGuard: (key: string) => key is K,
  valueGuard: (value: unknown) => value is V
): Record<K, V> {
  const result: Record<string, V> = {};
  
  if (isRecord(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      if (keyGuard(key) && valueGuard(value)) {
        result[key] = value;
      }
    }
  }
  
  return result as Record<K, V>;
}

/**
 * Parse JSON with type checking
 * @param json The JSON string to parse
 * @param typeGuard Type guard function for the parsed value
 * @returns The parsed value if it passes the type guard, undefined otherwise
 */
export function parseJSON<T>(
  json: string,
  typeGuard: (value: unknown) => value is T
): T | undefined {
  try {
    const parsed = JSON.parse(json);
    return typeGuard(parsed) ? parsed : undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Ensure that all properties of an object are defined
 * @param obj The object to check
 * @returns A new object with all properties defined
 * @throws Error if any property is undefined
 */
export function ensureAllDefined<T extends Record<string, unknown>>(
  obj: T,
  errorMessagePrefix = 'Missing required property:'
): { [K in keyof T]: NonNullable<T[K]> } {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      throw new Error(`${errorMessagePrefix} ${key}`);
    }
    result[key] = value;
  }
  
  return result as { [K in keyof T]: NonNullable<T[K]> };
}

/**
 * Type-safe version of Object.keys
 * @param obj The object to get keys from
 * @returns An array of typed keys
 */
export function typedKeys<T extends Record<string, unknown>>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

/**
 * Type-safe version of Object.entries
 * @param obj The object to get entries from
 * @returns An array of typed entries
 */
export function typedEntries<T extends Record<string, unknown>>(
  obj: T
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

/**
 * Type-safe version of Object.values
 * @param obj The object to get values from
 * @returns An array of typed values
 */
export function typedValues<T extends Record<string, unknown>>(obj: T): Array<T[keyof T]> {
  return Object.values(obj) as Array<T[keyof T]>;
} 