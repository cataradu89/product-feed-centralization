const asyncHandler = require('express-async-handler');
const Product = require('../models/product.model');
const Feed = require('../models/feed.model');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
  // Extract query parameters for filtering
  const { feedId, category, brand, search, page = 1, limit = 20 } = req.query;
  
  // Build query filter
  const filter = {};
  
  // If feedId is provided, filter by feedId
  if (feedId) {
    // Check if feed exists and belongs to user
    const feed = await Feed.findById(feedId);
    if (!feed || feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access products from this feed');
    }
    filter.feedId = feedId;
  } else {
    // If no feedId provided, find all feeds belonging to the user
    const userFeeds = await Feed.find({ createdBy: req.user._id }).select('_id');
    const userFeedIds = userFeeds.map(feed => feed._id);
    filter.feedId = { $in: userFeedIds };
  }
  
  // Apply other filters
  if (category) filter.category = { $regex: category, $options: 'i' };
  if (brand) filter.brand = { $regex: brand, $options: 'i' };
  
  // Apply search if provided
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  
  // Get total count for pagination
  const total = await Product.countDocuments(filter);
  
  // Get products with pagination
  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);
  
  // Send response with pagination info
  res.json({
    products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    // Check if the product's feed belongs to the user
    const feed = await Feed.findById(product.feedId);
    
    if (!feed || feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this product');
    }
    
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    // Check if the product's feed belongs to the user
    const feed = await Feed.findById(product.feedId);
    
    if (!feed || feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this product');
    }
    
    // Update product fields
    const updatedFields = req.body;
    
    // Don't allow changing the feedId
    delete updatedFields.feedId;
    
    // Update product
    Object.keys(updatedFields).forEach(key => {
      product[key] = updatedFields[key];
    });
    
    product.lastUpdated = Date.now();
    
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    // Check if the product's feed belongs to the user
    const feed = await Feed.findById(product.feedId);
    
    if (!feed || feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this product');
    }
    
    await product.remove();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Private
const getProductStats = asyncHandler(async (req, res) => {
  // Get all feeds belonging to the user
  const userFeeds = await Feed.find({ createdBy: req.user._id }).select('_id');
  const userFeedIds = userFeeds.map(feed => feed._id);
  
  // Get total product count
  const totalProducts = await Product.countDocuments({ 
    feedId: { $in: userFeedIds } 
  });
  
  // Get active product count
  const activeProducts = await Product.countDocuments({ 
    feedId: { $in: userFeedIds },
    product_active: 1
  });
  
  // Get inactive product count
  const inactiveProducts = await Product.countDocuments({ 
    feedId: { $in: userFeedIds },
    product_active: 0
  });
  
  // Get product count by category
  const categoryCounts = await Product.aggregate([
    { $match: { feedId: { $in: userFeedIds } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  // Get product count by brand
  const brandCounts = await Product.aggregate([
    { $match: { feedId: { $in: userFeedIds } } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  res.json({
    totalProducts,
    activeProducts,
    inactiveProducts,
    categoryCounts,
    brandCounts
  });
});

module.exports = {
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductStats,
};
