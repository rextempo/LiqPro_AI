import { ErrorHandler } from './error-handler';
import { createLogger } from './logger';

const logger = createLogger('validator');

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
export class Validator {
  /**
   * Validate a value is not empty
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static notEmpty(value: any, fieldName: string): ValidationResult {
    if (value === undefined || value === null || value === '') {
      return {
        isValid: false,
        errors: [`${fieldName} is required`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is a string
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isString(value: any, fieldName: string): ValidationResult {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errors: [`${fieldName} must be a string`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is a number
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isNumber(value: any, fieldName: string): ValidationResult {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        isValid: false,
        errors: [`${fieldName} must be a number`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is a boolean
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isBoolean(value: any, fieldName: string): ValidationResult {
    if (typeof value !== 'boolean') {
      return {
        isValid: false,
        errors: [`${fieldName} must be a boolean`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is an array
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isArray(value: any, fieldName: string): ValidationResult {
    if (!Array.isArray(value)) {
      return {
        isValid: false,
        errors: [`${fieldName} must be an array`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is an object
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isObject(value: any, fieldName: string): ValidationResult {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        isValid: false,
        errors: [`${fieldName} must be an object`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is a valid Solana address
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isSolanaAddress(value: any, fieldName: string): ValidationResult {
    // First check if it's a string
    const stringResult = Validator.isString(value, fieldName);
    if (!stringResult.isValid) {
      return stringResult;
    }
    
    // Check if it's a valid base58 string of the right length
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(value)) {
      return {
        isValid: false,
        errors: [`${fieldName} must be a valid Solana address`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is a valid timestamp
   * @param value Value to validate
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isTimestamp(value: any, fieldName: string): ValidationResult {
    // First check if it's a number
    const numberResult = Validator.isNumber(value, fieldName);
    if (!numberResult.isValid) {
      return numberResult;
    }
    
    // Check if it's a valid timestamp (positive number)
    if (value < 0) {
      return {
        isValid: false,
        errors: [`${fieldName} must be a valid timestamp (positive number)`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value is within a range
   * @param value Value to validate
   * @param min Minimum value
   * @param max Maximum value
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static isInRange(value: number, min: number, max: number, fieldName: string): ValidationResult {
    // First check if it's a number
    const numberResult = Validator.isNumber(value, fieldName);
    if (!numberResult.isValid) {
      return numberResult;
    }
    
    // Check if it's within the range
    if (value < min || value > max) {
      return {
        isValid: false,
        errors: [`${fieldName} must be between ${min} and ${max}`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value has a minimum length
   * @param value Value to validate
   * @param minLength Minimum length
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static minLength(value: string, minLength: number, fieldName: string): ValidationResult {
    // First check if it's a string
    const stringResult = Validator.isString(value, fieldName);
    if (!stringResult.isValid) {
      return stringResult;
    }
    
    // Check if it's at least the minimum length
    if (value.length < minLength) {
      return {
        isValid: false,
        errors: [`${fieldName} must be at least ${minLength} characters long`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value has a maximum length
   * @param value Value to validate
   * @param maxLength Maximum length
   * @param fieldName Field name for error message
   * @returns Validation result
   */
  static maxLength(value: string, maxLength: number, fieldName: string): ValidationResult {
    // First check if it's a string
    const stringResult = Validator.isString(value, fieldName);
    if (!stringResult.isValid) {
      return stringResult;
    }
    
    // Check if it's at most the maximum length
    if (value.length > maxLength) {
      return {
        isValid: false,
        errors: [`${fieldName} must be at most ${maxLength} characters long`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a value matches a regex pattern
   * @param value Value to validate
   * @param pattern Regex pattern
   * @param fieldName Field name for error message
   * @param errorMessage Custom error message
   * @returns Validation result
   */
  static matches(value: string, pattern: RegExp, fieldName: string, errorMessage?: string): ValidationResult {
    // First check if it's a string
    const stringResult = Validator.isString(value, fieldName);
    if (!stringResult.isValid) {
      return stringResult;
    }
    
    // Check if it matches the pattern
    if (!pattern.test(value)) {
      return {
        isValid: false,
        errors: [errorMessage || `${fieldName} has an invalid format`]
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate a request body
   * @param body Request body
   * @param schema Validation schema
   * @returns Validation result
   */
  static validateBody(body: any, schema: Record<string, (value: any) => ValidationResult>): ValidationResult {
    const errors: string[] = [];
    
    // Check if body is an object
    if (typeof body !== 'object' || body === null) {
      errors.push('Request body must be an object');
      return { isValid: false, errors };
    }
    
    // Validate each field according to the schema
    for (const [field, validator] of Object.entries(schema)) {
      const result = validator(body[field]);
      if (!result.isValid && result.errors) {
        errors.push(...result.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate a request body and throw an error if invalid
   * @param body Request body
   * @param schema Validation schema
   */
  static validateBodyOrThrow(body: any, schema: Record<string, (value: any) => ValidationResult>): void {
    const result = Validator.validateBody(body, schema);
    if (!result.isValid && result.errors) {
      logger.warn('Validation failed', { errors: result.errors, body });
      throw ErrorHandler.validationError('Validation failed', { errors: result.errors });
    }
  }

  /**
   * Validate a request query
   * @param query Request query
   * @param schema Validation schema
   * @returns Validation result
   */
  static validateQuery(query: any, schema: Record<string, (value: any) => ValidationResult>): ValidationResult {
    const errors: string[] = [];
    
    // Check if query is an object
    if (typeof query !== 'object' || query === null) {
      errors.push('Request query must be an object');
      return { isValid: false, errors };
    }
    
    // Validate each field according to the schema
    for (const [field, validator] of Object.entries(schema)) {
      const result = validator(query[field]);
      if (!result.isValid && result.errors) {
        errors.push(...result.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate a request query and throw an error if invalid
   * @param query Request query
   * @param schema Validation schema
   */
  static validateQueryOrThrow(query: any, schema: Record<string, (value: any) => ValidationResult>): void {
    const result = Validator.validateQuery(query, schema);
    if (!result.isValid && result.errors) {
      logger.warn('Validation failed', { errors: result.errors, query });
      throw ErrorHandler.validationError('Validation failed', { errors: result.errors });
    }
  }

  /**
   * Validate a request params
   * @param params Request params
   * @param schema Validation schema
   * @returns Validation result
   */
  static validateParams(params: any, schema: Record<string, (value: any) => ValidationResult>): ValidationResult {
    const errors: string[] = [];
    
    // Check if params is an object
    if (typeof params !== 'object' || params === null) {
      errors.push('Request params must be an object');
      return { isValid: false, errors };
    }
    
    // Validate each field according to the schema
    for (const [field, validator] of Object.entries(schema)) {
      const result = validator(params[field]);
      if (!result.isValid && result.errors) {
        errors.push(...result.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate a request params and throw an error if invalid
   * @param params Request params
   * @param schema Validation schema
   */
  static validateParamsOrThrow(params: any, schema: Record<string, (value: any) => ValidationResult>): void {
    const result = Validator.validateParams(params, schema);
    if (!result.isValid && result.errors) {
      logger.warn('Validation failed', { errors: result.errors, params });
      throw ErrorHandler.validationError('Validation failed', { errors: result.errors });
    }
  }
} 