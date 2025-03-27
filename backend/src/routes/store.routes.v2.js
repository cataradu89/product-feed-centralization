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
  
  // Otherwise append .com as a guess
  return `${storeName.toLowerCase()}.com`;
};

// Get all unique campaign_names (stores) with product counts
router.get('/', async (req, res) => {
  try {
    // Get all stores from the Store collection, or create if not exist
    let stores = await Store.find().sort({ productCount: -1 });
    
    // If no stores or refresh requested, rebuild from products
    if (stores.length === 0 || req.query.refresh === 'true') {
      const productStores = await Product.aggregate([
        // Group by campaign_name
        { 
          $group: { 
            _id: "$campaign_name", 
            count: { $sum: 1 } 
          } 
        },
        // Sort by count descending
        { $sort: { count: -1 } },
        // Format output
        { 
          $project: { 
            _id: 0, 
            name: "$_id", 
            productCount: "$count" 
          } 
        }
      ]);
      
      // Update or create store records
      for (const store of productStores) {
        await Store.findOneAndUpdate(
          { name: store.name },
          { 
            name: store.name,
            domain: extractDomain(store.name),
            productCount: store.productCount,
            $setOnInsert: { 
              createdAt: new Date() 
            }
          },
          { upsert: true, new: true }
        );
      }
      
      // Fetch the updated store list
      stores = await Store.find().sort({ productCount: -1 });
    }
    
    return res.status(200).json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    return res.status(500).json({ 
      message: 'Server error while fetching stores', 
      error: error.message 
    });
  }
});

// Get products for a specific store
router.get('/:name/products', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const total = await Product.countDocuments({ campaign_name: name });
    const products = await Product.find({ campaign_name: name })
      .sort({ lastUpdated: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    return res.status(200).json({
      total,
      products,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error(`Error fetching products for store ${req.params.name}:`, error);
    return res.status(500).json({ 
      message: 'Server error while fetching store products', 
      error: error.message 
    });
  }
});

// Generate and save favicon for a store
router.post('/:id/favicon', async (req, res) => {
  try {
    const { id } = req.params;
    const { size = 128 } = req.body;
    
    // Find the store
    const store = await Store.findById(id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
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
    
    // Get domain to use for favicon
    const domain = store.domain || extractDomain(store.name);
    
    // Generate favicon URL from Google API
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    
    try {
      // Fetch the favicon
      const response = await axios.get(faviconUrl, { responseType: 'arraybuffer' });
      
      // Generate a unique filename
      const filename = `${domain.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
      const filepath = path.join(faviconDir, filename);
      
      // Save the favicon to disk
      await writeFileAsync(filepath, response.data);
      
      // Store the direct Google Favicon URL for direct access
      store.favicon = `/favicons/${filename}`;
      store.faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
      store.domain = domain;
      store.faviconGeneratedAt = new Date();
      await store.save();
      
      return res.status(200).json({ 
        message: 'Favicon generated successfully',
        store
      });
    } catch (error) {
      console.error(`Error downloading favicon for ${domain}:`, error);
      return res.status(400).json({ 
        message: `Error downloading favicon: ${error.message}`, 
        domain
      });
    }
  } catch (error) {
    console.error('Error generating favicon:', error);
    return res.status(500).json({ 
      message: 'Server error while generating favicon',
      error: error.message 
    });
  }
});

// Generate favicons for all stores without one
router.post('/generate-all-favicons', async (req, res) => {
  try {
    const { size = 128 } = req.body;
    
    // Find stores without favicons
    const stores = await Store.find({ favicon: null });
    
    if (stores.length === 0) {
      return res.status(200).json({ 
        message: 'No stores without favicons found',
        count: 0
      });
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
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each store
    for (const store of stores) {
      try {
        // Get domain to use for favicon
        const domain = store.domain || extractDomain(store.name);
        
        // Generate favicon URL from Google API
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
        
        // Fetch the favicon
        const response = await axios.get(faviconUrl, { responseType: 'arraybuffer' });
        
        // Generate a unique filename
        const filename = `${domain.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
        const filepath = path.join(faviconDir, filename);
        
        // Save the favicon to disk
        await writeFileAsync(filepath, response.data);
        
        // Store the direct Google Favicon URL for direct access
        store.favicon = `/favicons/${filename}`;
        store.faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
        store.domain = domain;
        store.faviconGeneratedAt = new Date();
        await store.save();
        
        successCount++;
      } catch (error) {
        console.error(`Error generating favicon for ${store.name}:`, error);
        errorCount++;
        errors.push({
          storeName: store.name,
          error: error.message
        });
      }
    }
    
    return res.status(200).json({
      message: `Generated favicons for ${successCount} stores with ${errorCount} errors`,
      successCount,
      errorCount,
      errors
    });
  } catch (error) {
    console.error('Error generating favicons:', error);
    return res.status(500).json({ 
      message: 'Server error while generating favicons',
      error: error.message 
    });
  }
});

module.exports = router;
