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
export declare function assertNonNullable<T>(value: T, errorMessage?: string): NonNullable<T>;
/**
 * Type guard to check if a value is a Record (object)
 * @param value The value to check
 * @returns True if the value is a Record
 */
export declare function isRecord(value: unknown): value is Record<string, unknown>;
/**
 * Type guard to check if a value is an array of a specific type
 * @param value The value to check
 * @param itemGuard Type guard function for array items
 * @returns True if the value is an array of the specified type
 */
export declare function isArrayOf<T>(value: unknown, itemGuard: (item: unknown) => item is T): value is T[];
/**
 * Type guard to check if a value is a string
 * @param value The value to check
 * @returns True if the value is a string
 */
export declare function isString(value: unknown): value is string;
/**
 * Type guard to check if a value is a number
 * @param value The value to check
 * @returns True if the value is a number
 */
export declare function isNumber(value: unknown): value is number;
/**
 * Type guard to check if a value is a boolean
 * @param value The value to check
 * @returns True if the value is a boolean
 */
export declare function isBoolean(value: unknown): value is boolean;
/**
 * Type guard to check if a value is a Date
 * @param value The value to check
 * @returns True if the value is a Date
 */
export declare function isDate(value: unknown): value is Date;
/**
 * Safely access a property of an object with type checking
 * @param obj The object to access
 * @param key The property key
 * @param typeGuard Type guard function for the property value
 * @returns The property value if it exists and passes the type guard, undefined otherwise
 */
export declare function getTypedProperty<T>(obj: unknown, key: string, typeGuard: (value: unknown) => value is T): T | undefined;
/**
 * Safely cast a value to a specific type
 * @param value The value to cast
 * @param typeGuard Type guard function for the value
 * @param defaultValue Optional default value to return if the cast fails
 * @returns The cast value or the default value
 */
export declare function safeCast<T>(value: unknown, typeGuard: (value: unknown) => value is T, defaultValue?: T): T | undefined;
/**
 * Create a type-safe record from an object with unknown properties
 * @param obj The object to convert
 * @param keyGuard Type guard function for the keys
 * @param valueGuard Type guard function for the values
 * @returns A type-safe record
 */
export declare function createTypedRecord<K extends string, V>(obj: unknown, keyGuard: (key: string) => key is K, valueGuard: (value: unknown) => value is V): Record<K, V>;
/**
 * Parse JSON with type checking
 * @param json The JSON string to parse
 * @param typeGuard Type guard function for the parsed value
 * @returns The parsed value if it passes the type guard, undefined otherwise
 */
export declare function parseJSON<T>(json: string, typeGuard: (value: unknown) => value is T): T | undefined;
/**
 * Ensure that all properties of an object are defined
 * @param obj The object to check
 * @returns A new object with all properties defined
 * @throws Error if any property is undefined
 */
export declare function ensureAllDefined<T extends Record<string, unknown>>(obj: T, errorMessagePrefix?: string): {
    [K in keyof T]: NonNullable<T[K]>;
};
/**
 * Type-safe version of Object.keys
 * @param obj The object to get keys from
 * @returns An array of typed keys
 */
export declare function typedKeys<T extends Record<string, unknown>>(obj: T): Array<keyof T>;
/**
 * Type-safe version of Object.entries
 * @param obj The object to get entries from
 * @returns An array of typed entries
 */
export declare function typedEntries<T extends Record<string, unknown>>(obj: T): Array<[keyof T, T[keyof T]]>;
/**
 * Type-safe version of Object.values
 * @param obj The object to get values from
 * @returns An array of typed values
 */
export declare function typedValues<T extends Record<string, unknown>>(obj: T): Array<T[keyof T]>;
//# sourceMappingURL=type-utils.d.ts.map