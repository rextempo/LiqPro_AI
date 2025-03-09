import express, { Request, Response } from 'express';
import { DEFAULT_HEALTH_CHECK } from '@liqpro/common';

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', async (_req: Request, res: Response) => {
  res.json({
    ...DEFAULT_HEALTH_CHECK,
    service: 'signal-service'
  });
});

app.listen(port, () => {
  console.log(`Signal service listening at http://localhost:${port}`);
}); 