import axios from 'axios';

const API_PORT = 5000; 
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

// Add a request interceptor to inject the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 202 unauthorized responses that we use to avoid Chrome network errors
api.interceptors.response.use(
  (response) => {
    if (response.status === 202 && response.data?.error === 'unauthorized') {
      // Treat logic-level auth failures as rejections without throwing network console errors
      return Promise.reject({
        response: {
          status: 401,
          data: { message: response.data.message }
        }
      });
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
