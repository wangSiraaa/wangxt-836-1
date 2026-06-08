import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicketStore } from '../store/ticketStore.js';
import { useAuthStore } from '../store/authStore.js';
import type { Ticket } from '../../shared/types.js';
import {
  BarChart3,
  Ticket as TicketIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  Pause,
  TrendingUp,
  Eye,
  Plus,
  ArrowRight,
  Users,
  Timer,
  Target,
  XCircle,
} from 'lucide-react';

const statusLabels: Record<string, string> = {
  open: '待处理',
  processing: '处理中',
  paused: '已暂停',
  escalated: '已升级',
  arbitrated: '已仲裁',
  closed: '已关闭',
};

const statusColors: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  paused: 'bg-orange-100 text-orange-800',
  escalated: 'bg-red-100 text-red-800',
  arbitrated: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-600',
};

export default function StatsPanel() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    statsOverview,
    statsLoading,
    error,
    fetchStatsOverview,
    createTicket,
    clearError,
    clearStats,
  } = useTicketStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    customerName: '',
    customerEmail: '',
  });
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchStatsOverview();
    return () => clearStats();
  }, []);

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

  const formatMinutes = (minutes: number) => {
    if (minutes <= 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) return `${hours}小时${mins}分钟`;
    return `${mins}分钟`;
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
      const ticket = await createTicket(createForm);
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', customerName: '', customerEmail: '' });
      navigate(`/tickets/${ticket.id}`);
    } catch (e: any) {
      setCreateError(e.message);
    }
  };

  const canCreate = user && ['agent', 'supervisor', 'admin'].includes(user.role);

  const statsCards = statsOverview
    ? [
        {
          label: '总工单数',
          value: statsOverview.stats.total,
          icon: TicketIcon,
          color: 'bg-indigo-500',
          bgColor: 'bg-indigo-50',
          textColor: 'text-indigo-600',
        },
        {
          label: '待处理',
          value: statsOverview.stats.open,
          icon: Clock,
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-600',
        },
        {
          label: '处理中',
          value: statsOverview.stats.processing,
          icon: Users,
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
        },
        {
          label: '已暂停',
          value: statsOverview.stats.paused,
          icon: Pause,
          color: 'bg-orange-500',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-600',
        },
        {
          label: '已升级',
          value: statsOverview.stats.escalated,
          icon: TrendingUp,
          color: 'bg-red-500',
          bgColor: 'bg-red-50',
          textColor: 'text-red-600',
        },
        {
          label: '已关闭',
          value: statsOverview.stats.closed,
          icon: CheckCircle,
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          textColor: 'text-green-600',
        },
      ]
    : [];

  const renderTicketCard = (ticket: Ticket) => {
    const totalMs = (ticket.slaDurationMinutes || 1440) * 60 * 1000;
    const remainingMs = ticket.slaRemainingMs ?? 0;
    const getSlaColor = (r: number, t: number) => {
      if (r <= 0) return 'text-red-600 bg-red-50';
      const ratio = r / t;
      if (ratio < 0.2) return 'text-red-600 bg-red-50';
      if (ratio < 0.5) return 'text-yellow-600 bg-yellow-50';
      return 'text-green-600 bg-green-50';
    };

    return (
      <div
        key={ticket.id}
        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        onClick={() => navigate(`/tickets/${ticket.id}`)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
            <p className="text-xs text-gray-500 truncate">{ticket.customerName}</p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${statusColors[ticket.status]}`}
          >
            {statusLabels[ticket.status]}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          {ticket.status === 'closed' || ticket.status === 'arbitrated' ? (
            <span className="text-gray-400">-</span>
          ) : ticket.status === 'paused' ? (
            <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-1">
              <Pause className="w-3 h-3" />
              已暂停
            </span>
          ) : (
            <span
              className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 ${getSlaColor(remainingMs, totalMs)}`}
            >
              <Clock className="w-3 h-3" />
              {formatDuration(remainingMs)}
            </span>
          )}
          <span className="text-gray-400">{formatDate(ticket.createdAt).split(' ')[0]}</span>
        </div>
      </div>
    );
  };

  if (statsLoading && !statsOverview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">统计面板</h1>
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
        <p className="text-gray-500">实时监控工单处理状态和SLA履约情况</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-red-600">{error}</p>
          <button onClick={clearError} className="ml-auto text-red-500 hover:text-red-700">
            关闭
          </button>
        </div>
      )}

      {statsOverview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statsCards.map((card, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statsOverview.stats.overdue}</p>
                  <p className="text-sm text-gray-500">SLA 超时工单</p>
                </div>
              </div>
              {statsOverview.stats.overdue > 0 && (
                <button
                  onClick={() => navigate('/tickets', { state: { filter: 'overdue' } })}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                >
                  查看超时工单 <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Timer className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMinutes(statsOverview.stats.avgResolutionMinutes)}
                  </p>
                  <p className="text-sm text-gray-500">平均解决时长</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (statsOverview.stats.avgResolutionMinutes / 1440) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsOverview.stats.slaComplianceRate}%
                  </p>
                  <p className="text-sm text-gray-500">SLA 履约率</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    statsOverview.stats.slaComplianceRate >= 90
                      ? 'bg-green-500'
                      : statsOverview.stats.slaComplianceRate >= 70
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${statsOverview.stats.slaComplianceRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">最近工单</h3>
                <button
                  onClick={() => navigate('/tickets')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  全部工单 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {statsOverview.recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">暂无工单</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statsOverview.recentTickets.map(renderTicketCard)}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  已升级工单
                </h3>
                <button
                  onClick={() => navigate('/escalated')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  仲裁中心 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {statsOverview.escalatedTickets.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">暂无升级工单</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statsOverview.escalatedTickets.slice(0, 5).map(renderTicketCard)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Pause className="w-5 h-5 text-orange-500" />
                  已暂停工单
                </h3>
                <button
                  onClick={() => navigate('/tickets', { state: { filter: 'paused' } })}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  查看全部 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {statsOverview.pausedTickets.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">暂无暂停工单</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statsOverview.pausedTickets.slice(0, 5).map(renderTicketCard)}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  超时工单
                </h3>
                <button
                  onClick={() => navigate('/tickets', { state: { filter: 'overdue' } })}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  查看全部 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {statsOverview.overdueTickets.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                  <p className="text-gray-500">暂无超时工单</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statsOverview.overdueTickets.slice(0, 5).map(renderTicketCard)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">操作快捷入口</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/tickets')}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TicketIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">工单列表</span>
              </button>
              {canCreate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">新建工单</span>
                </button>
              )}
              {user && ['supervisor', 'arbitrator', 'admin'].includes(user.role) && (
                <button
                  onClick={() => navigate('/escalated')}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">升级仲裁</span>
                </button>
              )}
              {user && user.role === 'admin' && (
                <button
                  onClick={() => navigate('/users')}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">权限管理</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
