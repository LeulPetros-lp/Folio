import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Snackbar,
  Alert as MuiAlert,
} from "@mui/material";
import { AlertColor } from '@mui/material/Alert';
import DashboardCard from "@/app/(DashboardLayout)//components/shared/DashboardCard";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"
import axios from "axios";
import Image from "next/image"

interface Student {
  id: string;
  name: string;
  grade: string;
  section: string;
  isGood: boolean;
  book: any
  returnDate: string;
  coverImageUrl: string // This might be in student.book if book data is nested
}

const API_BASE_URL = "http://localhost:5123";

const ProductPerformance: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter()

  // Modal States
  const [openModal, setOpenModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newReturnDate, setNewReturnDate] = useState<string>("");
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Snackbar States
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>("info");

  const fetchStudents = () => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API_BASE_URL}/list-students`)
      .then((response) => {
        const formattedStudents = (Array.isArray(response.data.data) ? response.data.data : []).map(
          (student: any) => ({
            ...student,
            id: student._id || student.id,
          })
        );
        setStudents(formattedStudents);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching students:", err);
        const errorMessage = err.response?.data?.message || "Failed to fetch students. Please ensure the backend server is running.";
        setError(errorMessage);
        setStudents([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students
    .filter((student) =>
      student.name.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (!a.isGood && b.isGood) return -1;
      if (a.isGood && !b.isGood) return 1;
      return a.name.localeCompare(b.name);
    });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleShowSnackbar = (message: string, severity: AlertColor) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleOpenModal = (student: Student) => {
    setSelectedStudent(student);
    // Format the existing return date for the date input
    const existingReturnDate = student.returnDate ? new Date(student.returnDate).toISOString().split('T')[0] : "";
    setNewReturnDate(existingReturnDate); // Set initial value to current return date
    setModalError(null);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedStudent(null);
    setNewReturnDate("");
    setModalLoading(false);
    setModalError(null);
  };

  const handleReturnBook = async () => {
    if (!selectedStudent) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await axios.delete(`${API_BASE_URL}/return-book/${selectedStudent.id}`);
      setStudents((prevStudents) =>
        prevStudents.filter((s) => s.id !== selectedStudent.id)
      );
      handleShowSnackbar("Book returned successfully!", "success");
      router.refresh() // Refresh the page to update dashboard stats if needed
      handleCloseModal();

    } catch (err: any) {
      console.error("Error returning book:", err);
      const errorMessage = err.response?.data?.message || "Failed to return book.";
      setModalError(errorMessage); // Show error in modal
      handleShowSnackbar(errorMessage, "error"); // Show error in snackbar
    } finally {
      setModalLoading(false);
    }
  };



  const handleExtendReturnDate = async () => {
    if (!selectedStudent) return;

    // --- Validation 1: Check if new date is empty ---
    if (!newReturnDate) {
      const dateEmptyMsg = "New return date cannot be empty.";
      setModalError(dateEmptyMsg);
      handleShowSnackbar(dateEmptyMsg, "warning");
      return; // Stop execution
    }

    // --- Validation 2: Check if new date is before the current date ---
    const currentReturnDateObj = new Date(selectedStudent.returnDate);
    const newReturnDateObj = new Date(newReturnDate);

    // Set times to midnight for date-only comparison
    currentReturnDateObj.setHours(0, 0, 0, 0);
    newReturnDateObj.setHours(0, 0, 0, 0);

    if (newReturnDateObj < currentReturnDateObj) {
        const validationMsg = "Extended date cannot be before the current return date.";
        setModalError(validationMsg);
        handleShowSnackbar(validationMsg, "warning");
        return; // Stop execution
    }

    // If validations pass, proceed with API call
    setModalLoading(true);
    setModalError(null); // Clear previous modal error

    try {
      await axios.put(
        `${API_BASE_URL}/extend-return-date/${selectedStudent.id}`,
        { newReturnDate }
      );
      // Update the student in the local state
      setStudents((prevStudents) =>
        prevStudents.map((s) =>
          s.id === selectedStudent.id
            ? { ...s, returnDate: newReturnDate, isGood: new Date(newReturnDate) >= new Date() } // Update isGood based on the new date vs today
            : s
        )
      );
      handleShowSnackbar("Return date extended successfully!", "success");
      handleCloseModal(); // Close modal on success

    } catch (err: any) {
      console.error("Error extending return date:", err);
      const errorMessage = err.response?.data?.message || "Failed to extend return date.";
      setModalError(errorMessage); // Show error in modal
      handleShowSnackbar(errorMessage, "error"); // Show error in snackbar
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardCard title="Student Catalogue">
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <CircularProgress />
          <Typography sx={{ mt: 1 }}>Loading students...</Typography>
        </Box>
      </DashboardCard>
    );
  }

  if (error) {
    return (
      <DashboardCard title="Student Catalogue">
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography color="error">{error}</Typography>
          <Button onClick={fetchStudents} variant="contained" sx={{ mt: 2 }}>Try Again</Button>
        </Box>
      </DashboardCard>
    );
  }

  return (
    <>
      <DashboardCard title="">
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
              px: 2,
              pt: 0,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Student Book Records
            </Typography>
            <TextField
              style={{ width: 300 }}
              label="Search by Student Name"
              variant="outlined"
              value={query}
              onChange={handleInputChange}
              size="small"
            />
          </Box>
          <Box sx={{ overflow: "auto" }}>
            <Table aria-label="student table" sx={{ whiteSpace: "nowrap", mt: 0 }}>
              <TableHead>
                <TableRow>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>#</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Name</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Grade/Section</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Status</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600}>Book Name</Typography></TableCell>
                  <TableCell align="left"><Typography variant="subtitle2" fontWeight={600}>Return Date</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.slice(0, 10).map((student, i) => (
                    <TableRow
                      key={student.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => handleOpenModal(student)}
                    >
                      <TableCell><Typography sx={{ fontSize: "15px", fontWeight: "500" }}>{i + 1}</Typography></TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>{student.name}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Typography color="textSecondary" variant="subtitle2" fontWeight={400}>{student.grade}/{student.section}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          sx={{
                            px: "4px",
                            backgroundColor: student.isGood ? "primary.main" : "error.main",
                            color: "#fff",
                          }}
                          size="small"
                          label={student.isGood ? "Borrowed" : "Overdue"}
                        />
                      </TableCell>
                      <TableCell align="left">
                        <Typography variant="subtitle2">
                          {student.book ? student?.book.title.length > 19 ? `${student.book.title.slice(0, 19)} ...` : student.book.title : "No Book"}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Typography variant="subtitle2">
                          {new Date(student.returnDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow key="no-records-found">
                    <TableCell colSpan={6} align="center">
                      <Typography sx={{ p: 2 }}>
                        {query ? "No matching records found." : "No student records to display."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          {selectedStudent && (
            <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="sm">
              <DialogTitle>Manage Book for: {selectedStudent.name}</DialogTitle>
              <DialogContent>
                <DialogContentText sx={{ mb: 1 }}>
                  Book: <strong>{selectedStudent.book ? selectedStudent.book.title : "No Book"}</strong>
                </DialogContentText>
                <DialogContentText sx={{ mb: 2 }}>
                  Current Return Date: {new Date(selectedStudent.returnDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  ({selectedStudent.isGood ? "Borrowed" : "Overdue"})
                </DialogContentText>

                <TextField
                  autoFocus
                  margin="dense"
                  id="newReturnDate"
                  label="New Return Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={newReturnDate}
                  onChange={(e) => setNewReturnDate(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ mb: 2 }}
                />
                {modalError && <Typography color="error" sx={{ mb: 1, fontSize: '0.875rem' }}>{modalError}</Typography>}

              </DialogContent>
              <DialogActions sx={{ position: 'relative', px: 3, pb: 2 }}>
                {modalLoading && (
                  <CircularProgress size={24} sx={{ position: 'absolute', left: '50%', top: '50%', marginLeft: '-12px', marginTop: '-12px' }} />
                )}
                <Button onClick={handleCloseModal} color="inherit" disabled={modalLoading}>Cancel</Button>
                <Button onClick={handleExtendReturnDate} color="primary" variant="outlined" disabled={modalLoading}>
                  Extend Date
                </Button>
                <Button onClick={handleReturnBook} color="error" variant="contained" disabled={modalLoading}>
                  Return Book
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </>
      </DashboardCard>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default ProductPerformance;