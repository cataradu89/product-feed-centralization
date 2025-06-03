const express = require('express');
const { 
  getTypesenseProducts, 
  streamTypesenseProducts, 
  getUpdatedProducts 
} = require('../controllers/typesense.controller');
const cache = require('../utils/cache');

const router = express.Router();

// Get products formatted for Typesense with pagination - cache for 5 minutes
// This endpoint is public and doesn't require authentication
router.get('/products', cache.middleware('typesense-products', 300), getTypesenseProducts);

// Stream all products for Typesense (no caching for streaming endpoint)
// This endpoint is designed for initial data loading
router.get('/products/stream', streamTypesenseProducts);

// Get only updated products since a specific date - cache for 1 minute
// This endpoint is designed for incremental updates
router.get('/products/updates', cache.middleware('typesense-updates', 60), getUpdatedProducts);

module.exports = router;
