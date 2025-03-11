/**
 * Alert Routes
 * Handles API endpoints for alerts and notifications
 */
import { Router } from 'express';
import AlertController from '../controllers/alert-controller';
import { validate, schemas } from '../middleware/validator';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();
const alertController = new AlertController();

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
router.get('/', 
  validate(schemas.alert.getAll, 'query'),
  asyncHandler(alertController.getAllAlerts)
);

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
router.get('/:id', 
  validate(schemas.alert.getById, 'params'),
  asyncHandler(alertController.getAlertById)
);

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
router.post('/', 
  validate(schemas.alert.create),
  asyncHandler(alertController.createAlert)
);

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
router.put('/:id', 
  validate(schemas.alert.getById, 'params'),
  validate(schemas.alert.update),
  asyncHandler(alertController.updateAlert)
);

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
router.delete('/:id', 
  validate(schemas.alert.getById, 'params'),
  asyncHandler(alertController.deleteAlert)
);

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
router.post('/:id/dismiss', 
  validate(schemas.alert.getById, 'params'),
  asyncHandler(alertController.dismissAlert)
);

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
router.get('/settings', 
  validate(schemas.alert.getSettings, 'query'),
  asyncHandler(alertController.getAlertSettings)
);

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
router.put('/settings', 
  validate(schemas.alert.updateSettings),
  asyncHandler(alertController.updateAlertSettings)
);

logger.info('Alert routes registered');

export default router; 