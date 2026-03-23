import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
}

function clearAuth(): void {
  localStorage.removeItem('cleancheck_token');
  localStorage.removeItem('cleancheck_refresh_token');
  localStorage.removeItem('cleancheck_user');
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cleancheck_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't retry refresh or logout requests, or non-401 errors
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url === '/auth/refresh' ||
      originalRequest.url === '/auth/logout'
    ) {
      if (error.response?.status === 401) {
        clearAuth();
      }
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('cleancheck_refresh_token');
    if (!refreshToken) {
      clearAuth();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      localStorage.setItem('cleancheck_token', data.token);
      localStorage.setItem('cleancheck_refresh_token', data.refreshToken);

      // Process queued requests with new token
      processQueue(null, data.token);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${data.token}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — reject all queued requests and clear auth
      processQueue(refreshError, null);
      clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
