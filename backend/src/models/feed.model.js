const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: Number,
    enum: [0, 1], // 0 = inactive, 1 = active (published)
    default: 1
  },
  lastImported: {
    type: Date,
    default: null
  },
  importCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
feedSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Feed = mongoose.model('Feed', feedSchema);

module.exports = Feed;
