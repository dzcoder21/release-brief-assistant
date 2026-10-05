import axios from 'axios';

export const TOKEN_KEY = 'rba_token';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';

    if (
      err.response?.status === 401 &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register')
    ) {
      window.dispatchEvent(new Event('auth:expired'));
    }

    return Promise.reject(err);
  }
);

export const errorMessage = (
  err,
  fallback = 'Something went wrong. Please try again.'
) => {
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }

  if (err?.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.';
  }

  if (err?.message === 'Network Error') {
    return 'Cannot reach the server. Check that the backend is running.';
  }

  return fallback;
};

export const errorCode = (err) => err?.response?.data?.code;

export default api;