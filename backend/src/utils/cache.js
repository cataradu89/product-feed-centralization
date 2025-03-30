const redis = require('redis');
const { promisify } = require('util');

// Create Redis client
const redisUrl = process.env.REDIS_URI || 'redis://localhost:6379';
const client = redis.createClient({
  url: redisUrl,
  legacyMode: true
});

// Handle Redis connection errors
client.on('error', (err) => {
  console.error('Redis Error:', err);
});

client.on('connect', () => {
  console.log('Connected to Redis server');
});

// Connect to Redis
client.connect().catch(console.error);

// Promisify Redis commands
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);
const flushAsync = promisify(client.flushAll).bind(client);
const keysAsync = promisify(client.keys).bind(client);

// Cache middleware
const cache = {
  // Get data from cache
  async get(key) {
    try {
      const cachedData = await getAsync(key);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      console.error('Redis GET Error:', error);
      return null;
    }
  },

  // Set data in cache with expiration (in seconds)
  async set(key, data, expiration = 3600) {
    try {
      await setAsync(key, JSON.stringify(data), 'EX', expiration);
      return true;
    } catch (error) {
      console.error('Redis SET Error:', error);
      return false;
    }
  },

  // Delete cache by key
  async del(key) {
    try {
      await delAsync(key);
      return true;
    } catch (error) {
      console.error('Redis DEL Error:', error);
      return false;
    }
  },

  // Clear all cache
  async flush() {
    try {
      await flushAsync();
      return true;
    } catch (error) {
      console.error('Redis FLUSHALL Error:', error);
      return false;
    }
  },

  // Cache middleware for Express routes
  middleware(keyPrefix, expiration = 3600) {
    return async (req, res, next) => {
      // Skip cache in development mode
      if (process.env.NODE_ENV === 'development') {
        return next();
      }

      // Create a cache key based on the route and query parameters
      const key = `${keyPrefix}:${req.originalUrl || req.url}`;
      
      try {
        // Try to get data from cache
        const cachedData = await cache.get(key);
        
        if (cachedData) {
          // Return cached data
          return res.json(cachedData);
        }
        
        // Store the original res.json method
        const originalJson = res.json;
        
        // Override res.json method to cache the response
        res.json = function(data) {
          // Cache the response data
          cache.set(key, data, expiration);
          
          // Call the original res.json method
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        console.error('Cache Middleware Error:', error);
        next();
      }
    };
  },

  // Clear cache by pattern (using key prefix)
  async clearByPattern(pattern) {
    try {
      // Get all keys
      const keys = await keysAsync(pattern);
      
      // Delete all keys matching the pattern
      if (keys.length > 0) {
        await Promise.all(keys.map(key => delAsync(key)));
      }
      
      return true;
    } catch (error) {
      console.error('Redis Clear Pattern Error:', error);
      return false;
    }
  }
};

module.exports = cache;
