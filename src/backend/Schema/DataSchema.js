// File: ./Schema/DataSchema.js (Your Student Schema)
const mongoose = require('mongoose');

// Define a new sub-schema for the detailed book data "chunk"
// This should align with the structure of ApiShelfBookData from your frontend
const StudentBookDataChunkSchema = new mongoose.Schema({
  key: { type: String }, // e.g., "gb-...", "ol-..."
  title: {
    type: String,
    required: [true, 'Book title is required within the book data'],
  },
  author_name: { type: [String], default: [] },
  isbn: { type: [String], default: [] }, // Stores an array of ISBNs
  subject: { type: [String], default: [] },
  coverImageUrl: { type: String, default: "" },
  publisher: { type: String },
  publishedDate: { type: String },
  description: { type: String },
  pageCount: { type: Number },
  sourceApi: { type: String }, // e.g., 'GoogleBooks', 'OpenLibrary'
  googleBooksId: { type: String },
  openLibraryKey: { type: String },
  // Add any other fields from ApiShelfBookData you want to store
}, { _id: false, strict: false }); // strict: false allows fields not explicitly defined,
                                   // set to true if you want to enforce the exact schema.

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter student name'],
  },
  age: {
    type: Number,
    required: true,
  },
  book: { // This will now store the entire book data chunk
    type: StudentBookDataChunkSchema, // Use the new sub-schema defined above
    required: false, // Set to true if a book is mandatory for every student record
  },
  grade: {
    type: String, // Or Number, ensure consistency with frontend/usage
    required: true
  },
  section: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  returnDate: {
    type: Date,
    required: true
  },
  isGood: {
    type: Boolean,
    required: true
  },
  stud_id: {
    type: String,
    required: true,
    // Consider adding unique: true if each stud_id should only have one active loan at a time,
    // though your route logic already checks this.
    // unique: true,
  }
}, { timestamps: true });

// Ensure the model name 'Student' matches what you use in your route: const Student = require('./Schema/DataSchema');
module.exports = mongoose.model('Student', StudentSchema);