const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { authenticateJWT } = require('../middleware/auth');

// Get all unique campaign_names (stores) with product counts
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const stores = await Product.aggregate([
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

    return res.status(200).json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    return res.status(500).json({ message: 'Server error while fetching stores', error: error.message });
  }
});

// Get products for a specific store
router.get('/:name/products', authenticateJWT, async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const total = await Product.countDocuments({ campaign_name: name });
    const products = await Product.find({ campaign_name: name })
      .sort({ last_update: -1 })
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

module.exports = router;
