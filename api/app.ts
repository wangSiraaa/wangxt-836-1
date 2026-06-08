import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { getDb } from './database/init.js';
import { AuthService } from './services/AuthService.js';
import { TicketService } from './services/TicketService.js';
import { AuthController } from './controllers/AuthController.js';
import { TicketController } from './controllers/TicketController.js';
import { SlaWorker } from './cron/slaWorker.js';
import { authMiddleware, requireRole, requirePermission } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const clientDistPath = path.resolve(__dirname, '..', 'client');
  app.use(express.static(clientDistPath));
}

const db = getDb();
const authService = new AuthService(db);
const ticketService = new TicketService(db);
const authController = new AuthController(authService);
const ticketController = new TicketController(ticketService);
const slaWorker = new SlaWorker(ticketService);

slaWorker.start();

app.locals.authService = authService;
app.locals.ticketService = ticketService;
app.locals.authController = authController;
app.locals.ticketController = ticketController;
app.locals.slaWorker = slaWorker;

app.get('/api/health', (req: Request, res: Response): void => {
  let dbStatus = 'disconnected';
  let slaStatus = 'stopped';
  
  try {
    db.prepare('SELECT 1').get();
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error';
  }
  
  try {
    slaStatus = slaWorker.isRunning() ? 'running' : 'stopped';
  } catch (e) {
    slaStatus = 'error';
  }
  
  res.status(200).json({
    status: dbStatus === 'connected' && slaStatus === 'running' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    slaWorker: slaStatus,
    lastWorkerRun: slaWorker.getLastRunTime()?.toISOString() || null,
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes(authService, authController));

app.use('/api/tickets', authMiddleware(authService), ticketRoutes(ticketController, authService));

app.get(
  '/api/users',
  authMiddleware(authService),
  requireRole(authService, ['admin']),
  (req: Request, res: Response) => authController.getUsers(req, res)
);

app.get(
  '/api/auth/me',
  authMiddleware(authService),
  (req: Request, res: Response) => authController.getCurrentUser(req, res)
);

app.get(
  '/api/sla-config',
  authMiddleware(authService),
  requireRole(authService, ['admin']),
  (req: Request, res: Response) => ticketController.getSlaConfig(req, res)
);

app.put(
  '/api/sla-config',
  authMiddleware(authService),
  requireRole(authService, ['admin']),
  (req: Request, res: Response) => ticketController.updateSlaConfig(req, res)
);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  });
});

if (isProduction) {
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api/')) {
      const indexPath = path.resolve(__dirname, '..', 'client', 'index.html');
      res.sendFile(indexPath);
    } else {
      res.status(404).json({
        success: false,
        error: 'API not found',
      });
    }
  });
} else {
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API not found',
    });
  });
}

export default app;
