import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicketStore } from '../store/ticketStore.js';
import { useAuthStore } from '../store/authStore.js';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  TrendingUp,
  XCircle,
  CheckCircle,
  Gavel,
  User,
  Calendar,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import type { TicketStatus, ArbitrationDecision } from '../../shared/types.js';

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

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentTicket,
    pauseReasons,
    escalations,
    arbitration,
    loading,
    error,
    fetchTicket,
    fetchPauseReasons,
    fetchEscalations,
    fetchArbitration,
    processTicket,
    pauseTicket,
    resumeTicket,
    escalateTicket,
    arbitrateTicket,
    closeTicket,
    clearCurrent,
    clearError,
  } = useTicketStore();

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseError, setPauseError] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [showArbitrateModal, setShowArbitrateModal] = useState(false);
  const [arbitrationForm, setArbitrationForm] = useState({
    decision: 'approve' as ArbitrationDecision,
    comment: '',
    adjustmentMinutes: 0,
  });

  useEffect(() => {
    if (id) {
      fetchTicket(id);
      fetchPauseReasons(id);
      fetchEscalations(id);
      fetchArbitration(id);
    }
    return () => clearCurrent();
  }, [id]);

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

  const canProcess = user && ['agent', 'supervisor', 'admin'].includes(user.role) && currentTicket?.status === 'open';
  const canPause = user && ['agent', 'supervisor', 'admin'].includes(user.role) && ['open', 'processing'].includes(currentTicket?.status || '');
  const canResume = user && ['agent', 'supervisor', 'admin'].includes(user.role) && currentTicket?.status === 'paused';
  const canEscalate = user && ['supervisor', 'admin'].includes(user.role) && ['open', 'processing', 'paused'].includes(currentTicket?.status || '');
  const canArbitrate = user && ['arbitrator', 'supervisor', 'admin'].includes(user.role) && currentTicket?.status === 'escalated';
  const canClose = user && ['supervisor', 'admin'].includes(user.role) && ['open', 'processing', 'paused', 'arbitrated'].includes(currentTicket?.status || '');

  const handlePause = async () => {
    setPauseError('');

    if (!pauseReason.trim()) {
      setPauseError('暂停原因不能为空');
      return;
    }
    if (pauseReason.trim().length < 5) {
      setPauseError('暂停原因至少5个字符');
      return;
    }
    if (!id || !user) return;

    try {
      await pauseTicket(id, {
        reason: pauseReason,
        pausedBy: user.id,
      });
      setShowPauseModal(false);
      setPauseReason('');
    } catch (e: any) {
      setPauseError(e.message);
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) {
      alert('升级原因不能为空');
      return;
    }
    if (!id) return;

    try {
      await escalateTicket(id, escalateReason);
      setShowEscalateModal(false);
      setEscalateReason('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleArbitrate = async () => {
    if (!arbitrationForm.comment.trim()) {
      alert('仲裁意见不能为空');
      return;
    }
    if (!id || !user) return;

    try {
      await arbitrateTicket(id, {
        decision: arbitrationForm.decision,
        comment: arbitrationForm.comment,
        slaAdjustmentMinutes: arbitrationForm.decision === 'adjust' ? arbitrationForm.adjustmentMinutes : undefined,
      });
      setShowArbitrateModal(false);
      setArbitrationForm({ decision: 'approve', comment: '', adjustmentMinutes: 0 });
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading && !currentTicket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentTicket) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">工单不存在</p>
        <button
          onClick={() => navigate('/tickets')}
          className="text-indigo-600 hover:text-indigo-800"
        >
          返回列表
        </button>
      </div>
    );
  }

  const totalMs = (currentTicket.slaDurationMinutes || 1440) * 60 * 1000;
  const remainingMs = currentTicket.slaRemainingMs ?? 0;
  const slaPercent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回工单列表
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentTicket.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {currentTicket.customerName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(currentTicket.createdAt)}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[currentTicket.status]
                }`}
              >
                {statusLabels[currentTicket.status]}
              </span>
              {currentTicket.escalationLevel && currentTicket.escalationLevel > 0 && (
                <span className="text-red-600 font-medium">
                  升级等级 Lv.{currentTicket.escalationLevel}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canProcess && (
              <button
                onClick={() => id && processTicket(id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                开始处理
              </button>
            )}
            {canPause && (
              <button
                onClick={() => setShowPauseModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                暂停
              </button>
            )}
            {canResume && (
              <button
                onClick={() => id && resumeTicket(id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                恢复
              </button>
            )}
            {canEscalate && (
              <button
                onClick={() => setShowEscalateModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                升级
              </button>
            )}
            {canArbitrate && (
              <button
                onClick={() => setShowArbitrateModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                <Gavel className="w-4 h-4" />
                仲裁
              </button>
            )}
            {canClose && (
              <button
                onClick={() => {
                  if (confirm('确定要关闭此工单吗？')) {
                    id && closeTicket(id);
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                关闭
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-600">{error}</p>
          <button onClick={clearError} className="ml-auto text-red-500 hover:text-red-700">
            关闭
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">SLA 剩余时间</h3>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {currentTicket.status === 'closed' || currentTicket.status === 'arbitrated'
              ? '-'
              : currentTicket.status === 'paused'
              ? '已暂停'
              : formatDuration(remainingMs)}
          </div>
          {currentTicket.status !== 'closed' &&
            currentTicket.status !== 'arbitrated' &&
            currentTicket.status !== 'paused' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    slaPercent < 20 ? 'bg-red-500' : slaPercent < 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${slaPercent}%` }}
                />
              </div>
            )}
          {remainingMs <= 0 && currentTicket.status !== 'closed' && currentTicket.status !== 'arbitrated' && (
            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              已超时，等待自动升级
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">客户邮箱</h3>
          <p className="text-lg font-medium text-gray-900">{currentTicket.customerEmail}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">SLA 总时长</h3>
          <p className="text-lg font-medium text-gray-900">
            {currentTicket.slaDurationMinutes
              ? `${Math.floor(currentTicket.slaDurationMinutes / 60)}小时${currentTicket.slaDurationMinutes % 60}分钟`
              : '24小时'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            工单描述
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{currentTicket.description}</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pause className="w-5 h-5 text-orange-500" />
              暂停记录
            </h3>
            {pauseReasons.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无暂停记录</p>
            ) : (
              <div className="space-y-3">
                {pauseReasons.map((reason) => (
                  <div key={reason.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-900">{reason.reason}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>暂停时间：{formatDate(reason.pausedAt)}</span>
                      {reason.resumedAt && (
                        <span>恢复时间：{formatDate(reason.resumedAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              升级记录
            </h3>
            {escalations.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无升级记录</p>
            ) : (
              <div className="space-y-3">
                {escalations.map((record) => (
                  <div key={record.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-red-800">
                        Lv.{record.escalationLevel}
                        {record.isAutoEscalation && ' (自动升级)'}
                      </span>
                      <span className="text-xs text-red-600">
                        {formatDate(record.escalatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-red-700">{record.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {arbitration && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Gavel className="w-5 h-5 text-purple-500" />
                仲裁结果
              </h3>
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-sm font-medium ${
                      arbitration.decision === 'approve'
                        ? 'bg-green-100 text-green-800'
                        : arbitration.decision === 'reject'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {arbitration.decision === 'approve'
                      ? '批准升级'
                      : arbitration.decision === 'reject'
                      ? '驳回升级'
                      : '调整SLA'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(arbitration.arbitratedAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{arbitration.comment}</p>
                {arbitration.adjustmentMinutes && (
                  <p className="text-sm text-gray-500 mt-2">
                    SLA 调整：+{arbitration.adjustmentMinutes} 分钟
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">暂停工单</h2>
            <p className="text-gray-500 mb-6">
              暂停工单会暂停SLA时钟，请填写暂停原因：
            </p>

            {pauseError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {pauseError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                暂停原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="请至少填写5个字符..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {pauseReason.trim().length}/5 字符
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPauseModal(false);
                  setPauseReason('');
                  setPauseError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handlePause}
                disabled={!pauseReason.trim() || pauseReason.trim().length < 5}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认暂停
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">升级工单</h2>
            <p className="text-gray-500 mb-6">
              将工单升级至主管处理，请填写升级原因：
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                升级原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="请填写升级原因..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEscalateModal(false);
                  setEscalateReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleEscalate}
                disabled={!escalateReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认升级
              </button>
            </div>
          </div>
        </div>
      )}

      {showArbitrateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">仲裁工单</h2>

            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  仲裁决定 <span className="text-red-500">*</span>
                </label>
                <select
                  value={arbitrationForm.decision}
                  onChange={(e) =>
                    setArbitrationForm({
                      ...arbitrationForm,
                      decision: e.target.value as ArbitrationDecision,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="approve">批准升级</option>
                  <option value="reject">驳回升级</option>
                  <option value="adjust">调整SLA时效</option>
                </select>
              </div>

              {arbitrationForm.decision === 'adjust' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    调整时长（分钟）
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={arbitrationForm.adjustmentMinutes}
                    onChange={(e) =>
                      setArbitrationForm({
                        ...arbitrationForm,
                        adjustmentMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  仲裁意见 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={arbitrationForm.comment}
                  onChange={(e) =>
                    setArbitrationForm({ ...arbitrationForm, comment: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请详细说明仲裁理由..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowArbitrateModal(false);
                  setArbitrationForm({ decision: 'approve', comment: '', adjustmentMinutes: 0 });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleArbitrate}
                disabled={!arbitrationForm.comment.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认仲裁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
