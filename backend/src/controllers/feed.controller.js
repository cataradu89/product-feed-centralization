const asyncHandler = require('express-async-handler');
const fetch = require('node-fetch');
const csv = require('csv-parser');
const { Readable } = require('stream');
const Feed = require('../models/feed.model');
const Product = require('../models/product.model');
const PriceHistory = require('../models/price-history.model'); // Adăugat modelul PriceHistory
const ImportHistory = require('../models/import-history.model');
const cache = require('../utils/cache');
const { 
  createImportHistory, 
  updateImportHistory 
} = require('./import-history.controller');

// Variabilă globală pentru a controla oprirea importurilor
let shouldStopImport = false;

// Coadă de așteptare pentru importuri
const importQueue = [];
let isProcessingQueue = false;

// Funcția pentru a adăuga un feed în coada de așteptare și a porni procesarea dacă nu este deja în curs
const enqueueImport = async (feed, userId) => {
  // Verificăm dacă feed-ul este deja în coadă
  const alreadyQueued = importQueue.some(item => item.feed._id.toString() === feed._id.toString());
  if (alreadyQueued) {
    console.log(`Feed ${feed.name} is already in the import queue`);
    return { alreadyQueued: true };
  }
  
  // Adăugăm feed-ul în coadă cu un ID de istoric
  const importHistory = await createImportHistory(feed._id, userId);
  
  importQueue.push({
    feed,
    userId,
    importHistoryId: importHistory._id
  });
  
  console.log(`Added feed ${feed.name} to import queue. Queue length: ${importQueue.length}`);
  
  // Pornim procesarea cozii dacă nu este deja în curs
  if (!isProcessingQueue) {
    processImportQueue();
  }
  
  return { importHistoryId: importHistory._id };
};

// Funcția pentru a procesa coada de importuri secvențial
const processImportQueue = async () => {
  if (isProcessingQueue || importQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  shouldStopImport = false;
  
  console.log(`Starting import queue processing. Queue length: ${importQueue.length}`);
  
  while (importQueue.length > 0 && !shouldStopImport) {
    const { feed, userId, importHistoryId } = importQueue[0];
    
    console.log(`Processing feed ${feed.name} from queue`);
    
    try {
      // Actualizăm statusul importului la "processing"
      await updateImportHistory(importHistoryId, { status: 'processing' });
      
      // Procesăm feed-ul
      await processFeedImport(feed, importHistoryId, userId);
      
      console.log(`Successfully processed feed ${feed.name}`);
    } catch (error) {
      console.error(`Error processing feed ${feed.name}:`, error);
      
      // Marcăm importul ca eșuat
      await updateImportHistory(importHistoryId, { 
        status: 'failed',
        endTime: Date.now(),
        duration: 0,
        errorDetails: [{
          index: 0,
          error: error.message,
          url: 'system',
          title: 'System Error'
        }]
      });
    }
    
    // Eliminăm feed-ul procesat din coadă
    importQueue.shift();
  }
  
  // Resetăm flag-ul de oprire și de procesare
  shouldStopImport = false;
  isProcessingQueue = false;
  
  console.log(`Import queue processing completed. Queue length: ${importQueue.length}`);
};

// Funcție pentru a opri toate importurile
const stopImportQueue = () => {
  shouldStopImport = true;
  
  // Golim coada de importuri pentru a opri procesul complet
  while (importQueue.length > 0) {
    importQueue.pop();
  }
  
  console.log('Import process stopped by user');
  return true;
};

// @desc    Create a new feed
// @route   POST /api/feeds
// @access  Private
const createFeed = asyncHandler(async (req, res) => {
  const { name, url, status } = req.body;

  // Validate required fields
  if (!name || !url) {
    res.status(400);
    throw new Error('Please provide name and URL for the feed');
  }

  // Create new feed
  const feed = await Feed.create({
    name,
    url,
    status: status !== undefined ? status : 1, // Default to active if not provided
    createdBy: req.user._id,
  });

  // Clear feeds cache after creating a new feed
  await cache.clearByPattern('feeds:*');

  if (feed) {
    res.status(201).json(feed);
  } else {
    res.status(400);
    throw new Error('Invalid feed data');
  }
});

// @desc    Get all feeds
// @route   GET /api/feeds
// @access  Private
const getFeeds = asyncHandler(async (req, res) => {
  try {
    // Optimizăm interogarea pentru a include doar câmpurile necesare
    const feeds = await Feed.find({ createdBy: req.user._id })
      .select('name url status lastImport productCount createdAt updatedAt')
      .lean()  // Convertim rezultatul în obiecte JavaScript simple pentru performanță mai bună
      .sort({ createdAt: -1 });
    
    res.json(feeds);
  } catch (error) {
    console.error('Error in getFeeds:', error);
    res.status(500).json({ message: 'Error fetching feeds' });
  }
});

// @desc    Get feed by ID
// @route   GET /api/feeds/:id
// @access  Private
const getFeedById = asyncHandler(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (feed) {
    // Check if the feed belongs to the user
    if (feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this feed');
    }
    
    res.json(feed);
  } else {
    res.status(404);
    throw new Error('Feed not found');
  }
});

