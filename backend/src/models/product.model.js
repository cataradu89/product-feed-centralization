const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  aff_code: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  campaign_name: {
    type: String,
    required: true,
    trim: true
  },
  image_urls: {
    type: String,
    required: true
  },
  subcategory: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  product_active: {
    type: Number,
    enum: [0, 1],
    default: 1
  },
  brand: {
    type: String,
    default: 'Unknown'
  },
  product_id: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  old_price: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  feedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feed',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Update the lastUpdated field on save
productSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
