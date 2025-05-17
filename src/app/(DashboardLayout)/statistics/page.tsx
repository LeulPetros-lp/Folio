// src/app/(DashboardLayout)/statistics/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import axios from 'axios';

// Import PDF generation libraries
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// StatOverview is used, keep it imported
import StatOverview from "../components/dashboard/StatOverview";
import LogoStat from "../layout/shared/logo/LogoStat";


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
  shelfBookDistributionBySubjectTag: SubjectDistribution[];
  shelfBookDistributionByFirstSubject: SubjectDistribution[];
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // New state for PDF generation loading

  // Ref to capture the content for PDF
  const contentRef = useRef<HTMLDivElement>(null);

  // State for subject view mode (tag-based vs first-subject)
  const [subjectViewMode, setSubjectViewMode] = useState<'tag-based' | 'first-subject'>('first-subject');


  // Initialize chart options state. Start as null, options will be set in useEffect.
  const [subjectChartOptions, setSubjectChartOptions] = useState<any>(null);
  // ageChartOptions will now be specific for Pie
  const [ageChartOptions, setAgeChartOptions] = useState<any>(null);
  const [gradeChartOptions, setGradeChartOptions] = useState<any>(null);


  // Memoize base options for Bar charts
  const baseBarChartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
      toolbar: { show: false }, // Hide ApexCharts built-in download for page PDF
      animations: { enabled: true },
      height: 350, // Default height
    },
    plotOptions: { bar: { horizontal: false, columnWidth: '70%', borderRadius: 5 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: [],
      title: { text: '', style: { fontWeight: 600 } },
      labels: { style: { fontSize: '12px' }, rotate: -45, trim: true, }
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

  // Memoize base options for Pie charts
  const basePieChartOptions = useMemo(() => ({
    chart: {
      type: 'pie', // Set base type to pie
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
      height: 350, // Default height for pie
      toolbar: { show: false }, // Hide ApexCharts built-in download for page PDF
    },
    labels: [], // Labels will be set dynamically
    legend: { // Configure legend common for pie charts
      position: 'bottom',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      labels: { colors: theme.palette.text.primary },
    },
    dataLabels: { enabled: true, formatter: function (val: any, opts: any) { return opts.w.config.labels[opts.seriesIndex] + ": " + val.toFixed(1) + '%' } }, // Example data labels
    tooltip: { // Configure tooltip common for pie charts
        y: {
            formatter: function(val: number) {
                return val + " member" + (val === 1 ? "" : "s")
            }
        },
        theme: theme.palette.mode,
    },
    colors: [ // Example colors (can use more)
      theme.palette.info.main, theme.palette.success.main,
      theme.palette.warning.main, theme.palette.error.main,
      theme.palette.primary.main, theme.palette.secondary.main,
      theme.palette.grey[500], theme.palette.warning.dark,
    ],
    responsive: [{ // Example responsive options
      breakpoint: 480,
      options: {
        chart: { width: 200 },
        legend: { position: 'bottom' }
      }
    }]
  }), [theme.palette]);

  

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/get-statistics`);
      const fetchedData: LibraryStatistics = response.data;

      console.log("Raw API Data:", fetchedData);

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

      const sortSubjectData = (data: SubjectDistribution[]) => [...data].sort((a, b) => String(a.subject || 'Unknown').localeCompare(String(b.subject || 'Unknown')));
      const sortAgeData = (data: AgeDistribution[]) => [...data].sort((a, b) => (a.age || 0) - (b.age || 0));
      const sortGradeData = (data: GradeDistribution[]) => [...data].sort((a, b) => {
        const gradeA = String(a.grade || ''); const gradeB = String(b.grade || '');
        const numA = parseInt(gradeA, 10); const numB = parseInt(gradeB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return gradeA.localeCompare(gradeB);
      });

      fetchedData.shelfBookDistributionBySubjectTag = sortSubjectData(fetchedData.shelfBookDistributionBySubjectTag);
      fetchedData.shelfBookDistributionByFirstSubject = sortSubjectData(fetchedData.shelfBookDistributionByFirstSubject);
      fetchedData.memberDistributionByAge = sortAgeData(fetchedData.memberDistributionByAge);
      fetchedData.memberDistributionByGrade = sortGradeData(fetchedData.memberDistributionByGrade);


      setStatistics(fetchedData);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch statistics:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load statistics data. Please ensure the backend server is running and accessible at http://localhost:5123.";
      setError(errorMessage);
      setStatistics(null);
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
      setSubjectChartOptions(null);
      setAgeChartOptions(null);
      setGradeChartOptions(null);
      return;
    }

    // --- Subject Distribution Chart Options (Bar Chart) ---
    const currentSubjectDataArray = subjectViewMode === 'tag-based'
      ? statistics.shelfBookDistributionBySubjectTag || []
      : statistics.shelfBookDistributionByFirstSubject || [];

    const assignedSubjectCategories = currentSubjectDataArray
      .map((item: SubjectDistribution) => (item?.subject !== null && item?.subject !== undefined) ? String(item.subject).trim() : 'Unknown Subject')
      .filter(item => item !== '' && item !== 'Unknown Subject');

    const assignedSubjectData = currentSubjectDataArray
      .map((item: SubjectDistribution) => Number(item?.count) || 0)
      .filter(item => !isNaN(item) && item >= 0);

    const sumOfAssignedBooksInView = assignedSubjectData.reduce((sum, count) => sum + count, 0);
    const totalBooks = statistics.totalBooksOnShelf || 0;
    const naCount = Math.max(0, totalBooks - sumOfAssignedBooksInView);

    const finalSubjectCategories = [...assignedSubjectCategories];
    const finalSubjectData: number[] = naCount > 0 ? [...assignedSubjectData, naCount] : assignedSubjectData;


    const subjectLabelRotate = finalSubjectCategories.length > 15 ? -60 : -45;

    const newSubjectChartOptions = {
      ...baseBarChartOptions, // Use baseBarChartOptions
      chart: { ...baseBarChartOptions.chart, height: finalSubjectCategories.length > 0 && finalSubjectData.some(count => count > 0) ? 400 : 10, distributed: true },
      plotOptions: { bar: { horizontal: false, columnWidth: subjectViewMode === 'tag-based' ? '70%' : '60%', borderRadius: 5 } },
      xaxis: {
        ...baseBarChartOptions.xaxis,
        categories: finalSubjectCategories,
        title: { text: subjectViewMode === 'tag-based' ? 'Subject Tags' : 'First Subject per Book' },
        labels: {
          ...baseBarChartOptions.xaxis.labels,
          show: finalSubjectCategories.length > 0,
          rotate: subjectLabelRotate,
        }
      },
      yaxis: {
        ...baseBarChartOptions.yaxis,
        labels: { ...baseBarChartOptions.yaxis.labels, show: finalSubjectData.some(count => count > 0) },
        title: { text: subjectViewMode === 'tag-based' ? 'Number of Tags/Books' : 'Number of Books' }
      },
      colors: baseBarChartOptions.colors.slice(0, Math.max(finalSubjectCategories.length, 1)),
      tooltip: {
        y: { formatter: (val: number) => `${val} ${subjectViewMode === 'tag-based' ? (finalSubjectCategories.length > assignedSubjectCategories.length ? 'item' : 'tag/book') : 'book'}${val === 1 ? '' : 's'}` },
        theme: theme.palette.mode,
      },
      grid: { ...baseBarChartOptions.grid, borderColor: theme.palette.divider },
    };
    setSubjectChartOptions(newSubjectChartOptions);


    // --- Age Distribution Chart Options (Pie Chart) ---
    const ageDistributionArray = statistics.memberDistributionByAge || [];
    const ageCategories = ageDistributionArray
      .map(item => (item?.age !== null && item?.age !== undefined) ? String(item.age) : 'Unknown Age')
      .filter(item => item !== '' && item !== 'Unknown Age');

    const ageData = ageDistributionArray
      .map(item => Number(item?.count) || 0)
      .filter(item => !isNaN(item) && item >= 0);

    // Set age chart options for PIE
    const newAgeChartOptions = {
      ...basePieChartOptions, // Use basePieChartOptions
      chart: { ...basePieChartOptions.chart, height: ageCategories.length > 0 && ageData.some(count => count > 0) ? 350 : 15 }, // Keep height consistent for pie
      labels: ageCategories, // Use age categories as labels for slices
      colors: basePieChartOptions.colors.slice(0, Math.max(ageCategories.length, 1)), // Assign colors based on number of slices
      // Keep other pie-specific options from basePieChartOptions or override here
      tooltip: { // Custom tooltip for pie chart showing count
           y: {
               formatter: function(val: number) {
                   // Avoid division by zero
                   const totalMembers = statistics.totalMembers || 1;
                   return val + " Members" + "  |  ~" +  ((val/totalMembers)*100).toFixed(1) + "%"
               }
           },
           theme: theme.palette.mode,
       },
       dataLabels: { // Example data labels showing percentage
           enabled: true,
           formatter: function (val: any, opts: any) {
               // Show label and percentage, or just percentage if label is long
               const label = opts.w.config.labels[opts.seriesIndex];
               return val.toFixed(1) + '%'; // Always show percentage
           },
           dropShadow: { enabled: false } // Optional: remove shadow
       },
       legend: { // Ensure legend shows labels and values
           position: 'bottom',
           formatter: function(seriesName: string, opts: any) {
               // Display 'Age: [Value]' in the legend
               return seriesName !== 'Unknown Age' ? `${seriesName} Years Old` : seriesName;
           }
       }

    };
    setAgeChartOptions(newAgeChartOptions); // Set the state


    // --- Grade Distribution Chart Options (Bar Chart - Kept as is) ---
    const gradeDistributionArray = statistics?.memberDistributionByGrade || [];
    const gradeCategories = gradeDistributionArray
      .map(item => (item?.grade !== null && item?.grade !== undefined) ? String(item.grade).trim() : 'Unknown Grade')
      .filter(item => item !== '' && item !== 'Unknown Grade');

    const gradeData = gradeDistributionArray
      .map(item => Number(item?.count) || 0)
      .filter(item => !isNaN(item) && item >= 0);

    const newGradeChartOptions = {
      ...baseBarChartOptions, // Use baseBarChartOptions
      chart: { ...baseBarChartOptions.chart, height: gradeCategories.length > 0 && gradeData.some(count => count > 0) ? 350 : 10, distributed: true },
      plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
      xaxis: { ...baseBarChartOptions.xaxis, categories: gradeCategories, title: { text: 'Grade' }, labels: { ...baseBarChartOptions.xaxis.labels, rotate: 0, trim: false, show: gradeCategories.length > 0 } },
      yaxis: { ...baseBarChartOptions.yaxis, labels: { ...baseBarChartOptions.yaxis.labels, show: gradeData.some(count => count > 0) }, title: { text: 'Number of Members' } },
      colors: [theme.palette.success.main],
      tooltip: { y: { formatter: (val: number) => `${val} member${val === 1 ? '' : 's'}` }, theme: theme.palette.mode, },
      grid: { ...baseBarChartOptions.grid, borderColor: theme.palette.divider },
    };
    setGradeChartOptions(newGradeChartOptions);


    console.log("Chart Options State Updated. Subject:", newSubjectChartOptions, "Age:", newAgeChartOptions, "Grade:", newGradeChartOptions);


  }, [statistics, theme.palette, baseBarChartOptions, basePieChartOptions, subjectViewMode]); // Depend on statistics, theme, base options, AND subjectViewMode


  // --- Define variables for rendering (used directly in JSX) ---
  // Subject Chart Data (uses final data from useEffect logic)
  const currentSubjectDataArrayForRender = subjectViewMode === 'tag-based'
    ? statistics?.shelfBookDistributionBySubjectTag || []
    : statistics?.shelfBookDistributionByFirstSubject || [];

  const assignedSubjectCategoriesForRender = currentSubjectDataArrayForRender
    .map((item: SubjectDistribution) => (item?.subject !== null && item?.subject !== undefined) ? String(item.subject).trim() : 'Unknown Subject')
    .filter(item => item !== '' && item !== 'Unknown Subject');

  const assignedSubjectDataForRender = currentSubjectDataArrayForRender
    .map((item: SubjectDistribution) => Number(item?.count) || 0)
    .filter(item => !isNaN(item) && item >= 0);

  const sumOfAssignedBooksInViewForRender = assignedSubjectDataForRender.reduce((sum, count) => sum + count, 0);
  const totalBooks = statistics?.totalBooksOnShelf || 0;
  const naCount = Math.max(0, totalBooks - sumOfAssignedBooksInViewForRender);

  const finalSubjectCategoriesForRender = naCount > 0 ? [...assignedSubjectCategoriesForRender, 'N/A'] : assignedSubjectCategoriesForRender;
  const finalSubjectDataForRender: number[] = naCount > 0 ? [...assignedSubjectDataForRender, naCount] : assignedSubjectDataForRender;


  const subjectChartSeries: any = [{
    name: subjectViewMode === 'tag-based' ? 'Subject Entries' : 'Books',
    data: finalSubjectDataForRender // Use the data array including N/A
  }];

  const sumOfChartedBooksInView = assignedSubjectDataForRender.reduce((sum: number, count: number) => sum + count, 0);


  // Age Chart Data (Now a single array of numbers)
  const ageDistributionArray = statistics?.memberDistributionByAge || [];
  const ageCategoriesForRender = ageDistributionArray
    .map(item => (item?.age !== null && item?.age !== undefined) ? String(item.age) : 'Unknown Age')
    .filter(item => item !== '' && item !== 'Unknown Age');
  const ageDataForRender = ageDistributionArray
    .map(item => Number(item?.count) || 0)
    .filter(item => !isNaN(item) && item >= 0);

  // ageChartSeries is now just the array of numbers for the pie chart
  const ageChartSeriesForRender: number[] = ageDataForRender; // Use this directly for the pie chart series prop


  // Grade Chart Data (Bar Chart)
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
    if (newMode !== null) {
      setSubjectViewMode(newMode);
    }
  };

  console.log("Chart Render Conditional Check (Subject):", {
    mode: subjectViewMode,
    categories: finalSubjectCategoriesForRender,
    data: finalSubjectDataForRender,
    optionsReady: subjectChartOptions !== null,
    conditionResult: finalSubjectCategoriesForRender.length > 0 && finalSubjectDataForRender.some((count: number) => count > 0) && subjectChartOptions !== null
  });
  console.log("Chart Render Conditional Check (Age):", {
    categories: ageCategoriesForRender,
    data: ageDataForRender, // This is the series data now
    optionsReady: ageChartOptions !== null,
    conditionResult: ageCategoriesForRender.length > 0 && ageDataForRender.some((count: number) => count > 0) && ageChartOptions !== null
  });
  console.log("Chart Render Conditional Check (Grade):", {
    categories: gradeCategoriesForRender,
    data: gradeDataForRender,
    optionsReady: gradeChartOptions !== null,
    conditionResult: gradeCategoriesForRender.length > 0 && gradeDataForRender.some((count: number) => count > 0) && gradeChartOptions !== null
  });


  // --- PDF Layout Constants (in mm) ---
  const pdfUnit = 'mm';
  const pdfPageWidth = 210; // A4 width
  const pdfPageHeight = 297; // A4 height
  const pdfMargin = 15; // Margin on all sides
  const titleHeight = 20; // Space reserved for the title
  const spacingAfterTitle = 10; // Space between title and content

  const reportTitle = "Library Statistics Report";

  // --- PDF Download Function (Simplified for Single Page) ---
  const handleDownloadPdf = async () => {
    const input = contentRef.current;
    if (!input) {
      console.error("Could not find the content element for PDF generation.");
      alert("Content for PDF not available.");
      return;
    }

    setIsGeneratingPdf(true); // Start loading

    try {
      // Create a canvas from the content div
      const canvas = await html2canvas(input, {
        scale: 2, // Increase scale for higher resolution (adjust as needed)
        useCORS: true, // Needed if you have images from different origins
        logging: true, // Enable logging for debugging
        // Add background color if the captured area might be transparent
         backgroundColor: '#ffffff', // or theme.palette.background.default
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', pdfUnit, 'a4'); // 'p' for portrait, 'mm' for units, 'a4' size

      // Add Report Title
      const titleFontSize = 18;
      pdf.setFontSize(titleFontSize);
      const titleX = pdfPageWidth / 2;
      const titleY = pdfMargin + (titleHeight / 2) + (titleFontSize / 3); // Center title vertically in its reserved space


      // Add a line separator below title (optional)
       pdf.setDrawColor(theme.palette.divider); // Use the color string directly
       const lineY = pdfMargin + titleHeight - spacingAfterTitle/2;
       pdf.line(pdfMargin, lineY, pdfPageWidth - pdfMargin, lineY);


      // Calculate available area for the image after title and margins
      const imgAvailableWidth = pdfPageWidth - 2 * pdfMargin;
      const imgAvailableHeight = pdfPageHeight - 2 * pdfMargin - titleHeight - spacingAfterTitle; // Subtract title space and spacing

      // Calculate scaling factor to fit the image into the available area while maintaining aspect ratio
      const imgAspectRatio = canvas.width / canvas.height;
      const availableAspectRatio = imgAvailableWidth / imgAvailableHeight;

      let finalImgWidth;
      let finalImgHeight;

      if (imgAspectRatio > availableAspectRatio) {
          // Image is relatively wider, scale based on available width
          finalImgWidth = imgAvailableWidth;
          finalImgHeight = imgAvailableWidth / imgAspectRatio;
      } else {
          // Image is relatively taller or same aspect ratio, scale based on available height
          finalImgHeight = imgAvailableHeight;
          finalImgWidth = imgAvailableHeight * imgAspectRatio;
      }

      // Calculate position to center the scaled image within the available area
      const imgX = pdfMargin + (imgAvailableWidth - finalImgWidth) / 2;
      const imgY = pdfMargin + titleHeight + spacingAfterTitle + (imgAvailableHeight - finalImgHeight) / 2; // Position below title and spacing


      // Add the entire scaled image to the PDF
      pdf.addImage(imgData, 'PNG', imgX, imgY, finalImgWidth, finalImgHeight);


      pdf.save('library-report.pdf');

    } catch (err) {
      console.error("Error generating PDF:", err);
      alert(`Failed to generate PDF. ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingPdf(false); // End loading
    }
  };


  return (
    <Box sx={{ p: { xs: 3, md: 6 } }}>
      

      {/* Wrap the content to be captured in a div with the ref */}
      {/* This div's content will be screenshot by html2canvas */}
      {/* No padding needed here; padding is added within the PDF layout */}
       <div ref={contentRef} style={{ position: 'relative', minHeight: '300px', width: '100%' }}> {/* Added width: '100%' */}
        <LogoStat />
        <br></br>
        {/* Render loading/error states for the whole stats section */}
        {loading && !statistics && ( // Only show full loader if no initial data
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <CircularProgress />
            <Typography sx={{ mt: 1 }}>Loading library statistics...</Typography>
          </Box>
        )}

        {error && !statistics && ( // Only show full error if no initial data
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Alert severity="error">{error}</Alert>
            <Button onClick={fetchStatistics} variant="contained" sx={{ mt: 2 }}>Try Again</Button>
          </Box>
        )}

        {/* Render statistics and charts if data is loaded */}
        {!loading && !error && statistics && (
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



            <Grid item xs={12}><Divider sx={{ my: 3 }} /></Grid>

            {/* Charts Section */}
            <Grid item xs={12}>

              <Grid item xs={12}>
                <Typography variant="h4" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>BookShelf Distributions</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'right', mb: 3 }}>
                  Last Updated: {statistics.lastUpdated ? new Date(statistics.lastUpdated).toLocaleString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid container spacing={3}>

                {/* Book Distribution Chart (Bar Chart) */}
                <Grid item xs={12} md={12}>
                  <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, height: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Book Distribution by Subject
                      </Typography>
                      <ToggleButtonGroup
                        value={subjectViewMode}
                        exclusive
                        onChange={handleViewModeChange}
                        aria-label="subject view mode"
                        size="small"
                        sx={{ height: 30 }}
                      >
                        <ToggleButton value="first-subject" aria-label="first subject view">
                          Per Book (First Subject)
                        </ToggleButton>

                      </ToggleButtonGroup>
                    </Box>

                    {statistics.totalBooksOnShelf > 0 && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {subjectViewMode === 'tag-based' ? (
                          `This chart shows the distribution of all books on the shelf by **subject tag**, including ${sumOfChartedBooksInView} tags from books with assigned subjects and ${naCount} tags for books without assigned subjects (${statistics.totalBooksOnShelf} total books).`
                        ) : (
                          `This chart shows the distribution of all books on the shelf by their **first assigned subject**, including ${sumOfChartedBooksInView} books with a first subject and ${naCount} books without a first subject (${statistics.totalBooksOnShelf} total books).`
                        )}
                      </Typography>
                    )}

                    {finalSubjectCategoriesForRender.length > 0 && finalSubjectDataForRender.some((count: number) => count > 0) && subjectChartOptions !== null ? (
                      <Chart options={subjectChartOptions} series={subjectChartSeries} type="bar" height={subjectChartOptions.chart.height} />
                    ) : (
                      !loading && !error && statistics ? (
                        <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                          <Typography>
                            {finalSubjectCategoriesForRender.length === 0 || !finalSubjectDataForRender.some((count: number) => count > 0)
                              ? 'No subject distribution data available to display.'
                              : 'Loading chart...'
                            }
                          </Typography>
                          {statistics.totalBooksOnShelf > 0 && (finalSubjectCategoriesForRender.length === 0 || !finalSubjectDataForRender.some((count: number) => count > 0)) && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              There are {statistics.totalBooksOnShelf} total books on the shelf, but none have subject information or counts in this view.
                            </Typography>
                          )}
                        </Box>
                      ) : null
                    )}
                  </Paper>
                </Grid>




                <Grid item xs={12}><Divider sx={{ my: 3 }} /></Grid> {/* Divider */}
                <Grid item xs={12}>
                  <Typography variant="h4" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>Member Distributions</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'right', mb: 3 }}>
                    Last Updated: {statistics.lastUpdated ? new Date(statistics.lastUpdated).toLocaleString() : 'N/A'}
                  </Typography>
                </Grid>
                {/* Age Distribution Chart (PIE Chart) */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, height: '100%' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Member Distribution by Age
                    </Typography>
                     {/* Render the chart only if data is available AND options are ready */}
                    {ageCategoriesForRender.length > 0 && ageDataForRender.some((count: number) => count > 0) && ageChartOptions !== null ? (
                       // *** Use ageChartSeriesForRender and type="pie" ***
                      <Chart options={ageChartOptions} series={ageChartSeriesForRender} type="pie" height={ageChartOptions.chart.height} />
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

                {/* Grade Distribution Chart (Bar Chart - Kept as is) */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, height: '100%' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Member Distribution by Grade
                    </Typography>
                    {gradeCategoriesForRender.length > 0 && gradeDataForRender.some((count: number) => count > 0) && gradeChartOptions !== null ? (
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


              </Grid>
            </Grid>

            <Grid item xs={12}><Divider sx={{ my: 3 }} /></Grid>

          </Grid>
        )}

        {/* StatOverview Component (Student Book Records Table) */}
        {/* Ensure StatOverview content is visible and within the capture area */}
        <Box sx={{ mt: 4 }}>
          <StatOverview />
        </Box>
      </div> {/* End of div with ref */}


      <Box sx={{ mt: 4 }}> {/* Box for the button */}
         <Button
           variant="contained"
           color="primary"
           fullWidth
           onClick={handleDownloadPdf} // Add the click handler
           disabled={loading || error !== null || isGeneratingPdf || !statistics} // Disable button when loading, error, generating PDF, or no data
           startIcon={isGeneratingPdf ? <CircularProgress size={20} color="inherit" /> : null}
         >
           {isGeneratingPdf ? 'Generatinsg PDF...' : 'Download Library Report PDF'}
         </Button>
      </Box>

    </Box>
  );
}

export default StatisticsPage;