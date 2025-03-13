"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const error_handler_1 = require("./error-handler");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('validator');
/**
 * Validator utility
 */
class Validator {
    /**
     * Validate a value is not empty
     * @param value Value to validate
     * @param fieldName Field name for error message
     * @returns Validation result
     */
    static notEmpty(value, fieldName) {
        if (value === undefined || value === null || value === '') {
            return {
                isValid: false,
                errors: [`${fieldName} is required`],
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
    static isString(value, fieldName) {
        if (typeof value !== 'string') {
            return {
                isValid: false,
                errors: [`${fieldName} must be a string`],
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
    static isNumber(value, fieldName) {
        if (typeof value !== 'number' || isNaN(value)) {
            return {
                isValid: false,
                errors: [`${fieldName} must be a number`],
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
    static isBoolean(value, fieldName) {
        if (typeof value !== 'boolean') {
            return {
                isValid: false,
                errors: [`${fieldName} must be a boolean`],
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
    static isArray(value, fieldName) {
        if (!Array.isArray(value)) {
            return {
                isValid: false,
                errors: [`${fieldName} must be an array`],
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
    static isObject(value, fieldName) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return {
                isValid: false,
                errors: [`${fieldName} must be an object`],
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
    static isSolanaAddress(value, fieldName) {
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
                errors: [`${fieldName} must be a valid Solana address`],
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
    static isTimestamp(value, fieldName) {
        // First check if it's a number
        const numberResult = Validator.isNumber(value, fieldName);
        if (!numberResult.isValid) {
            return numberResult;
        }
        // Check if it's a valid timestamp (positive number)
        if (value < 0) {
            return {
                isValid: false,
                errors: [`${fieldName} must be a valid timestamp (positive number)`],
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
    static isInRange(value, min, max, fieldName) {
        // First check if it's a number
        const numberResult = Validator.isNumber(value, fieldName);
        if (!numberResult.isValid) {
            return numberResult;
        }
        // Check if it's within the range
        if (value < min || value > max) {
            return {
                isValid: false,
                errors: [`${fieldName} must be between ${min} and ${max}`],
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
    static minLength(value, minLength, fieldName) {
        // First check if it's a string
        const stringResult = Validator.isString(value, fieldName);
        if (!stringResult.isValid) {
            return stringResult;
        }
        // Check if it's at least the minimum length
        if (value.length < minLength) {
            return {
                isValid: false,
                errors: [`${fieldName} must be at least ${minLength} characters long`],
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
    static maxLength(value, maxLength, fieldName) {
        // First check if it's a string
        const stringResult = Validator.isString(value, fieldName);
        if (!stringResult.isValid) {
            return stringResult;
        }
        // Check if it's at most the maximum length
        if (value.length > maxLength) {
            return {
                isValid: false,
                errors: [`${fieldName} must be at most ${maxLength} characters long`],
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
    static matches(value, pattern, fieldName, errorMessage) {
        // First check if it's a string
        const stringResult = Validator.isString(value, fieldName);
        if (!stringResult.isValid) {
            return stringResult;
        }
        // Check if it matches the pattern
        if (!pattern.test(value)) {
            return {
                isValid: false,
                errors: [errorMessage || `${fieldName} has an invalid format`],
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
    static validateBody(body, schema) {
        const errors = [];
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
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Validate a request body and throw an error if invalid
     * @param body Request body
     * @param schema Validation schema
     */
    static validateBodyOrThrow(body, schema) {
        const result = Validator.validateBody(body, schema);
        if (!result.isValid && result.errors) {
            logger.warn('Validation failed', { errors: result.errors, body });
            throw error_handler_1.ErrorHandler.validationError('Validation failed', { errors: result.errors });
        }
    }
    /**
     * Validate a request query
     * @param query Request query
     * @param schema Validation schema
     * @returns Validation result
     */
    static validateQuery(query, schema) {
        const errors = [];
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
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Validate a request query and throw an error if invalid
     * @param query Request query
     * @param schema Validation schema
     */
    static validateQueryOrThrow(query, schema) {
        const result = Validator.validateQuery(query, schema);
        if (!result.isValid && result.errors) {
            logger.warn('Validation failed', { errors: result.errors, query });
            throw error_handler_1.ErrorHandler.validationError('Validation failed', { errors: result.errors });
        }
    }
    /**
     * Validate a request params
     * @param params Request params
     * @param schema Validation schema
     * @returns Validation result
     */
    static validateParams(params, schema) {
        const errors = [];
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
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Validate a request params and throw an error if invalid
     * @param params Request params
     * @param schema Validation schema
     */
    static validateParamsOrThrow(params, schema) {
        const result = Validator.validateParams(params, schema);
        if (!result.isValid && result.errors) {
            logger.warn('Validation failed', { errors: result.errors, params });
            throw error_handler_1.ErrorHandler.validationError('Validation failed', { errors: result.errors });
        }
    }
}
exports.Validator = Validator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3ZhbGlkYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0M7QUFDL0MscUNBQXdDO0FBRXhDLE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxXQUFXLENBQUMsQ0FBQztBQVV6Qzs7R0FFRztBQUNILE1BQWEsU0FBUztJQUNwQjs7Ozs7T0FLRztJQUNILE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBVSxFQUFFLFNBQWlCO1FBQzNDLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUMxRCxPQUFPO2dCQUNMLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE1BQU0sRUFBRSxDQUFDLEdBQUcsU0FBUyxjQUFjLENBQUM7YUFDckMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBVSxFQUFFLFNBQWlCO1FBQzNDLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsT0FBTztnQkFDTCxPQUFPLEVBQUUsS0FBSztnQkFDZCxNQUFNLEVBQUUsQ0FBQyxHQUFHLFNBQVMsbUJBQW1CLENBQUM7YUFDMUMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBVSxFQUFFLFNBQWlCO1FBQzNDLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlDLE9BQU87Z0JBQ0wsT0FBTyxFQUFFLEtBQUs7Z0JB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QUMsQ0FBQztZQUNoQyxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU87WUFDTCxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQzVCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQy9DLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxxQkFBcUIsQ0FDMUIsTUFBVyxFQUNYLE1BQXdEO1FBRXhELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNwRSxNQUFNLDRCQUFZLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFsWkQsOEJBa1pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi9lcnJvci1oYW5kbGVyJztcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCd2YWxpZGF0b3InKTtcblxuLyoqXG4gKiBWYWxpZGF0aW9uIHJlc3VsdFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFZhbGlkYXRpb25SZXN1bHQge1xuICBpc1ZhbGlkOiBib29sZWFuO1xuICBlcnJvcnM/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0b3IgdXRpbGl0eVxuICovXG5leHBvcnQgY2xhc3MgVmFsaWRhdG9yIHtcbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgdmFsdWUgaXMgbm90IGVtcHR5XG4gICAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byB2YWxpZGF0ZVxuICAgKiBAcGFyYW0gZmllbGROYW1lIEZpZWxkIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VcbiAgICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHRcbiAgICovXG4gIHN0YXRpYyBub3RFbXB0eSh2YWx1ZTogYW55LCBmaWVsZE5hbWU6IHN0cmluZyk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogZmFsc2UsXG4gICAgICAgIGVycm9yczogW2Ake2ZpZWxkTmFtZX0gaXMgcmVxdWlyZWRgXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgdmFsdWUgaXMgYSBzdHJpbmdcbiAgICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHZhbGlkYXRlXG4gICAqIEBwYXJhbSBmaWVsZE5hbWUgRmllbGQgbmFtZSBmb3IgZXJyb3IgbWVzc2FnZVxuICAgKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdFxuICAgKi9cbiAgc3RhdGljIGlzU3RyaW5nKHZhbHVlOiBhbnksIGZpZWxkTmFtZTogc3RyaW5nKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzVmFsaWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcnM6IFtgJHtmaWVsZE5hbWV9IG11c3QgYmUgYSBzdHJpbmdgXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgdmFsdWUgaXMgYSBudW1iZXJcbiAgICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHZhbGlkYXRlXG4gICAqIEBwYXJhbSBmaWVsZE5hbWUgRmllbGQgbmFtZSBmb3IgZXJyb3IgbWVzc2FnZVxuICAgKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdFxuICAgKi9cbiAgc3RhdGljIGlzTnVtYmVyKHZhbHVlOiBhbnksIGZpZWxkTmFtZTogc3RyaW5nKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicgfHwgaXNOYU4odmFsdWUpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3JzOiBbYCR7ZmllbGROYW1lfSBtdXN0IGJlIGEgbnVtYmVyYF0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IGlzVmFsaWQ6IHRydWUgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBhIHZhbHVlIGlzIGEgYm9vbGVhblxuICAgKiBAcGFyYW0gdmFsdWUgVmFsdWUgdG8gdmFsaWRhdGVcbiAgICogQHBhcmFtIGZpZWxkTmFtZSBGaWVsZCBuYW1lIGZvciBlcnJvciBtZXNzYWdlXG4gICAqIEByZXR1cm5zIFZhbGlkYXRpb24gcmVzdWx0XG4gICAqL1xuICBzdGF0aWMgaXNCb29sZWFuKHZhbHVlOiBhbnksIGZpZWxkTmFtZTogc3RyaW5nKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3JzOiBbYCR7ZmllbGROYW1lfSBtdXN0IGJlIGEgYm9vbGVhbmBdLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBpc1ZhbGlkOiB0cnVlIH07XG4gIH1cblxuICAvKipcbiAgICogVmFsaWRhdGUgYSB2YWx1ZSBpcyBhbiBhcnJheVxuICAgKiBAcGFyYW0gdmFsdWUgVmFsdWUgdG8gdmFsaWRhdGVcbiAgICogQHBhcmFtIGZpZWxkTmFtZSBGaWVsZCBuYW1lIGZvciBlcnJvciBtZXNzYWdlXG4gICAqIEByZXR1cm5zIFZhbGlkYXRpb24gcmVzdWx0XG4gICAqL1xuICBzdGF0aWMgaXNBcnJheSh2YWx1ZTogYW55LCBmaWVsZE5hbWU6IHN0cmluZyk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzVmFsaWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcnM6IFtgJHtmaWVsZE5hbWV9IG11c3QgYmUgYW4gYXJyYXlgXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgdmFsdWUgaXMgYW4gb2JqZWN0XG4gICAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byB2YWxpZGF0ZVxuICAgKiBAcGFyYW0gZmllbGROYW1lIEZpZWxkIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VcbiAgICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHRcbiAgICovXG4gIHN0YXRpYyBpc09iamVjdCh2YWx1ZTogYW55LCBmaWVsZE5hbWU6IHN0cmluZyk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnIHx8IHZhbHVlID09PSBudWxsIHx8IEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3JzOiBbYCR7ZmllbGROYW1lfSBtdXN0IGJlIGFuIG9iamVjdGBdLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBpc1ZhbGlkOiB0cnVlIH07XG4gIH1cblxuICAvKipcbiAgICogVmFsaWRhdGUgYSB2YWx1ZSBpcyBhIHZhbGlkIFNvbGFuYSBhZGRyZXNzXG4gICAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byB2YWxpZGF0ZVxuICAgKiBAcGFyYW0gZmllbGROYW1lIEZpZWxkIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VcbiAgICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHRcbiAgICovXG4gIHN0YXRpYyBpc1NvbGFuYUFkZHJlc3ModmFsdWU6IGFueSwgZmllbGROYW1lOiBzdHJpbmcpOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgICAvLyBGaXJzdCBjaGVjayBpZiBpdCdzIGEgc3RyaW5nXG4gICAgY29uc3Qgc3RyaW5nUmVzdWx0ID0gVmFsaWRhdG9yLmlzU3RyaW5nKHZhbHVlLCBmaWVsZE5hbWUpO1xuICAgIGlmICghc3RyaW5nUmVzdWx0LmlzVmFsaWQpIHtcbiAgICAgIHJldHVybiBzdHJpbmdSZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaXQncyBhIHZhbGlkIGJhc2U1OCBzdHJpbmcgb2YgdGhlIHJpZ2h0IGxlbmd0aFxuICAgIGNvbnN0IGJhc2U1OFJlZ2V4ID0gL15bMS05QS1ISi1OUC1aYS1rbS16XXszMiw0NH0kLztcbiAgICBpZiAoIWJhc2U1OFJlZ2V4LnRlc3QodmFsdWUpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3JzOiBbYCR7ZmllbGROYW1lfSBtdXN0IGJlIGEgdmFsaWQgU29sYW5hIGFkZHJlc3NgXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgdmFsdWUgaXMgYSB2YWxpZCB0aW1lc3RhbXBcbiAgICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHZhbGlkYXRlXG4gICAqIEBwYXJhbSBmaWVsZE5hbWUgRmllbGQgbmFtZSBmb3IgZXJyb3IgbWVzc2FnZVxuICAgKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdFxuICAgKi9cbiAgc3RhdGljIGlzVGltZXN0YW1wKHZhbHVlOiBhbnksIGZpZWxkTmFtZTogc3RyaW5nKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgLy8gRmlyc3QgY2hlY2sgaWYgaXQncyBhIG51bWJlclxuICAgIGNvbnN0IG51bWJlclJlc3VsdCA9IFZhbGlkYXRvci5pc051bWJlcih2YWx1ZSwgZmllbGROYW1lKTtcbiAgICBpZiAoIW51bWJlclJlc3VsdC5pc1ZhbGlkKSB7XG4gICAgICByZXR1cm4gbnVtYmVyUmVzdWx0O1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGl0J3MgYSB2YWxpZCB0aW1lc3RhbXAgKHBvc2l0aXZlIG51bWJlcilcbiAgICBpZiAodmFsdWUgPCAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3JzOiBbYCR7ZmllbGROYW1lfSBtdXN0IGJlIGEgdmFsaWQgdGltZXN0YW1wIChwb3NpdGl2ZSBudW1iZXIpYF0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IGlzVmFsaWQ6IHRydWUgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBhIHZhbHVlIGlzIHdpdGhpbiBhIHJhbmdlXG4gICAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byB2YWxpZGF0ZVxuICAgKiBAcGFyYW0gbWluIE1pbmltdW0gdmFsdWVcbiAgICogQHBhcmFtIG1heCBNYXhpbXVtIHZhbHVlXG4gICAqIEBwYXJhbSBmaWVsZE5hbWUgRmllbGQgbmFtZSBmb3IgZXJyb3IgbWVzc2FnZVxuICAgKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdFxuICAgKi9cbiAgc3RhdGljIGlzSW5SYW5nZSh2YWx1ZTogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIsIGZpZWxkTmFtZTogc3RyaW5nKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgLy8gRmlyc3QgY2hlY2sgaWYgaXQncyBhIG51bWJlclxuICAgIGNvbnN0IG51bWJlclJlc3VsdCA9IFZhbGlkYXRvci5pc051bWJlcih2YWx1ZSwgZmllbGROYW1lKTtcbiAgICBpZiAoIW51bWJlclJlc3VsdC5pc1ZhbGlkKSB7XG4gICAgICByZXR1cm4gbnVtYmVyUmVzdWx0O1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGl0J3Mgd2l0aGluIHRoZSByYW5nZVxuICAgIGlmICh2YWx1ZSA8IG1pbiB8fCB2YWx1ZSA+IG1heCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogZmFsc2UsXG4gICAgICAgIGVycm9yczogW2Ake2ZpZWxkTmFtZX0gbXVzdCBiZSBiZXR3ZWVuICR7bWlufSBhbmQgJHttYXh9YF0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IGlzVmFsaWQ6IHRydWUgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBhIHZhbHVlIGhhcyBhIG1pbmltdW0gbGVuZ3RoXG4gICAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byB2YWxpZGF0ZVxuICAgKiBAcGFyYW0gbWluTGVuZ3RoIE1pbmltdW0gbGVuZ3RoXG4gICAqIEBwYXJhbSBmaWVsZE5hbWUgRmllbGQgbmFtZSBmb3IgZXJyb3IgbWVzc2FnZVxuICAgKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdFxuICAgKi9cbiAgc3RhdGljIG1pbkxlbmd0aCh2YWx1ZTogc3RyaW5nLCBtaW5MZW5ndGg6IG51bWJlciwgZmllbGROYW1lOiBzdHJpbmcpOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgICAvLyBGaXJzdCBjaGVjayBpZiBpdCdzIGEgc3RyaW5nXG4gICAgY29uc3Qgc3RyaW5nUmVzdWx0ID0gVmFsaWRhdG9yLmlzU3RyaW5nKHZhbHVlLCBmaWVsZE5hbWUpO1xuICAgIGlmICghc3RyaW5nUmVzdWx0LmlzVmFsaWQpIHtcbiAgICAgIHJldHVybiBzdHJpbmdSZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaXQncyBhdCBsZWFzdCB0aGUgbWluaW11bSBsZW5ndGhcbiAgICBpZiAodmFsdWUubGVuZ3RoIDwgbWluTGVuZ3RoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc1ZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3JzOiBbYCR7ZmllbGROYW1lfSBtdXN0IGJlIGF0IGxlYXN0ICR7bWluTGVuZ3RofSBjaGFyYWN0ZXJzIGxvbmdgXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgdmFsdWUgaGFzIGEgbWF4aW11bSBsZW5ndGhcbiAgICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHZhbGlkYXRlXG4gICAqIEBwYXJhbSBtYXhMZW5ndGggTWF4aW11bSBsZW5ndGhcbiAgICogQHBhcmFtIGZpZWxkTmFtZSBGaWVsZCBuYW1lIGZvciBlcnJvciBtZXNzYWdlXG4gICAqIEByZXR1cm5zIFZhbGlkYXRpb24gcmVzdWx0XG4gICAqL1xuICBzdGF0aWMgbWF4TGVuZ3RoKHZhbHVlOiBzdHJpbmcsIG1heExlbmd0aDogbnVtYmVyLCBmaWVsZE5hbWU6IHN0cmluZyk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgIC8vIEZpcnN0IGNoZWNrIGlmIGl0J3MgYSBzdHJpbmdcbiAgICBjb25zdCBzdHJpbmdSZXN1bHQgPSBWYWxpZGF0b3IuaXNTdHJpbmcodmFsdWUsIGZpZWxkTmFtZSk7XG4gICAgaWYgKCFzdHJpbmdSZXN1bHQuaXNWYWxpZCkge1xuICAgICAgcmV0dXJuIHN0cmluZ1Jlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBpdCdzIGF0IG1vc3QgdGhlIG1heGltdW0gbGVuZ3RoXG4gICAgaWYgKHZhbHVlLmxlbmd0aCA+IG1heExlbmd0aCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogZmFsc2UsXG4gICAgICAgIGVycm9yczogW2Ake2ZpZWxkTmFtZX0gbXVzdCBiZSBhdCBtb3N0ICR7bWF4TGVuZ3RofSBjaGFyYWN0ZXJzIGxvbmdgXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgdmFsdWUgbWF0Y2hlcyBhIHJlZ2V4IHBhdHRlcm5cbiAgICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHZhbGlkYXRlXG4gICAqIEBwYXJhbSBwYXR0ZXJuIFJlZ2V4IHBhdHRlcm5cbiAgICogQHBhcmFtIGZpZWxkTmFtZSBGaWVsZCBuYW1lIGZvciBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBlcnJvck1lc3NhZ2UgQ3VzdG9tIGVycm9yIG1lc3NhZ2VcbiAgICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHRcbiAgICovXG4gIHN0YXRpYyBtYXRjaGVzKFxuICAgIHZhbHVlOiBzdHJpbmcsXG4gICAgcGF0dGVybjogUmVnRXhwLFxuICAgIGZpZWxkTmFtZTogc3RyaW5nLFxuICAgIGVycm9yTWVzc2FnZT86IHN0cmluZ1xuICApOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgICAvLyBGaXJzdCBjaGVjayBpZiBpdCdzIGEgc3RyaW5nXG4gICAgY29uc3Qgc3RyaW5nUmVzdWx0ID0gVmFsaWRhdG9yLmlzU3RyaW5nKHZhbHVlLCBmaWVsZE5hbWUpO1xuICAgIGlmICghc3RyaW5nUmVzdWx0LmlzVmFsaWQpIHtcbiAgICAgIHJldHVybiBzdHJpbmdSZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgaXQgbWF0Y2hlcyB0aGUgcGF0dGVyblxuICAgIGlmICghcGF0dGVybi50ZXN0KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNWYWxpZDogZmFsc2UsXG4gICAgICAgIGVycm9yczogW2Vycm9yTWVzc2FnZSB8fCBgJHtmaWVsZE5hbWV9IGhhcyBhbiBpbnZhbGlkIGZvcm1hdGBdLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBpc1ZhbGlkOiB0cnVlIH07XG4gIH1cblxuICAvKipcbiAgICogVmFsaWRhdGUgYSByZXF1ZXN0IGJvZHlcbiAgICogQHBhcmFtIGJvZHkgUmVxdWVzdCBib2R5XG4gICAqIEBwYXJhbSBzY2hlbWEgVmFsaWRhdGlvbiBzY2hlbWFcbiAgICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHRcbiAgICovXG4gIHN0YXRpYyB2YWxpZGF0ZUJvZHkoXG4gICAgYm9keTogYW55LFxuICAgIHNjaGVtYTogUmVjb3JkPHN0cmluZywgKHZhbHVlOiBhbnkpID0+IFZhbGlkYXRpb25SZXN1bHQ+XG4gICk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIENoZWNrIGlmIGJvZHkgaXMgYW4gb2JqZWN0XG4gICAgaWYgKHR5cGVvZiBib2R5ICE9PSAnb2JqZWN0JyB8fCBib2R5ID09PSBudWxsKSB7XG4gICAgICBlcnJvcnMucHVzaCgnUmVxdWVzdCBib2R5IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgZXJyb3JzIH07XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgZWFjaCBmaWVsZCBhY2NvcmRpbmcgdG8gdGhlIHNjaGVtYVxuICAgIGZvciAoY29uc3QgW2ZpZWxkLCB2YWxpZGF0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHNjaGVtYSkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRvcihib2R5W2ZpZWxkXSk7XG4gICAgICBpZiAoIXJlc3VsdC5pc1ZhbGlkICYmIHJlc3VsdC5lcnJvcnMpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goLi4ucmVzdWx0LmVycm9ycyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlzVmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgICBlcnJvcnM6IGVycm9ycy5sZW5ndGggPiAwID8gZXJyb3JzIDogdW5kZWZpbmVkLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVmFsaWRhdGUgYSByZXF1ZXN0IGJvZHkgYW5kIHRocm93IGFuIGVycm9yIGlmIGludmFsaWRcbiAgICogQHBhcmFtIGJvZHkgUmVxdWVzdCBib2R5XG4gICAqIEBwYXJhbSBzY2hlbWEgVmFsaWRhdGlvbiBzY2hlbWFcbiAgICovXG4gIHN0YXRpYyB2YWxpZGF0ZUJvZHlPclRocm93KFxuICAgIGJvZHk6IGFueSxcbiAgICBzY2hlbWE6IFJlY29yZDxzdHJpbmcsICh2YWx1ZTogYW55KSA9PiBWYWxpZGF0aW9uUmVzdWx0PlxuICApOiB2b2lkIHtcbiAgICBjb25zdCByZXN1bHQgPSBWYWxpZGF0b3IudmFsaWRhdGVCb2R5KGJvZHksIHNjaGVtYSk7XG4gICAgaWYgKCFyZXN1bHQuaXNWYWxpZCAmJiByZXN1bHQuZXJyb3JzKSB7XG4gICAgICBsb2dnZXIud2FybignVmFsaWRhdGlvbiBmYWlsZWQnLCB7IGVycm9yczogcmVzdWx0LmVycm9ycywgYm9keSB9KTtcbiAgICAgIHRocm93IEVycm9ySGFuZGxlci52YWxpZGF0aW9uRXJyb3IoJ1ZhbGlkYXRpb24gZmFpbGVkJywgeyBlcnJvcnM6IHJlc3VsdC5lcnJvcnMgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgcmVxdWVzdCBxdWVyeVxuICAgKiBAcGFyYW0gcXVlcnkgUmVxdWVzdCBxdWVyeVxuICAgKiBAcGFyYW0gc2NoZW1hIFZhbGlkYXRpb24gc2NoZW1hXG4gICAqIEByZXR1cm5zIFZhbGlkYXRpb24gcmVzdWx0XG4gICAqL1xuICBzdGF0aWMgdmFsaWRhdGVRdWVyeShcbiAgICBxdWVyeTogYW55LFxuICAgIHNjaGVtYTogUmVjb3JkPHN0cmluZywgKHZhbHVlOiBhbnkpID0+IFZhbGlkYXRpb25SZXN1bHQ+XG4gICk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIENoZWNrIGlmIHF1ZXJ5IGlzIGFuIG9iamVjdFxuICAgIGlmICh0eXBlb2YgcXVlcnkgIT09ICdvYmplY3QnIHx8IHF1ZXJ5ID09PSBudWxsKSB7XG4gICAgICBlcnJvcnMucHVzaCgnUmVxdWVzdCBxdWVyeSBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGVycm9ycyB9O1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGVhY2ggZmllbGQgYWNjb3JkaW5nIHRvIHRoZSBzY2hlbWFcbiAgICBmb3IgKGNvbnN0IFtmaWVsZCwgdmFsaWRhdG9yXSBvZiBPYmplY3QuZW50cmllcyhzY2hlbWEpKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0b3IocXVlcnlbZmllbGRdKTtcbiAgICAgIGlmICghcmVzdWx0LmlzVmFsaWQgJiYgcmVzdWx0LmVycm9ycykge1xuICAgICAgICBlcnJvcnMucHVzaCguLi5yZXN1bHQuZXJyb3JzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaXNWYWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGVycm9yczogZXJyb3JzLmxlbmd0aCA+IDAgPyBlcnJvcnMgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBhIHJlcXVlc3QgcXVlcnkgYW5kIHRocm93IGFuIGVycm9yIGlmIGludmFsaWRcbiAgICogQHBhcmFtIHF1ZXJ5IFJlcXVlc3QgcXVlcnlcbiAgICogQHBhcmFtIHNjaGVtYSBWYWxpZGF0aW9uIHNjaGVtYVxuICAgKi9cbiAgc3RhdGljIHZhbGlkYXRlUXVlcnlPclRocm93KFxuICAgIHF1ZXJ5OiBhbnksXG4gICAgc2NoZW1hOiBSZWNvcmQ8c3RyaW5nLCAodmFsdWU6IGFueSkgPT4gVmFsaWRhdGlvblJlc3VsdD5cbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcmVzdWx0ID0gVmFsaWRhdG9yLnZhbGlkYXRlUXVlcnkocXVlcnksIHNjaGVtYSk7XG4gICAgaWYgKCFyZXN1bHQuaXNWYWxpZCAmJiByZXN1bHQuZXJyb3JzKSB7XG4gICAgICBsb2dnZXIud2FybignVmFsaWRhdGlvbiBmYWlsZWQnLCB7IGVycm9yczogcmVzdWx0LmVycm9ycywgcXVlcnkgfSk7XG4gICAgICB0aHJvdyBFcnJvckhhbmRsZXIudmFsaWRhdGlvbkVycm9yKCdWYWxpZGF0aW9uIGZhaWxlZCcsIHsgZXJyb3JzOiByZXN1bHQuZXJyb3JzIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBhIHJlcXVlc3QgcGFyYW1zXG4gICAqIEBwYXJhbSBwYXJhbXMgUmVxdWVzdCBwYXJhbXNcbiAgICogQHBhcmFtIHNjaGVtYSBWYWxpZGF0aW9uIHNjaGVtYVxuICAgKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdFxuICAgKi9cbiAgc3RhdGljIHZhbGlkYXRlUGFyYW1zKFxuICAgIHBhcmFtczogYW55LFxuICAgIHNjaGVtYTogUmVjb3JkPHN0cmluZywgKHZhbHVlOiBhbnkpID0+IFZhbGlkYXRpb25SZXN1bHQ+XG4gICk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIENoZWNrIGlmIHBhcmFtcyBpcyBhbiBvYmplY3RcbiAgICBpZiAodHlwZW9mIHBhcmFtcyAhPT0gJ29iamVjdCcgfHwgcGFyYW1zID09PSBudWxsKSB7XG4gICAgICBlcnJvcnMucHVzaCgnUmVxdWVzdCBwYXJhbXMgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCBlcnJvcnMgfTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBlYWNoIGZpZWxkIGFjY29yZGluZyB0byB0aGUgc2NoZW1hXG4gICAgZm9yIChjb25zdCBbZmllbGQsIHZhbGlkYXRvcl0gb2YgT2JqZWN0LmVudHJpZXMoc2NoZW1hKSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdG9yKHBhcmFtc1tmaWVsZF0pO1xuICAgICAgaWYgKCFyZXN1bHQuaXNWYWxpZCAmJiByZXN1bHQuZXJyb3JzKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKC4uLnJlc3VsdC5lcnJvcnMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpc1ZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxuICAgICAgZXJyb3JzOiBlcnJvcnMubGVuZ3RoID4gMCA/IGVycm9ycyA6IHVuZGVmaW5lZCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGEgcmVxdWVzdCBwYXJhbXMgYW5kIHRocm93IGFuIGVycm9yIGlmIGludmFsaWRcbiAgICogQHBhcmFtIHBhcmFtcyBSZXF1ZXN0IHBhcmFtc1xuICAgKiBAcGFyYW0gc2NoZW1hIFZhbGlkYXRpb24gc2NoZW1hXG4gICAqL1xuICBzdGF0aWMgdmFsaWRhdGVQYXJhbXNPclRocm93KFxuICAgIHBhcmFtczogYW55LFxuICAgIHNjaGVtYTogUmVjb3JkPHN0cmluZywgKHZhbHVlOiBhbnkpID0+IFZhbGlkYXRpb25SZXN1bHQ+XG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHJlc3VsdCA9IFZhbGlkYXRvci52YWxpZGF0ZVBhcmFtcyhwYXJhbXMsIHNjaGVtYSk7XG4gICAgaWYgKCFyZXN1bHQuaXNWYWxpZCAmJiByZXN1bHQuZXJyb3JzKSB7XG4gICAgICBsb2dnZXIud2FybignVmFsaWRhdGlvbiBmYWlsZWQnLCB7IGVycm9yczogcmVzdWx0LmVycm9ycywgcGFyYW1zIH0pO1xuICAgICAgdGhyb3cgRXJyb3JIYW5kbGVyLnZhbGlkYXRpb25FcnJvcignVmFsaWRhdGlvbiBmYWlsZWQnLCB7IGVycm9yczogcmVzdWx0LmVycm9ycyB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==