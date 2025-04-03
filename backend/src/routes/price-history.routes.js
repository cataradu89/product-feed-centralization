const express = require('express');
const {
  getProductPriceHistory,
} = require('../controllers/price-history.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Define route specific to products
// This route will be mounted under /api/products/:id/price-history
router.route('/').get(protect, getProductPriceHistory);

// Export the router to be used in index.js
module.exports = router;
