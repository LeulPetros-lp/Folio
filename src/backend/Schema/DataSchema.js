const mongoose = require('mongoose');

// Define a sub-schema for the book details
const BookObjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required within the book object'],
  },
  isbn: {
    type: String,
    required: [true, 'Book ISBN is required within the book object'],
  },
  coverImageUrl: {
    type: String,
    required: false, // Assuming the cover image URL can be optional
  }
}, { _id: false }); // _id: false if you don't need a separate ID for the book sub-document



const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter student name'],
  },
  age: {
    type: Number,
    required: true,
  },
  book: { // Changed 'book' to store an object
    type: BookObjectSchema, // Use the sub-schema defined above
    required: false, // Set to false if a student can be registered without a book initially.
                     // If a book *must* be assigned, set this to true or handle it in backend route logic.
                     // Given your previous `required: [false, ...]` for the string book, keeping this optional.
  },
  grade: {
    type: String,
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
  isGood: { // This field was in your schema
    type: Boolean,
    required: true
  },
  stud_id: {
    type: String,
    required: true,
  }
}, { timestamps: true });

const Students = mongoose.model('Students', StudentSchema); // Or 'Student' if you prefer singular for model name

module.exports = Students;