import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { UserRole } from '../../shared/types.js';

declare global {
  namespace Express {
    interface Request {
      user?: import('../../shared/types.js').User;
      token?: string;
    }
  }
}

export function authMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);
    const user = authService.validateToken(token);
    if (!user) {
      return res.status(401).json({ error: '认证令牌无效或已过期' });
    }

    req.user = user;
    req.token = token;
    next();
  };
}

export function requirePermission(authService: AuthService, permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    if (!authService.hasPermission(req.user, permission)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

export function requireRole(authService: AuthService, roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    if (!authService.hasRole(req.user, roles)) {
      return res.status(403).json({ error: '角色权限不足' });
    }
    next();
  };
}
