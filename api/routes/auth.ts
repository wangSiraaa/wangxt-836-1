import { Router, type Request, type Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middleware/auth.js';

export default function authRoutes(authService: AuthService, controller: AuthController) {
  const router = Router();

  router.post('/login', (req: Request, res: Response): void => {
    controller.login(req, res);
  });

  router.post(
    '/logout',
    authMiddleware(authService),
    (req: Request, res: Response): void => {
      controller.logout(req, res);
    }
  );

  return router;
}
