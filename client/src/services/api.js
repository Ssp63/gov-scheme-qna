import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 120000, // 2 minutes timeout for AI responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ensure JSON serialization for POST/PUT requests
    if (config.data && typeof config.data === 'object' && 
        (config.method === 'post' || config.method === 'put') &&
        config.headers['Content-Type'] === 'application/json') {
      // Request data logging removed for production
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('Access forbidden. You do not have permission.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Authentication
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    verifyEmail: (email) => api.get(`/auth/verify-email/${email}`),
  },

  // Schemes
  schemes: {
    getAll: (params) => api.get('/schemes', { params }),
    getAdminAll: (params) => api.get('/schemes/admin/all', { params }),
    getById: (id) => api.get(`/schemes/${id}`),
    create: (data) => {
      // Check if data is FormData (for file uploads)
      if (data instanceof FormData) {
        return api.post('/schemes', data, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      return api.post('/schemes', data);
    },
    update: (id, data) => {
      // Check if data is FormData (for file uploads)
      if (data instanceof FormData) {
        return api.put(`/schemes/${id}`, data, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      return api.put(`/schemes/${id}`, data);
    },
    delete: (id) => api.delete(`/schemes/${id}`),
    permanentDelete: (id) => api.delete(`/schemes/${id}/permanent`),
    restore: (id) => api.post(`/schemes/${id}/restore`),
    search: (query) => api.get('/schemes/search', { params: { q: query } }),
  },

  // Chat
  chat: {
    askQuestion: (data) => api.post('/chat/ask', data),
    getPopularQuestions: () => api.get('/chat/popular/questions'),
    searchAllSchemes: (data) => api.post('/chat/search/all-schemes', data),
    getSearchSuggestions: (params) => api.get('/chat/search/suggestions', { params }),
    // Chat history and storage features removed - not needed for temporary users
  },

  // User Management (Super Admin only)
  users: {
    getAll: () => api.get('/auth/users'),
    getById: (id) => api.get(`/auth/users/${id}`),
    create: (userData) => api.post('/auth/register', userData),
    update: (id, userData) => api.put(`/auth/users/${id}`, userData),
    delete: (id) => api.delete(`/auth/users/${id}`),
  },

  // File Upload
  upload: {
    documents: (formData, onProgress) => 
      api.post('/upload/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress,
      }),
    getDocuments: (params) => api.get('/upload/documents', { params }),
    getDocument: (id) => api.get(`/upload/documents/${id}`),
    deleteDocument: (id) => api.delete(`/upload/documents/${id}`),
  },

  // Analytics (lightweight, 4 documents only)
  analytics: {
    getOverview: () => api.get('/analytics/overview'),
    resetAnalytics: () => api.post('/analytics/reset'),
    getSummary: () => api.get('/analytics/summary'),
  },

  // Health check
  health: () => api.get('/health'),
};

export default api;