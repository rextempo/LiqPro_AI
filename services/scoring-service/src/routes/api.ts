import { Router, Request, Response, NextFunction } from 'express';
import { createLogger } from '@liqpro/monitoring';
import { ScoringController } from '../controllers/scoring-controller';

const logger = createLogger('scoring-service:api');

/**
 * Create API routes for the scoring service
 * @param scoringController Scoring controller instance
 * @returns Express router
 */
export function createApiRoutes(scoringController: ScoringController): Router {
  const router = Router();

  // Middleware for handling async errors
  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // Health check endpoint
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'scoring-service' });
  });

  // Get health scores for a pool
  router.get(
    '/pools/:poolAddress/health-scores',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const scores = scoringController.getHealthScores(poolAddress, limit);
      return res.json(scores);
    })
  );

  // Get latest health score for a pool
  router.get(
    '/pools/:poolAddress/health-score/latest',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      
      const score = scoringController.getLatestHealthScore(poolAddress);
      if (!score) {
        return res.status(404).json({ error: 'Health score not found for this pool' });
      }
      
      return res.json(score);
    })
  );

  // Get risk assessments for a pool
  router.get(
    '/pools/:poolAddress/risk-assessments',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const assessments = scoringController.getRiskAssessments(poolAddress, limit);
      return res.json(assessments);
    })
  );

  // Get latest risk assessment for a pool
  router.get(
    '/pools/:poolAddress/risk-assessment/latest',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      
      const assessment = scoringController.getLatestRiskAssessment(poolAddress);
      if (!assessment) {
        return res.status(404).json({ error: 'Risk assessment not found for this pool' });
      }
      
      return res.json(assessment);
    })
  );

  // Get recommendations for a pool
  router.get(
    '/pools/:poolAddress/recommendations',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const recommendations = scoringController.getRecommendations(poolAddress, limit);
      return res.json(recommendations);
    })
  );

  // Get latest recommendation for a pool
  router.get(
    '/pools/:poolAddress/recommendation/latest',
    asyncHandler(async (req: Request, res: Response) => {
      const { poolAddress } = req.params;
      
      const recommendation = scoringController.getLatestRecommendation(poolAddress);
      if (!recommendation) {
        return res.status(404).json({ error: 'Recommendation not found for this pool' });
      }
      
      return res.json(recommendation);
    })
  );

  // Error handler
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(`API error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  });

  return router;
} 