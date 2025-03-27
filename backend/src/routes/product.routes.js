const express = require('express');
const {
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductStats
} = require('../controllers/product.controller');

const router = express.Router();

// All routes are already protected by authMiddleware in index.js

// Get product statistics
router.get('/stats', getProductStats);

// Get all products
router.get('/', getProducts);

// Get, update, and delete product by ID
router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
