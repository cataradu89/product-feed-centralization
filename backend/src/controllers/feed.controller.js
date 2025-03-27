const asyncHandler = require('express-async-handler');
const fetch = require('node-fetch');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Feed = require('../models/feed.model');
const Product = require('../models/product.model');

// @desc    Create a new feed
// @route   POST /api/feeds
// @access  Private
const createFeed = asyncHandler(async (req, res) => {
  const { name, url, status } = req.body;

  // Validate required fields
  if (!name || !url) {
    res.status(400);
    throw new Error('Please provide name and URL for the feed');
  }

  // Create new feed
  const feed = await Feed.create({
    name,
    url,
    status: status !== undefined ? status : 1, // Default to active if not provided
    createdBy: req.user._id,
  });

  if (feed) {
    res.status(201).json(feed);
  } else {
    res.status(400);
    throw new Error('Invalid feed data');
  }
});

// @desc    Get all feeds
// @route   GET /api/feeds
// @access  Private
const getFeeds = asyncHandler(async (req, res) => {
  const feeds = await Feed.find({ createdBy: req.user._id })
    .sort({ createdAt: -1 });
  
  res.json(feeds);
});

// @desc    Get feed by ID
// @route   GET /api/feeds/:id
// @access  Private
const getFeedById = asyncHandler(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (feed) {
    // Check if the feed belongs to the user
    if (feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this feed');
    }
    
    res.json(feed);
  } else {
    res.status(404);
    throw new Error('Feed not found');
  }
});

// @desc    Update feed
// @route   PUT /api/feeds/:id
// @access  Private
const updateFeed = asyncHandler(async (req, res) => {
  const { name, url, status } = req.body;
  
  const feed = await Feed.findById(req.params.id);

  if (feed) {
    // Check if the feed belongs to the user
    if (feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this feed');
    }

    // Update feed properties
    feed.name = name || feed.name;
    feed.url = url || feed.url;
    feed.status = status !== undefined ? status : feed.status;

    const updatedFeed = await feed.save();
    res.json(updatedFeed);
  } else {
    res.status(404);
    throw new Error('Feed not found');
  }
});

// @desc    Delete feed
// @route   DELETE /api/feeds/:id
// @access  Private
const deleteFeed = asyncHandler(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (feed) {
    // Check if the feed belongs to the user
    if (feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this feed');
    }

    // Delete all products associated with this feed
    await Product.deleteMany({ feedId: feed._id });
    
    // Delete the feed
    await feed.remove();
    res.json({ message: 'Feed removed' });
  } else {
    res.status(404);
    throw new Error('Feed not found');
  }
});

