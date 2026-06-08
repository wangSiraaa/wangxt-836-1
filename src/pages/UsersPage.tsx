import { useEffect, useState } from 'react';
import { authAPI } from '../lib/api.js';
import type { User, UserRole } from '../../shared/types.js';
import { Users, Shield, Mail, AlertCircle } from 'lucide-react';

const roleNames: Record<UserRole, string> = {
  agent: '客服专员',
  supervisor: '客服主管',
  arbitrator: '仲裁专员',
  admin: '系统管理员',
};

const roleColors: Record<UserRole, string> = {
  agent: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-green-100 text-green-800',
  arbitrator: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

const roleDescriptions: Record<UserRole, string> = {
  agent: '创建工单、处理工单、暂停/恢复工单',
  supervisor: '升级工单、关闭工单、仲裁工单',
  arbitrator: '仲裁SLA升级工单',
  admin: '系统配置、用户管理、SLA配置',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authAPI.getUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.response?.data?.error || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">权限管理</h1>
        <p className="text-gray-500">管理系统用户和角色权限分配</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        {Object.entries(roleDescriptions).map(([role, desc]) => (
          <div key={role} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${
                roleColors[role as UserRole]
              }`}
            >
              {roleNames[role as UserRole]}
            </span>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            用户列表
          </h2>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            加载中...
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无用户数据</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户信息
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户名
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.realName?.charAt(0) || user.username?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.realName || '-'}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.username}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          roleColors[user.role]
                        }`}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {roleNames[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleString('zh-CN')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">测试账户说明</h3>
        <p className="text-yellow-700 text-sm mb-4">
          系统预置了以下测试账户，所有账户密码均为 <code className="bg-yellow-100 px-2 py-0.5 rounded">123456</code>
        </p>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <p className="font-mono font-semibold text-gray-900">agent</p>
            <p className="text-sm text-gray-500">客服专员</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <p className="font-mono font-semibold text-gray-900">supervisor</p>
            <p className="text-sm text-gray-500">客服主管</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <p className="font-mono font-semibold text-gray-900">arbitrator</p>
            <p className="text-sm text-gray-500">仲裁专员</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <p className="font-mono font-semibold text-gray-900">admin</p>
            <p className="text-sm text-gray-500">系统管理员</p>
          </div>
        </div>
      </div>
    </div>
  );
}
