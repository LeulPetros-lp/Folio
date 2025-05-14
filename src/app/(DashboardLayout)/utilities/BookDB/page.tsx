'use client';
import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import {
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Chip,
  Typography,
  Button,
  Grid,
  Box,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Stack,
  Alert,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook'; // Import for placeholder icon
import axios from 'axios';

// Book interface (as previously defined)
interface Book {
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

// De-duplication function (as previously defined)
const deduplicateBooks = (books: Book[]): Book[] => {
  const seenKeys = new Set<string>();
  const uniqueBooks: Book[] = [];
  for (const book of books) {
    let uniqueIdentifier: string | null = null;
    const validIsbns = book.isbn
      ?.map(isbn => isbn.replace(/[^0-9X]/gi, ''))
      .filter(isbnStr => isbnStr.length === 10 || isbnStr.length === 13)
      .sort((a, b) => b.length - a.length);
    if (validIsbns && validIsbns.length > 0) {
      uniqueIdentifier = validIsbns[0];
    }
    if (!uniqueIdentifier) {
      const title = book.title?.trim().toLowerCase();
      const firstAuthor = book.author_name?.[0]?.trim().toLowerCase();
      if (title && firstAuthor) {
        uniqueIdentifier = `t:${title}|a:${firstAuthor}`;
      } else if (title) {
        uniqueIdentifier = `t:${title}`;
      }
    }
    if (uniqueIdentifier) {
      if (!seenKeys.has(uniqueIdentifier)) {
        seenKeys.add(uniqueIdentifier);
        uniqueBooks.push(book);
      }
    } else {
      if (!seenKeys.has(book.key)) {
        seenKeys.add(book.key);
        uniqueBooks.push(book);
      }
    }
  }
  return uniqueBooks;
};


const Page: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchBooks = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setBooks([]);

    try {
      const [googleResponse, openLibraryResponse] = await Promise.all([
        axios
          .get(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
              searchQuery
            )}&maxResults=40&maxAllowedMaturityRating=not-mature`
             // Add &key=YOUR_GOOGLE_API_KEY for production for reliability
          )
          .catch((err) => {
            console.error('Google Books API Error:', err.message);
            return { data: { items: [] }, error: true, source: 'Google Books' };
          }),
        axios
          .get(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(
              searchQuery
            )}&limit=60&fields=key,title,author_name,isbn,subject,cover_i,publisher,first_publish_year,publish_date,number_of_pages_median,first_sentence_value`
          )
          .catch((err) => {
            console.error('Open Library API Error:', err.message);
            return { data: { docs: [] }, error: true, source: 'Open Library' };
          }),
      ]);

      let combinedBooks: Book[] = [];
      let apiErrors: string[] = [];

      if (googleResponse.data.items && googleResponse.data.items.length > 0) {
        const googleBooksMapped = googleResponse.data.items.map((item: any): Book => {
          const volumeInfo = item.volumeInfo;
          return {
            key: `gb-${item.id}`,
            googleBooksId: item.id,
            title: volumeInfo.title,
            author_name: volumeInfo.authors || [],
            isbn:
              volumeInfo.industryIdentifiers?.map(
                (idObj: any) => idObj.identifier
              ) || [],
            subject: volumeInfo.categories || [],
            coverImageUrl:
              volumeInfo.imageLinks?.thumbnail ||
              volumeInfo.imageLinks?.smallThumbnail,
            publisher: volumeInfo.publisher,
            publishedDate: volumeInfo.publishedDate,
            description: volumeInfo.description,
            pageCount: volumeInfo.pageCount,
            sourceApi: 'GoogleBooks',
          };
        });
        combinedBooks = combinedBooks.concat(googleBooksMapped);
      } else if ((googleResponse as any).error) {
        apiErrors.push('Failed to fetch results from Google Books.');
      }

      if (openLibraryResponse.data.docs && openLibraryResponse.data.docs.length > 0) {
        const openLibraryBooksMapped = openLibraryResponse.data.docs.map((doc: any): Book => ({
          key: `ol-${doc.key?.split('/').pop() || doc.key}`,
          openLibraryKey: doc.key?.split('/').pop(),
          title: doc.title,
          author_name: doc.author_name || [],
          isbn: doc.isbn || [],
          subject: doc.subject?.slice(0, 10) || [],
          coverImageUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
          publisher: doc.publisher?.join(', '),
          publishedDate: String(doc.first_publish_year || doc.publish_date?.[0] || ''),
          description: typeof doc.first_sentence_value === 'string' ? doc.first_sentence_value : undefined,
          pageCount: typeof doc.number_of_pages_median === 'number' ? doc.number_of_pages_median : undefined,
          sourceApi: 'OpenLibrary',
        }));
        combinedBooks = combinedBooks.concat(openLibraryBooksMapped);
      } else if ((openLibraryResponse as any).error) {
        apiErrors.push('Failed to fetch results from Open Library.');
      }

      const uniqueBooks = deduplicateBooks(combinedBooks);
      setBooks(uniqueBooks);

      if (apiErrors.length > 0) {
        setError(apiErrors.join('\n'));
      }
      if (uniqueBooks.length === 0 && apiErrors.length === 0 && query) {
        setError(`No books found for "${searchQuery}". Try a different search term or check your spelling.`);
      }

    } catch (err: any) {
      console.error('Generic error in fetchBooks:', err);
      setError('An unexpected error occurred while fetching books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const performSearch = () => {
    if (query.trim()) {
      fetchBooks(query);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      performSearch();
    }
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setOpen(true);
    setAddError(null);
  };

  const handleAddBook = async () => {
    if (selectedBook) {
      setAddError(null);
      try {
        const response = await axios.put('http://localhost:5123/add-shelf', { bookDets: selectedBook });
        if (response.status === 200 || response.status === 201) {
          setOpen(false);
        } else {
          const errorMessage = response.data?.message || `Failed to add book. Server responded with status: ${response.status}`;
          setAddError(errorMessage);
        }
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response) {
          const backendErrorMessage = err.response.data?.message || err.response.data?.error;
          setAddError(backendErrorMessage || `Failed to add book: ${err.response.status} ${err.response.statusText}`);
        } else if (err.request) {
          setAddError('Failed to add book: No response from server. Check network and backend.');
        } else {
          setAddError(`Failed to add book: An unexpected error occurred. ${err.message}`);
        }
      }
    } else {
      setAddError("No book selected to add.");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
        <TextField
          sx={{ width: { xs: '100%', sm: 450 }, bgcolor: 'white' }}
          label="Search Google Books & Open Library"
          variant="outlined"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder="e.g., The Lord of the Rings"
        />
        {/* <Button variant="contained" sx={{ height: '56px', width: {xs: '100%', sm: 'auto'}, px: {sm: 3} }} onClick={performSearch}>
          Search
        </Button> */}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={50} />
        </Box>
      )}
      {error && !loading && (
        <Alert severity="warning" sx={{ my: 2, mx: 'auto', maxWidth: 'lg' }}>
          {error.split('\n').map((line, idx) => <Typography key={idx} component="p">{line}</Typography>)}
        </Alert>
      )}
      {!loading && !error && books.length === 0 && !query && (
         <Typography sx={{mt: 4, textAlign: 'center', color: 'text.secondary' }}>
            Enter a book title or keywords to start searching.
        </Typography>
      )}

      {!loading && books.length > 0 && (
        <Grid container spacing={3} justifyContent="center">
          {books.map((book) => (
            <Grid item key={book.key} xs={6} sm={4} md={3} lg={2.4} xl={2}>
              <Card
                sx={{
                  width: '100%',
                  maxWidth: 180,
                  height: 300,
                  mx: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s ease', // Added border-color to transition
                  '&:hover': {
                    transform: 'translateY(-5px) scale(1.03)',
                    boxShadow: (theme) => theme.shadows[10],
                    borderColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main, // Subtle border color change on hover
                  },
                  borderRadius: '12px',
                  position: 'relative',
                  border: '1px solid transparent', // Initial transparent border to prevent layout shift
                }}
                // variant="outlined" // Using manual border for hover effect consistency
              >
                <CardActionArea
                  onClick={() => handleBookClick(book)}
                  sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
                >
                  <Box sx={{
                      height: 210,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.200',
                      overflow: 'hidden',
                      borderTopLeftRadius: '12px', // Match card radius
                      borderTopRightRadius: '12px',
                    }}
                  >
                    {book.coverImageUrl ? (
                      <CardMedia
                        component="img"
                        sx={{
                          height: '100%',
                          width: '100%',
                          objectFit: 'contain',
                        }}
                        image={book.coverImageUrl}
                        alt={book.title || 'Book cover'}
                      />
                    ) : (
                      // Enhanced Placeholder
                      <Stack spacing={0.5} alignItems="center" justifyContent="center" sx={{height: '100%', color: 'text.secondary', p:1}}>
                        <MenuBookIcon sx={{ fontSize: '3rem', opacity: 0.6 }} />
                        <Typography variant="caption" sx={{textAlign:'center'}}>
                          No Cover
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                  <Chip
                    label={book.sourceApi === 'GoogleBooks' ? 'Google' : 'OpenLib'}
                    size="small"
                    color={book.sourceApi === 'GoogleBooks' ? 'primary' : 'secondary'}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      opacity: 0.9,
                      fontSize: '0.68rem',
                      height: '20px',
                      lineHeight: '20px',
                      '& .MuiChip-label': { px: '8px' }
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1, p: 1.5, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography
                      variant="body2"
                      component="p"
                      title={book.title || "Unknown Title"}
                      sx={{
                        fontWeight: 500,
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4,
                        minHeight: '2.8em'
                      }}
                    >
                      {book.title || 'Unknown Title'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal for book confirmation (structure remains as per your last provided code) */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', position: 'relative', pt: 2.5, pb: 1 }}>
          {selectedBook?.title && selectedBook.title.length > 40 ? `${selectedBook.title.slice(0, 40)}...` : selectedBook?.title || "Book Details"}
          {selectedBook && (
            <Chip
                label={selectedBook.sourceApi === 'GoogleBooks' ? 'Source: Google Books' : 'Source: Open Library'}
                size="small"
                color={selectedBook.sourceApi === 'GoogleBooks' ? 'primary' : 'secondary'}
                variant="outlined"
                sx={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)', fontSize: '0.7rem' }}
            />
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {selectedBook && (
            <>
              <Box display="flex" justifyContent="center" mb={2.5}>
                {selectedBook.coverImageUrl ? (
                  <CardMedia
                    component="img"
                    sx={{
                      width: '140px',
                      height: '200px',
                      borderRadius: '8px',
                      objectFit: 'contain',
                      boxShadow: 3
                    }}
                    image={selectedBook.coverImageUrl}
                    alt={selectedBook.title || "Book cover"}
                  />
                ) : (
                  <Card
                    sx={{
                      width: 140, height: 200, mx: 'auto', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200',
                    }}
                    variant="outlined"
                  >
                    <Typography sx={{ color: 'grey.700' }}>No Image</Typography>
                  </Card>
                )}
              </Box>

              <Stack spacing={1} sx={{textAlign: 'left', mb: 2, px: {xs: 0, sm: 1}}}>
                <Typography variant="body1"><strong>Author(s):</strong> {selectedBook.author_name?.join(', ') || 'N/A'}</Typography>
                <Typography variant="body1"><strong>Publisher:</strong> {selectedBook.publisher?.slice(0, 600) + "..." || 'N/A'}</Typography>
                <Typography variant="body1"><strong>Published:</strong> {selectedBook.publishedDate || 'N/A'}</Typography>
                <Typography variant="body1"><strong>Pages:</strong> {selectedBook.pageCount || 'N/A'}</Typography>
                <Typography variant="body1">
                  <strong>ISBN(s):</strong> {selectedBook.isbn?.slice(0, 5).join(', ') || 'N/A'}
                  {selectedBook.isbn && selectedBook.isbn.length > 5 && (
                    <Typography variant="caption" component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>
                      (+{selectedBook.isbn.length - 5} more)
                    </Typography>
                  )}
                </Typography>
              </Stack>

              {selectedBook.description && (
                <Box sx={{ textAlign: 'left', my: 2.5, maxHeight: 150, overflowY: 'auto', border: '1px solid #e0e0e0', p: 1.5, borderRadius: '8px', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" component="p" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Description:
                  </Typography>
                  <Typography variant="body2" component="p">
                    {selectedBook.description}
                  </Typography>
                </Box>
              )}

              {selectedBook.subject && selectedBook.subject.length > 0 && (
                <Box sx={{ textAlign: 'center', my: 2.5 }}>
                <Typography variant="subtitle2" component="p" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Categories/Subjects:
                </Typography>
                <Box display="flex" flexWrap="wrap" justifyContent="center" gap={0.8}>
                    {selectedBook.subject.slice(0, 5).map((subject, index) => (
                    <Chip key={index} label={subject} size="small" />
                    ))}
                    {selectedBook.subject.length > 5 && <Chip label={`+${selectedBook.subject.length - 5} more`} size="small" />}
                </Box>
                </Box>
              )}
            </>
          )}
          {addError && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{addError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px:3, py: 1.5, borderTop: '1px solid #e0e0e0' }}>
          <Button color="inherit" variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button color="primary" variant="contained" onClick={handleAddBook}>Confirm Add Book</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Page;