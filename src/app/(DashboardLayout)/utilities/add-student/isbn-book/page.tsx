"use client";
import React, { useEffect, useState } from "react";
import { Image } from "next/image"; // Corrected import for Next.js Image
import {
  TextField,
  Autocomplete,
  Button,
  Modal,
  Box,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import axios from "axios";
import { useRouter } from "next/navigation";

interface BookDetails {
  title: string;
  coverImageUrl: string;
  isbn: string;
}

type Duration = "3-days" | "1-week" | "2-week" | "1-month";
type Age = number;
type BookOption = string;

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
  const [bookOption, setBookOption] = useState<BookOption>("");
  const [empty, setIsEmpty] = useState(true);
  const [membersList, setMembers] = useState<any[]>([]);
  const [member, setMember] = useState<any | null>(null);

  const [openModal, setOpenModal] = useState(false);

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
      console.log("API Response:", response.data);

      if (response.data && response.data.title) {
        const bookDetails: BookDetails = {
          title: response.data.title,
          coverImageUrl: response.data.coverImageUrl,
          isbn: isbn,
        };
        setBookDetails(bookDetails);
      } else {
        setBookDetails({ title: "Book Not Found", coverImageUrl: "", isbn: isbn });
      }
    } catch (error) {
      console.error("There was an error with the API request!", error);
      setBookDetails({ title: "Book Not Found", coverImageUrl: "", isbn: isbn });
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
          console.log("Invalid duration");
          return null;
      }

      const day = date_col.getDate();
      const month = date_col.getMonth() + 1;
      const year = date_col.getFullYear();

      setReturnDate({ day, month, year });
    };

    if (duration) calc_return_date();
  }, [duration]);

  const done_btn = async () => {
    try {
      const response_data_push = await axios.post("http://localhost:5123/add-student", {
        bookDets,
        name,
        age,
        grade,
        section,
        duration,
        returnDate,
        isGood,
      });
      console.log(response_data_push);
    } catch (err_db) {
      console.error("Error submitting data:", err_db);
    }
  };

  const add_shelf = async () => {
    try {
      const add_shelf = await axios.put("http://localhost:5123/add-shelf", { bookDets });
      alert("Book Added");
    } catch (err) {
      console.error("Error adding to shelf:", err);
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
        console.log(response.data.data);
        setMembers(response.data.data);
      } catch (err) {
        console.error("Error fetching shelf items:", err);
      }
    };
    get_members();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, padding: 3, position: "relative", left: 3 }}>
        <Image
          src={bookDets?.coverImageUrl || "https://covers.openlibrary.org/b/id/7898938-L.jpg"}
          alt="Book Cover"
          width={200}
          height={300}
          style={{ borderRadius: 2 }}
        />
        <Box sx={{ width: 400 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                options={membersList}
                getOptionLabel={(option: any) => option.name}
                value={name}
                onChange={(e, value) => {
                  setName(value?.name || "");
                  setAge(value?.age || "");
                  setSection(value?.section || "");
                  setGrade(value?.grade || "");
                }}
                renderInput={(params) => <TextField {...params} label="Select Member" variant="outlined" fullWidth />}
              />
            </Box>
            <Box sx={{ width: 80 }}>
              <TextField label="Age" value={age !== "" ? String(age) : ""} disabled fullWidth variant="outlined" type="number" />
            </Box>
          </Box>

          <TextField label="Isbn Code" value={isbn} onChange={(e) => setIsbn(e.target.value)} fullWidth sx={{ mt: 2 }} />
          <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={getBook}>
            Get Book
          </Button>

          <TextField
            label="Book Name"
            value={bookDets?.title}
            fullWidth
            sx={{ mt: 2 }}
            InputProps={{ readOnly: true }}
          />

          <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={add_shelf}>
            Add to Shelf
          </Button>

          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Duration</InputLabel>
              <Select value={duration || ""} onChange={(e) => handleDuration(e.target.value as string)} label="Duration" fullWidth>
                <MenuItem value="3-days">3 days</MenuItem>
                <MenuItem value="1-week">1 week</MenuItem>
                <MenuItem value="2-week">2 weeks</MenuItem>
                <MenuItem value="1-month">1 month</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button variant="contained" color="primary" sx={{ mt: 3 }} onClick={handleAddStudentClick}>
            Add Student
          </Button>

          <Modal open={openModal} onClose={() => setOpenModal(false)}>
            <Box sx={{ p: 4, bgcolor: "white", borderRadius: 2, width: 400, mx: "auto" }}>
              <Typography variant="h6">{empty ? "Please fill all fields" : "Confirm Student Addition"}</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography>Name: {name}</Typography>
                <Typography>Age: {age}</Typography>
                <Typography>Grade: {grade}, Section: {section}</Typography>
                <Typography>Duration: {duration}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
                <Button variant="outlined" color="secondary" onClick={() => setOpenModal(false)}>
                  Close
                </Button>
                <Button variant="contained" color="primary" onClick={() => { done_btn(); setOpenModal(false); }}>
                  Confirm
                </Button>
              </Box>
            </Box>
          </Modal>

          {returnDate && (
            <Typography sx={{ mt: 2 }}>
              The book should be returned by {returnDate.day}/{returnDate.month}/{returnDate.year}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
