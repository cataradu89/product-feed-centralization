// Feed service for interacting with the feed API endpoints
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

// Feed service functions
const feedService = {
  // Get all feeds
  getFeeds: async () => {
    try {
      const response = await apiClient.get('/api/feeds');
      return response.data;
    } catch (error) {
      console.error('Error fetching feeds:', error);
      throw error;
    }
  },

  // Get a single feed by ID
  getFeed: async (id) => {
    try {
      const response = await apiClient.get(`/api/feeds/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching feed ${id}:`, error);
      throw error;
    }
  },

  // Create a new feed
  createFeed: async (feedData) => {
    try {
      const response = await apiClient.post('/api/feeds', feedData);
      return response.data;
    } catch (error) {
      console.error('Error creating feed:', error);
      throw error;
    }
  },

  // Update an existing feed
  updateFeed: async (id, feedData) => {
    try {
      const response = await apiClient.put(`/api/feeds/${id}`, feedData);
      return response.data;
    } catch (error) {
      console.error(`Error updating feed ${id}:`, error);
      throw error;
    }
  },

  // Delete a feed
  deleteFeed: async (id) => {
    try {
      const response = await apiClient.delete(`/api/feeds/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting feed ${id}:`, error);
      throw error;
    }
  },

  // Import a feed (trigger the import process)
  importFeed: async (id) => {
    try {
      const response = await apiClient.post(`/api/feeds/${id}/import`);
      return response.data;
    } catch (error) {
      console.error(`Error importing feed ${id}:`, error);
      throw error;
    }
  },

  // Bulk import feeds from CSV file
  bulkImport: async (csvData) => {
    try {
      const response = await apiClient.post('/api/feeds/bulk-import', csvData);
      return response.data;
    } catch (error) {
      console.error('Error bulk importing feeds:', error);
      throw error;
    }
  },

  // Get feed products
  getFeedProducts: async (id, limit = 10, skip = 0) => {
    try {
      const response = await apiClient.get(`/api/feeds/${id}/products`, {
        params: { limit, skip }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching products for feed ${id}:`, error);
      throw error;
    }
  },
};

export default feedService;
