import { Router, type Request, type Response } from 'express';
import { TicketController } from '../controllers/TicketController.js';
import { AuthService } from '../services/AuthService.js';
import { requirePermission, requireRole } from '../middleware/auth.js';

export default function ticketRoutes(controller: TicketController, authService: AuthService) {
  const router = Router();

  router.get('/', (req: Request, res: Response): void => {
    controller.getTickets(req, res);
  });

  router.post(
    '/',
    requirePermission(authService, 'ticket:create'),
    (req: Request, res: Response): void => {
      controller.createTicket(req, res);
    }
  );

  router.get('/escalated', (req: Request, res: Response): void => {
    controller.getEscalatedTickets(req, res);
  });

  router.get('/:id', (req: Request, res: Response): void => {
    controller.getTicket(req, res);
  });

  router.post(
    '/:id/process',
    requirePermission(authService, 'ticket:process'),
    (req: Request, res: Response): void => {
      controller.processTicket(req, res);
    }
  );

  router.post(
    '/:id/pause',
    requirePermission(authService, 'ticket:pause'),
    (req: Request, res: Response): void => {
      controller.pauseTicket(req, res);
    }
  );

  router.post(
    '/:id/resume',
    requirePermission(authService, 'ticket:pause'),
    (req: Request, res: Response): void => {
      controller.resumeTicket(req, res);
    }
  );

  router.post(
    '/:id/escalate',
    requirePermission(authService, 'ticket:escalate'),
    (req: Request, res: Response): void => {
      controller.escalateTicket(req, res);
    }
  );

  router.post(
    '/:id/arbitrate',
    requireRole(authService, ['arbitrator', 'supervisor', 'admin']),
    (req: Request, res: Response): void => {
      controller.arbitrateTicket(req, res);
    }
  );

  router.post(
    '/:id/close',
    requirePermission(authService, 'ticket:close'),
    (req: Request, res: Response): void => {
      controller.closeTicket(req, res);
    }
  );

  router.get('/:id/pause-reasons', (req: Request, res: Response): void => {
    controller.getPauseReasons(req, res);
  });

  router.get('/:id/escalations', (req: Request, res: Response): void => {
    controller.getEscalations(req, res);
  });

  router.get('/:id/arbitration', (req: Request, res: Response): void => {
    controller.getArbitration(req, res);
  });

  return router;
}
