// @ts-nocheck

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

    // https://covers.openlibrary.org/b/isbn/9781789890242-L.jpg
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
// const Student = require('./path-to-your-Student-model'); // Make sure Student model is imported

app.post('/add-student', async (req, res) => {
  try {
    const { bookDets, name, age, grade, section, duration, returnDate, isGood, stud_id } = req.body;

    // --- Fundamental Field Validation ---
    if (!name || !age || (grade === undefined || grade === "") || !section || !duration || !returnDate || !stud_id || (isGood === undefined)) {
      console.error("Validation failed (add-student). Missing fundamental student/loan fields. Received body:", req.body);
      return res.status(400).json({ message: 'Required student/loan fields are missing: name, age, grade, section, duration, returnDate, stud_id, or isGood status.' });
    }

    // --- Validate the structure of bookDets and existence of the data chunk ---
    // The frontend now sends bookDets as { data: { /* actual book chunk */ } }
    if (!bookDets || typeof bookDets !== 'object' || !bookDets.data || typeof bookDets.data !== 'object') {
      console.error("Validation failed (add-student). 'bookDets' or 'bookDets.data' is missing or not an object. Received bookDets:", JSON.stringify(bookDets, null, 2));
      return res.status(400).json({ message: 'A valid bookDets object containing a "data" property with full book details is required.' });
    }

    const actualBookDataChunk = bookDets.data; // This is the chunk

    // --- Validate essential fields within the book data chunk ---
    // Ensure title and at least one ISBN (as an array) are present in the chunk
    if (!actualBookDataChunk.title || 
        (!actualBookDataChunk.isbn || !Array.isArray(actualBookDataChunk.isbn) || actualBookDataChunk.isbn.length === 0)) {
      console.error("Validation failed (add-student). Book title or ISBN array (min 1) is missing in bookDets.data. Received book chunk:", JSON.stringify(actualBookDataChunk, null, 2));
      return res.status(400).json({ message: 'Book details chunk (bookDets.data) must include a title and an array with at least one ISBN.' });
    }
    
    // --- Validate returnDate structure ---
    if (!returnDate || typeof returnDate !== 'object' || !returnDate.year || !returnDate.month || !returnDate.day) {
        console.error("Validation failed (add-student). Problematic returnDate. Received returnDate:", returnDate);
        return res.status(400).json({ message: 'Valid return date object (including year, month, day) is required.' });
    }

    // --- Clone Check for Student Borrowing Record ---
    // Checks if this stud_id already has ANY active borrowing record.
    const existingLoan = await Student.findOne({ stud_id: stud_id });

    if (existingLoan) {
      // If a record is found, it means this student already has a book borrowed.
      // Display first ISBN from the array if available for the message
      const displayIsbn = (existingLoan.book && existingLoan.book.isbn && Array.isArray(existingLoan.book.isbn) && existingLoan.book.isbn.length > 0)
                          ? existingLoan.book.isbn[0]
                          : 'N/A';
      return res.status(409).json({ // 409 Conflict
        message: `This student (ID: ${stud_id}) already has an active book borrowed (Book: ${existingLoan.book.title}, ISBN: ${displayIsbn}). A student can only borrow one book at a time.`,
        existingLoanDetails: {
          studentId: existingLoan.stud_id,
          bookTitle: existingLoan.book.title,
          bookIsbn: displayIsbn,
          returnDate: existingLoan.returnDate
        }
      });
    }

    // --- Data Preparation for Mongoose Model ---
    // The 'actualBookDataChunk' is assigned directly to studentData.book
    const studentData = {
      name: name.trim(),
      age: Number(age),
      grade: String(grade),
      section: section.trim(),
      book: actualBookDataChunk, // Assign the entire chunk here
      duration,
      isGood,
      returnDate: new Date(returnDate.year, returnDate.month - 1, returnDate.day), // JS month is 0-indexed
      stud_id,
    };

    const student = new Student(studentData); // StudentSchema.book now expects StudentBookDataChunkSchema
    await student.save();

    res.status(200).json({ message: 'Student borrowing record added successfully', student });

  } catch (err) {
    console.error('Error in /add-student route:', err);
    if (err.name === 'ValidationError') {
      // Log the detailed validation errors
      console.error('Mongoose Validation Errors (add-student):', JSON.stringify(err.errors, null, 2));
      return res.status(400).json({ message: "Validation Error from Schema. Please check data format.", errors: err.errors });
    }
    if (err.code === 11000) { // MongoDB unique constraint violation
        return res.status(409).json({ message: 'This student borrowing record might violate a unique constraint (e.g., stud_id already exists for an active loan).', errorDetails: err.keyValue });
    }
    if (!res.headersSent) {
      res.status(500).json({ message: "Couldn't add student borrowing record to db due to an internal server error" });
    }
  }
});



