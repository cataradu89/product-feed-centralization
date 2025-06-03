const asyncHandler = require('express-async-handler');
const Product = require('../models/product.model');

/**
 * @desc    Get all products formatted for Typesense
 * @route   GET /api/typesense/products
 * @access  Public
 */
const getTypesenseProducts = asyncHandler(async (req, res) => {
  try {
    // Get all products that are active
    const products = await Product.find({ product_active: 1 })
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
    
    res.json(typesenseProducts);
  } catch (error) {
    console.error('Error in getTypesenseProducts:', error);
    res.status(500).json({ message: 'Error fetching products for Typesense' });
  }
});

module.exports = {
  getTypesenseProducts
};
