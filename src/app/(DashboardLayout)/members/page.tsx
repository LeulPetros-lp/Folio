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
  TextField, // Added TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Interface for Members from /get-members
interface Member {
  id: string | number;    // For React key
  stud_id: string | number;   // Database ID
  name: string;
  parentPhone: string;
  age: number | string;
  grade: number | string;
  section: string;
}

// Interface for Student Borrow Records from /list-students
interface StudentBorrowRecord {
  _id: string | number;
  memberId: string | number;
  name: string;
  book: string;
  isGood: boolean;
  returnDate: string;
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
  const [searchTerm, setSearchTerm] = useState<string>(''); // New state for search

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
          axios.get('http://localhost:5123/list-students')
        ]);

        const membersData = membersResponse.data.data || membersResponse.data.members || membersResponse.data || [];
        if (Array.isArray(membersData)) {
          // Ensure 'id' for React key is present, using stud_id as fallback if necessary
          const processedMembers = membersData.map(m => ({ ...m, id: m.id || m.stud_id }));
          setMembers(processedMembers);
        }
        else { console.error("Fetched members data not an array:", membersData); setMembers([]); }

        const studentBorrowsData = studentBorrowsResponse.data.data || studentBorrowsResponse.data.students || studentBorrowsResponse.data || [];
        if (Array.isArray(studentBorrowsData)) {
          setStudentBorrowRecords(studentBorrowsData);
          // console.log("Fetched Student Borrow Records (first 3):", JSON.stringify(studentBorrowsData.slice(0,3), null, 2));
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
    // console.log(`[canMemberBeRevoked] Checking for memberId: ${member_Id_to_check}`);
    if (loading) {
      // console.log("[canMemberBeRevoked] Initial data still loading. Defaulting to disable revoke.");
      return false;
    }
    if (!studentBorrowRecords || studentBorrowRecords.length === 0) {
      // console.log("[canMemberBeRevoked] No student borrow records available. Member IS revokable.");
      return true;
    }
    const hasLinkedBorrowRecord = studentBorrowRecords.some(
      (record) => String(record.memberId) === String(member_Id_to_check)
    );

    if (hasLinkedBorrowRecord) {
      // console.log(`[canMemberBeRevoked] Active borrow record FOUND for memberId: ${member_Id_to_check}. Member is NOT revokable.`);
      return false;
    } else {
      // console.log(`[canMemberBeRevoked] No active borrow record found for memberId: ${member_Id_to_check}. Member IS revokable.`);
      return true;
    }
  };

  const handleRevokeMember = async () => {
    if (!selectedMember || !selectedMember.stud_id) {
      setSnackbarMessage("No member selected.");
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!canMemberBeRevoked(selectedMember.stud_id)) {
      setSnackbarMessage("This member has an active borrowing record and cannot be revoked now.");
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:5123/revoke-member/${selectedMember.stud_id}`);
      if (response.status === 200) {
        if (response.data.err) {
          setSnackbarMessage(`Could not revoke: ${response.data.err}`);
          setSnackbarSeverity('warning');
        } else {
          setSnackbarMessage(response.data.message || 'Member revoked successfully!');
          setSnackbarSeverity('success');
          setMembers(prevMembers => prevMembers.filter(m => m.stud_id !== selectedMember!.stud_id));
          handleCloseModal();
        }
      } else {
        const errorMessage = response.data.message || `Failed to revoke member. Status: ${response.status}`;
        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
      }
    } catch (apiError: any) {
      console.error("Error revoking member:", apiError);
      let userMessage = 'An unexpected error occurred while trying to revoke member.';
      if (apiError.response) {
        userMessage = apiError.response.data.message || apiError.response.data.error || `Server error: ${apiError.response.status}`;
        if (apiError.response.status === 404) {
          userMessage = apiError.response.data.message || 'Member not found on the server for revocation.';
          setMembers(prevMembers => prevMembers.filter(m => m.stud_id !== selectedMember!.stud_id));
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

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(member.stud_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(member.grade).toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Main loader for the whole page
  if (loading && members.length === 0 && studentBorrowRecords.length === 0) { // Adjusted condition to only show full page loader on initial load
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', fontFamily: 'Poppins, sans-serif' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading page data...</Typography>
      </Container>
    );
  }

  // Main error display for the whole page
  if (error && !loading && members.length === 0) { // Adjusted condition
    return (
      <Container sx={{ py: 5, fontFamily: 'Poppins, sans-serif' }}>
        <Alert severity="error" variant="filled">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ fontFamily: 'Poppins, sans-serif', py: 3, minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', color: '#2c3e50', mb: 2, fontWeight: 600 }}>
          Members Dashboard
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-around', gap:3 }}>
          <TextField
            label="Search Members (by Name, ID, Grade, Section)"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ maxWidth: '800px' }} // Adjusted width

          />

          <Button
            sx={{ mb: 4, display: 'block', mx: 'auto', px: 4, py: 1.5 }} // Slightly larger button
            variant="contained"
            color="primary"
            onClick={() => router.push("/members/registration")}
          >
            Register New Member
          </Button>
        </Box>



        {/* Conditional rendering for loading/error specific to member list if needed, else rely on main loader */}
        {loading && members.length > 0 && ( // Show a subtle loader if members are already partially loaded but a refresh is happening.
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress size={24} /><Typography sx={{ ml: 1 }}>Refreshing data...</Typography></Box>
        )}


        {!loading && !error && members.length === 0 && ( // No members registered at all
          <Alert severity="info" sx={{ mt: 4, py: 3, textAlign: 'center' }} variant="outlined">
            No members are currently registered in the system. <br />
            Click the "Register New Member" button above to add the first member.
          </Alert>
        )}

        {!loading && !error && members.length > 0 && filteredMembers.length === 0 && ( // Members exist, but none match search
          <Alert severity="info" sx={{ mt: 4, py: 2 }} variant="outlined">
            No members found matching "{searchTerm}". Try a different search term.
          </Alert>
        )}

        {!loading && !error && filteredMembers.length > 0 && (
          <Stack spacing={2.5} sx={{ mt: 2 }}>
            {filteredMembers.map((member) => (
              <Card
                key={member.id || member.stud_id} // Ensure key is unique
                sx={{
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: (theme) => theme.shadows[8] },
                  borderRadius: '8px' // Slightly more rounded cards
                }}
              >
                <CardActionArea onClick={() => handleCardClick(member)} component="div">
                  <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', sm: { alignItems: 'center' }, gap: 2, p: { xs: 2, md: 3 } }}>
                    <Box flexGrow={1}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                        {member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {member.stud_id} | Age: {member.age} | Grade: {member.grade} | Section: {member.section}
                      </Typography>
                    </Box>
                    {/* Optionally, show an indicator if member cannot be revoked */}
                    {!canMemberBeRevoked(member.stud_id) && (
                      <Tooltip title="This member has an active borrow record.">
                        <Typography variant="caption" sx={{ color: 'orange.main', alignSelf: 'center', ml: { sm: 'auto' } }}>
                          Active Borrow
                        </Typography>
                      </Tooltip>
                    )}
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
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Database ID:</Box> {selectedMember.stud_id}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Parent's Phone:</Box> {selectedMember.parentPhone}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Age:</Box> {selectedMember.age}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Grade:</Box> {selectedMember.grade}</Typography>
                <Typography variant="body1" gutterBottom><Box component="span" sx={{ fontWeight: 'bold' }}>Section:</Box> {selectedMember.section}</Typography>
              </Box>
              <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'flex-end' }}>
                <Tooltip title={!canMemberBeRevoked(selectedMember.stud_id) ? "Member has an active borrow record and cannot be revoked." : "Revoke this member"}>
                  <span>
                    <Button
                      variant="contained"
                      onClick={handleRevokeMember}
                      disabled={!canMemberBeRevoked(selectedMember.stud_id)}
                      sx={{
                        backgroundColor: !canMemberBeRevoked(selectedMember.stud_id) ? 'grey.400' : 'error.main',
                        '&:hover': {
                          backgroundColor: !canMemberBeRevoked(selectedMember.stud_id) ? 'grey.400' : 'error.dark'
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
          key={snackbarMessage + snackbarSeverity} // Key helps re-render Snackbar if message/severity changes for same open state
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