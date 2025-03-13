var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Router } from 'express';
import { createLogger } from '@liqpro/monitoring';
const logger = createLogger('scoring-service:api');
/**
 * Create API routes for the scoring service
 * @param scoringController Scoring controller instance
 * @returns Express router
 */
export function createApiRoutes(scoringController) {
    const router = Router();
    // Middleware for handling async errors
    const asyncHandler = (fn) => {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    };
    // Health check endpoint
    router.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok', service: 'scoring-service' });
    });
    // Get health scores for a pool
    router.get('/pools/:poolAddress/health-scores', asyncHandler((req, res) => __awaiter(this, void 0, void 0, function* () {
        const { poolAddress } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const scores = scoringController.getHealthScores(poolAddress, limit);
        return res.json(scores);
    })));
    // Get latest health score for a pool
    router.get('/pools/:poolAddress/health-score/latest', asyncHandler((req, res) => __awaiter(this, void 0, void 0, function* () {
        const { poolAddress } = req.params;
        const score = scoringController.getLatestHealthScore(poolAddress);
        if (!score) {
            return res.status(404).json({ error: 'Health score not found for this pool' });
        }
        return res.json(score);
    })));
    // Get risk assessments for a pool
    router.get('/pools/:poolAddress/risk-assessments', asyncHandler((req, res) => __awaiter(this, void 0, void 0, function* () {
        const { poolAddress } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const assessments = scoringController.getRiskAssessments(poolAddress, limit);
        return res.json(assessments);
    })));
    // Get latest risk assessment for a pool
    router.get('/pools/:poolAddress/risk-assessment/latest', asyncHandler((req, res) => __awaiter(this, void 0, void 0, function* () {
        const { poolAddress } = req.params;
        const assessment = scoringController.getLatestRiskAssessment(poolAddress);
        if (!assessment) {
            return res.status(404).json({ error: 'Risk assessment not found for this pool' });
        }
        return res.json(assessment);
    })));
    // Get recommendations for a pool
    router.get('/pools/:poolAddress/recommendations', asyncHandler((req, res) => __awaiter(this, void 0, void 0, function* () {
        const { poolAddress } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const recommendations = scoringController.getRecommendations(poolAddress, limit);
        return res.json(recommendations);
    })));
    // Get latest recommendation for a pool
    router.get('/pools/:poolAddress/recommendation/latest', asyncHandler((req, res) => __awaiter(this, void 0, void 0, function* () {
        const { poolAddress } = req.params;
        const recommendation = scoringController.getLatestRecommendation(poolAddress);
        if (!recommendation) {
            return res.status(404).json({ error: 'Recommendation not found for this pool' });
        }
        return res.json(recommendation);
    })));
    // Error handler
    router.use((err, _req, res, _next) => {
        logger.error(`API error: ${err.message}`);
        res.status(500).json({ error: 'Internal server error' });
    });
    return router;
}