// @desc    Update feed
// @route   PUT /api/feeds/:id
// @access  Private
const updateFeed = asyncHandler(async (req, res) => {
  const { name, url, status } = req.body;
  
  const feed = await Feed.findById(req.params.id);

  if (feed) {
    // Check if the feed belongs to the user
    if (feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this feed');
    }

    // Update feed properties
    feed.name = name || feed.name;
    feed.url = url || feed.url;
    feed.status = status !== undefined ? status : feed.status;

    const updatedFeed = await feed.save();

    // Clear feed caches after updating
    await cache.clearByPattern(`feed:*${req.params.id}*`);
    await cache.clearByPattern('feeds:*');

    res.json(updatedFeed);
  } else {
    res.status(404);
    throw new Error('Feed not found');
  }
});

// @desc    Delete feed
// @route   DELETE /api/feeds/:id
// @access  Private
const deleteFeed = asyncHandler(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (feed) {
    // Check if the feed belongs to the user
    if (feed.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this feed');
    }

    // Delete all products associated with this feed
    await Product.deleteMany({ feedId: feed._id });
    
    // Delete the feed
    await feed.remove();

    // Clear feed caches after deleting
    await cache.clearByPattern(`feed:*${req.params.id}*`);
    await cache.clearByPattern('feeds:*');

    res.json({ message: 'Feed removed' });
  } else {
    res.status(404);
    throw new Error('Feed not found');
  }
});

// @desc    Import products from a feed (adaugă în coada de așteptare)
// @route   POST /api/feeds/:id/import
// @access  Private
const importFeed = asyncHandler(async (req, res) => {
  const feed = await Feed.findById(req.params.id);

  if (!feed) {
    res.status(404);
    throw new Error('Feed not found');
  }

  // Check if the feed belongs to the user
  if (feed.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to import this feed');
  }

  // Check if the feed is active
  if (feed.status !== 1) {
    res.status(400);
    throw new Error('Cannot import from an inactive feed');
  }

  try {
    // Adăugăm feed-ul în coada de așteptare
    const result = await enqueueImport(feed, req.user._id);
    
    if (result.alreadyQueued) {
      return res.status(200).json({
        message: `Feed ${feed.name} is already queued for import`,
        importId: null
      });
    }
    
    // Returnăm imediat ID-ul importului pentru monitorizare
    res.status(202).json({
      message: 'Feed import added to queue',
      importId: result.importHistoryId
    });
  } catch (error) {
    console.error('Feed import error:', error);
    res.status(500);
    throw new Error(`Failed to start import: ${error.message}`);
  }
});

