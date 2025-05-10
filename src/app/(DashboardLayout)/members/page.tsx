// Add this at the top if using Next.js App Router
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Modal,
  Button,
  Stack,
  IconButton,
  Snackbar,
  AlertColor,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Interface for Members from /get-members
interface Member {
  id: string | number;    // For React key
  _id: string | number;   // Database ID
  name: string;
  parentPhone: string;
  age: number | string;
  grade: number | string;
  section: string;
}

// Interface for Student Borrow Records from /list-students
interface StudentBorrowRecord {
  _id: string | number; // The StudentBorrowRecord document's own _id
  memberId: string | number; // <<<< THIS FIELD LINKS TO Member._id
  name: string;         // Name of the student (might be same as member name)
  book: string;
  isGood: boolean;
  returnDate: string;   // Or Date
  // Add other fields from DataSchema.js relevant to identifying an active borrow
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 500,
  bgcolor: 'background.paper',
  border: '1px solid #ddd',
  borderRadius: 2,
  boxShadow: 24,
  p: { xs: 2, sm: 3, md: 4 },
  fontFamily: 'Poppins, sans-serif',
};

function MembersPreviewPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [studentBorrowRecords, setStudentBorrowRecords] = useState<StudentBorrowRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('info');

  const router = useRouter();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [membersResponse, studentBorrowsResponse] = await Promise.all([
          axios.get('http://localhost:5123/get-members'),
          axios.get('http://localhost:5123/list-students') // This should list StudentBorrowRecords
        ]);

        const membersData = membersResponse.data.data || membersResponse.data.members || membersResponse.data || [];
        if (Array.isArray(membersData)) setMembers(membersData);
        else { console.error("Fetched members data not an array:", membersData); setMembers([]); }

        // Ensure /list-students returns data that includes the memberId linking field
        const studentBorrowsData = studentBorrowsResponse.data.data || studentBorrowsResponse.data.students || studentBorrowsResponse.data || [];
        if (Array.isArray(studentBorrowsData)) {
            setStudentBorrowRecords(studentBorrowsData);
            console.log("Fetched Student Borrow Records (first 3):", JSON.stringify(studentBorrowsData.slice(0,3), null, 2));
        } else {
            console.error("Fetched student borrow data not an array:", studentBorrowsData);
            setStudentBorrowRecords([]);
        }

      } catch (err: any) {
        console.error("Error fetching initial data:", err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch initial page data.';
        setError(errorMessage);
        setMembers([]);
        setStudentBorrowRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleCardClick = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  const canMemberBeRevoked = (member_Id_to_check: string | number): boolean => {
    console.log(`[canMemberBeRevoked] Checking for memberId: ${member_Id_to_check}`);
    if (loading) {
        console.log("[canMemberBeRevoked] Initial data still loading. Defaulting to disable revoke.");
        return false; // Cannot revoke (button disabled)
    }
    if (!studentBorrowRecords || studentBorrowRecords.length === 0) {
      console.log("[canMemberBeRevoked] No student borrow records available. Member IS revokable.");
      return true; // No borrow records, so member is revokable
    }

    // Check if any student borrow record is linked to this member.
    // This assumes 'record.memberId' now exists in your StudentBorrowRecord interface and data.
    const hasLinkedBorrowRecord = studentBorrowRecords.some(
      (record) => String(record.memberId) === String(member_Id_to_check)
    );

    if (hasLinkedBorrowRecord) {
      console.log(`[canMemberBeRevoked] Active borrow record FOUND for memberId: ${member_Id_to_check} via linking field. Member is NOT revokable.`);
      return false; // Member has a linked borrow record, so NOT revokable
    } else {
      console.log(`[canMemberBeRevoked] No active borrow record found for memberId: ${member_Id_to_check} via linking field. Member IS revokable.`);
      return true; // No linked borrow record found, so IS revokable
    }
  };

  const handleRevokeMember = async () => {
    if (!selectedMember || !selectedMember._id) {
      setSnackbarMessage("No member selected.");
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    // Frontend check before calling API
    if (!canMemberBeRevoked(selectedMember._id)) {
        setSnackbarMessage("This member has an active borrowing record and cannot be revoked now.");
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
    }

    

    try {
      const response = await axios.delete(`http://localhost:5123/revoke-member/${selectedMember._id}`);
      if (response.status === 200) {
        if (response.data.err) { // Backend blocked the deletion
            setSnackbarMessage(`Could not revoke: ${response.data.err}`);
            setSnackbarSeverity('warning'); // Or 'error' if preferred for a failed action
        } else { // Deletion was successful on the backend
            setSnackbarMessage(response.data.message || 'Member revoked successfully!');
            setSnackbarSeverity('success');
            setMembers(prevMembers => prevMembers.filter(m => m._id !== selectedMember!._id));
            handleCloseModal();
        }
      } else {
        // Should be caught by catch block if non-2xx
        const errorMessage = response.data.message || `Failed to revoke member. Status: ${response.status}`;
        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
      }
    } catch (apiError: any) {
      console.error("Error revoking member:", apiError);
      let userMessage = 'An unexpected error occurred while trying to revoke member.';
      if (apiError.response) {
        userMessage = apiError.response.data.message || apiError.response.data.error || `Server error: ${apiError.response.status}`;
        if (apiError.response.status === 404) { // Member not found in Members collection for deletion
          userMessage = apiError.response.data.message || 'Member not found on the server for revocation.';
          setMembers(prevMembers => prevMembers.filter(m => m._id !== selectedMember!._id)); // Remove from UI if confirmed not found
          handleCloseModal();
        }
      } else if (apiError.request) {
        userMessage = 'No response from server. Please check your network connection.';
      } else {
        userMessage = 'Could not make the request to revoke member.';
      }
      setSnackbarMessage(userMessage);
      setSnackbarSeverity('error');
    }
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // ... (rest of your JSX: loading, error, main page structure, cards, modal, snackbar)
  // The JSX structure from the previous "full final code" for the frontend can be used here.
  // Ensure the Revoke Button's disabled prop correctly uses `!canMemberBeRevoked(selectedMember._id)`

  if (loading) {
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', fontFamily: 'Poppins, sans-serif' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading members...</Typography>
      </Container>
    );
  }

  if (error && !loading) {
    return (
      <Container sx={{ py: 5, fontFamily: 'Poppins, sans-serif' }}>
        <Alert severity="error" variant="filled">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ fontFamily: 'Poppins, sans-serif', py: 3, minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', color: '#2c3e50', mb: 4, fontWeight: 600 }}>
          Members Dashboard
        </Typography>
        <Button
          sx={{ mt: 2, mb: 4, display: 'block', mx: 'auto', px:4, py: 1.5 }}
          variant="contained"
          color="primary"
          onClick={() => router.push("/members/registration")}
        >
          Register New Member
        </Button>

        {members.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }} variant="outlined">No members found.</Alert>
        ) : (
          <Stack spacing={2.5}>
            {members.map((member) => (
              <Card
                key={member.id}
                sx={{
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: (theme) => theme.shadows[8] },
                }}
              >
                <CardActionArea onClick={() => handleCardClick(member)} component="div">
                  <CardContent sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, p: {xs: 2, md: 3} }}>
                    <Box flexGrow={1}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                        {member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Age: {member.age} | Grade: {member.grade} | Section: {member.section}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )}

        {selectedMember && (
          <Modal
            open={isModalOpen}
            onClose={handleCloseModal}
            aria-labelledby="member-details-modal-title"
          >
            <Box sx={modalStyle}>
              <IconButton
                aria-label="close"
                onClick={handleCloseModal}
                sx={{ position: 'absolute', right: 12, top: 12, color: (theme) => theme.palette.grey[600] }}
              >
                <CloseIcon />
              </IconButton>
              <Typography id="member-details-modal-title" variant="h5" component="h2" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 3 }}>
                {selectedMember.name}'s Details
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Database ID:</Box> {selectedMember._id}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Parent's Phone:</Box> {selectedMember.parentPhone}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Age:</Box> {selectedMember.age}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Grade:</Box> {selectedMember.grade}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Section:</Box> {selectedMember.section}</Typography>
              </Box>
              <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'flex-end' }}>
                <Tooltip title={!canMemberBeRevoked(selectedMember._id) ? "Member has an active borrow record and cannot be revoked." : "Revoke this member"}>
                  <span> {/* Tooltip needs a span wrapper for disabled MUI buttons */}
                    <Button
                      variant="contained"
                      onClick={handleRevokeMember}
                      disabled={!canMemberBeRevoked(selectedMember._id)}
                      sx={{
                        backgroundColor: !canMemberBeRevoked(selectedMember._id) ? 'grey.400' : 'error.main',
                        '&:hover': { 
                            backgroundColor: !canMemberBeRevoked(selectedMember._id) ? 'grey.400' : 'error.dark' 
                        },
                      }}
                    >
                      Revoke Member
                    </Button>
                  </span>
                </Tooltip>
                <Button variant="outlined" color="secondary" onClick={handleCloseModal}>
                  Close
                </Button>
              </Stack>
            </Box>
          </Modal>
        )}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          key={snackbarMessage + snackbarSeverity}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%', boxShadow: 6 }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default MembersPreviewPage;