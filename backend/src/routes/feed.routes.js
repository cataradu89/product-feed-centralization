const express = require('express');
const {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  importFeed,
  bulkImportFeeds
} = require('../controllers/feed.controller');

const router = express.Router();

// All routes are already protected by authMiddleware in index.js

// Get all feeds and create new feed
router.route('/')
  .get(getFeeds)
  .post(createFeed);

// Bulk import feeds from CSV
router.post('/bulk-import', bulkImportFeeds);

// Get, update, and delete feed by ID
router.route('/:id')
  .get(getFeedById)
  .put(updateFeed)
  .delete(deleteFeed);

// Import products from feed
router.post('/:id/import', importFeed);

module.exports = router;
