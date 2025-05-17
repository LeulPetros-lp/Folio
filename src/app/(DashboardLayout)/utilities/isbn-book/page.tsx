"use client";
import React, { useState, useEffect } from "react"; // Import useEffect
import {
  TextField,
  Button, // Keep Button import if needed elsewhere
  Box,
  Typography,
  CircularProgress,
  styled,
  Theme,
  Snackbar,
  Alert,
  AlertProps,
  Grid,
  Modal,
  IconButton,
  Backdrop,
  Fade // Keep Fade for modal and use for top image
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import axios from "axios";
import Image from "next/image";

// Define interfaces for book data from each API
interface OpenLibraryBook {
  source: 'OpenLibrary';
  key: string; // <-- Unique key property
  title: string;
  author?: string; // Note: Open Library often provides author key, requires second fetch for name
  coverImageUrl?: string;
  isbn: string; // Can be the searched ISBN or one found in the data
  description?: string | { type: string; value: string }; // OL description can be string or object
  subjects?: string[];
  publishers?: string[];
  publish_date?: string;
  first_publish_year?: number;
  subtitle?: string;
}

interface GoogleBook {
  source: 'GoogleBooks';
  key: string; // <-- Unique key property (Google Books Volume ID)
  title: string;
  author?: string[]; // Google Books usually provides an array of authors
  coverImageUrl?: string;
  isbn: string; // Can be the searched ISBN or one found in the data
  description?: string; // GB description is typically string
  categories?: string[];
  publishedDate?: string;
  pageCount?: number; // Optional field
  publisher?: string; // Optional field
  subtitle?: string; // Optional field
}

type BookResult = OpenLibraryBook | GoogleBook;

// Styled Box for the modal content
const StyledModalContent = styled(Box)(({ theme }) => `
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px; /* Max width for larger screens */
  max-height: 90vh; /* Max height to prevent overflow */
  overflow-y: auto; /* Enable scrolling within the modal */
  background-color: ${theme.palette.background.paper};
  border-radius: ${theme.shape.borderRadius}px;
  box-shadow: ${theme.shadows[24]};
  padding: ${theme.spacing(4)};
  outline: none; /* Remove default outline */
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing(2)};
`);

// Styled Box for the image placeholder/container in results (used for side-by-side)
const ImageResultContainer = styled(Box)(({ theme }) => `
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing(2)};
  border: 1px solid ${theme.palette.divider};
  border-radius: ${theme.shape.borderRadius}px;
  cursor: pointer; /* Indicate clickability */
  transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
  min-height: 250px; /* Give it a minimum height */
  background-color: ${theme.palette.background.default};
  width: 100%; /* Ensure it takes full width of Grid item */

  &:hover {
    transform: translateY(-4px); /* Slight lift effect */
    box-shadow: ${theme.shadows[3]};
  }
`);

// Styled Box for the form section - Defined outside the component
const FormContainer = styled(Box)(({ theme }) => `
    display: flex;
    gap: ${theme.spacing(2)};
    alignItems: flex-end; // Align items to the bottom
    width: 100%; // Take full width
    flexDirection: column; // Stack on small screens
    ${theme.breakpoints.up('sm')} { // Media query for breakpoint
        flexDirection: row; // Row on small screens and up
    }
`);

// Styled Box for the prominent top book display (Now clickable!)
const TopBookDisplay = styled(Box)(({ theme }) => `
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: ${theme.spacing(4)} auto; /* Center and add margin */
  padding: ${theme.spacing(3)};
  border: 1px solid ${theme.palette.divider};
  border-radius: ${theme.shape.borderRadius * 2}px; /* Match main card radius */
  background-color: ${theme.palette.background.paper};
  box-shadow: ${theme.shadows[4]};
  max-width: 300px; /* Control max width */
  text-align: center;
  cursor: pointer; /* Make the whole card clickable */
   transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;

   &:hover {
    transform: translateY(-4px); /* Slight lift effect */
    box-shadow: ${theme.shadows[6]}; /* More prominent shadow on hover */
   }
`);


export default function AddBookToShelfPage() {
  const [isbn, setIsbn] = useState<string>("");
  const [olBook, setOlBook] = useState<OpenLibraryBook | null>(null);
  const [googleBook, setGoogleBook] = useState<GoogleBook | null>(null);
  const [topBookImage, setTopBookImage] = useState<BookResult | null>(null); // State for the top image
  const [loading, setLoading] = useState(false); // Overall fetching loading state
  const [addingToShelfSource, setAddingToShelfSource] = useState<string | null>(null); // To track which source is being added

  // State for Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertProps['severity']>('success');

  // State for Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBookData, setModalBookData] = useState<BookResult | null>(null);

  // Function to show Snackbar
  const showSnackbar = (message: string, severity: AlertProps['severity']) => {
      setSnackbarMessage(message);
      setSnackbarSeverity(severity);
      setSnackbarOpen(true);
  };

  // Function to close Snackbar
  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') {
          return;
      }
      setSnackbarOpen(false);
  };

  // Functions to control Modal
  // This function is called when clicking the top card OR a side-by-side summary
  const handleOpenModal = (book: BookResult) => {
      setModalBookData(book);
      setModalOpen(true);
  };

  const handleCloseModal = () => {
      setModalOpen(false);
      setModalBookData(null); // Clear modal data on close
      // Reset adding state only if modal is closed while adding the same source
      setAddingToShelfSource(null);
  };


  // Replace with your actual Google Books API Key or configure securely
  // Ensure NEXT_PUBLIC_ prefix if using Next.js public env variables
  const GOOGLE_BOOKS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY; // Make sure this is defined in your .env.local

  const fetchBookDetails = async () => {
    showSnackbar("", 'info'); // Clear previous snackbar
    setOlBook(null); // Clear previous results
    setGoogleBook(null);
    setTopBookImage(null); // Clear top image on new search
    setModalBookData(null); // Clear modal data if a new search is initiated
    setLoading(true); // Start overall loading

    if (!isbn.trim()) {
      showSnackbar("Please enter an ISBN.", 'warning'); // Use snackbar for input validation error
      setLoading(false);
      return;
    }

    const trimmedIsbn = isbn.trim();
    let olResult: OpenLibraryBook | null = null;
    let googleResult: GoogleBook | null = null;
    let fetchErrors: string[] = [];

    // Use Promise.all to fetch concurrently
    await Promise.all([
        // --- Fetch from Open Library ---
        axios.get(`https://openlibrary.org/isbn/${trimmedIsbn}.json`)
            .then(async (olResponse) => {
                if (olResponse.data) {
                    const data = olResponse.data;
                    const title = data.title || "Title Not Available";
                     const authorKey = data.authors && data.authors.length > 0 ? data.authors[0].key : null;
                    let authorName = "Unknown Author";
                    if(authorKey){
                         try {
                             const authorRes = await axios.get(`https://openlibrary.org${authorKey}.json`);
                             if(authorRes.data && authorRes.data.name){
                                 authorName = authorRes.data.name;
                             }
                         } catch (authorError){
                             console.error("Error fetching OL author details:", authorError);
                         }
                    }

                    const coverId = data.covers && data.covers.length > 0 ? data.covers[0] : null;
                    const coverImageUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "";

                    const olDescription = typeof data.description === 'object' && data.description !== null && typeof data.description.value === 'string'
                                            ? data.description.value
                                            : typeof data.description === 'string' ? data.description : '';

                    olResult = {
                        source: 'OpenLibrary',
                        key: data.key,
                        title: title,
                        author: authorName,
                        coverImageUrl: coverImageUrl,
                        isbn: trimmedIsbn,
                        description: olDescription,
                        subjects: data.subjects as string[] || [],
                        publishers: data.publishers as string[] || [],
                        publish_date: data.publish_date as string || '',
                        first_publish_year: data.first_publish_year as number,
                        subtitle: data.subtitle as string,
                    };
                     console.log("Fetched from Open Library:", olResult);
                } else {
                     fetchErrors.push("Open Library: Book data empty.");
                }
            })
            .catch((err) => {
                console.error("Error fetching from Open Library:", err);
                const olErrorMessage = axios.isAxiosError(err) && err.response?.status === 404
                                     ? 'Open Library: Book not found for this ISBN.'
                                     : `Open Library: Fetch failed (${axios.isAxiosError(err) ? err.message : 'network error'}).`;
                fetchErrors.push(olErrorMessage);
            }),

        // --- Fetch from Google Books ---
        (async () => {
             if (!GOOGLE_BOOKS_API_KEY) {
                 console.warn("GOOGLE_BOOKS_API_KEY is not set. Skipping Google Books API call.");
                 fetchErrors.push("Google Books: API key not configured.");
                 return;
             }
             try {
                 // CORRECTED LINE: Use the trimmedIsbn and the environment variable GOOGLE_BOOKS_API_KEY
                 const googleResponse = await axios.get(
                   `https://www.googleapis.com/books/v1/volumes?q=isbn:${trimmedIsbn}&key=${GOOGLE_BOOKS_API_KEY}`
                 );

                 if (googleResponse.data.items && googleResponse.data.items.length > 0) {
                     const item = googleResponse.data.items[0];
                     const volumeInfo = item.volumeInfo;
                     const title = volumeInfo.title || "Title Not Available (Google Books)";
                     const authors = volumeInfo.authors || [];
                     const coverImageUrl = volumeInfo.imageLinks?.extraLarge || volumeInfo.imageLinks?.large || volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.smallThumbnail || volumeInfo.imageLinks?.thumbnail || "";
                     const googleIsbn = volumeInfo.industryIdentifiers?.find((id:any) => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier || trimmedIsbn;

                     googleResult = {
                       source: 'GoogleBooks',
                       key: item.id,
                       title: title,
                       author: authors,
                       coverImageUrl: coverImageUrl,
                       isbn: googleIsbn,
                       description: volumeInfo.description as string || '',
                       categories: volumeInfo.categories as string[] || [],
                       publishedDate: volumeInfo.publishedDate as string || '',
                       pageCount: volumeInfo.pageCount as number,
                       publisher: volumeInfo.publisher as string,
                       subtitle: volumeInfo.subtitle as string,
                     };
                     console.log("Fetched from Google Books:", googleResult);
                 } else {
                    fetchErrors.push("Google Books: Book not found.");
                 }
             } catch (err) {
                 console.error("Error fetching from Google Books:", err);
                 const googleErrorMessage = axios.isAxiosError(err) && err.response?.status
                                          ? `Google Books: Fetch failed (Status: ${err.response.status}).`
                                          : `Google Books: Fetch failed (${axios.isAxiosError(err) ? err.message : 'network error'}).`;
                 fetchErrors.push(googleErrorMessage);
             }
         })()
    ]);

    // Set results after both fetches complete
    setOlBook(olResult);
    setGoogleBook(googleResult);

    // Decide which book to display on top - Prioritize OL if found, otherwise Google
    const primaryBook = olResult || googleResult; // Get the first successful result
    setTopBookImage(primaryBook);


    // Provide feedback via Snackbar
    if (!olResult && !googleResult) {
        showSnackbar("No book found for this ISBN. Please check the number and try again.", 'error');
        console.error("Fetch Errors:", fetchErrors.join(" | "));
    } else if (!olResult || !googleResult) {
        showSnackbar(`Book found from ${olResult ? olResult.source : googleResult?.source}. Note: Failed to fetch from the other source.`, 'warning');
         console.warn("Partial fetch success, errors:", fetchErrors.join(" | "));
    } else {
        // If both were successful, the primary book is OL. Let user know both are available.
        showSnackbar("Book details fetched successfully! See results below.", 'success');
    }

    setLoading(false); // End overall loading
  };

  const handleAddToShelf = async (book: BookResult) => {
    if (!book || !book.key) {
       showSnackbar(`Cannot add book from ${book?.source || 'Unknown Source'}: Missing unique identifier.`, 'error');
       console.error("Attempted to add book without a key:", book);
       return;
    }

    // Set adding state only for the specific source being added
    setAddingToShelfSource(book.source);
    showSnackbar("", 'info'); // Clear previous snackbar

    try {
      const payload = {
        bookDets: book,
      };

      console.log(`Sending payload to /add-shelf:`, JSON.stringify(payload, null, 2));

      const response = await axios.put("http://localhost:5123/add-shelf", payload);

      console.log('Book added to shelf successfully:', response.data);
      showSnackbar(`"${book.title}" added to shelf successfully!`, 'success');

      handleCloseModal();

      // Clear the specific result that was added from the main display states
      if(book.source === 'OpenLibrary') setOlBook(null);
      if(book.source === 'GoogleBooks') setGoogleBook(null);
      // Also clear the top image if the book being added is the one shown on top
      if (topBookImage?.key === book.key) {
          setTopBookImage(null);
      }


      setTimeout(() => {
          // Check states *after* the update might be more reliable with a timeout
          if (!olBook && !googleBook) {
               setIsbn(""); // Clear ISBN if both results are now null
          }
       }, 0);

    } catch (err) {
      console.error(`Error adding book from ${book.source} to shelf:`, err);
       const errorMessage = axios.isAxiosError(err) && axios.isAxiosError(err) && err.response?.data?.message // Corrected double axios.isAxiosError
                            ? err.response.data.message
                            : `Failed to add book from ${book.source} to shelf. Please try again.`;
      showSnackbar(errorMessage, 'error');
    } finally {
      // Reset adding state for this source regardless of success/failure
      setAddingToShelfSource(null);
    }
  };

    // Helper function to render individual book result summary (image + title/author) for side-by-side
    const renderBookSummary = (
        book: BookResult | null,
        sourceType: 'OpenLibrary' | 'GoogleBooks',
        overallLoading: boolean // Keep for potential future use, but not strictly needed for this logic
    ) => {
        // Only render if we have book data AND this book is NOT the one shown on top
        if (!book || topBookImage?.key === book.key) {
             return null;
        }

        const authorDisplay = book.source === 'GoogleBooks' && Array.isArray(book.author)
                            ? book.author.join(', ')
                            : (book.author || 'N/A'); // Ensure handling for OL string author or undefined

        return (
            // Use Grid item for layout
            <Grid item xs={12} sm={6} key={book.key}>
                {/* Make the container clickable to open modal */}
                <ImageResultContainer onClick={() => handleOpenModal(book)}>
                    <Box sx={{ width: 120, height: 180, position: 'relative', mb: 1 }}>
                        <Image
                            src={book.coverImageUrl || "https://via.placeholder.com/120x180?text=No+Cover"}
                            alt={`Cover of ${book.title}`}
                            layout="fill"
                            objectFit="contain"
                            priority={true}
                        />
                    </Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontSize: '1rem', mt: 1, textAlign: 'center' }}>
                        {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem', textAlign: 'center' }}>
                        by {authorDisplay}
                    </Typography>
                </ImageResultContainer>
            </Grid>
        );
    }

    // Function to render detailed info in the modal
    const renderDetailedBookInfo = (book: BookResult) => {
        const isGoogleBook = book.source === 'GoogleBooks';
        const authorDisplay = isGoogleBook && Array.isArray(book.author)
                            ? book.author.join(', ')
                            : (book.author || 'N/A');
        const description = typeof book.description === 'object' && book.description !== null && typeof book.description.value === 'string'
                            ? book.description.value
                            : typeof book.description === 'string' ? book.description : 'No description available.';

        const isAddingThisBook = addingToShelfSource === book.source;

        return (
            <Box>
                <IconButton
                  aria-label="close"
                  onClick={handleCloseModal}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                  }}
                >
                  <CloseIcon />
                </IconButton>

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                     <Box sx={{ width: 150, height: 225, position: 'relative' }}>
                         <Image
                           src={book.coverImageUrl || "https://via.placeholder.com/150x225?text=No+Cover"}
                           alt={`Cover of ${book.title}`}
                           layout="fill"
                           objectFit="contain"
                           priority={true}
                         />
                     </Box>
                </Box>

                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                    {book.title}
                </Typography>
                 {book.subtitle && (
                    <Typography variant="subtitle1" gutterBottom color="text.secondary" sx={{ textAlign: 'center' }}>
                         {book.subtitle}
                     </Typography>
                 )}

                <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', mb: 2 }}>
                    by {authorDisplay}
                </Typography>

                 <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    ISBN: {book.isbn}
                 </Typography>

                 {isGoogleBook ? (
                     <>
                         {book.publisher && <Typography variant="body2" color="text.secondary">Publisher: {book.publisher}</Typography>}
                         {book.publishedDate && <Typography variant="body2" color="text.secondary">Published Date: {book.publishedDate}</Typography>}
                         {book.pageCount !== undefined && book.pageCount !== null && book.pageCount > 0 && (
                             <Typography variant="body2" color="text.secondary">Pages: {book.pageCount}</Typography>
                         )}
                         {book.categories && book.categories.length > 0 && <Typography variant="body2" color="text.secondary">Categories: {book.categories.join(', ')}</Typography>}
                     </>
                 ) : ( // Open Library specific details
                      <>
                         {book.publishers && book.publishers.length > 0 && <Typography variant="body2" color="text.secondary">Publishers: {book.publishers.join(', ')}</Typography>}
                         {book.publish_date && <Typography variant="body2" color="text.secondary">Publish Date: {book.publish_date}</Typography>}
                         {book.first_publish_year !== undefined && book.first_publish_year !== null && book.first_publish_year > 0 && (
                              <Typography variant="body2" color="text.secondary">First Publish Year: {book.first_publish_year}</Typography>
                         )}
                         {book.subjects && book.subjects.length > 0 && <Typography variant="body2" color="text.secondary">Subjects: {book.subjects.join(', ')}</Typography>}
                      </>
                 )}

                 <Typography variant="body2" sx={{ mt: 2, mb: 3, lineHeight: 1.6 }}>
                    **Description:** {description}
                 </Typography>


                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    {/* Only show Add button if the book has a key */}
                    {book.key ? (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleAddToShelf(book)}
                          disabled={isAddingThisBook}
                          sx={{ px: 4, py: 1.5 }}
                        >
                           {isAddingThisBook ? <CircularProgress size={24} color="inherit" /> : "Add to Shelf"}
                        </Button>
                    ) : (
                         <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                           Cannot add (missing key)
                         </Typography>
                    )}
                </Box>
            </Box>
        );
    }


  return (
    <Box sx={{ padding: { xs: 2, sm: 4, md: 6 }, minHeight: '100vh', backgroundColor: 'background.default' }}>

      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', color: 'text.primary', mb: 2 }}>
          Library Book Search
      </Typography>
       <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 6 }}>
           Access a vast collection by searching across two major book databases
       </Typography>

        {/* Prominent Top Book Image Display - Shown only when topBookImage is set */}
        <Fade in={!!topBookImage}>
             {/* The Box wrapper is needed for Fade to work correctly when the content changes */}
            <Box>
                 {topBookImage && (
                     // Make the TopBookDisplay clickable to open the modal
                     <TopBookDisplay onClick={() => handleOpenModal(topBookImage)}>
                          <Box sx={{ width: 150, height: 225, position: 'relative', mb: 1 }}>
                              <Image
                                src={topBookImage.coverImageUrl || "https://via.placeholder.com/150x225?text=No+Cover"}
                                alt={`Cover of ${topBookImage.title}`}
                                layout="fill"
                                objectFit="contain"
                                priority={true}
                              />
                          </Box>
                           <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontSize: '1.1rem', mt: 1, textAlign: 'center' }}>
                               {topBookImage.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>
                                by {(topBookImage.source === 'GoogleBooks' && Array.isArray(topBookImage.author))
                                        ? topBookImage.author.join(', ')
                                        : (topBookImage.author || 'N/A')}
                            </Typography>
                     </TopBookDisplay>
                 )}
            </Box>
        </Fade>


       {/* Form Section - Styled to fit background */}
       {/* Add margin top based on image presence */}
       <FormContainer sx={{ maxWidth: 600, margin: '0 auto', gap: 2, mt: topBookImage ? 4 : 0 }}>
         <TextField
           label="Enter ISBN"
           value={isbn}
           onChange={(e) => setIsbn(e.target.value)}
           onKeyDown={(e) => { // Handle Enter key press
              // Only search if Enter is pressed, not loading, not adding, and ISBN is not empty
              if (e.key === 'Enter' && !loading && addingToShelfSource === null && isbn.trim()) {
                  fetchBookDetails();
              }
           }}
           fullWidth
           variant="outlined"
           disabled={loading || addingToShelfSource !== null} // Disable if fetching OR adding
           placeholder="e.g., 978-0321765723"
           size="medium"
         />
         {/* Search button removed */}
       </FormContainer>

        {/* Loading Spinner - Centralized when fetching */}
        {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        )}


       {/* Display Area for OTHER Results using Grid */}
       {/* Show this grid only if NOT loading, NOT modal open, AND at least one alternative book exists */}
       {/* An alternative exists if either OL or Google book is not null AND its key is different from the top book */}
       {/* We also ensure olBook or googleBook is not null to only show the grid if *a* result was found (and potentially others exist) */}
       {!loading && !modalOpen && (olBook || googleBook) && (olBook?.key !== topBookImage?.key || googleBook?.key !== topBookImage?.key) ? (
            <Grid container spacing={4} sx={{ mt: 6, justifyContent: 'center' }}>
                {/* Render OL summary ONLY if it exists AND is not the top book */}
                {olBook && olBook.key !== topBookImage?.key && renderBookSummary(olBook, 'OpenLibrary', loading)}
                {/* Render Google summary ONLY if it exists AND is not the top book */}
                {googleBook && googleBook.key !== topBookImage?.key && renderBookSummary(googleBook, 'GoogleBooks', loading)}

                 {/* Handle edge case: if one result was found and is on top, but the other failed,
                     the grid might be empty. We could add a message here if needed.
                     For now, the grid just won't show if no alternative is found.
                 */}
            </Grid>
        ) : (
             // Optional: Add some space if search is done and results were found (even if only one shown on top)
             !loading && (olBook || googleBook) && !modalOpen && <Box sx={{ mt: 6 }} />
        )}


      {/* Snackbar for notifications */}
      <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000} // Hide after 6 seconds
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Position at bottom center
      >
          <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
              {snackbarMessage}
          </Alert>
      </Snackbar>

        {/* Modal for Book Details */}
        <Modal
            aria-labelledby="book-details-modal-title"
            aria-describedby="book-details-modal-description"
            open={modalOpen}
            onClose={handleCloseModal}
            closeAfterTransition
            slots={{ backdrop: Backdrop }}
            slotProps={{
              backdrop: {
                timeout: 500,
              },
            }}
        >
            <Fade in={modalOpen}>
                {/* Only render modal content if modalBookData is available */}
                {modalBookData ? (
                    <StyledModalContent>
                        {renderDetailedBookInfo(modalBookData)}
                    </StyledModalContent>
                ) : (
                    // Fallback if modalBookData is unexpectedly null (shouldn't happen with current logic)
                    <StyledModalContent>
                        <Typography color="error">Error: Could not load book details for display.</Typography>
                         <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                             <Button onClick={handleCloseModal} variant="contained">Close</Button>
                         </Box>
                    </StyledModalContent>
                )}
            </Fade>
        </Modal>

    </Box>
  );
}