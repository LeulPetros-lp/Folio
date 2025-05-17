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
  TextField,
  Divider,
  styled,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'; // Keep for card icon if desired
import HighlightOffIcon from '@mui/icons-material/HighlightOff'; // Keep for active borrow indicator icon

// Interface for Members from /get-members
interface Member {
  id: string | number;
  stud_id: string | number;
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

// Styled Box for consistent info display in modal - Adjusted styling
const InfoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1.5),
  // Removed the '& svg' styling as icons are removed
}));

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxWidth: 550,
  bgcolor: 'background.paper',
  border: '1px solid #ddd',
  borderRadius: 2,
  boxShadow: 24,
  p: { xs: 3, sm: 4, md: 5 },
  fontFamily: 'Poppins, sans-serif',
  outline: 'none',
};

function MembersPreviewPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [studentBorrowRecords, setStudentBorrowRecords] = useState<StudentBorrowRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

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
          const processedMembers = membersData.map(m => ({ ...m, id: m.id || m.stud_id }));
          setMembers(processedMembers);
        }
        else { console.error("Fetched members data not an array:", membersData); setMembers([]); }

        const studentBorrowsData = studentBorrowsResponse.data.data || studentBorrowsResponse.data.students || studentBorrowsResponse.data || [];
        if (Array.isArray(studentBorrowsData)) {
          setStudentBorrowRecords(studentBorrowsData);
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
    if (loading) {
      return false;
    }
    if (!studentBorrowRecords || studentBorrowRecords.length === 0) {
      return true;
    }
    const hasLinkedBorrowRecord = studentBorrowRecords.some(
      (record) => String(record.memberId) === String(member_Id_to_check)
    );

    return !hasLinkedBorrowRecord;
  };

  // The handleRevokeMember function remains unchanged as it's core logic
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
  if (loading && members.length === 0 && studentBorrowRecords.length === 0) {
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', fontFamily: 'Poppins, sans-serif' }}>
        <CircularProgress size={60} thickness={4} color="primary" />
        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>Loading members data...</Typography>
      </Container>
    );
  }

  // Main error display for the whole page
  if (error && !loading && members.length === 0) {
    return (
      <Container sx={{ py: 5, fontFamily: 'Poppins, sans-serif' }}>
        <Alert severity="error" variant="outlined" sx={{ borderColor: 'error.main', color: 'error.dark' }}>
          <Typography variant="body1">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ fontFamily: 'Poppins, sans-serif', py: 4, minHeight: '100vh', backgroundColor: 'white' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', color: '#2c3e50', mb: 4, fontWeight: 700 }}>
          Library Members (*{members?.length || 0})
        </Typography>

        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 3, alignItems: { sm: 'center' } }}>
          <TextField
            label="Search Members"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Registered Student Name"
            sx={{ maxWidth: { sm: '10rm' }, '.MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'background.paper' } }}
          />

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => router.push("/members/registration")}
            sx={{ px: 4, py: 1.5, borderRadius: '8px', whiteSpace: 'nowrap' }}
          >
            Register New Member
          </Button>
        </Box>

        {loading && members.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2, color: 'text.secondary' }}>
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
            <Typography variant="body2">Refreshing data...</Typography>
          </Box>
        )}

        {!loading && !error && members.length === 0 && (
          <Alert severity="info" sx={{ mt: 4, py: 3, textAlign: 'center', border: '1px dashed #b3e5fc', color: '#01579b' }} variant="outlined">
            <Typography variant="h6" gutterBottom>No Members Registered</Typography>
            <Typography variant="body1">It looks like no members have been added to the system yet.</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>Click the "Register New Member" button above to get started.</Typography>
          </Alert>
        )}

        {!loading && !error && members.length > 0 && filteredMembers.length === 0 && (
          <Alert severity="warning" sx={{ mt: 4, py: 2, border: '1px dashed #ffb74d', color: '#e65100' }} variant="outlined">
            <Typography variant="body1">No members found matching your search: "<strong>{searchTerm}</strong>".</Typography>
          </Alert>
        )}

        {!loading && !error && filteredMembers.length > 0 && (
          <Stack spacing={2.5} sx={{ mt: 2 }}>
            {filteredMembers.map((member) => (
              <Card
                key={member.id || member.stud_id}
                sx={{
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: (theme) => theme.shadows[10] },
                  borderRadius: '10px',
                  border: '1px solid #e0e0e0',
                  bgcolor: 'background.paper',
                }}
              >
                <CardActionArea onClick={() => handleCardClick(member)} component="div" sx={{ p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    {/* Keep PersonOutlineIcon on the card as a general indicator */}
                    <PersonOutlineIcon sx={{ fontSize: 40, color: 'primary.main', flexShrink: 0 }} />
                    <Box flexGrow={1}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                        {member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        ID: <strong>{member.stud_id}</strong> | Age: {member.age} | Grade: {member.grade} | Section: {member.section}
                      </Typography>
                    </Box>
                    {!canMemberBeRevoked(member.stud_id) && (
                      <Tooltip title="This member has an active borrow record and cannot be revoked yet.">
                        <HighlightOffIcon color="warning" sx={{ fontSize: 30, flexShrink: 0 }} />
                      </Tooltip>
                    )}
                  </Box>
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
            closeAfterTransition
          >
            <Box sx={modalStyle}>
              <IconButton
                aria-label="close"
                onClick={handleCloseModal}
                sx={{ position: 'absolute', right: 16, top: 16, color: (theme) => theme.palette.grey[600] }}
              >
                <CloseIcon />
              </IconButton>
              <Typography id="member-details-modal-title" variant="h5" component="h2" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold', mb: 2 }}>
                Member Details
              </Typography>
              <Typography variant="h6" sx={{ mb: 3, color: 'text.primary' }}>
                {selectedMember.name}
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box>
                {/* Removed Icons from InfoBox */}
                <InfoBox>
                  <Typography variant="body1"><Box component="span" sx={{ fontWeight: 'bold' }}>Database ID:</Box> {selectedMember.stud_id}</Typography>
                </InfoBox>
                <InfoBox>
                  <Typography variant="body1"><Box component="span" sx={{ fontWeight: 'bold' }}>Parent's Phone:</Box> {selectedMember.parentPhone}</Typography>
                </InfoBox>
                <InfoBox>
                  <Typography variant="body1"><Box component="span" sx={{ fontWeight: 'bold' }}>Age:</Box> {selectedMember.age}</Typography>
                </InfoBox>
                <InfoBox>
                  <Typography variant="body1"><Box component="span" sx={{ fontWeight: 'bold' }}>Grade:</Box> {selectedMember.grade}</Typography>
                </InfoBox>
                <InfoBox>
                  <Typography variant="body1"><Box component="span" sx={{ fontWeight: 'bold' }}>Section:</Box> {selectedMember.section}</Typography>
                </InfoBox>
              </Box>

              <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'flex-end' }}>
                <Tooltip title={!canMemberBeRevoked(selectedMember.stud_id) ? "This member has an active borrow record and cannot be revoked yet." : "Permanently remove this member from the system."}>
                  <span>
                    <Button
                      variant="contained"
                      onClick={handleRevokeMember}
                      disabled={!canMemberBeRevoked(selectedMember.stud_id)}
                      sx={{
                        backgroundColor: !canMemberBeRevoked(selectedMember.stud_id) ? 'grey.500' : 'error.main',
                        '&:hover': {
                          backgroundColor: !canMemberBeRevoked(selectedMember.stud_id) ? 'grey.500' : 'error.dark'
                        },
                        boxShadow: !canMemberBeRevoked(selectedMember.stud_id) ? 'none' : undefined,
                        cursor: !canMemberBeRevoked(selectedMember.stud_id) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Revoke Member
                    </Button>
                  </span>
                </Tooltip>
                <Button variant="outlined" color="secondary" onClick={handleCloseModal} sx={{ borderRadius: '8px' }}>
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