// Add a book to the shelf
app.put('/add-shelf', async (req, res) => {
  try {
    const { bookDets } = req.body; // bookDets is the 'selectedBook' object from your frontend

    console.log('Received PUT /add-shelf (to store as chunk) with bookDets:', JSON.stringify(bookDets, null, 2));

    // --- Basic Validation for the incoming bookDets object ---
    if (!bookDets || typeof bookDets !== 'object' || Object.keys(bookDets).length === 0) {
      return res.status(400).json({ message: 'The bookDets object with full book details is required.' });
    }

    // Ensure the crucial 'key' (for identifierKey) and a 'title' are present in bookDets
    if (!bookDets.key || typeof bookDets.key !== 'string' || bookDets.key.trim() === "") {
        return res.status(400).json({ message: 'A valid unique key (bookDets.key) is required to identify the book entry.' });
    }
    if (!bookDets.title || typeof bookDets.title !== 'string' || bookDets.title.trim() === "") {
      // Even if storing a chunk, a title is fundamental for any minimal identification.
      return res.status(400).json({ message: 'A valid book title (bookDets.title) is required within the bookDets object.' });
    }

    // --- Prepare data for the new Shelf Item ---
    const shelfItemData = {
      identifierKey: bookDets.key.trim(), // Use the unique key from the frontend
      bookData: { ...bookDets },        // Store the entire received bookDets object as the "chunk"
      dateAdded: new Date()
    };

    // --- NO Application-Level Content-Based Clone Check ---
    // Uniqueness is now primarily handled by the `identifierKey` unique index in the Shelf schema.
    // This prevents the same API entry (e.g., same Google Book ID or Open Library Key) from being added multiple times.

    const shelfItem = new Shelf(shelfItemData);
    await shelfItem.save(); // Mongoose schema validation (e.g., required identifierKey) will run.

    res.status(201).json({ message: 'Book (as a full chunk) added to shelf successfully', shelfItem });

  } catch (err) {
    console.error('Error in PUT /add-shelf (store chunk) endpoint:', err);

    if (err.name === 'ValidationError') {
      // This would catch if 'identifierKey' or 'bookData' itself is missing, per schema.
      console.error('Mongoose Validation Errors:', JSON.stringify(err.errors, null, 2));
      return res.status(400).json({
        message: "Schema Validation Error. Ensure 'key' and 'title' are present in the book details.",
        errors: err.errors
      });
    }
    if (err.code === 11000) { // MongoDB unique constraint violation (likely on 'identifierKey')
        return res.status(409).json({ // 409 Conflict
            message: 'This book (identified by its unique key) already exists on the shelf.',
            errorDetails: err.keyValue // Shows which field caused the duplicate key error
        });
    }
    // Generic server error
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error occurred while attempting to add book to shelf." });
    }
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
    // 1. Destructure data from the request body
    const { stud_id, name, parentPhone, age, grade, section } = req.body;

    // 2. Input validation: Check for all required fields
    if (!stud_id || !name || !parentPhone || !age || !grade || !section) {
      return res.status(400).json({ message: 'All fields are required, including stud_id.' });
    }

    // Normalize string inputs for checking and saving
    const normalizedName = name.trim();
    const normalizedSection = section.trim();
    const numericAge = Number(age);
    const numericParentPhone = Number(parentPhone);
    const numericGrade = Number(grade); // Used for level calculation, original grade saved

    if (!normalizedName || isNaN(numericParentPhone) || isNaN(numericAge) || isNaN(numericGrade) || !normalizedSection) {
        return res.status(400).json({ message: 'Invalid data types or empty essential fields after trimming.' });
    }


    // 3. Clone Detection Logic (before attempting to save)
    // We'll check if a member with the same name (case-insensitive), age, and parentPhone already exists.
    // Adjust these fields as per your definition of a "clone".
    const potentialClone = await Members.findOne({
      name: new RegExp(`^${normalizedName}$`, 'i'), // Case-insensitive exact match for name
      age: numericAge,
      parentPhone: numericParentPhone,
      // You could add more fields to this query for a stricter clone definition:
      // grade: grade, // Use original grade string/number from req.body
      // section: normalizedSection,
    });

    if (potentialClone) {
      // A member with very similar details (excluding stud_id) already exists.
      return res.status(409).json({ // 409 Conflict is appropriate
        message: 'A member with similar details (name, age, and parent phone) already exists.',
        // You could optionally send back some info about the existing member if needed,
        // but be mindful of privacy. e.g., existingMemberId: potentialClone.stud_id
      });
    }

    // 4. If no clone, proceed to create the new member
    // Determine the level based on the grade.
    let level = '';
    if (numericGrade >= 1 && numericGrade <= 5) {
      level = 'Primary';
    } else if (numericGrade >= 6 && numericGrade <= 8) {
      level = 'Secondary';
    } else if (numericGrade >= 9 && numericGrade <= 12) {
      level = 'High School';
    } else {
      level = 'Undefined'; // Default or error for grades outside 1-12
    }

    const initialScore = 10;

    // Create a new member instance
    const member = new Members({
      stud_id, // The new, unique stud_id from req.body
      name: normalizedName,
      parentPhone: numericParentPhone,
      age: numericAge,
      grade, // Store original grade value (string or number as received)
      level,
      score: initialScore,
      section: normalizedSection,
    });

    // Save the member to the database
    await member.save();

    // Respond with success message and the newly created member data
    res.status(200).json({ message: 'Member added successfully', member });

  } catch (error) {
    // Handle errors during the member creation process
    console.error('Error adding member:', error);
    // This existing check handles uniqueness violation on `stud_id` (if it has a unique index)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A member with this Student ID (stud_id) already exists.' });
    }
    res.status(500).json({ message: "Couldn't add member to database. Please check server logs.", error: error.message });
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
    const studentBorrowRecord = await Student.findOne({ stud_id: memberId});
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
      const memberDeletionResult = await Members.findOneAndDelete({ stud_id: memberId});

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
    return res.status(400).json({ error: "Can't revoke students membership - student is still on the borrowers list" });
  }
});

