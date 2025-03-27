// Store service for interacting with the stores API endpoints
import axios from 'axios';

// Base URL for API calls
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Store service functions
const storeService = {
  // Get all stores with product counts
  getStores: async () => {
    try {
      // Fix the API path to include the full endpoint
      const response = await apiClient.get('/api/stores/v2');
      return response.data;
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }
  },

  // Get products for a specific store
  getStoreProducts: async (storeName, limit = 10, skip = 0) => {
    try {
      // Fix the API path to include the full endpoint
      const response = await apiClient.get(`/api/stores/v2/${encodeURIComponent(storeName)}/products`, {
        params: { limit, skip }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching products for store ${storeName}:`, error);
      throw error;
    }
  },

  // Generate favicon for a store
  generateFavicon: async (storeId, size = 128) => {
    try {
      const response = await apiClient.post(`/api/stores/v2/${storeId}/favicon`, { size });
      return response.data;
    } catch (error) {
      console.error(`Error generating favicon for store ${storeId}:`, error);
      throw error;
    }
  },

  // Generate favicons for all stores without one
  generateAllFavicons: async (size = 128) => {
    try {
      const response = await apiClient.post('/api/stores/v2/generate-all-favicons', { size });
      return response.data;
    } catch (error) {
      console.error('Error generating favicons for all stores:', error);
      throw error;
    }
  },

  // Refresh store list from products
  refreshStores: async () => {
    try {
      const response = await apiClient.get('/api/stores/v2', { params: { refresh: true } });
      return response.data;
    } catch (error) {
      console.error('Error refreshing stores:', error);
      throw error;
    }
  }
};

export default storeService;
