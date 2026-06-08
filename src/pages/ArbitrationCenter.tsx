import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicketStore } from '../store/ticketStore.js';
import { useAuthStore } from '../store/authStore.js';
import type { Ticket } from '../../shared/types.js';
import {
  Gavel,
  Clock,
  AlertTriangle,
  Eye,
  TrendingUp,
  User,
  Calendar,
} from 'lucide-react';

export default function ArbitrationCenter() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { escalatedTickets, loading, error, fetchEscalatedTickets } = useTicketStore();

  useEffect(() => {
    fetchEscalatedTickets();
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '已超时';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const canArbitrate = user && ['arbitrator', 'supervisor', 'admin'].includes(user.role);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">升级仲裁中心</h1>
        <p className="text-gray-500">处理SLA超时或人工升级的工单</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          加载中...
        </div>
      )}

      {!loading && escalatedTickets.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Gavel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无待仲裁工单</h3>
          <p className="text-gray-500">所有升级工单已处理完毕</p>
        </div>
      )}

      {!loading && escalatedTickets.length > 0 && (
        <div className="space-y-4">
          {escalatedTickets.map((ticket: Ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-xl shadow-sm border border-red-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{ticket.title}</h3>
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        Lv.{ticket.escalationLevel || 1}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {ticket.customerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(ticket.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <TrendingUp className="w-4 h-4" />
                        SLA超时
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">SLA 已超时</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatDuration(Math.abs(ticket.slaRemainingMs ?? 0))}
                    </p>
                  </div>
                  {canArbitrate && (
                    <button
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                    >
                      <Gavel className="w-4 h-4" />
                      仲裁处理
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
