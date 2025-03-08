const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'Please enter student name'],
    },
    age: {
      type: Number,
      required: true,
    },
    book: {
      type: String,
      required: [false, "Please enter the book "]
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
      type: Date,  // Store the return date as a Date object
      required: true
    },
    isGood: {
      type: Boolean,
      required: true
    }
  }, { timestamps: true });
  
  const Students = mongoose.model('Students', StudentSchema);
  
  module.exports = Students;
  