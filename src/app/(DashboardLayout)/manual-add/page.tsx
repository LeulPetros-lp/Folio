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

export default function Page() {
  const [bookDets, setBookDetails] = useState<BookDetails | null>(null);
  const [isbn, setIsbn] = useState<string>("");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [returnDate, setReturnDate] = useState<ReturnDate | null>(null);
  const [age, setAge] = useState<Age | "">("");
  const [grade, setGrade] = useState<number | "">("");
  const [section, setSection] = useState<string>("");
  const [name, setName] = useState<string>(""); // Member Name
  const [shelf, setShelf] = useState<ShelfItem[]>([]); // Book Shelf
  const [membersList, setMembers] = useState<any[]>([]); // Members List
  const [openModal, setOpenModal] = useState(false);
  const [isGood, setIsGood] = useState(false)

  const router = useRouter()

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
  });

  const handleAddStudentClick = () => {
    console.log({ name, age, isbn, grade, section, duration }); // Debug log
    if (!name.trim() || !age || !isbn.trim() || !grade || !section.trim() || !duration) {
      // Open modal even if validation fails
      setOpenModal(true);
    } else {
      // Open modal for confirmation
      setOpenModal(true);
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
      await axios.post("http://localhost:5123/add-student", {
        bookDets,
        name,
        age,
        grade,
        section,
        duration,
        returnDate,
        isGood
      });
      console.log("Student added successfully!");
      setOpenModal(false); // Close modal after successful submission
      router.replace("/")
    } catch (err_db) {
      console.error("Error submitting data:", err_db);
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
      } catch (err) {
        console.error("Error fetching members:", err);
      }
    };
    get_members();
    get_shelf();
  }, []);

  const getBook = () => {
    const selectedBook = shelf.find((item) => item.BookName === isbn);
    if (selectedBook) {
      setBookDetails({
        title: selectedBook.BookName,
        coverImageUrl: selectedBook.ImgUrl,
        isbn: selectedBook.Isbn,
      });
    } else {
      setBookDetails({
        title: "Book Not Found",
        coverImageUrl: "",
        isbn: "",
      });
    }
  };

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
          {/* Member Selection */}
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
              />
            </div>
          </div>
          <br />
          <div style={{ display: "flex", gap: 20 }}>
            <TextField label="Year" value={grade} disabled style={{ flex: 1 }} />
            <TextField label="Section" value={section} disabled style={{ width: 100 }} />
          </div>

          {/* Book Selection */}
          <div style={{ display: "flex", gap: 20 }}>
            <Autocomplete
              options={shelf}
              getOptionLabel={(option) => option.BookName}
              onChange={(event, value) => {
                setIsbn(value?.BookName || "");
              }}
              renderInput={(params) => <TextField {...params} label="Select Book" />}
              fullWidth
              style={{ marginTop: "20px" }}
            />
            <Button onClick={getBook}>Get Book</Button>
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

          {/* Add Student */}
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

      {/* Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <StyledModalBox>
          {name && age && grade && section && isbn && duration ? (
            <>
              <h3>Confirm Student Addition</h3>
              <p>Do you want to add the student with the following details?</p>
              <p>Name: {name}</p>
              <p>Age: {age}</p>
              <p>Grade: {grade}, Section: {section}</p>
              <p>Book: {bookDets?.title}</p>
              <p>
                Return Date: {returnDate?.day}/{returnDate?.month}/{returnDate?.year}
              </p>
              <Button onClick={done_btn} color="primary">
                Confirm
              </Button>
            </>
          ) : (
            <>
              <h3>Error</h3>
              <p>Please fill in all fields before adding a student.</p>
            </>
          )}
        </StyledModalBox>
      </Modal>
    </div>
  );
}
