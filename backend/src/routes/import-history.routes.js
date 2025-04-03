const express = require('express');
const {
  getImportHistory,
  getImportHistoryById,
  getImportStatus,
  stopAllImports
} = require('../controllers/import-history.controller');
const cache = require('../utils/cache');

const router = express.Router();

// All routes are protected by authMiddleware in index.js

// Get global import status - no cache pentru a reflecta statusul în timp real
router.get('/status', getImportStatus);

// Stop all imports
router.post('/stop', stopAllImports);

// Get all import history entries - cache for 1 minute
router.get('/', cache.middleware('import-history', 60), getImportHistory);

// Get import history by ID - cache for 1 minute
router.get('/:id', cache.middleware('import-history', 60), getImportHistoryById);

module.exports = router;
