// ./Schema/StockSchema.js (Example - This is a simplified schema focused on storing the chunk)
const mongoose = require('mongoose');

const shelfSchema = new mongoose.Schema({
  // This key will come from your frontend's `Book.key` (e.g., "gb-XYZ123" or "ol-ABC456")
  // Making it unique prevents adding the exact same source book multiple times.
  identifierKey: {
    type: String,
    required: true,
    unique: true, // Ensures each book from a specific API source (identified by this key) is added only once
    index: true,
  },

  // This field will store the entire 'bookDets' object received from the frontend.
  // 'bookDets' is your standardized 'Book' object including all its keys and details.
  bookData: {
    type: mongoose.Schema.Types.Mixed, // Allows any object structure
    required: true,
  },

  dateAdded: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Shelf', shelfSchema);