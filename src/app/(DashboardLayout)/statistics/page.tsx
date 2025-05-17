// src/app/(DashboardLayout)/statistics/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  Skeleton,
  Divider, // Import Divider for visual separation
  ToggleButton, // Import ToggleButton for view mode control
  ToggleButtonGroup, // Import ToggleButtonGroup for view mode control
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import axios from 'axios';
import StatOverview from "../components/dashboard/StatOverview"; // Adjust path as needed

// Interfaces for fetched data structures
interface SubjectDistribution {
  subject: string | null | undefined;
  count: number | null | undefined;
}

interface AgeDistribution {
  age: number | null | undefined;
  count: number | null | undefined;
}

interface GradeDistribution {
  grade: string | number | null | undefined;
  count: number | null | undefined;
}

// !! IMPORTANT: LibraryStatistics Interface MUST match your backend response EXACTLY !!
interface LibraryStatistics {
  totalStudentsWithBorrows: number;
  totalMembers: number;
  totalBooksOnShelf: number;
  shelfBookDistributionBySubjectTag: SubjectDistribution[]; // Data counting every subject tag
  shelfBookDistributionByFirstSubject: SubjectDistribution[]; // Data counting each book by its first subject
  overdueBooksCount: number;
  activeBorrowsByDuration: Array<{ _id: string | null | undefined; count: number | null | undefined }>;
  memberDistributionByAge: AgeDistribution[];
  memberDistributionByGrade: GradeDistribution[];
  lastUpdated: string;
}

const API_BASE_URL = "http://localhost:5123";

// Dynamically import Chart for SSR safety
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });


