const asyncHandler = require('express-async-handler');
const PriceHistory = require('../models/price-history.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

// @desc    Get price history for a specific product
// @route   GET /api/products/:id/price-history
// @access  Private
const getProductPriceHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { timeframe = 'all' } = req.query; // Default to 'all'

  // Validate Product ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid Product ID');
  }

  // Optional: Check if product exists and belongs to the user
  // const product = await Product.findById(id);
  // if (!product || product.createdBy.toString() !== req.user._id.toString()) {
  //   res.status(404);
  //   throw new Error('Product not found or not authorized');
  // }

  let dateFilter = {};
  const now = new Date();

  // Apply timeframe filter
  if (timeframe === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    dateFilter = { timestamp: { $gte: weekAgo } };
  } else if (timeframe === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    dateFilter = { timestamp: { $gte: monthAgo } };
  } else if (timeframe === 'year') {
    const yearAgo = new Date(now);
    yearAgo.setFullYear(now.getFullYear() - 1);
    dateFilter = { timestamp: { $gte: yearAgo } };
  } // 'all' needs no date filter

  try {
    // Fetch price history records, sorted by timestamp ascending
    const history = await PriceHistory.find({
      productId: id,
      ...dateFilter,
    }).sort({ timestamp: 1 });

    if (!history) {
      // Should technically return empty array, but safety check
      return res.json([]);
    }

    res.json(history);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500);
    throw new Error('Failed to fetch price history');
  }
});

module.exports = {
  getProductPriceHistory,
};
