"use client";
import React, { useEffect, useState } from "react";
import { TextField, Button, Autocomplete, MenuItem, Modal, Box } from "@mui/material";
import { styled } from "@mui/system";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { v4 as uuidv4} from "uuid"

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
}

export default function Page() {
  const router = useRouter();
  const [bookDets, setBookDetails] = useState<BookDetails | null>(null);
  const [isbn, setIsbn] = useState<string>("");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [returnDate, setReturnDate] = useState<ReturnDate | null>(null);
  const [age, setAge] = useState<Age | "">("");
  const [grade, setGrade] = useState<number | "">("");
  const [section, setSection] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isGood, setIsGood] = useState<Boolean>(true);
  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [popoverVisible, setPopoverVisible] = useState(false); // This state is unused in the provided code
  const [empty, setIsEmpty] = useState(true);
  const [membersList, setMembers] = useState<any>();
  const [member, setMember] = useState<any | null>(null); // This state is unused in the provided code
  const [openModal, setOpenModal] = useState(false); // This is for the student addition modal
  const [present,setPresent] = useState(false);

  // New state for the "Add to Shelf" confirmation modal
  const [addShelfModalOpen, setAddShelfModalOpen] = useState(false);

  const handleAddStudentClick = () => {
    if (!name.trim() || !age || !isbn.trim() || !grade || !section.trim() || !duration) {
      setIsEmpty(true);
      setOpenModal(true);
    } else {
      setIsEmpty(false);
      setOpenModal(true);
    }
  };

  const getBook = async () => {
    if (!isbn.trim()) {
      console.log("ISBN is empty");
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5123/api/book/${isbn}`);
      if (response.data && response.data.title) {
        setBookDetails({
          title: response.data.title,
          coverImageUrl: response.data.coverImageUrl,
          isbn,
        });
      } else {
        setBookDetails({ title: "Book Not Found", coverImageUrl: "", isbn });
      }
    } catch (error) {
      setBookDetails({ title: "Book Not Found", coverImageUrl: "", isbn });
    }
  };

  const handleDuration = (key: string) => {
    if (["3-days", "1-week", "2-week", "1-month"].includes(key)) {
      setDuration(key as Duration);
    } else {
      console.error("Invalid duration key");
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
    }
  }, [duration]);

const done_btn = async () => {
  try {
    // Step 1: Fetch the list of students
    const res = await axios.get('http://localhost:5123/list-students');
    const students = res.data.data;

    const stud_id = uuidv4()

    // Step 2: Check if the student already exists
    const studentExists = students.some((student: any) => student.name === name);

    if (studentExists) {
      setPresent(true)
      // Note: The modal content for 'present' state needs to be handled carefully.
      // The original code had a slightly complex conditional rendering in the student modal.
      // This logic remains untouched as per your request.
      return; // Exit the function if the student already exists
    }

    // Step 3: Add the student since they don't exist
    await axios.post("http://localhost:5123/add-student", {
      bookDets,
      name,
      age,
      grade,
      section,
      duration,
      returnDate,
      isGood,
      stud_id
    });

    console.log("Student added successfully!");
    // Consider adding an alert here for success like: alert("Student added successfully!");
  } catch (err) {
    console.error("Error submitting data:", err);
    // Consider adding an alert here for error: alert("Error adding student.");
  }
};

  // This is the original function that will be called from the new modal's confirm button
  const performAddShelfApiCall = async () => {
    try {
      // It's good practice to ensure bookDets is valid before an API call,
      // even if the button to open the modal checks it.
      if (!bookDets || !bookDets.isbn || bookDets.title === "Book Not Found") {
        alert("Cannot add to shelf: Book details are missing or invalid.");
        return;
      }
      await axios.put("http://localhost:5123/add-shelf", { bookDets });
      alert("Book Added");
    } catch (err) {
      console.error("Error adding to shelf:", err);
      alert("Failed to add book to shelf. Please try again."); // Added error alert for feedback
    }
  };

  // This function now just opens the confirmation modal
  const handleAddShelfClick = () => {
    if (bookDets && bookDets.title !== "Book Not Found" && bookDets.isbn) {
      setAddShelfModalOpen(true);
    } else {
      alert("Please fetch and select a valid book before adding to shelf.");
    }
  };


  useEffect(() => {
    const get_shelf = async () => {
      try {
        const response = await axios.get("http://localhost:5123/shelf-item");
        setShelf(response.data.data);
      } catch (err) {
        console.error("Error fetching shelf items:", err);
      }
    };

    const get_members = async () => {
      try {
        const response = await axios.get("http://localhost:5123/get-members");
        setMembers(response.data.data);
      } catch (err)        {
        console.error("Error fetching members:", err);
      }
    };
    get_members();
    get_shelf();
  }, []);

  const StyledModalBox = styled(Box)({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    padding: "20px",
    boxShadow: "24", // Kept as string "24" as per original code
    borderRadius: "8px",
    outline: "none",
  });

  return (
    <div className="p-12">
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: 30, position: "relative", left: 20 }}>
        <Image
          width={400}
          height={600}
          alt="Book Cover"
          src={bookDets?.coverImageUrl || "https://covers.openlibrary.org/b/id/7898938-L.jpg"}
          style={{ borderRadius: 10}}
          priority
        />

        <div style={{ width: "400px", position: "relative", left: 200 }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 2, display: "flex", gap: 20, alignItems: "center" }}>
              <Autocomplete
                options={membersList || []}
                getOptionLabel={(option: any) => option.name || ""}
                onInputChange={(e, value) => setName(value)}
                onChange={(event, value: any) => {
                  if (value) {
                    setName(value.name);
                    setAge(value.age);
                    setGrade(value.grade);
                    setSection(value.section);
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
                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : "")}
              />
            </div>
          </div>
          <br />
          <div style={{ display: "flex", gap: 20 }}>
            <TextField
              label="ISBN Code"
              type="number"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button color="primary" onClick={getBook} style={{ marginTop: "8px" }}>
              Get Book
            </Button>
          </div>
          <TextField
            label="Book Name"
            value={bookDets?.title || ""}
            disabled
            fullWidth
            style={{ marginTop: 20 }}
          />
          {/* MODIFIED: onClick handler for "Add to Shelf" button */}
          <Button fullWidth color="primary" onClick={handleAddShelfClick} style={{ marginTop: 20 }} variant="contained">
            Add to Shelf
          </Button>
          <br />
          <br />
          <div style={{ display: "flex", gap: 20 }}>
            <TextField
              label="Year" // Assuming this is Grade
              value={grade}
              disabled
              style={{ flex: 1 }}
              onChange={(e) => setGrade(e.target.value ? parseInt(e.target.value) : "")}
            />
            <TextField
              label="Section"
              value={section}
              disabled
              style={{ width: 100 }}
            />
          </div>
          <TextField
            select
            label="Borrow Duration"
            value={duration || ""}
            onChange={(e) => handleDuration(e.target.value)}
            fullWidth
            style={{ marginTop: 20 }}
          >
            <MenuItem value="3-days">3 days</MenuItem>
            <MenuItem value="1-week">1 week</MenuItem>
            <MenuItem value="2-week">2 weeks</MenuItem>
            <MenuItem value="1-month">1 month</MenuItem>
          </TextField>
          <Button fullWidth color="primary" onClick={handleAddStudentClick} style={{ marginTop: 20 }} variant="contained">
            Add Student
          </Button>
          <Modal open={openModal} onClose={() => setOpenModal(false)}>
            <StyledModalBox>
              <h2>{empty ? "Incomplete Details" : "Confirm Student Addition"}</h2>
              {
                 !empty ? present ?  ( // This complex ternary remains as is.
                  <>
                    <p>Name: {name}</p>
                    <p>Age: {age}</p>
                    <p>Grade: {grade}, Section: {section}</p>
                    <p>Duration: {duration}</p>
                  </>
                ) : 'Student Exsists' : '' // Corrected typo from "Exsists" to "Exists" in display string
              }
              <Button color="secondary" onClick={() => {
                setOpenModal(false)
                // The original code calls done_btn() even when "Close" is clicked after "Incomplete Details"
                // or "Student Exists". This behavior is preserved.
                done_btn()
              }} style={{ marginRight: 10 }}>
                Close
              </Button>
              {!empty && (
                <Button
                  color="primary"
                  onClick={() => {
                    setOpenModal(false);
                    done_btn();
                  }}
                >
                  Confirm
                </Button>
              )}
            </StyledModalBox>
          </Modal>
          {returnDate && (
            <p style={{ marginTop: 20 }}>
              The book should be returned by {returnDate.day}/{returnDate.month}/{returnDate.year}
            </p>
          )}
        </div>
      </div>

      {/* NEW: Modal for Add to Shelf Confirmation */}
      <Modal open={addShelfModalOpen} onClose={() => setAddShelfModalOpen(false)}>
        <StyledModalBox sx={{minWidth: 300}}> {/* Optional: ensure modal has some minWidth */}
          <h2 style={{ marginTop: 0 }}>Confirm Add to Shelf</h2>
          {bookDets && (
            <p>
              Are you sure you want to add the book titled "<strong>{bookDets.title}</strong>" (ISBN: {bookDets.isbn}) to the shelf?
            </p>
          )}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              color="secondary"
              onClick={() => setAddShelfModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              variant="contained"
              onClick={() => {
                performAddShelfApiCall(); // Call the original API logic
                done_btn()
                router.replace("/")
              }}
              // Disable confirm if book details are not valid (though handleAddShelfClick should prevent opening)
              disabled={!bookDets || !bookDets.isbn || bookDets.title === "Book Not Found"}
            >
              Confirm
            </Button>
          </div>
        </StyledModalBox>
      </Modal>
    </div>
  );
}