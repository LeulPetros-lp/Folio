const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const Student = require('./Schema/DataSchema'); // Import the Student model
const Shelf = require('./Schema/StockSchema'); // Import the Shelf model
const Members = require('./Schema/MembersSchema')

const app = express();
const PORT = process.env.PORT || 5123;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

mongoose.connect("mongodb+srv://leulpete14:wMJPgiS5RLeN0xI4@libby.wn5g9qy.mongodb.net/?retryWrites=true&w=majority&appName=LIBBY").then(() => {
  console.log("Connected to DB");
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.log(error);
});

// Function to check status based on return date
const checkStatus = (returnDate) => {
  const currentDate = new Date();
  const returnDateObj = new Date(returnDate);
  
  if (returnDateObj < currentDate) {
    return 'Overdue';
  } else {
    return 'Good';
  }
};

// Update student statuses based on return date
app.put('/update-student-status', async (req, res) => {
  try {
    const students = await Student.find({});

    // Loop through all students and update their status
    for (const student of students) {
      const newStatus = checkStatus(student.returnDate);
      student.isGood = (newStatus === 'Good'); // Update isGood based on the status
      await student.save(); // Save the updated student
    }

    res.status(200).json({ message: 'Student statuses updated successfully' });
  } catch (err) {
    console.error('Error updating student statuses:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List all students
app.get('/list-students', async (req, res) => {
  try {
    const data = await Student.find({}); // Use the Student model to find all students
    res.json({ data });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch book details by ISBN
app.get('/api/book/:isbn', async (req, res) => {
  const isbn = req.params.isbn;
  try {
    const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`);
    const bookData = response.data;
    const bookKey = `ISBN:${isbn}`;

    if (bookData[bookKey] && bookData[bookKey].details) {
      const title = bookData[bookKey].details.title;
      const coverImageUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
      res.json({ title, coverImageUrl });
    } else {
      res.status(404).json({ error: 'Book details not found' });
    }
  } catch (error) {
    console.error('Error fetching book data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new student
app.post('/add-student', async (req, res) => {
  try {
    const { bookDets, name, age, grade, section, duration, returnDate, isGood } = req.body;

    if (!name || !age || !grade || !section || !duration || !returnDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const student = new Student({
      name,
      age,
      grade,
      section,
      book: bookDets.title || "Book Title",  // Correctly reference the book title from bookDets
      isbn: bookDets.isbn || "0123456789", // Handle optional ISBN
      duration,
      isGood,
      returnDate: new Date(returnDate.year, returnDate.month - 1, returnDate.day)  // Convert returnDate to a Date object
    });

    await student.save();
    res.status(200).json({ message: 'Student successfully added', student });
  } catch (err) {
    console.error('Error saving student:', err);
    res.status(500).json({ message: "Couldn't add student to db" });
  }
});

// Add a book to the shelf
app.put('/add-shelf', async (req, res) => {
  try {
    const { bookDets } = req.body;
    const shelf = new Shelf({
      BookName: bookDets.title,
      ImgUrl: bookDets.coverImageUrl || "https://preview.colorkit.co/color/FF2D55.png?type=article-preview-logo&size=social&colorname=Cherry%20Paddle%20Pop",
      Isbn: bookDets.isbn || "00000000000",
    });

    await shelf.save();
    res.status(200).json({ message: 'Book added to shelf' });
  } catch (err) {
    console.error('Error adding book to shelf:', err);
    res.status(500).json({ message: "Error handler ( * Personal )" });
  }
});





app.get('/search-students', async (req, res) => {
  try {
    const { name } = req.query; // Get the search term from the query parameters
    if (!name) {
      return res.status(400).json({ message: "Name query parameter is required" });
    }

    // Use a case-insensitive search to match the student name
    const students = await Student.find({ name: new RegExp(name, 'i') });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }

    res.status(200).json({ data: students });
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





app.put('/shelf-manual', async (req, res) => {
  try {
    const { bookName,bookAuthor } = req.body;
    const shelf = new Shelf({
      BookName: bookName,
      ImgUrl:  "https://preview.colorkit.co/color/FF2D55.png?type=article-preview-logo&size=social&colorname=Cherry%20Paddle%20Pop",
      Author: bookAuthor
    });

    await shelf.save();
    res.status(200).json({ message: 'Book added to shelf' });
  } catch (err) {
    console.error('Error adding book to shelf:', err);
    res.status(500).json({ message: "Error handler ( * Personal )" });
  }
});

// Get all books on the shelf
app.get("/shelf-item", async (req, res) => {
  try {
    const data = await Shelf.find({});
    res.json({ data });
  } catch (err) {
    console.error('Error fetching shelf items:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get("/get-members", async(req,res) => {
  try {
    const data = await Members.find({})
    res.json({ data })
  } catch (e) {
    res.json(e)
  }
})


// Delete a book from the shelf
app.delete('/shelf-item/:id', async (req, res) => {
  const bookId = req.params.id;
  try {
    const result = await Shelf.findByIdAndDelete(bookId);
    if (!result) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Extend 
app.put('/extend-return-date/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const { newReturnDate } = req.body;

  if (!newReturnDate) {
    return res.status(400).json({ message: 'newReturnDate is required' });
  }

  try {
    // Find the student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Validate or parse newReturnDate if necessary (e.g., ensure it's a valid date)
    // For simplicity, we're assuming it's a string in 'YYYY-MM-DD' format
    student.returnDate = newReturnDate;
    // If your 'isGood' status depends on the return date, you might need to update it here too.
    // For example, if extending makes an overdue book no longer overdue.
    // student.isGood = new Date(newReturnDate) >= new Date(); // Example logic

    await student.save();

    res.status(200).json({ message: 'Book return date extended successfully', student });
  } catch (err) {
    console.error('Error extending return date:', err);
    // More specific error handling (e.g., validation error) can be added
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Return a book
app.delete('/return-book/:studentId', async (req, res) => {
  const studentId = req.params.studentId;

  try {
    // Find the student by ID and delete
    const student = await Student.findByIdAndDelete(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ message: 'Book returned and student record deleted successfully' });
  } catch (err) {
    console.error('Error returning book:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/add/member', async (req, res) => {
  try {
    const { name, parentPhone, age, grade, section } = req.body;

    if (!name || !parentPhone || !age || !grade || !section) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const member = new Members({
      name,
      parentPhone,
      age,
      grade,
      section,
    });

    await member.save();
    res.status(200).json({ message: 'Member added successfully', member });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ message: "Couldn't add member to db" });
  }
});

app.get('/get-members', async(req,res) => {
  try {
    const data = await Members.find({})
    res.json(data)
  } catch (e) {
    res.json(e)
  }
})

// Revoke membership by deleting a member
app.delete('/revoke-member/:id', async (req, res) => {
  const memberId = req.params.id; // Correctly uses req.params.id

  console.log(`BACKEND: Received DELETE request for /revoke-member/${memberId}`);
  console.log(`BACKEND: Member ID to process: ${memberId}`);

  if (!memberId) {
    console.log('BACKEND: No memberId provided in request params.');
    return res.status(400).json({ error: 'Member ID is required.' });
  }

  try {
    // Step 1: Check the Student collection (or your borrow tracking collection)
    const studentBorrowRecord = await Student.findById(memberId);
    console.log(`BACKEND: Result of Student.findById('${memberId}'):`, JSON.stringify(studentBorrowRecord, null, 2));

    // Step 2: Determine if the found student record (if any) indicates an active borrow
    if (studentBorrowRecord && studentHasActiveBorrow(studentBorrowRecord)) {
      // Student record found AND it indicates an active borrow, so block deletion from Members.
      console.log(`BACKEND: Member '${memberId}' has an active borrow (based on studentHasActiveBorrow logic). Revocation blocked.`);
      // Return 200 OK with an 'err' field to indicate non-deletion to the client
      return res.status(200).json({ err: "Student has an active book borrow and cannot be revoked." });
    } else {
      // Condition for deletion from Members:
      // EITHER no studentBorrowRecord was found (student is not in the Student collection)
      // OR a studentBorrowRecord was found, BUT studentHasActiveBorrow() returned false (no active borrow).
      if (!studentBorrowRecord) {
        console.log(`BACKEND: No borrow-related record found in 'Student' collection for memberId '${memberId}'. Proceeding to attempt deletion from 'Members' collection.`);
      } else {
        console.log(`BACKEND: Borrow-related record found in 'Student' collection for memberId '${memberId}', but it does NOT indicate an active borrow (studentHasActiveBorrow returned false). Proceeding to attempt deletion from 'Members' collection.`);
      }

      // Step 3: Proceed to delete from the main Members collection
      const memberDeletionResult = await Members.findByIdAndDelete(memberId);

      if (!memberDeletionResult) {
        console.log(`BACKEND: Member NOT found in 'Members' collection with ID '${memberId}' for deletion.`);
        return res.status(404).json({ message: 'Member not found in Members collection.' });
      }

      console.log(`BACKEND: Member '${memberId}' DELETED successfully from 'Members' collection.`);
      return res.status(200).json({ message: 'Member revoked successfully.' });
    }
  } catch (err) {
    console.error(`BACKEND: Error processing /revoke-member/${memberId}:`, err); // Log the full error object
    // Check for specific Mongoose CastError (e.g., invalid ObjectId format)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        console.log(`BACKEND: Invalid Member ID format: ${memberId}`);
        return res.status(400).json({ error: `Invalid Member ID format: ${memberId}.` });
    }
    // Generic server error
    return res.status(500).json({ error: 'Internal Server Error while attempting to revoke member.' });
  }
});

