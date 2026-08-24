import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Attach JWT automatically
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('geto_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Handle 401 globally
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('geto_token');
      localStorage.removeItem('geto_user');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export default api;