app.get('/get-statistics', async (req, res) => {
  try {
    const now = new Date();
    console.log(`Workspaceing library statistics at ${now.toISOString()}`);

    // 1. Total number of student borrowing records
    const totalStudentsWithBorrows = await Student.countDocuments();
    console.log(`- totalStudentsWithBorrows: ${totalStudentsWithBorrows}`);

    // 2. Total number of registered library members
    const totalMembers = await Members.countDocuments();
    console.log(`- totalMembers: ${totalMembers}`);

    // 3. Total number of books on the shelf
    const totalBooksOnShelf = await Shelf.countDocuments();
    console.log(`- totalBooksOnShelf: ${totalBooksOnShelf}`);

    // 4a. Distribution of books on the shelf by subject tag
    const shelfBookDistributionBySubjectTag = await Shelf.aggregate([
      { $match: { "bookData.subject": { $exists: true, $ne: null, $not: { $size: 0 } } } },
      { $unwind: "$bookData.subject" },
      { $project: { subject: { $trim: { input: { $toLower: "$bookData.subject" } } } } },
      { $match: { subject: { $ne: null, $ne: "" } } },
      { $group: { _id: "$subject", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { subject: "$_id", count: 1, _id: 0 } }
    ]);
    console.log(`- shelfBookDistributionBySubjectTag (${shelfBookDistributionBySubjectTag.length}):`, shelfBookDistributionBySubjectTag);

    // 4b. Distribution of books by FIRST subject
    const shelfBookDistributionByFirstSubject = await Shelf.aggregate([
      { $match: { "bookData.subject": { $exists: true, $ne: null, $not: { $size: 0 } } } },
      {
        $project: {
          firstSubject: {
            $let: {
              vars: { first: { $arrayElemAt: ["$bookData.subject", 0] } },
              in: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$$first", null] },
                      { $ne: ["$$first", ""] },
                      { $ne: ["$$first", undefined] }
                    ]
                  },
                  "$$first",
                  null
                ]
              }
            }
          }
        }
      },
      { $match: { firstSubject: { $ne: null } } },
      {
        $group: {
          _id: { $trim: { input: { $toLower: "$firstSubject" } } },
          count: { $sum: 1 }
        }
      },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 20 },
      { $project: { subject: "$_id", count: 1, _id: 0 } }
    ]);
    console.log(`- shelfBookDistributionByFirstSubject (${shelfBookDistributionByFirstSubject.length}):`, shelfBookDistributionByFirstSubject);

    // 5. Number of currently overdue books
    const overdueBooksCount = await Student.countDocuments({ returnDate: { $lt: now } });
    console.log(`- overdueBooksCount: ${overdueBooksCount}`);

    // 6. Distribution of active borrows by duration
    const activeBorrowsByDuration = await Student.aggregate([
      { $match: { duration: { $exists: true, $ne: null, $ne: "" } } },
      { $project: { duration: { $toString: "$duration" } } },
      { $group: { _id: "$duration", count: { $sum: 1 } } },
      { $match: { _id: { $ne: "null", $ne: "undefined", $ne: "" } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { duration: "$_id", count: 1, _id: 0 } }
    ]);
    console.log(`- activeBorrowsByDuration (${activeBorrowsByDuration.length}):`, activeBorrowsByDuration);

    // 7. Distribution of Members by Age
    const memberDistributionByAge = await Members.aggregate([
      { $match: { age: { $exists: true, $ne: null, $gt: 0 } } },
      { $project: { age: { $toInt: "$age" } } },
      { $group: { _id: "$age", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } },
      { $project: { age: "$_id", count: 1, _id: 0 } }
    ]);
    console.log(`- memberDistributionByAge (${memberDistributionByAge.length}):`, memberDistributionByAge);

    // 8. Distribution of Members by Grade
    const memberDistributionByGrade = await Members.aggregate([
      { $match: { grade: { $exists: true, $ne: null, $ne: "" } } },
      { $project: { grade: { $toString: "$grade" } } },
      { $group: { _id: "$grade", count: { $sum: 1 } } },
      { $match: { _id: { $ne: "null", $ne: "undefined", $ne: "" } } },
      { $sort: { _id: 1 } },
      { $project: { grade: "$_id", count: 1, _id: 0 } }
    ]);
    console.log(`- memberDistributionByGrade (${memberDistributionByGrade.length}):`, memberDistributionByGrade);

    // Assemble the final response
    const statistics = {
      totalStudentsWithBorrows,
      totalMembers,
      totalBooksOnShelf,
      shelfBookDistributionBySubjectTag,
      shelfBookDistributionByFirstSubject,
      overdueBooksCount,
      activeBorrowsByDuration,
      memberDistributionByAge,
      memberDistributionByGrade,
      lastUpdated: now.toISOString()
    };

    console.log("Successfully compiled statistics.");
    res.status(200).json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      message: 'Failed to retrieve statistics due to an internal server error.',
      error: error.message
    });
  }
});

