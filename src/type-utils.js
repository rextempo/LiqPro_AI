"use strict";
/**
 * Type utilities for improved TypeScript type safety
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.typedValues = exports.typedEntries = exports.typedKeys = exports.ensureAllDefined = exports.parseJSON = exports.createTypedRecord = exports.safeCast = exports.getTypedProperty = exports.isDate = exports.isBoolean = exports.isNumber = exports.isString = exports.isArrayOf = exports.isRecord = exports.assertNonNullable = void 0;
/**
 * Ensures that a value is not null or undefined
 * @param value The value to check
 * @param errorMessage Optional error message
 * @returns The non-null value
 * @throws Error if the value is null or undefined
 */
function assertNonNullable(value, errorMessage = 'Value is null or undefined') {
    if (value === null || value === undefined) {
        throw new Error(errorMessage);
    }
    return value;
}
exports.assertNonNullable = assertNonNullable;
/**
 * Type guard to check if a value is a Record (object)
 * @param value The value to check
 * @returns True if the value is a Record
 */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
exports.isRecord = isRecord;
/**
 * Type guard to check if a value is an array of a specific type
 * @param value The value to check
 * @param itemGuard Type guard function for array items
 * @returns True if the value is an array of the specified type
 */
function isArrayOf(value, itemGuard) {
    return Array.isArray(value) && value.every(item => itemGuard(item));
}
exports.isArrayOf = isArrayOf;
/**
 * Type guard to check if a value is a string
 * @param value The value to check
 * @returns True if the value is a string
 */
function isString(value) {
    return typeof value === 'string';
}
exports.isString = isString;
/**
 * Type guard to check if a value is a number
 * @param value The value to check
 * @returns True if the value is a number
 */
function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}
exports.isNumber = isNumber;
/**
 * Type guard to check if a value is a boolean
 * @param value The value to check
 * @returns True if the value is a boolean
 */
function isBoolean(value) {
    return typeof value === 'boolean';
}
exports.isBoolean = isBoolean;
/**
 * Type guard to check if a value is a Date
 * @param value The value to check
 * @returns True if the value is a Date
 */
function isDate(value) {
    return value instanceof Date && !isNaN(value.getTime());
}
exports.isDate = isDate;
/**
 * Safely access a property of an object with type checking
 * @param obj The object to access
 * @param key The property key
 * @param typeGuard Type guard function for the property value
 * @returns The property value if it exists and passes the type guard, undefined otherwise
 */
function getTypedProperty(obj, key, typeGuard) {
    if (isRecord(obj) && key in obj) {
        const value = obj[key];
        if (typeGuard(value)) {
            return value;
        }
    }
    return undefined;
}
exports.getTypedProperty = getTypedProperty;
/**
 * Safely cast a value to a specific type
 * @param value The value to cast
 * @param typeGuard Type guard function for the value
 * @param defaultValue Optional default value to return if the cast fails
 * @returns The cast value or the default value
 */
function safeCast(value, typeGuard, defaultValue) {
    return typeGuard(value) ? value : defaultValue;
}
exports.safeCast = safeCast;
/**
 * Create a type-safe record from an object with unknown properties
 * @param obj The object to convert
 * @param keyGuard Type guard function for the keys
 * @param valueGuard Type guard function for the values
 * @returns A type-safe record
 */
function createTypedRecord(obj, keyGuard, valueGuard) {
    const result = {};
    if (isRecord(obj)) {
        for (const [key, value] of Object.entries(obj)) {
            if (keyGuard(key) && valueGuard(value)) {
                result[key] = value;
            }
        }
    }
    return result;
}
exports.createTypedRecord = createTypedRecord;
/**
 * Parse JSON with type checking
 * @param json The JSON string to parse
 * @param typeGuard Type guard function for the parsed value
 * @returns The parsed value if it passes the type guard, undefined otherwise
 */
function parseJSON(json, typeGuard) {
    try {
        const parsed = JSON.parse(json);
        return typeGuard(parsed) ? parsed : undefined;
    }
    catch (error) {
        return undefined;
    }
}
exports.parseJSON = parseJSON;
/**
 * Ensure that all properties of an object are defined
 * @param obj The object to check
 * @returns A new object with all properties defined
 * @throws Error if any property is undefined
 */
function ensureAllDefined(obj, errorMessagePrefix = 'Missing required property:') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined || value === null) {
            throw new Error(`${errorMessagePrefix} ${key}`);
        }
        result[key] = value;
    }
    return result;
}
exports.ensureAllDefined = ensureAllDefined;
/**
 * Type-safe version of Object.keys
 * @param obj The object to get keys from
 * @returns An array of typed keys
 */
function typedKeys(obj) {
    return Object.keys(obj);
}
exports.typedKeys = typedKeys;
/**
 * Type-safe version of Object.entries
 * @param obj The object to get entries from
 * @returns An array of typed entries
 */
function typedEntries(obj) {
    return Object.entries(obj);
}
exports.typedEntries = typedEntries;
/**
 * Type-safe version of Object.values
 * @param obj The object to get values from
 * @returns An array of typed values
 */
function typedValues(obj) {
    return Object.values(obj);
}
exports.typedValues = typedValues;
