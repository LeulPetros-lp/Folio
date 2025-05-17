// src/app/(DashboardLayout)/components/dashboard/StatOverview.tsx
"use client";

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
    CircularProgress,
    Snackbar,
    Alert as MuiAlert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import { AlertColor } from '@mui/material/Alert';
import DashboardCard from "@/app/(DashboardLayout)//components/shared/DashboardCard"; // Adjust path as needed
import React, { useState, useEffect, useMemo } from "react"; // Import useMemo
import axios from "axios";
// Removed Image

import useDebounce from "../../../../utils/hooks/useDebounce"; // <-- Import the debounce hook

interface Student {
    id: string;
    name: string;
    grade: string;
    section: string;
    isGood: boolean; // True for Borrowed, False for Overdue
    book: {
        title: string;
        coverImageUrl?: string;
    } | null;
    returnDate: string;
}

const API_BASE_URL = "http://localhost:5123";

const StatOverview: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [query, setQuery] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'borrowed' | 'overdue'>('all');

    // --- Use the debounce hook for the search query ---
    const debouncedQuery = useDebounce(query, 300); // Debounce query with a 300ms delay
    // --- End debounce hook usage ---


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
                if (!response.data || !Array.isArray(response.data.data)) {
                     console.error("API response structure mismatch for /list-students:", response.data);
                     throw new Error("Invalid data format received from the server for student list.");
                }

                const formattedStudents = response.data.data.map(
                    (student: any) => ({
                        ...student,
                        id: student._id || student.id,
                        book: student.book || null,
                        isGood: student.isGood
                    })
                );
                setStudents(formattedStudents);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching students:", err);
                const errorMessage = err.response?.data?.message || err.message || "Failed to fetch students. Please ensure the backend server is running.";
                setError(errorMessage);
                setStudents([]);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStudents();
    }, []); // Fetch data only once on mount

    const handleStatusFilterChange = (event: any) => {
        setStatusFilter(event.target.value as 'all' | 'borrowed' | 'overdue');
    };


    // --- Use useMemo to memoize filteredStudents ---
    // This ensures filtering/sorting only re-runs when 'students', 'debouncedQuery', or 'statusFilter' change.
    // Crucially, filtering is now triggered by debouncedQuery, not the immediate 'query'.
    const filteredStudents = useMemo(() => {
        console.log("Filtering students..."); // Add logging to see when filtering runs
        return students
            .filter((student) =>
                // Use the debouncedQuery for filtering
                student.name.toLowerCase().includes(debouncedQuery.toLowerCase())
            )
            .filter(student => {
                if (statusFilter === 'all') {
                    return true;
                } else if (statusFilter === 'borrowed') {
                    return student.isGood;
                } else { // statusFilter === 'overdue'
                    return !student.isGood;
                }
            })
            .sort((a, b) => {
                if (!a.isGood && b.isGood) return -1;
                if (a.isGood && !b.isGood) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [students, debouncedQuery, statusFilter]); // Dependencies for useMemo


    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        // Update the immediate 'query' state on every keystroke
        setQuery(event.target.value);
        // The actual filtering will use the debouncedQuery
    };

    // Snackbar handlers
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

    if (loading) {
        return (
            <DashboardCard title="Student Catalogue">
                <Box sx={{ textAlign: 'center', p: 3 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 1 }}>Loading student records...</Typography>
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
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: "space-between",
                            mb: 3,
                            px: 2,
                            pt: 0,
                            gap: 2,
                            width: '100%'
                        }}
                    >
                         <Typography variant="h6" fontWeight={600} sx={{ mb: { xs: 1, sm: 0 } }}>
                            Student Book Records
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
                            <TextField
                                sx={{ width: { xs: '100%', sm: 250 } }}
                                label="Search by Student Name"
                                variant="outlined"
                                value={query} // TextField value still bound to immediate 'query' for responsive input display
                                onChange={handleInputChange}
                                size="small"
                            />
                             <FormControl sx={{ minWidth: 120, width: { xs: '100%', sm: 'auto' } }} size="small">
                                <InputLabel id="status-filter-label">Status</InputLabel>
                                <Select
                                    labelId="status-filter-label"
                                    id="status-filter-select"
                                    value={statusFilter}
                                    label="Status"
                                    onChange={handleStatusFilterChange}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="borrowed">Borrowed</MenuItem>
                                    <MenuItem value="overdue">Overdue</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                    <Box sx={{ overflowX: "auto", width: '100%' }}>
                        <Table aria-label="student table" sx={{ whiteSpace: "nowrap", mt: 0, minWidth: 650 }}>
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
                                {/* Render the first 10 of the filtered students */}
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.slice(0, 10).map((student, i) => (
                                        <TableRow
                                            key={student.id}
                                            hover
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
                                                    {student.book ? student?.book.title.length > 25 ? `${student.book.title.slice(0, 25)}...` : student.book.title : "No Book"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="left">
                                                <Typography variant="subtitle2">
                                                    {student.returnDate ? new Date(student.returnDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow key="no-records-found">
                                        <TableCell colSpan={6} align="center">
                                            <Typography sx={{ p: 2 }}>
                                                {query || statusFilter !== 'all' ? "No matching records found with current filters." : "No student records to display."}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
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

export default StatOverview;