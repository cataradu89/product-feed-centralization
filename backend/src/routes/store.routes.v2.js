const express = require('express');
const router = express.Router();
const Product = require('../models/product.model');
const Store = require('../models/store.model');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const cache = require('../utils/cache');

// Utility function to extract domain from store name
const extractDomain = (storeName) => {
  // Remove common suffixes/prefixes and extract domain-like part
  const domainPattern = /(?:www\.)?([\w-]+(?:\.[\w-]+)+)/i;
  const match = storeName.match(domainPattern);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  
  // If no match but contains dots, use the full string
  if (storeName.includes('.')) {
    return storeName.toLowerCase();
  }
  
  // Default fallback
  return null;
};

// Get all unique campaign_names (stores) with product counts
router.get('/', cache.middleware('stores', 300), async (req, res) => {
  try {
    // Get all stores from the Store collection, or create if not exist
    let stores = await Store.find().sort({ productCount: -1 });
    
    if (stores.length === 0) {
      // If no stores exist, create them from product data
      const storeData = await Product.aggregate([
        {
          $group: {
            _id: '$campaign_name',
            productCount: { $sum: 1 },
            lastUpdated: { $max: '$lastUpdated' }
          }
        },
        { $sort: { productCount: -1 } }
      ]);
      
      // Create store documents
      const storePromises = storeData.map(async (store) => {
        const domain = extractDomain(store._id);
        
        return Store.create({
          name: store._id,
          domain,
          productCount: store.productCount,
          lastUpdated: store.lastUpdated
        });
      });
      
      stores = await Promise.all(storePromises);
    }
    
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ message: 'Error fetching stores', error: error.message });
  }
});

// Get products for a specific store
router.get('/:storeName/products', cache.middleware('store-products', 300), async (req, res) => {
  try {
    const { storeName } = req.params;
    const { page = 1, limit = 20, sort = 'lastUpdated', order = 'desc' } = req.query;
    
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sort] = sortOrder;
    
    const products = await Product.find({ campaign_name: storeName })
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Product.countDocuments({ campaign_name: storeName });
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching store products:', error);
    res.status(500).json({ message: 'Error fetching store products', error: error.message });
  }
});

// Generate favicon for a specific store
router.post('/:storeId/generate-favicon', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { size = 128 } = req.body;
    
    // Find the store
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    // Check if domain exists
    if (!store.domain) {
      // Try to extract domain from store name
      const domain = extractDomain(store.name);
      if (!domain) {
        return res.status(400).json({ message: 'Cannot generate favicon: no domain available' });
      }
      
      // Update store with domain
      store.domain = domain;
      await store.save();
    }
    
    // Create directory for favicons if it doesn't exist
    const faviconDir = path.join(__dirname, '../../public/favicons');
    try {
      await mkdirAsync(faviconDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    
    // Generate filename
    const filename = `${store._id.toString()}.png`;
    const filepath = path.join(faviconDir, filename);
    
    // Fetch favicon from Google's favicon service
    const domain = store.domain;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    
    try {
      const response = await axios.get(faviconUrl, { responseType: 'arraybuffer' });
      await writeFileAsync(filepath, response.data);
      
      // Update store with favicon info
      store.favicon = filename;
      store.faviconUrl = `/public/favicons/${filename}`;
      store.faviconGeneratedAt = new Date();
      await store.save();
      
      // Clear cache for stores
      await cache.clearByPattern('stores:*');
      
      res.json({
        message: 'Favicon generated successfully',
        store
      });
    } catch (error) {
      console.error('Error fetching favicon:', error);
      res.status(500).json({ message: 'Error generating favicon', error: error.message });
    }
  } catch (error) {
    console.error('Error in generate-favicon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate favicons for all stores that don't have one
router.post('/generate-all-favicons', async (req, res) => {
  try {
    const { size = 128 } = req.body;
    
    // Find stores without favicons
    const stores = await Store.find({ favicon: null });
    
    if (stores.length === 0) {
      return res.json({ message: 'No stores without favicons found' });
    }
    
    // Create directory for favicons if it doesn't exist
    const faviconDir = path.join(__dirname, '../../public/favicons');
    try {
      await mkdirAsync(faviconDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    
    // Process each store
    const results = [];
    for (const store of stores) {
      try {
        // Skip if no domain
        if (!store.domain) {
          // Try to extract domain from store name
          const domain = extractDomain(store.name);
          if (!domain) {
            results.push({ store: store.name, status: 'skipped', reason: 'No domain available' });
            continue;
          }
          
          // Update store with domain
          store.domain = domain;
          await store.save();
        }
        
        // Generate filename
        const filename = `${store._id.toString()}.png`;
        const filepath = path.join(faviconDir, filename);
        
        // Fetch favicon from Google's favicon service
        const domain = store.domain;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
        
        const response = await axios.get(faviconUrl, { responseType: 'arraybuffer' });
        await writeFileAsync(filepath, response.data);
        
        // Update store with favicon info
        store.favicon = filename;
        store.faviconUrl = `/public/favicons/${filename}`;
        store.faviconGeneratedAt = new Date();
        await store.save();
        
        results.push({ store: store.name, status: 'success' });
      } catch (error) {
        console.error(`Error generating favicon for ${store.name}:`, error);
        results.push({ store: store.name, status: 'error', error: error.message });
      }
    }
    
    // Clear cache for stores
    await cache.clearByPattern('stores:*');
    
    res.json({
      message: 'Favicon generation completed',
      total: stores.length,
      results
    });
  } catch (error) {
    console.error('Error in generate-all-favicons:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
