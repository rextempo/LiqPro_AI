/**
 * Validation Middleware
 * Provides request data validation using Joi
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from './error-handler';
import { Logger } from '../utils/logger';

const logger = new Logger('Validator');

/**
 * Validate request data against a Joi schema
 * @param schema Joi schema to validate against
 * @param property Request property to validate (body, params, query)
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: false
        }
      }
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      
      logger.warn(`验证错误: ${errorMessage}`, {
        path: req.path,
        method: req.method,
        property
      });
      
      return next(new ApiError(400, `验证错误: ${errorMessage}`));
    }

    return next();
  };
};

/**
 * Request Validation Middleware
 * Validates incoming requests against predefined schemas
 */
export const schemas = {
  // Signal schemas
  signal: {
    getAll: Joi.object({
      poolAddress: Joi.string().optional(),
      signalType: Joi.string().valid('buy', 'sell', 'hold').optional(),
      minStrength: Joi.number().min(0).max(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      offset: Joi.number().integer().min(0).optional(),
    }),
    getById: Joi.object({
      id: Joi.string().required(),
    }),
    getByPool: Joi.object({
      poolId: Joi.string().required(),
    }),
    getLatest: Joi.object({
      limit: Joi.number().integer().min(1).max(50).optional().default(10),
    }),
  },

  // Strategy schemas
  strategy: {
    getAll: Joi.object({
      type: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      offset: Joi.number().integer().min(0).optional(),
    }),
    getById: Joi.object({
      id: Joi.string().required(),
    }),
    create: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      type: Joi.string().required(),
      parameters: Joi.object().required(),
      isActive: Joi.boolean().optional().default(false),
      targetPools: Joi.array().items(Joi.string()).optional(),
    }),
    update: Joi.object({
      name: Joi.string().optional(),
      description: Joi.string().optional(),
      parameters: Joi.object().optional(),
      isActive: Joi.boolean().optional(),
      targetPools: Joi.array().items(Joi.string()).optional(),
    }),
    evaluate: Joi.object({
      timeframe: Joi.string().valid('1d', '7d', '30d', '90d', 'all').optional().default('30d'),
    }),
    optimize: Joi.object({
      targetMetric: Joi.string().valid('profit', 'accuracy', 'risk_adjusted_return').required(),
      constraints: Joi.object().optional(),
    }),
  },

  // History schemas
  history: {
    getSignals: Joi.object({
      poolAddress: Joi.string().optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      signalType: Joi.string().valid('buy', 'sell', 'hold').optional(),
      limit: Joi.number().integer().min(1).max(1000).optional(),
      offset: Joi.number().integer().min(0).optional(),
    }),
    getPerformance: Joi.object({
      poolAddress: Joi.string().required(),
    }),
    getAccuracy: Joi.object({
      strategyId: Joi.string().optional(),
      timeframe: Joi.string().valid('1d', '7d', '30d', '90d', 'all').optional().default('30d'),
    }),
    getTrends: Joi.object({
      metric: Joi.string().valid('signal_count', 'accuracy', 'profit').optional().default('signal_count'),
      timeframe: Joi.string().valid('1d', '7d', '30d', '90d').optional().default('30d'),
    }),
    export: Joi.object({
      poolAddresses: Joi.array().items(Joi.string()).optional(),
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      format: Joi.string().valid('csv', 'json').optional().default('csv'),
    }),
  },

  // Alert schemas
  alert: {
    getAll: Joi.object({
      status: Joi.string().valid('active', 'dismissed', 'all').optional().default('active'),
      type: Joi.string().optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      offset: Joi.number().integer().min(0).optional(),
    }),
    getById: Joi.object({
      id: Joi.string().required(),
    }),
    create: Joi.object({
      type: Joi.string().required(),
      poolAddress: Joi.string().required(),
      threshold: Joi.number().required(),
      message: Joi.string().required(),
      priority: Joi.string().valid('low', 'medium', 'high').required(),
    }),
    update: Joi.object({
      threshold: Joi.number().optional(),
      message: Joi.string().optional(),
      priority: Joi.string().valid('low', 'medium', 'high').optional(),
      status: Joi.string().valid('active', 'dismissed').optional(),
    }),
    getSettings: Joi.object({
      type: Joi.string().optional(),
    }),
    updateSettings: Joi.object({
      enabledAlertTypes: Joi.array().items(Joi.string()).optional(),
      notificationChannels: Joi.object({
        email: Joi.boolean().optional(),
        push: Joi.boolean().optional(),
        slack: Joi.boolean().optional(),
      }).optional(),
      thresholds: Joi.object().optional(),
    }),
  }
};

export default { validate, schemas }; 