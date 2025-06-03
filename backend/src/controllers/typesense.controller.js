const asyncHandler = require('express-async-handler');
const Product = require('../models/product.model');
const { Transform } = require('stream');

/**
 * @desc    Get products formatted for Typesense with pagination
 * @route   GET /api/typesense/products
 * @access  Public
 */
const getTypesenseProducts = asyncHandler(async (req, res) => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Default to 1000 products per page
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalCount = await Product.countDocuments({ product_active: 1 });
    const totalPages = Math.ceil(totalCount / limit);

    // Get products for current page
    const products = await Product.find({ product_active: 1 })
      .select('-__v')
      .sort({ _id: 1 }) // Consistent sorting for pagination
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Transform products for Typesense
    const typesenseProducts = products.map(product => {
      return {
        id: product._id.toString(),
        product_id: product.product_id,
        title: product.title,
        description: product.description || '',
        price: product.price,
        old_price: product.old_price || '',
        url: product.url,
        image_url: product.image_urls,
        brand: product.brand || 'Unknown',
        category: product.category,
        subcategory: product.subcategory || '',
        campaign_name: product.campaign_name,
        aff_code: product.aff_code,
        last_updated: product.lastUpdated,
        created_at: product.createdAt
      };
    });
    
    // Return with pagination metadata
    res.json({
      products: typesenseProducts,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error in getTypesenseProducts:', error);
    res.status(500).json({ message: 'Error fetching products for Typesense' });
  }
});

/**
 * @desc    Stream products formatted for Typesense (for large datasets)
 * @route   GET /api/typesense/products/stream
 * @access  Public
 */
const streamTypesenseProducts = asyncHandler(async (req, res) => {
  try {
    // Set headers for streaming JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Create cursor for streaming
    const cursor = Product.find({ product_active: 1 })
      .select('-__v')
      .sort({ _id: 1 })
      .cursor();
    
    // Start the JSON array
    res.write('[');
    
    let isFirst = true;
    
    // Process each product
    for await (const product of cursor) {
      const typesenseProduct = {
        id: product._id.toString(),
        product_id: product.product_id,
        title: product.title,
        description: product.description || '',
        price: product.price,
        old_price: product.old_price || '',
        url: product.url,
        image_url: product.image_urls,
        brand: product.brand || 'Unknown',
        category: product.category,
        subcategory: product.subcategory || '',
        campaign_name: product.campaign_name,
        aff_code: product.aff_code,
        last_updated: product.lastUpdated,
        created_at: product.createdAt
      };
      
      // Add comma between items (not before the first item)
      if (!isFirst) {
        res.write(',');
      } else {
        isFirst = false;
      }
      
      // Write the product as JSON
      res.write(JSON.stringify(typesenseProduct));
    }
    
    // End the JSON array and response
    res.write(']');
    res.end();
  } catch (error) {
    console.error('Error in streamTypesenseProducts:', error);
    // If headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error streaming products for Typesense' });
    } else {
      // If we've already started streaming, we can only end the response
      res.end();
    }
  }
});

/**
 * @desc    Get products updated since a specific date
 * @route   GET /api/typesense/products/updates
 * @access  Public
 */
const getUpdatedProducts = asyncHandler(async (req, res) => {
  try {
    // Get the since parameter (ISO date string)
    const sinceDate = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    
    if (isNaN(sinceDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format for since parameter' });
    }
    
    // Find products updated since the specified date
    const products = await Product.find({
      product_active: 1,
      lastUpdated: { $gte: sinceDate }
    })
      .select('-__v')
      .lean();
    
    // Transform products for Typesense
    const typesenseProducts = products.map(product => {
      return {
        id: product._id.toString(),
        product_id: product.product_id,
        title: product.title,
        description: product.description || '',
        price: product.price,
        old_price: product.old_price || '',
        url: product.url,
        image_url: product.image_urls,
        brand: product.brand || 'Unknown',
        category: product.category,
        subcategory: product.subcategory || '',
        campaign_name: product.campaign_name,
        aff_code: product.aff_code,
        last_updated: product.lastUpdated,
        created_at: product.createdAt
      };
    });
    
    res.json({
      products: typesenseProducts,
      count: typesenseProducts.length,
      since: sinceDate.toISOString()
    });
  } catch (error) {
    console.error('Error in getUpdatedProducts:', error);
    res.status(500).json({ message: 'Error fetching updated products' });
  }
});

module.exports = {
  getTypesenseProducts,
  streamTypesenseProducts,
  getUpdatedProducts
};
