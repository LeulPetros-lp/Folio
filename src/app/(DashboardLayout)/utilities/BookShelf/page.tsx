"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Modal,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Grid,
  Snackbar,
  Alert,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material"; // For the delete icon

// Define types for the book data
interface Book {
  _id: string;
  ImgUrl: string | null;
  BookName: string;
  Isbn: string;
}

export default function Page() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null); // To store the selected book for the modal
  const [open, setOpen] = useState<boolean>(false); // Modal open state
  const [alertMessage, setAlertMessage] = useState<string | null>(null); // Store alert message
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success'); // Store alert severity
  const [openAlert, setOpenAlert] = useState<boolean>(false); // To control the Snackbar visibility

  // Fetch the shelf books from the backend
  useEffect(() => {
    axios
      .get("http://localhost:5123/shelf-item")
      .then((response) => {
        setBooks(response.data.data); // Assuming the books are in the `data` array
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching shelf items:", error);
        setLoading(false);
      });
  }, []);

  // Function to delete a book
  const handleDeleteBook = async (bookId: string, bookName: string) => {
    try {
      // Check if the book is borrowed by querying the server with the bookName
      const response = await axios.get("http://localhost:5123/list-students", {
        params: { bookName }, // Send the book name as a query parameter
      });

      const isBorrowed = response.data.data.some((student: any) => student.book === bookName);

      if (isBorrowed) {
        setAlertMessage("The book is currently borrowed and cannot be deleted.");
        setAlertSeverity('error');
        setOpenAlert(true);
        return;
      }

      // If not borrowed, delete the book
      await axios.delete(`http://localhost:5123/shelf-item/${bookId}`);
      setBooks((prevBooks) => prevBooks.filter((book) => book._id !== bookId));

      setAlertMessage("Book successfully deleted.");
      setAlertSeverity('success');
      setOpenAlert(true);
    } catch (error) {
      console.error("Error deleting book:", error);
      setAlertMessage("Error deleting book. Please try again.");
      setAlertSeverity('error');
      setOpenAlert(true);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <Typography variant="h4" align="center" gutterBottom>
        Your Library Book Shelf ({books?.length}*)
      </Typography>
      <br></br>
      {/* Grid layout for images */}
      <Grid container spacing={2} justifyContent="center">
        {loading ? (
          <CircularProgress />
        ) : books.length > 0 ? (
          books.map((book: Book) => (
            <Grid item key={book._id} xs={6} sm={4} md={3} lg={2} xl={2}>
              <Box
                sx={{
                  width: 120,
                  height: 200,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor:
                    book.ImgUrl ===
                      "https://preview.colorkit.co/color/FF2D55.png?type=article-preview-logo&size=social&colorname=Cherry%20Paddle%20Pop"
                      ? "#FF2D55"
                      : "transparent",
                }}
                onClick={() => {
                  setSelectedBook(book);
                  setOpen(true); // Open the modal
                }}
              >
                {book.ImgUrl ===
                  "https://preview.colorkit.co/color/FF2D55.png?type=article-preview-logo&size=social&colorname=Cherry%20Paddle%20Pop" ? (
                  <div style={{ width: "100%", height: "100%" }}></div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.ImgUrl || ""}
                    alt="Book cover"
                    style={{ width: "100%", height: "auto", borderRadius: 10 }}
                  />
                )}
              </Box>
              <Typography variant="body2" align="center" color="textSecondary">
                {book.BookName}
              </Typography>
            </Grid>
          ))
        ) : (
          <Typography variant="body1" align="center">
            No books found
          </Typography>
        )}
      </Grid>

      {/* Modal to display selected book details */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="book-details-modal"
        aria-describedby="book-details-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            width: 400,
            maxWidth: "80%",
          }}
        >
          <Typography variant="h6" id="book-details-modal">
            Book Details
          </Typography>
          {selectedBook && (
            <div className="text-center">
              <Box display="flex" justifyContent="center" mb={4}>
                {selectedBook.ImgUrl !==
                  "https://preview.colorkit.co/color/FF2D55.png?type=article-preview-logo&size=social&colorname=Cherry%20Paddle%20Pop" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedBook.ImgUrl || ""}
                    alt="Book cover"
                    style={{ width: 120, height: "auto", borderRadius: 10 }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 120,
                      height: 200,
                      backgroundColor: "#FF2D55",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 2,
                    }}
                  ></Box>
                )}
              </Box>
              <Typography variant="body1">
                <strong>Title:</strong> {selectedBook.BookName}
              </Typography>
              <Typography variant="body1">
                <strong>ISBN:</strong> {selectedBook.Isbn || "Not provided"}
              </Typography>
            </div>
          )}
          <Box display="flex" justifyContent="space-between" mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (selectedBook) {
                  handleDeleteBook(selectedBook._id, selectedBook.BookName);
                  setOpen(false); // Close the modal after deletion
                }
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Snackbar and Alert to show messages */}
      <Snackbar
        open={openAlert}
        autoHideDuration={6000}
        onClose={() => setOpenAlert(false)}
        style={{ display: 'flex',alignContent: 'left', textAlign: 'left' }}
      >
        <Alert
          onClose={() => setOpenAlert(false)}
          severity={alertSeverity}
          sx={{
            width: '100%',
            padding: '16px 24px', // Adjusting padding for a taller alert
            height: 'auto', // Let height adjust based on content
          }}
          style={{ position: 'relative', left: 300 }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
