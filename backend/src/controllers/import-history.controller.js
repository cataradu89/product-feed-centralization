const asyncHandler = require('express-async-handler');
const ImportHistory = require('../models/import-history.model');
const Feed = require('../models/feed.model');
const cache = require('../utils/cache');

// @desc    Get all import history entries
// @route   GET /api/import-history
// @access  Private
const getImportHistory = asyncHandler(async (req, res) => {
  try {
    // Extract query parameters for filtering and pagination
    const { feedId, status, page = 1, limit = 20 } = req.query;
    
    // Build query filter
    const filter = { createdBy: req.user._id };
    
    // Apply filters if provided
    if (feedId) filter.feedId = feedId;
    if (status) filter.status = status;
    
    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await ImportHistory.countDocuments(filter);
    
    // Get import history entries with pagination
    const importHistory = await ImportHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      data: importHistory
    });
  } catch (error) {
    console.error('Error fetching import history:', error);
    res.status(500).json({ message: 'Error fetching import history' });
  }
});

// @desc    Get import history by ID
// @route   GET /api/import-history/:id
// @access  Private
const getImportHistoryById = asyncHandler(async (req, res) => {
  try {
    const importHistory = await ImportHistory.findById(req.params.id);
    
    if (!importHistory) {
      res.status(404);
      throw new Error('Import history not found');
    }
    
    // Verify if the import history belongs to the user
    if (importHistory.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this import history');
    }
    
    res.json(importHistory);
  } catch (error) {
    console.error('Error fetching import history by ID:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching import history' });
  }
});

// @desc    Create a new import history entry (internal use only)
// @access  Private
const createImportHistory = async (feedId, userId) => {
  try {
    // Get feed information to include in the history entry
    const feed = await Feed.findById(feedId);
    if (!feed) {
      throw new Error('Feed not found');
    }
    
    // Create a new import history entry
    const importHistory = await ImportHistory.create({
      feedId,
      feedName: feed.name,
      status: 'pending',
      createdBy: userId
    });
    
    return importHistory;
  } catch (error) {
    console.error('Error creating import history:', error);
    throw error;
  }
};

// @desc    Update an import history entry (internal use only)
// @access  Private
const updateImportHistory = async (importHistoryId, updateData) => {
  try {
    const importHistory = await ImportHistory.findByIdAndUpdate(
      importHistoryId,
      updateData,
      { new: true }
    );
    
    // Clear import history cache when updated
    await cache.clearByPattern('import-history:*');
    
    return importHistory;
  } catch (error) {
    console.error('Error updating import history:', error);
    throw error;
  }
};

// @desc    Get global import status
// @route   GET /api/import-history/status
// @access  Private
const getImportStatus = asyncHandler(async (req, res) => {
  try {
    // Obținem informații despre importurile în curs
    const activeImports = await ImportHistory.find({
      status: { $in: ['pending', 'processing'] },
      createdBy: req.user._id
    }).sort({ createdAt: 1 }).lean();
    
    // Verificăm dacă există import în curs
    const isImporting = activeImports.length > 0;
    
    // Obținem statistici globale pentru importurile finalizate astăzi
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const completedImports = await ImportHistory.find({
      status: 'completed',
      createdBy: req.user._id,
      endTime: { $gte: startOfDay }
    }).lean();
    
    // Calculăm statisticile globale
    const stats = completedImports.reduce((acc, imp) => {
      acc.totalProcessed += imp.totalProcessed || 0;
      acc.inserted += imp.inserted || 0;
      acc.updated += imp.updated || 0;
      acc.deactivated += imp.deactivated || 0;
      acc.errors += imp.errors || 0;
      return acc;
    }, { 
      totalProcessed: 0, 
      inserted: 0, 
      updated: 0, 
      deactivated: 0, 
      errors: 0 
    });
    
    // Obținem numărul total de feed-uri active
    const totalActiveFeeds = await Feed.countDocuments({ 
      status: 1,
      createdBy: req.user._id
    });
    
    // Calculăm numărul de feed-uri procesate astăzi
    const processedFeedsCount = completedImports.length;
    
    res.json({
      isImporting,
      currentImport: activeImports.length > 0 ? activeImports[0] : null,
      queuedImports: activeImports.slice(1),
      stats,
      totalActiveFeeds,
      processedFeedsCount
    });
  } catch (error) {
    console.error('Error fetching import status:', error);
    res.status(500).json({ message: 'Error fetching import status' });
  }
});

// @desc    Stop all imports
// @route   POST /api/import-history/stop
// @access  Private
const stopAllImports = asyncHandler(async (req, res) => {
  try {
    // Găsim toate importurile în curs pentru utilizatorul curent
    const activeImports = await ImportHistory.find({
      status: { $in: ['pending', 'processing'] },
      createdBy: req.user._id
    });
    
    // Marcăm toate importurile active ca fiind oprite
    for (const imp of activeImports) {
      await updateImportHistory(imp._id, {
        status: 'failed',
        endTime: Date.now(),
        duration: (Date.now() - imp.startTime) / 1000,
        errorDetails: [{
          index: 0,
          error: 'Import process stopped by user',
          url: 'system',
          title: 'System Error'
        }]
      });
    }
    
    res.json({ 
      message: 'All imports stopped successfully',
      stoppedCount: activeImports.length
    });
  } catch (error) {
    console.error('Error stopping imports:', error);
    res.status(500).json({ message: 'Error stopping imports' });
  }
});

module.exports = {
  getImportHistory,
  getImportHistoryById,
  createImportHistory,
  updateImportHistory,
  getImportStatus,
  stopAllImports
};
