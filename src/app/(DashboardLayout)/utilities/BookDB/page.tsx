'use client';
import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import { TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Chip, Typography, Button, Grid, Box, Card } from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Book {
  key: string;
  coverImageUrl?: string;
  author_name?: string[];
  title?: string;
  subject: string[];
  isbn?: string[];
}

const Page: React.FC = () => {

  const router = useRouter()

  const [query, setQuery] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchBooks = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const openLibraryResponse = await axios.get(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&details=true`
      );

      console.log('Open Library Response:', openLibraryResponse.data);

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

      setBooks(openLibraryBooks);
    } catch (error: any) {
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
      fetchBooks(query);
    }
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setOpen(true);
  };

  const handleAddBook = async () => {
    if (selectedBook) {
      try {
        const bookDets = {
          title: selectedBook.title || 'Unknown Title',
          coverImageUrl: selectedBook.coverImageUrl || "https://bookshow.blurb.com/bookshow/cache/P14573326/md/cover_2.jpeg?access_key=6890e15bab68c1c63a894a2f8e21728a",
          isbn: selectedBook.isbn ? selectedBook.isbn[0] : "00000000000",
        };

        const response = await axios.put('http://localhost:5123/add-shelf', { bookDets });

        if (response.status === 200) {
          console.log('Book added to shelf:', response.data);
          setOpen(false);
        }
      } catch (err: any) {
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
          onKeyDown={handleKeyPress}
          placeholder="Try: Lords of the ring"
        />

        <Button variant='contained' sx={{ ml: 2}} onClick={() => router.push("/utilities/isbn-book")}>ISBN DB</Button>
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
            books.map((book) => { 

              return (
                <Grid
                  item
                  key={book.key}
                  xs={6} sm={4} md={3} lg={2} xl={2}
                  className="flex flex-col items-center cursor-pointer transition-transform transform hover:scale-105 hover:shadow-lg"
                  onClick={() => handleBookClick(book)}
                >
                  {book.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverImageUrl}
                      alt="Book cover"
                      className="w-20 h-28 mb-2 rounded-lg object-cover"
                      style={{ 
                        borderRadius: 5
                      }}
                    />
                  ) : (
                    <Card
                    sx={{
                      width: '10rem',
                      height: '14rem',
                      mx: 'auto',
                      mb: '1rem', // Corresponds to Tailwind's mb-4
                      borderRadius: '0.5rem', // Corresponds to Tailwind's rounded-lg
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'white', // Corresponds to Tailwind's bg-gray-200
                      // Note: objectFit: 'cover' from your list is for image content, not the Card container itself.
                    }}
                    variant="outlined" // Optional: gives a border, good for placeholders
                  >
                    <Typography sx={{ color: 'grey.700' /* Corresponds to text-gray-500 */ }}>
                      No Image
                    </Typography>

                    </Card>
                  )}
                  <p className="text-center text-sm text-gray-700">{book.title}</p>
                  {/* <p className="text-center text-xs text-gray-500">
                    By {book.author_name?.join(', ') || 'Unknown Author'}
                  </p> */}
                </Grid>
              );
            })
          ) : (
            <p>No books found</p>
          )}
        </Grid>
      )}

      {/* Modal for book confirmation */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Confirm Book Addition</DialogTitle>
        <DialogContent sx={{ width: '400px' }}>
          {selectedBook && (
            <div className="text-center">
              {selectedBook.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedBook.coverImageUrl}
                  alt="Book cover"
                  className="w-40 h-56 mx-auto mb-4 rounded-lg object-cover"
                  style={{ borderRadius: 10}}
                />
              ) : (
                <Card
                sx={{
                  width: '10rem',
                  height: '14rem',
                  mx: 'auto',
                  mb: '1rem', // Corresponds to Tailwind's mb-4
                  borderRadius: '0.5rem', // Corresponds to Tailwind's rounded-lg
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'white', // Corresponds to Tailwind's bg-gray-200
                  // Note: objectFit: 'cover' from your list is for image content, not the Card container itself.
                }}
                variant="outlined" // Optional: gives a border, good for placeholders
              >
                <Typography sx={{ color: 'grey.700' /* Corresponds to text-gray-500 */ }}>
                  No Image
                </Typography>
              </Card>
              )}

              <p><strong>Title:</strong> {selectedBook.title}</p>
              <p><strong>Author:</strong> {selectedBook.author_name?.join(", ") || "Unknown Author"}</p>
              <p><strong>ISBN:</strong> {selectedBook.isbn?.join(", ") || "N/A"}</p>
              <Typography variant="subtitle2" component="p" className="mt-2 font-italic">
                Subjects:
              </Typography>
              <Box mt={1} display="flex" flexWrap="wrap" justifyContent="center">
                {selectedBook.subject.slice(0, 5).map((subject, index) => (
                  <Chip
                    key={index}
                    label={subject}
                    color="primary"
                    style={{ padding: 10, margin: 5 }}
                  />
                ))}
              </Box>
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

