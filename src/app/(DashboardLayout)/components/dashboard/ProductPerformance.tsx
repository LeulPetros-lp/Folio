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
} from "@mui/material";
import DashboardCard from "@/app/(DashboardLayout)//components/shared/DashboardCard";
import { useState, useEffect } from "react";
import axios from "axios";

interface Student {
  id: string;
  name: string;
  post: string;
  grade: string;
  section: string;
  isGood: boolean;
  book: string;
  returnDate: string;
}

const ProductPerformance: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    // Fetch data from the database
    axios
      .get("http://localhost:5123/list-students")
      .then((response) => {
        setStudents(response.data.data); // Update state with fetched students data
      })
      .catch((err) => {
        console.error("Error fetching students:", err);
      });
  }, []);

  // Filtered students based on the search query
  const filteredStudents = students
  .filter((student) =>
    student.name.toLowerCase().includes(query.toLowerCase())
  )
  .sort((a, b) => {
    // Overdue students come first
    if (!a.isGood && b.isGood) return -1;
    if (a.isGood && !b.isGood) return 1;
    return 0; // Maintain relative order for other students
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value); // Update query on input change
  };

  return (
    <DashboardCard title="">
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 2,
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        Student Catalogue 
      </Typography>
      <TextField
        style={{ width: 300 }}
        label="Search for Students"
        variant="outlined"
        value={query}
        onChange={handleInputChange}
        
      />
      </Box>
      <Box sx={{ overflow: "auto", width: { xs: "280px", sm: "auto" } }}>
        <Table
          aria-label="student table"
          sx={{
            whiteSpace: "nowrap",
            mt: 2,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  CId
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Name
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Grade/Section
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Status
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight={600}>
                  Book Name
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="subtitle2" fontWeight={600}>
                  Return Date
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length > 0 ? (
              students.slice(0,6).map((student, i) => (
                <TableRow
                  key={student.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => alert(`Selected Student: ${student.name}`)}
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: "15px",
                        fontWeight: "500",
                      }}
                    >
                      {i + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {student.name}
                        </Typography>
                        <Typography
                          color="textSecondary"
                          sx={{
                            fontSize: "13px",
                          }}
                        >
                          {student.post}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      color="textSecondary"
                      variant="subtitle2"
                      fontWeight={400}
                    >
                      {student.grade}
                      {student.section}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      sx={{
                        px: "4px",
                        backgroundColor: student.isGood
                          ? "rgb(93, 135, 255)"
                          : "rgb(255, 93, 93)",
                        color: "#fff",
                      }}
                      size="small"
                      label={student.isGood ? "Borrowed" : "Overdue"}
                    />
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      {student.book.length > 25
                        ? `${student.book.slice(0, 9)}...`
                        : student.book}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h6">
                      {new Date(student.returnDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography>No matching records found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </DashboardCard>
  );
};

export default ProductPerformance;