// @desc    Import products from a feed
// @route   POST /api/feeds/:id/import
// @access  Private
const importFeed = asyncHandler(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (!feed) {
    res.status(404);
    throw new Error('Feed not found');
  }

  // Check if the feed belongs to the user
  if (feed.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to import this feed');
  }

  // Check if the feed is active
  if (feed.status !== 1) {
    res.status(400);
    throw new Error('Cannot import from an inactive feed');
  }

  try {
    // Fetch CSV data from feed URL
    console.log(`Fetching CSV data from URL: ${feed.url}`);
    const response = await fetch(feed.url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV from ${feed.url}: ${response.statusText}`);
    }
    
    const csvData = await response.text();
    console.log(`CSV data fetched, size: ${csvData.length} bytes`);
    
    // Parse CSV data
    const results = [];
    const parser = csv();
    
    await new Promise((resolve, reject) => {
      Readable.from(csvData)
        .pipe(parser)
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${results.length} products from CSV`);

    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    let errors = [];
    
    // Process products in batches to prevent memory issues
    const BATCH_SIZE = 50;
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1}/${Math.ceil(results.length/BATCH_SIZE)}, items ${i+1}-${Math.min(i+BATCH_SIZE, results.length)}`);
      
      // Process each product in the batch with error handling per product
      const batchPromises = batch.map(async (item, index) => {
        try {
          // Validate required fields for a product
          if (!item.url || !item.title || !item.price) {
            console.warn(`Skipping item ${i + index + 1}: Missing required fields`);
            errorCount++;
            return { success: false, error: 'Missing required fields', item };
          }
          
          // Handle potential numeric values that come as strings
          if (item.price) {
            item.price = parseFloat(item.price) || 0;
          }
          if (item.old_price) {
            item.old_price = parseFloat(item.old_price) || 0;
          }
          if (item.product_active !== undefined) {
            item.product_active = parseInt(item.product_active) || 0;
          }

          // Check if product with same URL exists
          const existingProduct = await Product.findOne({ url: item.url });
          
          if (existingProduct) {
            // Update existing product
            Object.keys(item).forEach(key => {
              // Skip empty values that would overwrite existing data
              if (item[key] !== null && item[key] !== undefined && item[key] !== '') {
                existingProduct[key] = item[key];
              }
            });
            existingProduct.lastUpdated = Date.now();
            await existingProduct.save();
            updateCount++;
            return { success: true, action: 'updated', url: item.url };
          } else {
            // Create new product
            await Product.create({
              ...item,
              feedId: feed._id,
            });
            insertCount++;
            return { success: true, action: 'inserted', url: item.url };
          }
        } catch (itemError) {
          console.error(`Error processing item ${i + index + 1}:`, itemError);
          errorCount++;
          errors.push({
            index: i + index + 1,
            error: itemError.message,
            url: item.url || 'unknown',
            title: item.title || 'unknown'
          });
          return { success: false, error: itemError.message, item };
        }
      });
      
      // Wait for all products in batch to be processed
      await Promise.all(batchPromises);
      console.log(`Batch completed: ${insertCount} inserted, ${updateCount} updated, ${errorCount} errors so far`);
    }
    
    // Update feed import stats
    feed.lastImported = Date.now();
    feed.importCount = feed.importCount + 1;
    await feed.save();
    
    const message = errorCount > 0 
      ? `Feed imported with some errors: ${errorCount} products failed to import` 
      : 'Feed imported successfully';
    
    res.status(200).json({
      message,
      totalProcessed: results.length,
      inserted: insertCount,
      updated: updateCount,
      failed: errorCount,
      errors: errors.slice(0, 10) // Return first 10 errors for debugging
    });
  } catch (error) {
    console.error('Feed import error:', error);
    res.status(500);
    throw new Error(`Failed to import feed: ${error.message}`);
  }
});

// @desc    Bulk import feeds from CSV
// @route   POST /api/feeds/bulk-import
// @access  Private
const bulkImportFeeds = asyncHandler(async (req, res) => {
  try {
    const { feeds } = req.body;
    
    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      res.status(400);
      throw new Error('Please provide a valid list of feeds');
    }

    const results = {
      total: feeds.length,
      imported: 0,
      failed: 0,
      errors: []
    };

    // Process each feed
    for (const feedData of feeds) {
      try {
        // Validate required fields
        if (!feedData.name || !feedData.url) {
          results.failed++;
          results.errors.push({
            name: feedData.name || 'Unknown',
            url: feedData.url || 'Unknown',
            error: 'Missing required fields (name or URL)'
          });
          continue;
        }

        // Check if feed with the same URL already exists
        const existingFeed = await Feed.findOne({ 
          url: feedData.url,
          createdBy: req.user._id 
        });

        if (existingFeed) {
          results.failed++;
          results.errors.push({
            name: feedData.name,
            url: feedData.url,
            error: 'Feed with this URL already exists'
          });
          continue;
        }

        // Create new feed
        await Feed.create({
          name: feedData.name,
          url: feedData.url,
          status: feedData.status !== undefined ? feedData.status : 1, // Default to active
          createdBy: req.user._id,
        });

        results.imported++;
      } catch (feedError) {
        console.error('Error importing feed:', feedError);
        results.failed++;
        results.errors.push({
          name: feedData.name || 'Unknown',
          url: feedData.url || 'Unknown',
          error: feedError.message
        });
      }
    }

    res.status(200).json({
      message: `Imported ${results.imported} out of ${results.total} feeds`,
      ...results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500);
    throw new Error(`Failed to bulk import feeds: ${error.message}`);
  }
});

module.exports = {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  importFeed,
  bulkImportFeeds,
};
