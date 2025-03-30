const express = require('express');
const {
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductStats
} = require('../controllers/product.controller');
const cache = require('../utils/cache');

const router = express.Router();

// All routes are already protected by authMiddleware in index.js

// Get product statistics - cache for 5 minutes
router.get('/stats', cache.middleware('product-stats', 300), getProductStats);

// Get all products - cache for 2 minutes
router.get('/', cache.middleware('products', 120), getProducts);

// Get, update, and delete product by ID
router.route('/:id')
  .get(cache.middleware('product', 300), getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
