const express = require('express');
const {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  importFeed,
  bulkImportFeeds,
  importAllFeeds,
  stopImport
} = require('../controllers/feed.controller');
const cache = require('../utils/cache');

// Feed routes middleware
const router = express.Router();

// All routes are already protected by authMiddleware in index.js

// Get all feeds and create new feed
router.route('/')
  .get(cache.middleware('feeds', 300), getFeeds)
  .post(createFeed);

// Bulk import feeds from CSV
router.post('/bulk-import', bulkImportFeeds);

// Route for importing all active feeds
router.post('/import-all', importAllFeeds);

// Route for stopping active imports
router.post('/stop-import', stopImport);

// Get, update, and delete feed by ID
router.route('/:id')
  .get(cache.middleware('feed', 300), getFeedById)
  .put(updateFeed)
  .delete(deleteFeed);

// Import feed data
router.post('/:id/import', importFeed);

module.exports = router;
