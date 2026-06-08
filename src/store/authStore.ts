import { create } from 'zustand';
import { authAPI } from '../lib/api.js';
import type { User, LoginRequest, LoginResponse } from '../../shared/types.js';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ loading: true, error: null });
    try {
      const result = await authAPI.login(data);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      set({
        user: result.user,
        token: result.token,
        isAuthenticated: true,
        loading: false,
      });
      return result;
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || '登录失败';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await authAPI.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  },

  loadCurrentUser: async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      set({ user: JSON.parse(storedUser) });
    }
    try {
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true });
      localStorage.setItem('user', JSON.stringify(user));
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
