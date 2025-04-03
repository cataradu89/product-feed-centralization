const mongoose = require('mongoose');

const priceHistorySchema = mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product',
    },
    price: {
      type: Number,
      required: true,
    },
    oldPrice: {
      type: Number,
      default: null, // Prețul anterior poate lipsi la prima înregistrare
    },
    feedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Feed',
    },
    importHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ImportHistory',
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false }, // Folosim timestamp automat pentru data creării
  }
);

// Index pentru interogări eficiente
priceHistorySchema.index({ productId: 1, timestamp: -1 });
priceHistorySchema.index({ timestamp: -1 });

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);

module.exports = PriceHistory;