// @desc    Import all active feeds
// @route   POST /api/feeds/import-all
// @access  Private
const importAllFeeds = asyncHandler(async (req, res) => {
  try {
    // Obținem toate feed-urile active
    const activeFeeds = await Feed.find({ 
      createdBy: req.user._id,
      status: 1
    });
    
    if (activeFeeds.length === 0) {
      return res.status(400).json({ message: 'No active feeds to import' });
    }
    
    // Sortăm feed-urile în ordinea corectă
    // (mai întâi cele care nu au fost niciodată importate, apoi cele mai vechi)
    const sortedFeeds = activeFeeds.sort((a, b) => {
      // Dacă a nu a fost importat niciodată, vine primul
      if (!a.lastImported && b.lastImported) return -1;
      
      // Dacă b nu a fost importat niciodată, vine primul
      if (!b.lastImported && a.lastImported) return 1;
      
      // Dacă niciunul nu a fost importat, sortăm după nume
      if (!a.lastImported && !b.lastImported) {
        return a.name.localeCompare(b.name);
      }
      
      // Altfel, sortăm după dată (datele mai vechi primul)
      return new Date(a.lastImported) - new Date(b.lastImported);
    });
    
    // Adăugăm feed-urile în coadă în ordinea sortată
    const importPromises = sortedFeeds.map(feed => enqueueImport(feed, req.user._id));
    const results = await Promise.all(importPromises);
    
    // Numărăm feed-urile adăugate în coadă
    const addedToQueue = results.filter(result => !result.alreadyQueued).length;
    
    res.status(202).json({
      message: `Added ${addedToQueue} feeds to import queue`,
      totalFeeds: sortedFeeds.length,
      addedToQueue
    });
  } catch (error) {
    console.error('Error queueing feeds for import:', error);
    res.status(500);
    throw new Error(`Failed to queue feeds: ${error.message}`);
  }
});

// @desc    Stop all active imports
// @route   POST /api/feeds/stop-import
// @access  Private
const stopImport = asyncHandler(async (req, res) => {
  stopImportQueue();
  res.status(200).json({ message: 'Import process stopped' });
});

// @desc    Bulk import feeds from CSV
// @route   POST /api/feeds/bulk-import
// @access  Private
const bulkImportFeeds = asyncHandler(async (req, res) => {
  try {
    const { feeds } = req.body;
    
    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      res.status(400);
      throw new Error('Please provide a valid list of feeds');
    }

    const results = {
      total: feeds.length,
      imported: 0,
      failed: 0,
      errors: []
    };

    // Process each feed
    for (const feedData of feeds) {
      try {
        // Validate required fields
        if (!feedData.name || !feedData.url) {
          results.failed++;
          results.errors.push({
            name: feedData.name || 'Unknown',
            url: feedData.url || 'Unknown',
            error: 'Missing required fields (name or URL)'
          });
          continue;
        }

        // Check if feed with the same URL already exists
        const existingFeed = await Feed.findOne({ 
          url: feedData.url,
          createdBy: req.user._id 
        });

        if (existingFeed) {
          results.failed++;
          results.errors.push({
            name: feedData.name,
            url: feedData.url,
            error: 'Feed with this URL already exists'
          });
          continue;
        }

        // Create new feed
        await Feed.create({
          name: feedData.name,
          url: feedData.url,
          status: feedData.status !== undefined ? feedData.status : 1, // Default to active
          createdBy: req.user._id,
        });

        // Clear feeds cache after creating a new feed
        await cache.clearByPattern('feeds:*');

        results.imported++;
      } catch (feedError) {
        console.error('Error importing feed:', feedError);
        results.failed++;
        results.errors.push({
          name: feedData.name || 'Unknown',
          url: feedData.url || 'Unknown',
          error: feedError.message
        });
      }
    }

    res.status(200).json({
      message: `Imported ${results.imported} out of ${results.total} feeds`,
      ...results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500);
    throw new Error(`Failed to bulk import feeds: ${error.message}`);
  }
});

