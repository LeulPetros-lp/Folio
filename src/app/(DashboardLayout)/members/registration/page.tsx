"use client";
import React, { useState } from "react";
import {
  TextField,
  Button,
  Modal,
  Box,
  Typography,
  Card,
  Grid,
  Container,
  Alert,
} from "@mui/material";
import { styled } from "@mui/system";
import axios from "axios";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid"; // Correctly imported


// import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";

interface MemberFormData {
  studentId: string; // Added studentId
  name: string;
  parentPhone: string;
  age: number | "";
  grade: number | "";
  section: string;
}

const StyledModalBox = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[24],
  width: "400px",
}));

export default function Page() {
  const router = useRouter();

  const [formData, setFormData] = useState<MemberFormData>({
    studentId: "", // Initialized studentId
    name: "",
    parentPhone: "",
    age: "",
    grade: "",
    section: "",
  });
  const [openModal, setOpenModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age" || name === "grade" ? (value ? parseInt(value) : "") : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.parentPhone || !formData.age || !formData.grade || !formData.section) {
      setError("Please fill in all fields");
      setOpenModal(true);
      return;
    }

    const stud_id = uuidv4(); // Generate studentId

    const dataToSend = {
      ...formData,
      stud_id, // Add generated studentId to the data being sent
    };

    try {
      const response = await axios.put("http://localhost:5123/add/member", dataToSend); // Send dataToSend
      if (response.status === 200) {
        setError(null);
        setOpenModal(true);
        setFormData({ // Reset form
          studentId: "", // Reset studentId
          name: "",
          parentPhone: "",
          age: "",
          grade: "",
          section: "",
        });

        console.log(response)

        router.push("/");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || "Failed to add member. Please try again.");
      } else {
        setError("Failed to add member. Please try again.");
      }
      setOpenModal(true);
    }
  };

  return (
    <PageContainer title="Member Registration" description="Register new members">
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 4 }}>
              {/* Logo Section */}
              {/* <Box
                display="flex"
                justifyContent="center"
                mb={4}
                sx={{
                  '& > div': {
                    transform: 'scale(1.5)',
                    marginY: 4,
                  }
                }}
              >
                <Logo />
              </Box> */}
             

              <Box textAlign="center" mb={4}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Member Registration
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Please fill in the details to register a new member
                </Typography>
              </Box>

              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  {/* Name */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Student Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  {/* Parent's Phone Number */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Parent's Phone Number"
                      name="parentPhone"
                      value={formData.parentPhone}
                      onChange={handleInputChange}
                      required
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>

                  {/* Age */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Age"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange}
                      required
                      fullWidth
                      variant="outlined"
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  {/* Grade */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Grade"
                      name="grade"
                      type="number"
                      value={formData.grade}
                      onChange={handleInputChange}
                      required
                      fullWidth
                      variant="outlined"
                      inputProps={{ min: 1, max: 12 }}
                    />
                  </Grid>

                  {/* Section - Centered */}
                  <Grid item xs={12} display="flex" justifyContent="center">
                    <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                      <TextField
                        label="Section"
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        variant="outlined"
                      />
                    </Box>
                  </Grid>

                  {/* Submit Button */}
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="center" mt={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="large"
                        sx={{
                          px: 5,
                          py: 1,
                          fontSize: "16px",
                          borderRadius: "8px",
                        }}
                      >
                        Register Member
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Modal */}
      <Modal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          // setError(null); // Keep error message if modal is closed by clicking outside
        }}
      >
        <StyledModalBox>
          <Box textAlign="center">
            {error ? (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              </>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Member registered successfully!
                </Alert>
              </>
            )}
            <Button
              onClick={() => {
                setOpenModal(false);
                setError(null); // Clear error when explicitly closing modal via button
              }}
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              Close
            </Button>
          </Box>
        </StyledModalBox>
      </Modal>
    </PageContainer>
  );
}