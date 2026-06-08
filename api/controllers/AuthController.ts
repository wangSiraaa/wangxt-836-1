import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { LoginRequest } from '../../shared/types.js';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  login(req: Request, res: Response): void {
    try {
      const body = req.body as LoginRequest;
      if (!body.username || !body.password) {
        res.status(400).json({ error: '用户名和密码为必填字段' });
        return;
      }
      const result = this.authService.login(body);
      res.json(result);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  }

  logout(req: Request, res: Response): void {
    try {
      if (req.token) {
        this.authService.logout(req.token);
      }
      res.json({ message: '登出成功' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  getCurrentUser(req: Request, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    res.json(req.user);
  }

  getUsers(req: Request, res: Response): void {
    try {
      const users = this.authService.getAllUsers();
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}