// Funcția de import efectiv, care rulează în background
const processFeedImport = async (feed, importHistoryId, userId) => {
  const startTime = Date.now();
  
  try {
    // Obținem toate ID-urile produselor existente pentru acest feed
    // pentru a putea marca ca inactive produsele care nu mai sunt în feed
    const existingProductIds = await Product.find({ feedId: feed._id })
      .select('_id url')
      .lean();
    
    // Creăm un Map cu URL-urile produselor existente pentru căutare rapidă
    const existingProductsMap = new Map();
    existingProductIds.forEach(product => {
      existingProductsMap.set(product.url, product._id);
    });
    
    console.log(`Found ${existingProductIds.length} existing products for feed`);

    // Set pentru a ține evidența URL-urilor produselor din feed-ul curent
    const processedProductUrls = new Set();
    
    // Fetch CSV data from feed URL
    console.log(`Fetching CSV data from URL: ${feed.url}`);
    let response;
    
    try {
      // Folosim un timeout pentru a preveni blocarea pe feed-uri problematice
      const fetchPromise = fetch(feed.url);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 60000) // 60 secunde timeout
      );
      
      response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV from ${feed.url}: ${response.statusText}`);
      }
    } catch (fetchError) {
      console.error(`Error fetching feed data: ${fetchError.message}`);
      await updateImportHistory(importHistoryId, {
        status: 'failed',
        endTime: Date.now(),
        duration: (Date.now() - startTime) / 1000,
        errorDetails: [{
          index: 0,
          error: `Network error: ${fetchError.message}`,
          url: feed.url,
          title: 'CSV fetch failed'
        }]
      });
      
      throw fetchError;
    }
    
    let csvData;
    try {
      csvData = await response.text();
      console.log(`CSV data fetched, size: ${csvData.length} bytes`);
      
      if (csvData.length === 0) {
        throw new Error('CSV data is empty');
      }
    } catch (textError) {
      console.error(`Error reading response data: ${textError.message}`);
      await updateImportHistory(importHistoryId, {
        status: 'failed',
        endTime: Date.now(),
        duration: (Date.now() - startTime) / 1000,
        errorDetails: [{
          index: 0,
          error: `Data error: ${textError.message}`,
          url: feed.url,
          title: 'CSV data reading failed'
        }]
      });
      
      throw textError;
    }
    
    // Actualizăm istoricul cu starea curentă
    await updateImportHistory(importHistoryId, {
      status: 'processing'
    });
    
    // Parse CSV data
    const results = [];
    const parser = csv({
      trim: true, // Eliminăm spațiile din jurul valorilor
      skipLines: 0 // Nu sărim nicio linie
    });
    
    try {
      await new Promise((resolve, reject) => {
        Readable.from(csvData)
          .pipe(parser)
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', (err) => {
            console.error('CSV parsing error:', err);
            reject(new Error(`CSV parsing error: ${err.message}`));
          });
      });
      
      console.log(`Parsed ${results.length} products from CSV`);
      
      if (results.length === 0) {
        console.warn('CSV was parsed but no products were found');
        await updateImportHistory(importHistoryId, {
          status: 'completed',
          totalProcessed: 0,
          inserted: 0,
          updated: 0,
          deactivated: 0,
          errors: 0,
          endTime: Date.now(),
          duration: (Date.now() - startTime) / 1000,
          errorDetails: [{
            index: 0,
            error: 'Feed contains no products',
            url: feed.url,
            title: 'Empty product list'
          }]
        });
        
        // Update feed import stats even if empty
        feed.lastImported = Date.now();
        feed.importCount = feed.importCount + 1;
        await feed.save();
        
        return {
          status: 'completed',
          totalProcessed: 0,
          inserted: 0,
          updated: 0,
          deactivated: 0,
          errors: 0
        };
      }
    } catch (parseError) {
      console.error(`Error parsing CSV data: ${parseError.message}`);
      await updateImportHistory(importHistoryId, {
        status: 'failed',
        endTime: Date.now(),
        duration: (Date.now() - startTime) / 1000,
        errorDetails: [{
          index: 0,
          error: `CSV parsing error: ${parseError.message}`,
          url: feed.url,
          title: 'CSV parsing failed'
        }]
      });
      
      throw parseError;
    }
    
    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    let errors = [];
    
    // Process products in batches to prevent memory issues
    const BATCH_SIZE = 50;
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      // Verificăm dacă trebuie să oprim importul
      if (shouldStopImport) {
        throw new Error('Import process stopped by user');
      }
      
      const batch = results.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1}/${Math.ceil(results.length/BATCH_SIZE)}, items ${i+1}-${Math.min(i+BATCH_SIZE, results.length)}`);
      
      // Actualizăm progresul în istoricul importului
      await updateImportHistory(importHistoryId, {
        totalProcessed: i + batch.length,
        inserted: insertCount,
        updated: updateCount,
        errors: errorCount
      });
      
      // Process each product in the batch with error handling per product
      const batchPromises = batch.map(async (item, index) => {
        try {
          // Validate required fields for a product
          if (!item.url || !item.title || !item.price) {
            console.warn(`Skipping item ${i + index + 1}: Missing required fields`);
            errorCount++;
            return { success: false, error: 'Missing required fields', item };
          }
          
          // Handle potential numeric values that come as strings
          let newPrice = item.price ? parseFloat(item.price) : null;
          let oldPriceValue = item.old_price ? parseFloat(item.old_price) : null;
          
          if (newPrice === null || isNaN(newPrice)) {
            console.warn(`Skipping item ${i + index + 1} due to invalid price: ${item.price}`);
            errorCount++;
            return { success: false, error: 'Invalid price', item };
          }
          
          item.price = newPrice;
          item.old_price = oldPriceValue;

          if (item.product_active !== undefined) {
            item.product_active = parseInt(item.product_active) || 0;
          }

          // Adăugăm URL-ul produsului în set-ul de produse procesate
          processedProductUrls.add(item.url);

          // Check if product with same URL exists
          const existingProduct = await Product.findOne({ url: item.url });
          
          if (existingProduct) {
            // === START LOGICĂ ISTORIC PREȚ ===
            let priceChanged = false;
            let previousPrice = existingProduct.price;
            
            if (existingProduct.price !== item.price) {
              priceChanged = true;
            }
            // === END LOGICĂ ISTORIC PREȚ ===
            
            // Update existing product
            Object.keys(item).forEach(key => {
              // Skip empty values that would overwrite existing data
              // Excepție: câmpul `old_price` poate fi actualizat cu null dacă nu mai e prezent
              if (item[key] !== null && item[key] !== undefined && item[key] !== '' || key === 'old_price') {
                existingProduct[key] = item[key];
              }
            });
            existingProduct.lastUpdated = Date.now();
            
            // Salvează produsul actualizat
            await existingProduct.save();
            updateCount++;

            // === START SALVARE ISTORIC PREȚ ===
            if (priceChanged) {
              try {
                await PriceHistory.create({
                  productId: existingProduct._id,
                  price: item.price,
                  oldPrice: previousPrice, // Salvăm prețul anterior
                  feedId: feed._id,
                  importHistoryId: importHistoryId
                });
                console.log(`Price history recorded for product ${existingProduct._id}: ${previousPrice} -> ${item.price}`);
              } catch (historyError) {
                console.error(`Failed to record price history for product ${existingProduct._id}:`, historyError);
              }
            }
            // === END SALVARE ISTORIC PREȚ ===

            return { success: true, action: 'updated', url: item.url };
          } else {
            // Create new product
            const newProduct = await Product.create({
              ...item,
              feedId: feed._id,
              createdBy: userId // Asigurăm că se salvează și cine a creat produsul
            });
            insertCount++;
            
            // === START SALVARE PRIMUL PREȚ ===
            try {
              await PriceHistory.create({
                productId: newProduct._id,
                price: newProduct.price,
                oldPrice: null, // Prima înregistrare nu are preț anterior
                feedId: feed._id,
                importHistoryId: importHistoryId
              });
              console.log(`Initial price history recorded for new product ${newProduct._id}: ${newProduct.price}`);
            } catch (historyError) {
              console.error(`Failed to record initial price history for product ${newProduct._id}:`, historyError);
            }
            // === END SALVARE PRIMUL PREȚ ===
            
            return { success: true, action: 'inserted', url: item.url };
          }
        } catch (itemError) {
          console.error(`Error processing item ${i + index + 1}:`, itemError);
          errorCount++;
          errors.push({
            index: i + index + 1,
            error: itemError.message,
            url: item.url || 'unknown',
            title: item.title || 'unknown'
          });
          return { success: false, error: itemError.message, item };
        }
      });
      
      // Wait for all products in batch to be processed
      await Promise.all(batchPromises);
      console.log(`Batch completed: ${insertCount} inserted, ${updateCount} updated, ${errorCount} errors so far`);
    }
    
    // Marcăm ca inactive produsele care nu mai există în feed
    let deactivatedCount = 0;
    
    // Verificăm dacă trebuie să oprim importul
    if (shouldStopImport) {
      throw new Error('Import process stopped by user');
    }
    
    // Găsim toate produsele care există în baza de date dar nu au fost văzute în feed-ul curent
    const productsToDeactivate = Array.from(existingProductsMap.entries())
      .filter(([url]) => !processedProductUrls.has(url))
      .map(([, id]) => id);
    
    if (productsToDeactivate.length > 0) {
      console.log(`Marking ${productsToDeactivate.length} products as inactive because they are no longer in the feed`);
      
      // Actualizăm în lot toate produsele care trebuie dezactivate
      const deactivateResult = await Product.updateMany(
        { _id: { $in: productsToDeactivate } },
        { $set: { product_active: 0, lastUpdated: Date.now() } }
      );
      
      deactivatedCount = deactivateResult.modifiedCount;
      console.log(`Deactivated ${deactivatedCount} products that were no longer in feed`);
    }
    
    // Update feed import stats
    feed.lastImported = Date.now();
    feed.importCount = feed.importCount + 1;
    await feed.save();
    
    // Clear product and store caches after import
    await cache.clearByPattern('products:*');
    await cache.clearByPattern('stores:*');
    await cache.clearByPattern(`feed:*${feed._id}*`);
    await cache.clearByPattern('import-history:*');
    
    // Calculăm durata importului
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Durata în secunde
    
    // Actualizăm înregistrarea de istoric a importului cu rezultatele finale
    await updateImportHistory(importHistoryId, {
      status: 'completed',
      totalProcessed: results.length,
      inserted: insertCount,
      updated: updateCount,
      deactivated: deactivatedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors.slice(0, 20) : [], // Stocăm doar primele 20 de erori pentru a evita depășirea limitei de dimensiune
      endTime: endTime,
      duration: duration
    });
    
    console.log(`Feed import completed in ${duration} seconds`);
    
    return {
      status: 'completed',
      totalProcessed: results.length,
      inserted: insertCount,
      updated: updateCount,
      deactivated: deactivatedCount,
      errors: errorCount
    };
  } catch (error) {
    console.error('Feed import processing error:', error);
    
    // Actualizăm înregistrarea de istoric a importului cu eroarea
    await updateImportHistory(importHistoryId, {
      status: 'failed',
      endTime: Date.now(),
      duration: (Date.now() - startTime) / 1000,
      errorDetails: [{
        index: 0,
        error: error.message,
        url: 'system',
        title: 'System Error'
      }]
    });
    
    throw error;
  }
};

module.exports = {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  importFeed,
  importAllFeeds,
  stopImport,
  bulkImportFeeds
};
