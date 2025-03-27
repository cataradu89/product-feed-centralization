const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  domain: {
    type: String,
    trim: true
  },
  favicon: {
    type: String,
    default: null
  },
  faviconUrl: {
    type: String,
    default: null
  },
  faviconGeneratedAt: {
    type: Date,
    default: null
  },
  productCount: {
    type: Number,
    default: 0
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
storeSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
