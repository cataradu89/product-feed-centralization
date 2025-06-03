const express = require('express');
const { getTypesenseProducts } = require('../controllers/typesense.controller');
const cache = require('../utils/cache');

const router = express.Router();

// Get all products formatted for Typesense - cache for 5 minutes
// This endpoint is public and doesn't require authentication
router.get('/products', cache.middleware('typesense-products', 300), getTypesenseProducts);

module.exports = router;
