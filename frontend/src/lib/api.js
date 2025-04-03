import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with base URL
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth services
export const authService = {
  // Register a new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  
  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  // Get current user
  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('user'));
    }
    return null;
  },
  
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

// Feed services
export const feedService = {
  // Get all feeds
  getFeeds: async () => {
    const response = await api.get('/feeds');
    return response.data;
  },
  
  // Get feed by ID
  getFeed: async (id) => {
    const response = await api.get(`/feeds/${id}`);
    return response.data;
  },
  
  // Create new feed
  createFeed: async (feedData) => {
    const response = await api.post('/feeds', feedData);
    return response.data;
  },
  
  // Update feed
  updateFeed: async (id, feedData) => {
    const response = await api.put(`/feeds/${id}`, feedData);
    return response.data;
  },
  
  // Delete feed
  deleteFeed: async (id) => {
    const response = await api.delete(`/feeds/${id}`);
    return response.data;
  },
  
  // Import feed
  importFeed: async (id) => {
    const response = await api.post(`/feeds/${id}/import`);
    return response.data;
  },
  
  // Import all active feeds
  importAllFeeds: async () => {
    const response = await api.post('/feeds/import-all');
    return response.data;
  },
  
  // Stop active imports
  stopImport: async () => {
    const response = await api.post('/feeds/stop-import');
    return response.data;
  },
  
  // Bulk import feeds from CSV data
  bulkImportFeeds: async (feedsArray) => {
    const response = await api.post('/feeds/bulk-import', { feeds: feedsArray });
    return response.data;
  }
};

// Product services
export const productService = {
  // Get all products with optional filtering
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },
  
  // Get product by ID
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  
  // Update product
  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },
  
  // Delete product
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
  
  // Get product statistics
  getProductStats: async () => {
    const response = await api.get('/products/stats');
    return response.data;
  },
  
  // Get product price history
  getProductPriceHistory: async (productId, timeframe = 'all') => {
    try {
      const response = await api.get(`/products/${productId}/price-history?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching price history for product ${productId}:`, error);
      throw error;
    }
  },
};

// Import history services
export const importHistoryService = {
  // Get all import history entries with optional filtering
  getImportHistory: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    if (params.feedId) queryParams.append('feedId', params.feedId);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await api.get(`/import-history${query}`);
    return response.data;
  },
  
  // Get import history by ID
  getImportHistoryById: async (id) => {
    const response = await api.get(`/import-history/${id}`);
    return response.data;
  },
  
  // Get global import status
  getImportStatus: async () => {
    const response = await api.get('/import-history/status');
    return response.data;
  },
  
  // Stop all active imports
  stopAllImports: async () => {
    const response = await api.post('/import-history/stop');
    return response.data;
  }
};

export default api;
