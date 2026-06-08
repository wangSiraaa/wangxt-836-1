import { Request, Response } from 'express';
import { TicketService } from '../services/TicketService.js';
import {
  CreateTicketRequest,
  PauseTicketRequest,
  ArbitrateRequest,
  TicketStatus,
} from '../../shared/types.js';

export class TicketController {
  private ticketService: TicketService;

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }

  getTickets(req: Request, res: Response): void {
    try {
      const status = req.query.status as TicketStatus | undefined;
      const tickets = this.ticketService.getAllTickets(status);
      res.json(tickets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  getTicket(req: Request, res: Response): void {
    try {
      const ticket = this.ticketService.getTicketById(req.params.id);
      if (!ticket) {
        res.status(404).json({ error: '工单不存在' });
        return;
      }
      res.json(ticket);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  createTicket(req: Request, res: Response): void {
    try {
      const body = req.body as CreateTicketRequest;
      if (!body.title || !body.description || !body.customerName || !body.customerEmail) {
        res.status(400).json({ error: '标题、描述、客户名称、客户邮箱为必填字段' });
        return;
      }
      const ticket = this.ticketService.createTicket(body);
      res.status(201).json(ticket);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  processTicket(req: Request, res: Response): void {
    try {
      if (!req.user) {
        res.status(401).json({ error: '未登录' });
        return;
      }
      this.ticketService.processTicket(req.params.id, req.user.id);
      res.json({ message: '工单已标记为处理中' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  pauseTicket(req: Request, res: Response): void {
    try {
      const body = req.body as PauseTicketRequest;

      if (!body.reason || body.reason.trim() === '') {
        res.status(400).json({ error: '暂停原因不能为空' });
        return;
      }
      if (body.reason.trim().length < 5) {
        res.status(400).json({ error: '暂停原因至少5个字符' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ error: '未登录' });
        return;
      }

      this.ticketService.pauseTicket(req.params.id, {
        reason: body.reason,
        pausedBy: req.user.id,
      });
      res.json({ message: '工单已暂停' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  resumeTicket(req: Request, res: Response): void {
    try {
      this.ticketService.resumeTicket(req.params.id);
      res.json({ message: '工单已恢复' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  escalateTicket(req: Request, res: Response): void {
    try {
      const body = req.body as { reason?: string };
      if (!body.reason || body.reason.trim() === '') {
        res.status(400).json({ error: '升级原因不能为空' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ error: '未登录' });
        return;
      }
      const record = this.ticketService.escalateTicket(
        req.params.id,
        body.reason.trim(),
        req.user.id
      );
      res.json({ message: '工单已升级', record });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  arbitrateTicket(req: Request, res: Response): void {
    try {
      const body = req.body as ArbitrateRequest;
      if (!body.decision) {
        res.status(400).json({ error: '仲裁决定为必填字段' });
        return;
      }
      if (!body.comment || body.comment.trim() === '') {
        res.status(400).json({ error: '仲裁意见不能为空' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ error: '未登录' });
        return;
      }
      this.ticketService.arbitrateTicket(req.params.id, req.user.id, body);
      res.json({ message: '仲裁完成' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  closeTicket(req: Request, res: Response): void {
    try {
      this.ticketService.closeTicket(req.params.id);
      res.json({ message: '工单已关闭' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  getPauseReasons(req: Request, res: Response): void {
    try {
      const reasons = this.ticketService.getPauseReasons(req.params.id);
      res.json(reasons);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  getEscalations(req: Request, res: Response): void {
    try {
      const records = this.ticketService.getEscalationRecords(req.params.id);
      res.json(records);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  getArbitration(req: Request, res: Response): void {
    try {
      const result = this.ticketService.getArbitrationResult(req.params.id);
      if (!result) {
        res.status(404).json({ error: '未找到仲裁结果' });
        return;
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  getEscalatedTickets(req: Request, res: Response): void {
    try {
      const tickets = this.ticketService.getEscalatedTickets();
      res.json(tickets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  getSlaConfig(req: Request, res: Response): void {
    try {
      const config = this.ticketService.getSlaConfig();
      res.json(config);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  updateSlaConfig(req: Request, res: Response): void {
    try {
      const body = req.body as {
        durationMinutes: number;
        escalationThresholdPercent: number;
        autoEscalate: boolean;
      };
      this.ticketService.updateSlaConfig(
        body.durationMinutes,
        body.escalationThresholdPercent,
        body.autoEscalate
      );
      res.json({ message: 'SLA配置已更新' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
}
