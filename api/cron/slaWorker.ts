import cron, { type ScheduledTask } from 'node-cron';
import { TicketService } from '../services/TicketService.js';

export class SlaWorker {
  private ticketService: TicketService;
  private task: ScheduledTask | null = null;
  private running = false;
  private lastRunTime: Date | null = null;

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }

  start(): void {
    if (this.task) {
      console.log('SLA Worker 已在运行');
      return;
    }

    console.log('启动 SLA Worker，每分钟执行一次');
    this.running = true;

    this.task = cron.schedule('* * * * *', async () => {
      await this.run();
    });

    setTimeout(() => this.run(), 5000);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.running = false;
      console.log('SLA Worker 已停止');
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getLastRunTime(): Date | null {
    return this.lastRunTime;
  }

  private async run(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.lastRunTime = new Date();
    console.log(`[${this.lastRunTime.toISOString()}] 开始检查超时工单...`);

    try {
      const records = this.ticketService.autoEscalateOverdueTickets();
      if (records.length > 0) {
        console.log(`自动升级了 ${records.length} 个超时工单`);
      } else {
        console.log('没有发现超时工单');
      }
    } catch (e) {
      console.error('SLA Worker 执行出错:', e);
    }
  }
}
