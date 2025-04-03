const mongoose = require('mongoose');

const importHistorySchema = mongoose.Schema(
  {
    feedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Feed'
    },
    feedName: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    totalProcessed: {
      type: Number,
      default: 0
    },
    inserted: {
      type: Number,
      default: 0
    },
    updated: {
      type: Number,
      default: 0
    },
    deactivated: {
      type: Number,
      default: 0
    },
    errors: {
      type: Number,
      default: 0
    },
    errorDetails: [
      {
        index: Number,
        error: String,
        url: String,
        title: String
      }
    ],
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const ImportHistory = mongoose.model('ImportHistory', importHistorySchema);

module.exports = ImportHistory;
