"use client";
import React, { useEffect, useState } from "react";
import { TextField, Button, Autocomplete, Modal, Box, MenuItem } from "@mui/material";
import { styled } from "@mui/system";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface BookDetails {
  title: string;
  coverImageUrl: string;
  isbn: string;
}

type Duration = "3-days" | "1-week" | "2-week" | "1-month";
type Age = number;

interface ReturnDate {
  day: number;
  month: number;
  year: number;
}

interface ShelfItem {
  _id: string;
  BookName: string;
  ImgUrl: string;
  Isbn: string;
}

interface Member {
  stud_id: string;
  name: string;
  age: number;
  grade: string | number; // Accommodates string or number as seen in sample data/schema
  section: string;
  parentPhone?: number;
  _id?: string;
}

export default function Page() {
  const [bookDets, setBookDetails] = useState<BookDetails | null>(null);
  const [isbn, setIsbn] = useState<string>(""); // Stores BookName for selection from ShelfItem
  const [duration, setDuration] = useState<Duration | null>(null);
  const [returnDate, setReturnDate] = useState<ReturnDate | null>(null);
  const [age, setAge] = useState<Age | "">("");
  const [grade, setGrade] = useState<string | number | "">("");
  const [section, setSection] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [selectedStudId, setSelectedStudId] = useState<string>("");

  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [membersList, setMembers] = useState<Member[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [isGood, setIsGood] = useState(false); // Used for frontend validation and sent to backend

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
    console.log({ name, age, isbn, grade, section, duration, selectedStudId, bookActualIsbn: bookDets?.isbn });

    if (
      !name.trim() ||
      !age ||
      !selectedStudId?.trim() ||
      !isbn.trim() || // isbn here is the BookName selected, used to find bookDets
      !bookDets?.isbn || // This checks if actual book details (with ISBN) are loaded
      (grade === undefined || grade === "") || // More explicit check for grade
      !section.trim() ||
      !duration
    ) {
      setIsGood(false);
    } else {
      setIsGood(true);
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
          case "3-days":
            date_col.setDate(date_col.getDate() + 3);
            break;
          case "1-week":
            date_col.setDate(date_col.getDate() + 7);
            break;
          case "2-week":
            date_col.setDate(date_col.getDate() + 14);
            break;
          case "1-month":
            date_col.setMonth(date_col.getMonth() + 1);
            break;
          default:
            return;
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
    if (!isGood) {
        console.error("Attempted to submit with invalid or incomplete data based on frontend check.");
        return;
    }

    // Construct the payload with keys matching backend expectations
    const payload = {
      name: name,
      age: age,
      grade: String(grade), // Ensure grade is sent as a string if schema expects string
      section: section,
      duration: duration,
      returnDate: returnDate,   // Object {day, month, year}
      bookDets: bookDets,       // Object {title, isbn, coverImageUrl}, key is 'bookDets'
      isGood: isGood,           // Boolean, required by schema & backend
      stud_id: selectedStudId   // String, required by schema & backend
    };

    console.log("Attempting to send this payload to /add-student:", JSON.stringify(payload, null, 2));

    try {
      await axios.post("http://localhost:5123/add-student", payload);

      console.log("Student borrowing record added successfully!");
      setOpenModal(false);
      // Reset form fields
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
      console.error("Error submitting data:", err_db);
      if (axios.isAxiosError(err_db) && err_db.response) {
        console.error("Backend response data:", err_db.response.data);
        console.error("Backend response status:", err_db.response.status);
        // Optionally, set an error message state here to display in the modal
        // For example: alert(`Error: ${err_db.response.data.message || 'Submission failed'}`);
      } else {
        // alert('An unexpected error occurred.');
      }
    }
  };

  useEffect(() => {
    const get_shelf = async () => {
      try {
        const response = await axios.get("http://localhost:5123/shelf-item");
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

  const getBook = () => {
    if (!isbn) { // isbn state holds the BookName from Autocomplete selection
        setBookDetails(null);
        return;
    }
    const selectedBook = shelf.find((item) => item.BookName === isbn);
    if (selectedBook) {
      setBookDetails({
        title: selectedBook.BookName,
        coverImageUrl: selectedBook.ImgUrl,
        isbn: selectedBook.Isbn, // Actual ISBN from the shelf item
      });
    } else {
      setBookDetails({
        title: "Book Not Found",
        coverImageUrl: "https://covers.openlibrary.org/b/id/7898938-L.jpg",
        isbn: "",
      });
    }
  };

   useEffect(() => {
    if (isbn && shelf.length > 0) {
        getBook();
    } else if (!isbn) {
        setBookDetails(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isbn, shelf]); // getBook depends on shelf data as well

  return (
    <div className="p-12">
      <div style={{ display: "flex", alignItems: "center", gap: 100, padding: 30 }}>
        <Image
          width={400}
          height={600}
          alt="Book Cover"
          src={bookDets?.coverImageUrl || "https://covers.openlibrary.org/b/id/7898938-L.jpg"}
          style={{ borderRadius: 5 }}
        />

        <div style={{ width: "400px" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 2, display: "flex", gap: 20, alignItems: "center" }}>
              <Autocomplete
                options={membersList}
                getOptionLabel={(option: Member) => option.name || ""}
                isOptionEqualToValue={(option, value) => option.stud_id === value.stud_id}
                onChange={(event, value: Member | null) => {
                  if (value) {
                    setName(value.name);
                    setAge(value.age);
                    setGrade(value.grade);
                    setSection(value.section);
                    setSelectedStudId(value.stud_id);
                  } else {
                    setName("");
                    setAge("");
                    setGrade("");
                    setSection("");
                    setSelectedStudId("");
                  }
                }}
                renderInput={(params) => <TextField {...params} label="Select Member" />}
                fullWidth
              />
              <TextField
                label="Age"
                value={age}
                disabled
                style={{ width: 80 }}
              />
            </div>
          </div>
          <br />
          <div style={{ display: "flex", gap: 20 }}>
            <TextField label="Grade" value={grade} disabled style={{ flex: 1 }} />
            <TextField label="Section" value={section} disabled style={{ width: 100 }} />
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: "20px" }}>
            <Autocomplete
              options={shelf}
              getOptionLabel={(option: ShelfItem) => option.BookName}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              onChange={(event, value: ShelfItem | null) => {
                setIsbn(value?.BookName || ""); // Sets BookName to trigger useEffect for getBook
              }}
              renderInput={(params) => <TextField {...params} label="Select Book" />}
              fullWidth
            />
            <Button onClick={getBook} size="small" sx={{height: "56px"}}>Get Book</Button>
          </div>

          <TextField
            select
            label="Borrow Duration"
            value={duration || ""}
            onChange={(e) => handleDuration(e.target.value)}
            fullWidth
            style={{ marginTop: 20 }}
          >
            <MenuItem value="" disabled><em>Select duration</em></MenuItem>
            <MenuItem value="3-days">3 days</MenuItem>
            <MenuItem value="1-week">1 week</MenuItem>
            <MenuItem value="2-week">2 weeks</MenuItem>
            <MenuItem value="1-month">1 month</MenuItem>
          </TextField>

          <Button
            onClick={handleAddStudentClick}
            fullWidth
            style={{ marginTop: "20px" }}
            variant="contained"
            color="primary"
          >
            Add Student
          </Button>

          {returnDate && (
            <p style={{ marginTop: 20 }}>
              The book should be returned by {returnDate.day}/{returnDate.month}/{returnDate.year}
            </p>
          )}
        </div>
      </div>

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <StyledModalBox>
          {isGood ? (
            <>
              <h3>Confirm Student Addition</h3>
              <p>Do you want to add the student with the following details?</p>
              <p>Name: {name} (Student ID: {selectedStudId})</p>
              <p>Age: {age}</p>
              <p>Grade: {grade}, Section: {section}</p>
              <p>Book: {bookDets?.title} (ISBN: {bookDets?.isbn || "N/A"})</p>
              {returnDate && (
                 <p>Return Date: {returnDate.day}/{returnDate.month}/{returnDate.year}</p>
              )}
              <div style={{ marginTop: "15px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <Button onClick={() => setOpenModal(false)} color="secondary">Cancel</Button>
                <Button onClick={done_btn} color="primary" variant="contained">
                  Confirm
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3>Error</h3>
              <p>Please fill in all required fields and ensure member and book are correctly selected.</p>
              <div style={{ marginTop: "15px", textAlign: "right" }}>
                <Button onClick={() => setOpenModal(false)} color="primary" variant="contained">
                    OK
                </Button>
              </div>
            </>
          )}
        </StyledModalBox>
      </Modal>
    </div>
  );
}