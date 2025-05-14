"use client";
import React, { useEffect, useState, ChangeEvent } from "react";
import {
  TextField,
  Button,
  Autocomplete,
  Modal,
  Box,
  MenuItem,
  Typography,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/system";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Interface for the book details stored in the component's state
interface BookDetails {
  data: ApiShelfBookData; // The 'data' property will hold the actual book chunk
}

// --- Updated Interfaces for data fetched from API ---
interface ApiShelfBookData {
  key: string;
  title?: string;
  author_name?: string[];
  isbn?: string[]; // Array of ISBNs from API
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

interface ApiShelfItem {
  _id: string;
  identifierKey: string;
  bookData: ApiShelfBookData;
  dateAdded: string;
}

interface Member {
  stud_id: string;
  name: string;
  age: number;
  grade: string | number;
  section: string;
  parentPhone?: number;
  _id?: string;
}
// --- End of Updated API Data Interfaces ---

type Duration = "3-days" | "1-week" | "2-week" | "1-month";
type Age = number;

interface ReturnDate {
  day: number;
  month: number; // 1-12
  year: number;
}

export default function Page() {
  const [bookDets, setBookDetails] = useState<BookDetails | null>(null); // bookDets is now { data: ApiShelfBookData } | null
  const [isbn, setIsbn] = useState<string>(""); // Stores the selected book's title
  const [duration, setDuration] = useState<Duration | null>(null);
  const [returnDate, setReturnDate] = useState<ReturnDate | null>(null); // This state holds {day, month, year}
  const [age, setAge] = useState<Age | "">("");
  const [grade, setGrade] = useState<string | number | "">("");
  const [section, setSection] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [selectedStudId, setSelectedStudId] = useState<string>("");

  const [shelf, setShelf] = useState<ApiShelfItem[]>([]);
  const [membersList, setMembers] = useState<Member[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [isGood, setIsGood] = useState(false);

  const [isBookImageLoading, setIsBookImageLoading] = useState<boolean>(false);

  const router = useRouter();

  const StyledModalBox = styled(Box)({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    padding: "20px",
    boxShadow: "24",
    borderRadius: "8px",
    outline: "none",
    minWidth: "300px",
  });

  const handleAddStudentClick = () => {
    console.log("Validating for Add Student:", { name, age, selectedBookTitleFromIsbnState: isbn, grade, section, duration, selectedStudId, bookDetsState: bookDets });

    if (
      !name.trim() ||
      !age ||
      !selectedStudId?.trim() ||
      !isbn.trim() ||
      !bookDets?.data?.title ||
      (grade === undefined || grade === "") ||
      !section.trim() ||
      !duration
    ) {
      setIsGood(false);
      console.log("Frontend validation failed in handleAddStudentClick. Missing fields or book data chunk not fully loaded.");
    } else {
      setIsGood(true);
      console.log("Frontend validation passed in handleAddStudentClick.");
    }
    setOpenModal(true);
  };

  const handleDuration = (key: string) => {
    if (["3-days", "1-week", "2-week", "1-month"].includes(key)) {
      setDuration(key as Duration);
    } else {
      console.error("Invalid duration key");
      setDuration(null);
    }
  };

  useEffect(() => {
    if (duration) {
      const calc_return_date = () => {
        let date_col = new Date();
        switch (duration) {
          case "3-days": date_col.setDate(date_col.getDate() + 3); break;
          case "1-week": date_col.setDate(date_col.getDate() + 7); break;
          case "2-week": date_col.setDate(date_col.getDate() + 14); break;
          case "1-month": date_col.setMonth(date_col.getMonth() + 1); break;
          default: return;
        }
        setReturnDate({
          day: date_col.getDate(),
          month: date_col.getMonth() + 1,
          year: date_col.getFullYear(),
        });
      };
      calc_return_date();
    } else {
      setReturnDate(null);
    }
  }, [duration]);

  const done_btn = async () => {
    if (!isGood || !bookDets?.data?.title || !returnDate || !duration || !selectedStudId || !name || !age || (grade==="")) {
      console.error("Attempted to submit with invalid or incomplete data. Frontend check (isGood):", isGood, "Payload parts:", {bookDets, returnDate, duration, selectedStudId, name, age, grade});
      alert("Please ensure all student and book details are correctly filled before confirming.");
      setOpenModal(false);
      return;
    }

    const payload = {
      name: name,
      age: age,
      grade: String(grade),
      section: section,
      stud_id: selectedStudId,
      bookDets: bookDets, 
      duration: duration,
      // FIX APPLIED HERE: Send the returnDate state object directly
      returnDate: returnDate, 
      // WAS: returnDate: new Date(returnDate.year, returnDate.month -1, returnDate.day),
      isGood: isGood,
    };

    console.log("Frontend: Attempting to send this payload to /add-student:", JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post("http://localhost:5123/add-student", payload);
      console.log("Frontend: Student borrowing record added successfully!", response.data);
      setOpenModal(false);
      setName("");
      setAge("");
      setGrade("");
      setSection("");
      setSelectedStudId("");
      setIsbn("");
      setBookDetails(null);
      setDuration(null);
      setReturnDate(null);
      setIsGood(false);
      router.replace("/");
    } catch (err_db) {
      console.error("Frontend: Error submitting data:", err_db);
      if (axios.isAxiosError(err_db) && err_db.response) {
        console.error("Frontend: Backend response data:", err_db.response.data);
        console.error("Frontend: Backend response status:", err_db.response.status);
        alert(`Error: ${err_db.response.data.message || 'Submission failed. Check console for details.'} ${err_db.response.data.errors ? JSON.stringify(err_db.response.data.errors) : ''}`);
      } else {
        alert('An unexpected error occurred. Check console for details.');
      }
    }
  };

  useEffect(() => {
    const get_shelf = async () => {
      try {
        const response = await axios.get<{ data: ApiShelfItem[] }>("http://localhost:5123/shelf-item");
        setShelf(response.data.data || []);
      } catch (err) {
        console.error("Error fetching shelf items:", err);
        setShelf([]);
      }
    };

    const get_members = async () => {
      try {
        const response = await axios.get<{ data: Member[] }>("http://localhost:5123/get-members");
        setMembers(response.data.data || []);
      } catch (err) {
        console.error("Error fetching members:", err);
        setMembers([]);
      }
    };
    get_members();
    get_shelf();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isbn && shelf.length > 0) {
      if (!isBookImageLoading && (!bookDets || !bookDets.data || bookDets.data.title !== isbn)) {
         if (isMounted) setIsBookImageLoading(true);
      }

      const foundShelfItem = shelf.find((item: ApiShelfItem) => item.bookData.title === isbn);

      const timer = setTimeout(() => {
        if (isMounted) {
          if (foundShelfItem) {
            setBookDetails({
              data: foundShelfItem.bookData
            });
          } else {
            setBookDetails(null);
          }
          setIsBookImageLoading(false);
        }
      }, 200);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };

    } else if (!isbn) {
      if (isMounted) {
        setBookDetails(null);
        setIsBookImageLoading(false);
      }
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isbn, shelf]);


  const formatReturnDate = (dateInfo: ReturnDate | null): string => {
    if (!dateInfo) return "";
    const dateObj = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
    return dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Box className="p-15" sx={{ paddingBottom: '20px' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom textAlign='center'>
        "What you see and what you hear depends a great deal on where you are standing"<br></br>
        C.S. Lewis
      </Typography>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 100, padding: 30, justifyContent: 'center', marginTop: '30px' }}>
        <Box sx={{
          width: 400,
          height: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: '1px solid #eee',
          borderRadius: '5px',
          backgroundColor: isBookImageLoading ? '#f0f0f0' : 'transparent',
          overflow: 'hidden'
        }}>
          {isBookImageLoading ? (
            <CircularProgress />
          ) : (
            <Image
              width={400}
              height={600}
              alt={bookDets?.data?.title || (isbn && isBookImageLoading ? "Loading book details..." : "Select a book to see its cover")}
              src={bookDets?.data?.coverImageUrl || "https://covers.openlibrary.org/b/id/7898938-L.jpg"}
              style={{ borderRadius: 5, objectFit: 'contain' }}
              priority={!!bookDets?.data?.coverImageUrl}
            />
          )}
        </Box>

        <div style={{ width: "400px", marginTop: 100 }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 2, display: "flex", gap: 20, alignItems: "center" }}>
              <Autocomplete
                options={membersList}
                getOptionLabel={(option: Member) => `${option.name} (ID: ${option.stud_id})` || ""}
                isOptionEqualToValue={(option, value) => option.stud_id === value.stud_id}
                onChange={(event, value: Member | null) => {
                  if (value) { setName(value.name); setAge(value.age); setGrade(value.grade); setSection(value.section); setSelectedStudId(value.stud_id); }
                  else { setName(""); setAge(""); setGrade(""); setSection(""); setSelectedStudId(""); }
                }}
                renderInput={(params) => <TextField {...params} label="Select Member" />}
                fullWidth
              />
              <TextField label="Age" value={age} disabled style={{ width: 80 }} InputLabelProps={{ shrink: !!age || age === 0 }} />
            </div>
          </div>
          <br />
          <div style={{ display: "flex", gap: 20 }}>
            <TextField label="Grade" value={grade} disabled style={{ flex: 1 }} InputLabelProps={{ shrink: !!grade }}/>
            <TextField label="Section" value={section} disabled style={{ width: 100 }} InputLabelProps={{ shrink: !!section }}/>
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: "20px" }}>
            <Autocomplete
              options={shelf}
              getOptionLabel={(option: ApiShelfItem) => option.bookData.title || "Untitled Book"}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              value={shelf.find(book => book.bookData.title === isbn) || null}
              onChange={(event, value: ApiShelfItem | null) => {
                const newSelectedTitle = value?.bookData.title || "";
                setIsbn(newSelectedTitle);
                if (newSelectedTitle && (!bookDets || !bookDets.data || bookDets.data.title !== newSelectedTitle)) {
                    setIsBookImageLoading(true);
                } else if (!newSelectedTitle) {
                    setBookDetails(null); 
                    setIsBookImageLoading(false);
                }
              }}
              inputValue={isbn}
              onInputChange={(event, newInputValue, reason) => {
                if (reason === 'clear') { setIsbn(""); }
                else if (reason === 'input') { setIsbn(newInputValue); }
              }}
              renderInput={(params) => <TextField {...params} label="Select Book from Shelf" />}
              fullWidth
            />
          </div>

          <TextField select label="Borrow Duration" value={duration || ""} onChange={(e) => handleDuration(e.target.value)} fullWidth style={{ marginTop: 20 }} >
            <MenuItem value="" disabled><em>Select duration</em></MenuItem>
            <MenuItem value="3-days">3 days</MenuItem><MenuItem value="1-week">1 week</MenuItem><MenuItem value="2-week">2 weeks</MenuItem><MenuItem value="1-month">1 month</MenuItem>
          </TextField>

          <Button onClick={handleAddStudentClick} fullWidth style={{ marginTop: "20px" }} variant="contained" color="primary" >
            Assign Book
          </Button>

          {returnDate && (
            <Typography variant="body1" style={{ marginTop: 20, textAlign: 'center' }}>
              Return by: {formatReturnDate(returnDate)}
            </Typography>
          )}
        </div>
      </div>

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <StyledModalBox>
          {isGood && bookDets?.data ? (
            <>
              <Typography variant="h5" component="h3" gutterBottom textAlign="center">Confirm Assignment</Typography>
              <Typography><strong>Student:</strong> {name} (ID: {selectedStudId})</Typography>
              <Typography><strong>Age:</strong> {age}</Typography>
              <Typography><strong>Class:</strong> Grade {grade} - Section {section}</Typography>
              <Typography><strong>Book:</strong> {bookDets.data.title}</Typography>
              <Typography><strong>ISBN (from shelf):</strong> {bookDets.data.isbn?.[0] || "N/A"}</Typography>
              {returnDate && ( <Typography><strong>Return Date:</strong> {formatReturnDate(returnDate)}</Typography> )}
              <Box sx={{ marginTop: "25px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <Button onClick={() => setOpenModal(false)} color="secondary">Cancel</Button>
                <Button onClick={done_btn} color="primary" variant="contained"> Confirm </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h5" component="h3" gutterBottom color="error" textAlign="center">Input Error</Typography>
              <Typography textAlign="center">Please ensure all student details are filled and a valid book is selected from the shelf.</Typography>
              <Box sx={{ marginTop: "25px", textAlign: "right" }}>
                <Button onClick={() => setOpenModal(false)} color="primary" variant="contained"> OK </Button>
              </Box>
            </>
          )}
        </StyledModalBox>
      </Modal>
    </Box>
  );
}