"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Alert Routes
 * Handles API endpoints for alerts and notifications
 */
const express_1 = require("express");
const alert_controller_1 = __importDefault(require("../controllers/alert-controller"));
const validator_1 = require("../middleware/validator");
const error_handler_1 = require("../middleware/error-handler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const alertController = new alert_controller_1.default();
/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all alerts with optional filtering
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, dismissed, all]
 *           default: active
 *         description: Filter by alert status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by alert type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of alerts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of alerts
 *       500:
 *         description: Server error
 */
router.get('/', (0, validator_1.validate)(validator_1.schemas.alert.getAll, 'query'), (0, error_handler_1.asyncHandler)(alertController.getAllAlerts));
/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Get a specific alert by ID
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert details
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.get('/:id', (0, validator_1.validate)(validator_1.schemas.alert.getById, 'params'), (0, error_handler_1.asyncHandler)(alertController.getAlertById));
/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Create a new alert
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - poolAddress
 *               - threshold
 *               - message
 *               - priority
 *             properties:
 *               type:
 *                 type: string
 *               poolAddress:
 *                 type: string
 *               threshold:
 *                 type: number
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *     responses:
 *       201:
 *         description: Alert created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/', (0, validator_1.validate)(validator_1.schemas.alert.create), (0, error_handler_1.asyncHandler)(alertController.createAlert));
/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Update an existing alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threshold:
 *                 type: number
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               status:
 *                 type: string
 *                 enum: [active, dismissed]
 *     responses:
 *       200:
 *         description: Alert updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.put('/:id', (0, validator_1.validate)(validator_1.schemas.alert.getById, 'params'), (0, validator_1.validate)(validator_1.schemas.alert.update), (0, error_handler_1.asyncHandler)(alertController.updateAlert));
/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Delete an alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert deleted successfully
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', (0, validator_1.validate)(validator_1.schemas.alert.getById, 'params'), (0, error_handler_1.asyncHandler)(alertController.deleteAlert));
/**
 * @swagger
 * /api/alerts/{id}/dismiss:
 *   post:
 *     summary: Dismiss an alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert dismissed successfully
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.post('/:id/dismiss', (0, validator_1.validate)(validator_1.schemas.alert.getById, 'params'), (0, error_handler_1.asyncHandler)(alertController.dismissAlert));
/**
 * @swagger
 * /api/alerts/settings:
 *   get:
 *     summary: Get alert settings
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by alert type
 *     responses:
 *       200:
 *         description: Alert settings
 *       500:
 *         description: Server error
 */
router.get('/settings', (0, validator_1.validate)(validator_1.schemas.alert.getSettings, 'query'), (0, error_handler_1.asyncHandler)(alertController.getAlertSettings));
/**
 * @swagger
 * /api/alerts/settings:
 *   put:
 *     summary: Update alert settings
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabledAlertTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               notificationChannels:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   slack:
 *                     type: boolean
 *               thresholds:
 *                 type: object
 *     responses:
 *       200:
 *         description: Alert settings updated successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.put('/settings', (0, validator_1.validate)(validator_1.schemas.alert.updateSettings), (0, error_handler_1.asyncHandler)(alertController.updateAlertSettings));
logger_1.logger.info('Alert routes registered');
exports.default = router;
//# sourceMappingURL=alert-routes.js.map