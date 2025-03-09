import express, { Request, Response } from 'express';
import { DEFAULT_HEALTH_CHECK } from '@liqpro/common';
import { checkDatabaseConnection } from '@liqpro/database';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseConnection();
  res.json({
    ...DEFAULT_HEALTH_CHECK,
    database: dbHealth
  });
});

app.listen(port, () => {
  console.log(`Data service listening at http://localhost:${port}`);
}); 