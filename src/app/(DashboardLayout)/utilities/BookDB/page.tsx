'use client';
import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import { TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Chip, Typography, Button, Grid } from '@mui/material';
import axios from 'axios';

interface Book {
  key: string;
  coverImageUrl?: string;
  author_name?: string[];
  title?: string;
  subject: string[];
  isbn?: string[];
}

const Page: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchBooks = async (searchQuery: string) => {
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      // Fetch from Open Library API
      const openLibraryResponse = await axios.get(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&details=true`
      );

      console.log('Open Library Response:', openLibraryResponse.data);

      // Normalize Open Library books
      const openLibraryBooks = openLibraryResponse.data.docs.map((book: any) => ({
        key: book.key,
        title: book.title,
        author_name: book.author_name || [],
        isbn: book.isbn || [],
        subject: book.subject || [],
        coverImageUrl: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
          : null,
      }));

      setBooks(openLibraryBooks); // Set Open Library books in state
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.message);
        setError(error.message);
      } else {
        console.error('Unexpected error:', error);
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && query.trim()) {
      fetchBooks(query); // Fetch books when the user presses Enter
    }
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book); // Set the clicked book as the selected book
    setOpen(true); // Open the modal
  };

  const handleAddBook = async () => {
    if (selectedBook) {
      try {
        // Extract necessary details for the book
        const bookDets = {
          title: selectedBook.title || 'Unknown Title',
          coverImageUrl: selectedBook.coverImageUrl || "https://bookshow.blurb.com/bookshow/cache/P14573326/md/cover_2.jpeg?access_key=6890e15bab68c1c63a894a2f8e21728a",
          isbn: selectedBook.isbn ? selectedBook.isbn[0] : "00000000000",
        };

        // Make the PUT request to add the book to the shelf
        const response = await axios.put('http://localhost:5123/add-shelf', { bookDets });

        if (response.status === 200) {
          console.log('Book added to shelf:', response.data);
          setOpen(false); // Close the modal after success
        }
      } catch (err) {
        console.error('Error adding book to shelf:', err);
        setAddError('Failed to add book to shelf');
      }
    }
  };

  return (
    <div className="text-center p-10">
      <div className="flex justify-center mb-10" style={{ display: 'flex', justifyContent: 'center' }}>
          <TextField
            style={{ width: 450 }}
            label="Search for books"
            variant="outlined"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress} // Handle enter key to submit
            placeholder="Try: Lords of the ring"
          />
      </div>

      <br></br>
      {loading ? (
        <div style={{ textAlign: 'center', justifyContent: 'center', display: 'flex' }}>
          <CircularProgress />
        </div>
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : (
        <Grid container spacing={2} justifyContent="center">
          {books.length > 0 ? (
            books.map((book) => (
              <Grid
                item
                key={book.key}
                xs={6} sm={4} md={3} lg={2} xl={2} // Same responsive grid settings
                className="flex flex-col items-center cursor-pointer transition-transform transform hover:scale-105 hover:shadow-lg"
                onClick={() => handleBookClick(book)}
              >
                {book.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverImageUrl}
                    alt="Book cover"
                    className="w-20 h-28 mb-2 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-28 flex items-center justify-center bg-gray-200 text-gray-500 rounded-lg">
                    No Image
                  </div>
                )}
                <p className="text-center text-sm text-gray-700">{book.title}</p>
              </Grid>
            ))
          ) : (
            <p>No books found</p>
          )}
        </Grid>
      )}



      {/* Modal for book confirmation */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Confirm Book Addition</DialogTitle>
        <DialogContent>
          {selectedBook && (
            <div className="text-center">
              <p><strong>Title:</strong> {selectedBook.title}</p>
              <p><strong>Author:</strong> {selectedBook.author_name?.join(", ") || "Unknown Author"}</p>
              {selectedBook.subject.slice(0, 5).map((subject) => (
                <Chip label={subject} color="primary" style={{ padding: 10, margin: 5 }} key={subject} />
              ))}
            </div>
          )}
          {addError && <Typography color="error" style={{ marginTop: '8px' }}>{addError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button color="primary" onClick={handleAddBook}>Confirm Add Book</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Page;