function StatisticsPage() {
  const theme = useTheme();
  const [statistics, setStatistics] = useState<LibraryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for subject view mode (tag-based vs first-subject)
  const [subjectViewMode, setSubjectViewMode] = useState<'tag-based' | 'first-subject'>('first-subject'); // Default to tag-based view


  // Initialize chart options state. Start as null, options will be set in useEffect.
  const [subjectChartOptions, setSubjectChartOptions] = useState<any>(null);
  const [ageChartOptions, setAgeChartOptions] = useState<any>(null);
  const [gradeChartOptions, setGradeChartOptions] = useState<any>(null);


  // Memoize base options to prevent unnecessary re-creation
  const baseBarChartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
      toolbar: { show: true, tools: { download: true } },
      animations: { enabled: true },
      height: 350, // Default height
    },
    plotOptions: { bar: { horizontal: false, columnWidth: '70%', borderRadius: 5 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: [],
      title: { text: '', style: { fontWeight: 600 } }, // Title set in useEffect
      labels: { style: { fontSize: '12px' }, rotate: -45, trim: true, } // Rotation handled conditionally below
    },
    yaxis: {
      title: { text: 'Count', style: { fontWeight: 600 } },
      labels: { show: true },
      min: 0,
      tickAmount: 5,
    },
    fill: { opacity: 1 },
    tooltip: { theme: theme.palette.mode, },
    colors: [
      theme.palette.primary.main, theme.palette.secondary.main,
      theme.palette.success.main, theme.palette.warning.main,
      theme.palette.error.main, theme.palette.info.main,
      theme.palette.grey[500], theme.palette.warning.dark,
      theme.palette.success.dark, theme.palette.info.dark,
      theme.palette.primary.dark,
    ],
    legend: { show: false },
    grid: { borderColor: theme.palette.divider, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } }, }
  }), [theme.palette]);


  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // !! Ensure your backend is updated to provide shelfBookDistributionBySubjectTag AND shelfBookDistributionByFirstSubject
      const response = await axios.get(`${API_BASE_URL}/get-statistics`);
      const fetchedData: LibraryStatistics = response.data;

      console.log("Raw API Data:", fetchedData); // Log raw data received

      // Basic validation to ensure data structure matches the interface
      if (
        typeof fetchedData.totalStudentsWithBorrows !== 'number' || typeof fetchedData.totalMembers !== 'number' ||
        typeof fetchedData.totalBooksOnShelf !== 'number' || typeof fetchedData.overdueBooksCount !== 'number' ||
        typeof fetchedData.lastUpdated !== 'string' ||
        !Array.isArray(fetchedData.shelfBookDistributionBySubjectTag) || !Array.isArray(fetchedData.shelfBookDistributionByFirstSubject) ||
        !Array.isArray(fetchedData.activeBorrowsByDuration) ||
        !Array.isArray(fetchedData.memberDistributionByAge) || !Array.isArray(fetchedData.memberDistributionByGrade)
      ) {
        console.error("API response structure mismatch for /get-statistics:", fetchedData);
        throw new Error("Invalid data format received from the server for statistics. Missing or incorrect fields.");
      }

      // Sort distribution data arrays
      const sortSubjectData = (data: SubjectDistribution[]) => [...data].sort((a, b) => String(a.subject || 'Unknown').localeCompare(String(b.subject || 'Unknown')));
      const sortAgeData = (data: AgeDistribution[]) => [...data].sort((a, b) => (a.age || 0) - (b.age || 0));
      const sortGradeData = (data: GradeDistribution[]) => [...data].sort((a, b) => {
        const gradeA = String(a.grade || ''); const gradeB = String(b.grade || '');
        const numA = parseInt(gradeA, 10); const numB = parseInt(gradeB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return gradeA.localeCompare(gradeB);
      });

      // Sort both subject distributions from the backend
      fetchedData.shelfBookDistributionBySubjectTag = sortSubjectData(fetchedData.shelfBookDistributionBySubjectTag);
      fetchedData.shelfBookDistributionByFirstSubject = sortSubjectData(fetchedData.shelfBookDistributionByFirstSubject);
      fetchedData.memberDistributionByAge = sortAgeData(fetchedData.memberDistributionByAge);
      fetchedData.memberDistributionByGrade = sortGradeData(fetchedData.memberDistributionByGrade);


      setStatistics(fetchedData); // Set statistics state ONLY if validation passes
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch statistics:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load statistics data. Please ensure the backend server is running and accessible at http://localhost:5123.";
      setError(errorMessage);
      setStatistics(null); // Set statistics to null on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);


  // Effect to update all chart options when statistics, theme, OR subjectViewMode change
  useEffect(() => {
    if (!statistics) {
      console.log("useEffect: Statistics is null, skipping chart options update.");
      // Set chart options state to null if statistics become null (e.g. on fetch error)
      setSubjectChartOptions(null);
      setAgeChartOptions(null);
      setGradeChartOptions(null);
      return; // Exit if statistics is null
    }

    // --- Subject Distribution Chart Options (Depends on subjectViewMode) ---
    // Select the correct data array based on the current view mode
    const currentSubjectDataArray = subjectViewMode === 'tag-based'
      ? statistics.shelfBookDistributionBySubjectTag || []
      : statistics.shelfBookDistributionByFirstSubject || [];


    // Process the selected data array
    const assignedSubjectCategories = currentSubjectDataArray
      .map((item: SubjectDistribution) => (item?.subject !== null && item?.subject !== undefined) ? String(item.subject).trim() : 'Unknown Subject')
      .filter(item => item !== '' && item !== 'Unknown Subject');

    const assignedSubjectData = currentSubjectDataArray
      .map((item: SubjectDistribution) => Number(item?.count) || 0)
      .filter(item => !isNaN(item) && item >= 0);

    // Calculate N/A count based on the *total* books on shelf and the sum of *assigned* books in the *currently selected view*
    const sumOfAssignedBooksInView = assignedSubjectData.reduce((sum, count) => sum + count, 0);
    const totalBooks = statistics.totalBooksOnShelf || 0;
    const naCount = Math.max(0, totalBooks - sumOfAssignedBooksInView);

    const finalSubjectCategories = [...assignedSubjectCategories];
    const finalSubjectData = [...assignedSubjectData];

    if (naCount > 0) {
      finalSubjectCategories.push('N/A');
      finalSubjectData.push(naCount);
    }


    // Determine X-axis label rotation dynamically based on number of categories
    const subjectLabelRotate = finalSubjectCategories.length > 15 ? -60 : -45; // More rotation for many categories

    // Set subject chart options dynamically based on view mode
    const newSubjectChartOptions = { // Create the new options object
      ...baseBarChartOptions,
      chart: { ...baseBarChartOptions.chart, height: finalSubjectCategories.length > 0 && finalSubjectData.some(count => count > 0) ? 400 : 10, distributed: true },
      plotOptions: { bar: { horizontal: false, columnWidth: subjectViewMode === 'tag-based' ? '70%' : '60%', borderRadius: 5 } }, // Adjust bar width slightly by view
      xaxis: {
        ...baseBarChartOptions.xaxis,
        categories: finalSubjectCategories,
        title: { text: subjectViewMode === 'tag-based' ? 'Subject Tags' : 'First Subject per Book' }, // Dynamic Title
        labels: {
          ...baseBarChartOptions.xaxis.labels,
          show: finalSubjectCategories.length > 0,
          rotate: subjectLabelRotate, // Dynamic Rotation
        }
      },
      yaxis: {
        ...baseBarChartOptions.yaxis,
        labels: { ...baseBarChartOptions.yaxis.labels, show: finalSubjectData.some(count => count > 0) },
        title: { text: subjectViewMode === 'tag-based' ? 'Number of Tags/Books' : 'Number of Books' } // Dynamic Y-axis Title
      },
      colors: baseBarChartOptions.colors.slice(0, Math.max(finalSubjectCategories.length, 1)),
      tooltip: {
        y: { formatter: (val: number) => `${val} ${subjectViewMode === 'tag-based' ? (finalSubjectCategories.length > assignedSubjectCategories.length ? 'item' : 'tag/book') : 'book'}${val === 1 ? '' : 's'}` }, // Dynamic Tooltip Text
        theme: theme.palette.mode,
      },
      grid: { ...baseBarChartOptions.grid, borderColor: theme.palette.divider },
    };
    setSubjectChartOptions(newSubjectChartOptions); // Set the state


    // --- Age Distribution Chart Options ---
    const ageDistributionArray = statistics.memberDistributionByAge || [];
    const ageCategories = ageDistributionArray
      .map(item => (item?.age !== null && item?.age !== undefined) ? String(item.age) : 'Unknown Age')
      .filter(item => item !== '' && item !== 'Unknown Age');

    const ageData = ageDistributionArray
      .map(item => Number(item?.count) || 0)
      .filter(item => !isNaN(item) && item >= 0);

    // Set age chart options
    const newAgeChartOptions = { // Create the new options object
      ...baseBarChartOptions,
      chart: { ...baseBarChartOptions.chart, height: ageCategories.length > 0 && ageData.some(count => count > 0) ? 350 : 10, distributed: true },
      plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
      xaxis: { ...baseBarChartOptions.xaxis, categories: ageCategories, title: { text: 'Age' }, labels: { ...baseBarChartOptions.xaxis.labels, rotate: 0, trim: false, show: ageCategories.length > 0 } },
      yaxis: { ...baseBarChartOptions.yaxis, labels: { ...baseBarChartOptions.yaxis.labels, show: ageData.some(count => count > 0) }, title: { text: 'Number of Members' } },
      colors: [theme.palette.info.main],
      tooltip: { y: { formatter: (val: number) => `${val} member${val === 1 ? '' : 's'}` }, theme: theme.palette.mode, },
      grid: { ...baseBarChartOptions.grid, borderColor: theme.palette.divider },
    };
    setAgeChartOptions(newAgeChartOptions); // Set the state


    // --- Grade Distribution Chart Options ---
    const gradeDistributionArray = statistics.memberDistributionByGrade || [];
    const gradeCategories = gradeDistributionArray
      .map(item => (item?.grade !== null && item?.grade !== undefined) ? String(item.grade).trim() : 'Unknown Grade')
      .filter(item => item !== '' && item !== 'Unknown Grade');

    const gradeData = gradeDistributionArray
      .map(item => Number(item?.count) || 0)
      .filter(item => !isNaN(item) && item >= 0);

    // Set grade chart options
    const newGradeChartOptions = { // Create the new options object
      ...baseBarChartOptions,
      chart: { ...baseBarChartOptions.chart, height: gradeCategories.length > 0 && gradeData.some(count => count > 0) ? 350 : 10, distributed: true },
      plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
      xaxis: { ...baseBarChartOptions.xaxis, categories: gradeCategories, title: { text: 'Grade' }, labels: { ...baseBarChartOptions.xaxis.labels, rotate: 0, trim: false, show: gradeCategories.length > 0 } },
      yaxis: { ...baseBarChartOptions.yaxis, labels: { ...baseBarChartOptions.yaxis.labels, show: gradeData.some(count => count > 0) }, title: { text: 'Number of Members' } },
      colors: [theme.palette.success.main],
      tooltip: { y: { formatter: (val: number) => `${val} member${val === 1 ? '' : 's'}` }, theme: theme.palette.mode, },
      grid: { ...baseBarChartOptions.grid, borderColor: theme.palette.divider },
    };
    setGradeChartOptions(newGradeChartOptions); // Set the state


    console.log("Chart Options State Updated. Subject:", newSubjectChartOptions, "Age:", newAgeChartOptions, "Grade:", newGradeChartOptions);


  }, [statistics, theme.palette, baseBarChartOptions, subjectViewMode]); // Depend on statistics, theme, base options, AND subjectViewMode


  // --- Define variables for rendering (used directly in JSX) ---
  // Select the correct data array for rendering based on view mode
  const currentSubjectDataArrayForRender = subjectViewMode === 'tag-based'
    ? statistics?.shelfBookDistributionBySubjectTag || []
    : statistics?.shelfBookDistributionByFirstSubject || [];

  const assignedSubjectCategoriesForRender = currentSubjectDataArrayForRender
    .map((item: SubjectDistribution) => (item?.subject !== null && item?.subject !== undefined) ? String(item.subject).trim() : 'Unknown Subject')
    .filter(item => item !== '' && item !== 'Unknown Subject');

  const assignedSubjectDataForRender = currentSubjectDataArrayForRender
    .map((item: SubjectDistribution) => Number(item?.count) || 0)
    .filter(item => !isNaN(item) && item >= 0);

  // Calculate N/A count based on the *total* books on shelf and the sum of *assigned* books in the *currently selected view*
  const sumOfAssignedBooksInViewForRender = assignedSubjectDataForRender.reduce((sum, count) => sum + count, 0);
  const totalBooks = statistics?.totalBooksOnShelf || 0;
  const naCount = Math.max(0, totalBooks - sumOfAssignedBooksInViewForRender);

  // Data for Subject Chart Series (includes N/A if applicable)
  const subjectChartSeries: any = [{
    name: subjectViewMode === 'tag-based' ? 'Subject Entries' : 'Books', // Dynamic series name
    data: naCount > 0 ? [...assignedSubjectDataForRender, naCount] : assignedSubjectDataForRender // Add N/A count only if it exists
  }];
  // Categories/Data used for the Subject Chart rendering conditional (includes N/A if applicable)
  const finalSubjectCategoriesForRender = naCount > 0 ? [...assignedSubjectCategoriesForRender, 'N/A'] : assignedSubjectCategoriesForRender;
  const finalSubjectDataForRender = naCount > 0 ? [...assignedSubjectDataForRender, naCount] : assignedSubjectDataForRender;
  // Sum of *assigned* books for explanation - based on the data in the current view
  const sumOfChartedBooksInView = assignedSubjectDataForRender.reduce((sum: number, count: number) => sum + count, 0);


  // Data for Age Chart Series and Render Conditional
  const ageDistributionArray = statistics?.memberDistributionByAge || [];
  const ageCategoriesForRender = ageDistributionArray
    .map(item => (item?.age !== null && item?.age !== undefined) ? String(item.age) : 'Unknown Age')
    .filter(item => item !== '' && item !== 'Unknown Age');
  const ageDataForRender = ageDistributionArray
    .map(item => Number(item?.count) || 0)
    .filter(item => !isNaN(item) && item >= 0);
  const ageChartSeries: any = [{
    name: 'Members',
    data: ageDataForRender
  }];


  // Data for Grade Chart Series and Render Conditional
  const gradeDistributionArray = statistics?.memberDistributionByGrade || [];
  const gradeCategoriesForRender = gradeDistributionArray
    .map(item => (item?.grade !== null && item?.grade !== undefined) ? String(item.grade).trim() : 'Unknown Grade')
    .filter(item => item !== '' && item !== 'Unknown Grade');
  const gradeDataForRender = gradeDistributionArray
    .map(item => Number(item?.count) || 0)
    .filter(item => !isNaN(item) && item >= 0);
  const gradeChartSeries: any = [{
    name: 'Members',
    data: gradeDataForRender
  }];


  // Handler for view mode change
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'tag-based' | 'first-subject' | null,
  ) => {
    if (newMode !== null) { // Prevent unselecting all buttons
      setSubjectViewMode(newMode);
    }
  };


  console.log("Chart Render Conditional Check (Subject):", {
    mode: subjectViewMode,
    categories: finalSubjectCategoriesForRender,
    data: finalSubjectDataForRender,
    conditionResult: finalSubjectCategoriesForRender.length > 0 && finalSubjectDataForRender.some((count: number) => count > 0) && subjectChartOptions?.chart?.height !== undefined // Include options check
  });
  console.log("Chart Render Conditional Check (Age):", {
    categories: ageCategoriesForRender,
    data: ageDataForRender,
    conditionResult: ageCategoriesForRender.length > 0 && ageDataForRender.some((count: number) => count > 0) && ageChartOptions?.chart?.height !== undefined // Include options check
  });
  console.log("Chart Render Conditional Check (Grade):", {
    categories: gradeCategoriesForRender,
    data: gradeDataForRender,
    conditionResult: gradeCategoriesForRender.length > 0 && gradeDataForRender.some((count: number) => count > 0) && gradeChartOptions?.chart?.height !== undefined // Include options check
  });


  return (
    <Box sx={{ p: { xs: 3, md: 6 } }}>
      <Typography variant="h3" gutterBottom>Library Statistics</Typography>

      {/* Render loading/error states for the whole stats section */}
      {loading && (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <CircularProgress />
          <Typography sx={{ mt: 1 }}>Loading library statistics...</Typography>
        </Box>
        // Skeletons could be placed here for a better loading experience
      )}

      {error && (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Alert severity="error">{error}</Alert>
          <Button onClick={fetchStatistics} variant="contained" sx={{ mt: 2 }}>Try Again</Button>
        </Box>
      )}

      {/* Render statistics and charts if data is loaded */}
      {!loading && !error && statistics && ( // Main check for data loading
        <Grid container spacing={3}>

          {/* Scalar Statistics Cards Section */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              {/* Total Members */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" color="textSecondary" gutterBottom>Total Members</Typography>
                    <Typography variant="h4" component="div" fontWeight={600}>{statistics.totalMembers}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Students with Borrows */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" color="textSecondary" gutterBottom>Students with Borrows</Typography>
                    <Typography variant="h4" component="div" fontWeight={600}>{statistics.totalStudentsWithBorrows}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Total Books on Shelf */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" color="textSecondary" gutterBottom>Total Books on Shelf</Typography>
                    <Typography variant="h4" component="div" fontWeight={600}>{statistics.totalBooksOnShelf}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {/* Overdue Books */}
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" color="textSecondary" gutterBottom>Overdue Books</Typography>
                    <Typography variant="h4" component="div" fontWeight={600} color="error.main">{statistics.overdueBooksCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>



          <Grid item xs={12}><Divider sx={{ my: 3 }} /></Grid> {/* Divider */}

          {/* Charts Section */}
          <Grid item xs={12}>

            <Grid item xs={12}>
              <Typography variant="h4" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>Distributions</Typography> {/* Charts section title */}
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'right', mb: 3 }}>
                Last Updated: {statistics.lastUpdated ? new Date(statistics.lastUpdated).toLocaleString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid container spacing={3}>

              {/* Book Distribution Chart */}
              <Grid item xs={12} md={12}> {/* Take half width on md and up */}
                <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, height: '100%' }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}> {/* Flex container for title and toggle */}
                    {/* Dynamic Title */}
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Book Distribution by Subject
                    </Typography>
                    {/* Toggle button for view mode */}
                    <ToggleButtonGroup
                      value={subjectViewMode}
                      exclusive
                      onChange={handleViewModeChange}
                      aria-label="subject view mode"
                      size="small"
                      sx={{ height: 30 }} // Give toggle button a fixed height
                    >
                      <ToggleButton value="first-subject" aria-label="first subject view">
                        Per Book
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  {/* Dynamic Explanation */}
                  {statistics.totalBooksOnShelf > 0 && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {subjectViewMode === 'tag-based' ? (
                        `This chart shows the distribution of all books on the shelf by **subject tag**, including ${sumOfChartedBooksInView} tags from books with assigned subjects and ${naCount} tags for books without assigned subjects (${statistics.totalBooksOnShelf} total books).`
                      ) : (
                        `This chart shows the distribution of all books on the shelf by their **first assigned subject**, including ${sumOfChartedBooksInView} books with a first subject and ${naCount} books without a first subject (${statistics.totalBooksOnShelf} total books).`
                      )}
                    </Typography>
                  )}

                  {/* Render the chart only if data is available AND options are ready */}
                  {finalSubjectCategoriesForRender.length > 0 && finalSubjectDataForRender.some((count: number) => count > 0) && subjectChartOptions?.chart?.height !== undefined ? (
                    <Chart options={subjectChartOptions} series={subjectChartSeries} type="bar" height={subjectChartOptions.chart.height} />
                  ) : (
                    // Fallback message if no data or options aren't ready
                    !loading && !error && statistics ? ( // Check if data fetch is complete
                      <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                        <Typography>
                          {/* Display message based on whether data exists to chart */}
                          {finalSubjectCategoriesForRender.length === 0 || !finalSubjectDataForRender.some((count: number) => count > 0)
                            ? 'No subject distribution data available to display.' // More generic message
                            : 'Loading chart...' // Show loading if data exists but chart hasn't rendered
                          }
                        </Typography>
                        {statistics.totalBooksOnShelf > 0 && (finalSubjectCategoriesForRender.length === 0 || !finalSubjectDataForRender.some((count: number) => count > 0)) && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            There are {statistics.totalBooksOnShelf} total books on the shelf, but none have subject information or counts.
                          </Typography>
                        )}
                      </Box>
                    ) : null // Don't render anything if still loading or error
                  )}
                </Paper>
              </Grid>

              {/* Age Distribution Chart */}
              <Grid item xs={12} md={6}> {/* Take half width on md and up */}
                <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Member Distribution by Age
                  </Typography>
                  {/* Render the chart only if data is available AND options are ready */}
                  {ageCategoriesForRender.length > 0 && ageDataForRender.some((count: number) => count > 0) && ageChartOptions?.chart?.height !== undefined ? (
                    <Chart options={ageChartOptions} series={ageChartSeries} type="bar" height={ageChartOptions.chart.height} />
                  ) : (
                    !loading && !error && statistics ? (
                      <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                        <Typography>
                          {ageCategoriesForRender.length === 0 || !ageDataForRender.some((count: number) => count > 0)
                            ? 'No age distribution data available to display.'
                            : 'Loading chart...'
                          }
                        </Typography>
                      </Box>
                    ) : null
                  )}
                </Paper>
              </Grid>

              {/* Grade Distribution Chart */}
              <Grid item xs={12} md={6}> {/* Take half width on md and up, potentially on a new row */}
                <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Member Distribution by Grade
                  </Typography>
                  {/* Render the chart only if data is available AND options are ready */}
                  {gradeCategoriesForRender.length > 0 && gradeDataForRender.some((count: number) => count > 0) && gradeChartOptions?.chart?.height !== undefined ? (
                    <Chart options={gradeChartOptions} series={gradeChartSeries} type="bar" height={gradeChartOptions.chart.height} />
                  ) : (
                    !loading && !error && statistics ? (
                      <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                        <Typography>
                          {gradeCategoriesForRender.length === 0 || !gradeDataForRender.some((count: number) => count > 0)
                            ? 'No grade distribution data available to display.'
                            : 'Loading chart...'
                          }
                        </Typography>
                      </Box>
                    ) : null
                  )}
                </Paper>
              </Grid>

              {/* Active Borrows by Duration Chart/List (Optional) */}
              {/* You could add Active Borrows chart here if needed */}
              {/* statistics.activeBorrowsByDuration && statistics.activeBorrowsByDuration.length > 0 && ( ... ) */}


            </Grid>
          </Grid>

          <Grid item xs={12}><Divider sx={{ my: 3 }} /></Grid> {/* Divider */}

          {/* Display Last Updated Timestamp */}



        </Grid>
      )}

      {/* StatOverview Component (Student Book Records Table) */}
      {/* This component has its own internal loading/error handling */}
      <Box sx={{ mt: 4 }}>
        <StatOverview /> {/* This will render its own table */}
      </Box>


    </Box>
  );
}

export default StatisticsPage;