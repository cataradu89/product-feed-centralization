const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth.routes');
const feedRoutes = require('./routes/feed.routes');
const productRoutes = require('./routes/product.routes');
const storeRoutes = require('./routes/store.routes');
const storeRoutesV2 = require('./routes/store.routes.v2');
const importHistoryRoutes = require('./routes/import-history.routes');
const priceHistoryRoutes = require('./routes/price-history.routes');
const userRoutes = require('./routes/user.routes');
const typesenseRoutes = require('./routes/typesense.routes');

// Middleware
const { errorHandler } = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feeds', authMiddleware, feedRoutes);
app.use('/api/products', authMiddleware, productRoutes);
productRoutes.use('/:id/price-history', priceHistoryRoutes);
app.use('/api/stores', authMiddleware, storeRoutes);
app.use('/api/stores/v2', authMiddleware, storeRoutesV2);
app.use('/api/import-history', authMiddleware, importHistoryRoutes);
// Typesense endpoint - public, no auth required
app.use('/api/typesense', typesenseRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
