// src/app/(DashboardLayout)/components/dashboard/SubjectDistributionCard.tsx
"use client";

import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    Divider,
    CircularProgress // Optional: if you want internal loading state
} from "@mui/material";

// Define the interface for the data this component expects
interface SubjectDistribution {
    subject: string | null | undefined;
    count: number | null | undefined;
}

interface SubjectDistributionCardProps {
    /** Array of subject distribution data. */
    subjectData: SubjectDistribution[];
    /** Optional loading state passed from parent. */
    loading?: boolean;
    /** Optional error message passed from parent. */
    error?: string | null;
}

const SubjectDistributionCard: React.FC<SubjectDistributionCardProps> = ({ subjectData, loading, error }) => {

    // Sort data by count descending, then alphabetically by subject
    const sortedSubjectData = [...subjectData]
        .sort((a, b) => {
            const countA = a.count || 0;
            const countB = b.count || 0;
            if (countB !== countA) {
                return countB - countA; // Sort by count descending
            }
            const subjectA = String(a.subject || 'Unknown');
            const subjectB = String(b.subject || 'Unknown');
            return subjectA.localeCompare(subjectB); // Sort by subject alphabetically as tie-breaker
        })
        // Filter out items with zero count if desired, or handle in display
        .filter(item => (item.count || 0) > 0);


    return (
        <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Book Subjects Overview
                </Typography>

                {/* Handle Loading, Error, and No Data states */}
                {loading ? (
                     <Box sx={{ textAlign: 'center', py: 5 }}>
                         <CircularProgress size={24} />
                         <Typography variant="body2" sx={{ mt: 1 }}>Loading subjects...</Typography>
                     </Box>
                ) : error ? (
                     <Typography color="error" sx={{ textAlign: 'center', py: 5 }}>
                         {error}
                     </Typography>
                ) : sortedSubjectData.length === 0 ? (
                    <Typography color="textSecondary" sx={{ textAlign: 'center', py: 5 }}>
                        No subject distribution data available.
                    </Typography>
                ) : (
                    // Render the list of subjects and counts
                    <List dense disablePadding>
                        {sortedSubjectData.map((item, index) => (
                            <React.Fragment key={item.subject || `subject-${index}`}> {/* Use subject as key, fallback to index */}
                                <ListItem disablePadding>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body1" fontWeight={500}>
                                                {item.subject || 'Unknown Subject'}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="body2" color="textSecondary">
                                                {item.count || 0} book{item.count === 1 ? '' : 's'}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                                {/* Add a divider between items, except the last one */}
                                {index < sortedSubjectData.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
};

export default SubjectDistributionCard;