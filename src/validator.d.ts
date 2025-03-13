/**
 * Validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors?: string[];
}
/**
 * Validator utility
 */
export declare class Validator {
    /**
     * Validate a value is not empty
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static notEmpty(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is a string
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isString(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is a number
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isNumber(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is a boolean
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isBoolean(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is an array
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isArray(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is an object
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isObject(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is a valid Solana address
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isSolanaAddress(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is a valid timestamp
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isTimestamp(value: any, fieldName: string): ValidationResult;
    /**
     * Validate a value is within a range
     * @param value Value to validate
     * @param min Minimum value
     * @param max Maximum value
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static isInRange(value: number, min: number, max: number, fieldName: string): ValidationResult;
    /**
     * Validate a value has a minimum length
     * @param value Value to validate
     * @param minLength Minimum length
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static minLength(value: string, minLength: number, fieldName: string): ValidationResult;
    /**
     * Validate a value has a maximum length
     * @param value Value to validate
     * @param maxLength Maximum length
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static maxLength(value: string, maxLength: number, fieldName: string): ValidationResult;
    /**
     * Validate a value matches a regex pattern
     * @param value Value to validate
     * @param pattern Regex pattern
     * @param fieldName Field name for error message
     * @param errorMessage Custom error message
     * @returns Validation result
     */
    static matches(value: string, pattern: RegExp, fieldName: string, errorMessage?: string): ValidationResult;
    /**
     * Validate a request body
     * @param body Request body
     * @param schema Validation schema
     * @returns Validation result
     */
    static validateBody(body: any, schema: Record<string, (value: any) => ValidationResult>): ValidationResult;
    /**
     * Validate a request body and throw an error if invalid
     * @param body Request body
     * @param schema Validation schema
     */
    static validateBodyOrThrow(body: any, schema: Record<string, (value: any) => ValidationResult>): void;
    /**
     * Validate a request query
     * @param query Request query
     * @param schema Validation schema
     * @returns Validation result
     */
    static validateQuery(query: any, schema: Record<string, (value: any) => ValidationResult>): ValidationResult;
    /**
     * Validate a request query and throw an error if invalid
     * @param query Request query
     * @param schema Validation schema
     */
    static validateQueryOrThrow(query: any, schema: Record<string, (value: any) => ValidationResult>): void;
    /**
     * Validate a request params
     * @param params Request params
     * @param schema Validation schema
     * @returns Validation result
     */
    static validateParams(params: any, schema: Record<string, (value: any) => ValidationResult>): ValidationResult;
    /**
     * Validate a request params and throw an error if invalid
     * @param params Request params
     * @param schema Validation schema
     */
    static validateParamsOrThrow(params: any, schema: Record<string, (value: any) => ValidationResult>): void;
}
