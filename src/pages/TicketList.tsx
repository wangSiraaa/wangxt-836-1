import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicketStore } from '../store/ticketStore.js';
import { useAuthStore } from '../store/authStore.js';
import type { TicketStatus, Ticket } from '../../shared/types.js';
import {
  Ticket as TicketIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  Pause,
  Eye,
  Plus,
  Filter,
  ChevronDown,
  XCircle,
} from 'lucide-react';

const statusLabels: Record<TicketStatus, string> = {
  open: '待处理',
  processing: '处理中',
  paused: '已暂停',
  escalated: '已升级',
  arbitrated: '已仲裁',
  closed: '已关闭',
};

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  paused: 'bg-orange-100 text-orange-800',
  escalated: 'bg-red-100 text-red-800',
  arbitrated: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-600',
};

export default function TicketList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tickets, loading, error, fetchTickets, clearError } = useTicketStore();
  const [filterStatus, setFilterStatus] = useState<TicketStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    customerName: '',
    customerEmail: '',
  });
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchTickets(filterStatus || undefined);
  }, [filterStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      const timeEl = document.getElementById('current-time');
      if (timeEl) {
        timeEl.textContent = new Date().toLocaleString('zh-CN');
      }
    }, 1000);
    return () => clearInterval(timer);
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

  const getSlaColor = (remainingMs: number, totalMs: number) => {
    if (remainingMs <= 0) return 'text-red-600 bg-red-50';
    const ratio = remainingMs / totalMs;
    if (ratio < 0.2) return 'text-red-600 bg-red-50';
    if (ratio < 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.title.trim()) {
      setCreateError('请输入工单标题');
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError('请输入工单描述');
      return;
    }
    if (!createForm.customerName.trim()) {
      setCreateError('请输入客户名称');
      return;
    }
    if (!createForm.customerEmail.trim()) {
      setCreateError('请输入客户邮箱');
      return;
    }

    try {
      const { createTicket } = useTicketStore.getState();
      await createTicket(createForm);
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', customerName: '', customerEmail: '' });
    } catch (e: any) {
      setCreateError(e.message);
    }
  };

  const canCreate = user && ['agent', 'supervisor', 'admin'].includes(user.role);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">工单列表</h1>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              新建工单
            </button>
          )}
        </div>
        <p className="text-gray-500">管理所有客户工单，跟踪SLA处理时效</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">状态筛选：</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  filterStatus === ''
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                全部
              </button>
              {Object.entries(statusLabels).map(([status, label]) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as TicketStatus)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    filterStatus === status
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            加载中...
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div className="p-12 text-center">
            <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无工单数据</p>
          </div>
        )}

        {!loading && tickets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工单信息
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客户信息
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SLA 剩余时间
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket: Ticket) => {
                  const totalMs = (ticket.slaDurationMinutes || 1440) * 60 * 1000;
                  const remainingMs = ticket.slaRemainingMs ?? 0;
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {ticket.status === 'escalated' && (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                          {ticket.status === 'paused' && (
                            <Pause className="w-5 h-5 text-orange-500" />
                          )}
                          {ticket.status === 'closed' && (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                          {ticket.status === 'arbitrated' && (
                            <CheckCircle className="w-5 h-5 text-purple-500" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{ticket.title}</p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {ticket.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{ticket.customerName}</p>
                        <p className="text-xs text-gray-500">{ticket.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[ticket.status]
                          }`}
                        >
                          {statusLabels[ticket.status]}
                        </span>
                        {ticket.escalationLevel && ticket.escalationLevel > 0 && (
                          <span className="ml-2 text-xs text-red-600">
                            Lv.{ticket.escalationLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ticket.status === 'closed' || ticket.status === 'arbitrated' ? (
                          <span className="text-gray-400 text-sm">-</span>
                        ) : ticket.status === 'paused' ? (
                          <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-sm">
                            <Pause className="w-3 h-3 inline mr-1" />
                            已暂停
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              getSlaColor(remainingMs, totalMs)
                            }`}
                          >
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatDuration(remainingMs)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          查看
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">新建工单</h2>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工单标题
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="请输入工单标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工单描述
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="请详细描述问题"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    客户名称
                  </label>
                  <input
                    type="text"
                    value={createForm.customerName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, customerName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="客户姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    客户邮箱
                  </label>
                  <input
                    type="email"
                    value={createForm.customerEmail}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, customerEmail: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                >
                  创建工单
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
