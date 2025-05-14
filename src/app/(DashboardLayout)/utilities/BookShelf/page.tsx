"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import axios from "axios";
import {
  Input,
  Grid,
  Stack,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Box,
  Modal,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import { styled } from "@mui/material/styles";
import { Search as SearchIcon } from "lucide-react";

// Interface for the nested book data object
interface ShelfBookData {
  key: string;
  title?: string;
  author_name?: string[];
  isbn?: string[];
  subject?: string[];
  coverImageUrl?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  sourceApi: 'GoogleBooks' | 'OpenLibrary';
  googleBooksId?: string;
  openLibraryKey?: string;
}

// Interface for the items fetched from /shelf-item
interface ShelfDisplayItem {
  _id: string;
  identifierKey: string;
  bookData: ShelfBookData;
  dateAdded: string;
}

const SearchInput = styled(Input)(({ theme }) => ({
  "& .MuiInputBase-input": {
    padding: theme.spacing(1.5, 1.5, 1.5, 1),
    paddingLeft: `calc(1em + ${theme.spacing(2.5)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    maxWidth: "200px",
    "&:focus": {
      width: "300px",
      maxWidth: "300px",
    },
  },
}));

const modalStyle = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500, // Increased width slightly for more details
  maxWidth: "90%",
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 3, // Adjusted padding slightly
  outline: 'none',
};

const LibraryShelf = () => {
  const [shelf, setShelf] = useState<ShelfDisplayItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedBook, setSelectedBook] = useState<ShelfDisplayItem | null>(null);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<"success" | "error">(
    "success"
  );
  const [openAlert, setOpenAlert] = useState<boolean>(false);

  const specialImgUrl =
    "https://preview.colorkit.co/color/FF2D55.png?type=article-preview-logo&size=social&colorname=Cherry%20Paddle%20Pop";

  useEffect(() => {
    const getShelf = async () => {
      setLoading(true);
      try {
        const response = await axios.get<{ data: ShelfDisplayItem[] }>("http://localhost:5123/shelf-item");
        setShelf(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (error) {
        console.error("Error fetching shelf data:", error);
        setShelf([]);
        setAlertMessage("Failed to load books from the shelf.");
        setAlertSeverity("error");
        setOpenAlert(true);
      } finally {
        setLoading(false);
      }
    };
    getShelf();
  }, []);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredShelf = shelf.filter((item) => {
    if (!item || !item.bookData || typeof item.bookData.title !== "string") return false;
    if (searchTerm) {
      return item.bookData.title.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const handleOpenModal = (book: ShelfDisplayItem) => {
    setSelectedBook(book);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setSelectedBook(null);
    setOpenModal(false);
  };

  const handleShowAlert = (message: string, severity: "success" | "error") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setOpenAlert(true);
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string | undefined) => {
    setIsDeleting(true);
    try {
      if (bookTitle) {
        const response = await axios.get("http://localhost:5123/list-students");
        const isBorrowed = response.data.data.some(
          (student: any) => student.book && student.book.title === bookTitle
        );

        if (isBorrowed) {
          handleShowAlert(
            `The book "${bookTitle}" is currently borrowed and cannot be deleted.`,
            "error"
          );
          setIsDeleting(false);
          return;
        }
      } else {
        console.warn("Cannot check borrow status without a book title for book ID:", bookId);
      }

      await axios.delete(`http://localhost:5123/shelf-item/${bookId}`);
      setShelf((prevBooks) => prevBooks.filter((book) => book._id !== bookId));
      handleShowAlert("Book successfully deleted.", "success");
      handleCloseModal();
    } catch (error) {
      console.error("Error deleting book:", error);
      handleShowAlert("Error deleting book. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardCard title="Library Shelf">
      <Grid container spacing={3} alignItems="center" mb={4}>
        <Grid item xs={12} sm={7} md={8}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <SearchIcon
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "grey",
                zIndex: 1,
              }}
              size={20}
            />
            <SearchInput
              type="text"
              placeholder="Search by Title..."
              value={searchTerm}
              onChange={handleSearchChange}
              inputProps={{ "aria-label": "Search for books by title" }}
            />
          </div>
        </Grid>
        <Grid item xs={12} sm={5} md={4}>
          {loading && !shelf.length ? (
            <Typography variant="subtitle1" sx={{ textAlign: { xs: "left", sm: "right" } }}>
              Loading shelf...
            </Typography>
          ) : (
            <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }}>
              <Typography variant="h3" fontWeight="700">
                {filteredShelf.length}
              </Typography>
              <Typography variant="subtitle2" fontWeight="600">
                {filteredShelf.length === 1 ? "Book Found" : "Books Found"}
              </Typography>
            </Stack>
          )}
        </Grid>
      </Grid>

      <Box>
        <Typography variant="h6" mb={2} component="div">
          {searchTerm ? `Results for "${searchTerm}"` : "All Books"} (
          {filteredShelf.length})
        </Typography>
        {loading && shelf.length === 0 ? (
          <Grid item xs={12} sx={{ textAlign: "center", py: 3 }}>
            <CircularProgress />
            <Typography sx={{ mt: 1 }}>Loading books...</Typography>
          </Grid>
        ) : !loading && filteredShelf.length === 0 ? (
          <Grid item xs={12} sx={{ textAlign: "center", py: 3 }}>
            <Typography>
              {searchTerm
                ? "No books match your search criteria."
                : "The shelf is currently empty."}
            </Typography>
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {filteredShelf.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                <Card
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    cursor: "pointer",
                    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                    "&:hover": {
                      transform: "scale(1.03)",
                      boxShadow: 6,
                    }
                  }}
                  onClick={() => handleOpenModal(item)}
                >
                  <CardMedia
                    component="img"
                    image={
                      item.bookData.coverImageUrl === specialImgUrl
                        ? undefined
                        : item.bookData.coverImageUrl || "https://via.placeholder.com/300x260.png?text=No+Image" // Adjusted placeholder if needed
                    }
                    alt={item.bookData.title || "Book image"}
                    sx={{
                      objectFit: item.bookData.coverImageUrl === specialImgUrl ? undefined : "cover",
                      backgroundColor: item.bookData.coverImageUrl === specialImgUrl ? "#FF2D55" : "transparent",
                      height: 260, // << Increased height for "wider" image appearance
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: item.bookData.coverImageUrl === specialImgUrl ? '1.2rem' : undefined,
                      fontWeight: item.bookData.coverImageUrl === specialImgUrl ? 'bold' : undefined,
                    }}
                  >
                    {item.bookData.coverImageUrl === specialImgUrl ? 'Book Cover Placeholder' : undefined}
                  </CardMedia>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div" title={item.bookData.title || ""} noWrap>
                      {item.bookData.title || "Untitled Book"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      ISBN: {item.bookData.isbn && item.bookData.isbn.length > 0 ? item.bookData.isbn[0] : "N/A"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      Author(s): {item.bookData.author_name && item.bookData.author_name.length > 0 ? item.bookData.author_name.join(', ') : "N/A"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Modal
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="book-details-modal-title"
        aria-describedby="book-details-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h5" id="book-details-modal-title" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
            {selectedBook?.bookData.title || "Book Details"}
          </Typography>
          {selectedBook && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                {selectedBook.bookData.coverImageUrl === specialImgUrl ? (
                  <Box
                    sx={{
                      width: 120,
                      height: 180,
                      backgroundColor: "#FF2D55",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  >
                    Book Cover
                  </Box>
                ) : (
                  <img
                    src={selectedBook.bookData.coverImageUrl || "https://via.placeholder.com/120x180.png?text=No+Image"}
                    alt={selectedBook.bookData.title || "Book cover"}
                    style={{
                      maxWidth: "100%", // Ensure image is responsive within its grid item
                      height: 180, // Fixed height for consistency
                      objectFit: "contain",
                      borderRadius: "4px",
                      border: '1px solid #ddd'
                    }}
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={8}>
                <Typography variant="body1" gutterBottom>
                  <strong>Author(s):</strong> {selectedBook.bookData.author_name && selectedBook.bookData.author_name.length > 0 ? selectedBook.bookData.author_name.join(', ') : "Not provided"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>ISBN(s):</strong> {selectedBook.bookData.isbn && selectedBook.bookData.isbn.length > 0 ? selectedBook.bookData.isbn.slice(0, 10) : "Not provided"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Publisher:</strong> {selectedBook.bookData.publisher?.length > 20 ? selectedBook.bookData.publisher?.slice(0, 20) : ""}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Published Date:</strong> {selectedBook.bookData.publishedDate || "Not provided"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Page Count:</strong> {selectedBook.bookData.pageCount ? `${selectedBook.bookData.pageCount} pages` : "Not provided"}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ maxHeight: 80, overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid #eee', p: 1, borderRadius: 1, mt: 0.5 }}>
                  <strong>Subjects:</strong> {selectedBook.bookData.subject && selectedBook.bookData.subject.length > 0 ? selectedBook.bookData.subject.join(', ') : "Not specified"}
                </Typography>
              </Grid>
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Description:</Typography>
                <Box sx={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', p: 1.5, borderRadius: 1, whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                  {selectedBook.bookData.description || "No description available."}
                </Box>
              </Grid>
            </Grid>
          )}
          <Box display="flex" justifyContent="space-between" mt={3}>
            <Button variant="outlined" onClick={handleCloseModal} disabled={isDeleting}>
              Close
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
              onClick={() => {
                if (selectedBook) {
                  handleDeleteBook(selectedBook._id, selectedBook.bookData.title);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Book"}
            </Button>
          </Box>
        </Box>
      </Modal>

      <Snackbar
        open={openAlert}
        autoHideDuration={6000}
        onClose={() => setOpenAlert(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpenAlert(false)}
          severity={alertSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </DashboardCard>
  );
};

export default LibraryShelf;