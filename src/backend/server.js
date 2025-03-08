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
  const memberId = req.params.id;
  try {
    const result = await Members.findByIdAndDelete(memberId);
    if (!result) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.status(200).json({ message: 'Member revoked successfully' });
  } catch (err) {
    console.error('Error revoking member:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
