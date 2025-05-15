"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme, alpha } from "@mui/material/styles";
import {
  Grid,
  Stack,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  // Removed Modal, List, ListItem, ListItemText, IconButton, Divider, Button imports
} from "@mui/material";
import {
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    PeopleAlt as PeopleAltIcon,
    LibraryBooks as LibraryBooksIcon,
    Book as BookIcon,
    ErrorOutline as ErrorOutlineIcon,
    Update as UpdateIcon,
    // Removed CloseIcon import
} from '@mui/icons-material';

// --- Import useRouter for navigation ---
import { useRouter } from 'next/navigation';


// Interface for the statistics data expected from the backend
interface StatisticsData {
  totalStudentsWithBorrows: number;
  totalMembers: number;
  totalBooksOnShelf: number;
  shelfBookDistributionBySubject: Array<{ subject: string | null; count: number | null }>;
  overdueBooksCount: number;
  activeBorrowsByDuration: Array<{ duration: string | null; count: number | null }>;
  lastUpdated: string;
}

// Removed ModalBook interface as modal is removed

const StatCard = ({ title, value, icon, muiColor = 'primary' }: { title: string; value: string | number; icon: React.ReactNode; muiColor?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' }) => {
  const theme = useTheme();
  return (
    <Card sx={{
      display: 'flex',
      alignItems: 'center',
      p: 2.5,
      backgroundColor: alpha(theme.palette[muiColor]?.main || theme.palette.grey[500], 0.08),
      height: '100%'
    }}>
      <Box sx={{ mr: 2, color: `${muiColor}.main` }}>{icon}</Box>
      <Box>
        <Typography variant="h5" fontWeight="700">{value}</Typography>
        <Typography variant="body1" color="text.secondary">{title}</Typography>
      </Box>
    </Card>
  );
};

// Removed modalStyle as modal is removed


function StatisticsPage() {
  const theme = useTheme();
  const router = useRouter(); // --- Initialize router ---

  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Removed modal state variables ---
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [modalConfig, setModalConfig] = useState<{ type: 'Subject' | 'Duration'; category: string } | null>(null);
  // const [modalBooks, setModalBooks] = useState<ModalBook[]>([]);
  // const [loadingModalBooks, setLoadingModalBooks] = useState(false);

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('http://localhost:5123/get-statistics');
        setStatistics(response.data);
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Failed to load statistics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchStatistics();
  }, []);

  // --- Removed handleOpenModal and handleCloseModal functions ---
  // const handleOpenModal = async (type: 'Subject' | 'Duration', category: string) => { ... };
  // const handleCloseModal = () => { ... };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Statistics...</Typography>
      </Box>
    );
  }

  if (error || !statistics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
          {error || "No statistics data available or failed to load."}
        </Alert>
      </Box>
    );
  }

  const subjectDistributionArray = statistics.shelfBookDistributionBySubject || [];
  const durationDistributionArray = statistics.activeBorrowsByDuration || [];

  const subjectCategories = subjectDistributionArray.map(item => String(item.subject || 'Unknown Subject'));
  const subjectData = subjectDistributionArray.map(item => Number(item.count || 0));

  const durationLabels = durationDistributionArray.map(item => String(item.duration || 'Unknown Duration'));
  const durationData = durationDistributionArray.map(item => Number(item.count || 0));

  const subjectChartOptions: any = {
    chart: {
      type: 'bar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
      toolbar: { show: true, tools: { download: true } },
      animations: { enabled: true },
      events: {
        // --- Modified event handler for navigation ---
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          if (config.dataPointIndex !== undefined && config.dataPointIndex >= 0 && subjectCategories[config.dataPointIndex]) {
            const selectedSubject = subjectCategories[config.dataPointIndex];
            console.log(`Subject clicked: ${selectedSubject}. Redirecting to /utilities/BookShelf`);
            // --- Navigate to BookShelf page ---
            // You can add a query parameter here if the BookShelf page should filter by subject
            // router.push(`/utilities/BookShelf?subject=${encodeURIComponent(selectedSubject)}`);
            router.push('/utilities/BookShelf'); // Simple navigation
          }
        },
      },
    },
    plotOptions: { bar: { horizontal: false, columnWidth: '50%', borderRadius: 4, distributed: true } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: subjectCategories,
      title: { text: 'Subjects', style: { fontWeight: 600 } },
      labels: {
        formatter: function (value: any) {
          return String(value);
        }
      }
    },
    yaxis: { title: { text: 'Number of Books', style: { fontWeight: 600 } } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (val: number) => `${val} books` }, theme: theme.palette.mode },
    colors: [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main, theme.palette.info.main],
    legend: { show: false }
  };
  const subjectChartSeries: any = [{ name: 'Books', data: subjectData }];

  const durationChartOptions: any = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
      toolbar: { show: true, tools: { download: true } },
      animations: { enabled: true },
      events: {
        // --- Modified event handler for navigation ---
        dataPointSelection: (event: any, chartContext: any, config: any) => {
            if (config.dataPointIndex !== undefined && config.dataPointIndex >= 0 && durationLabels[config.dataPointIndex]) {
                const selectedDuration = durationLabels[config.dataPointIndex];
                console.log(`Duration clicked: ${selectedDuration}. Redirecting to /utilities/BookShelf`);
                 // --- Navigate to BookShelf page ---
                 // Note: Redirecting duration click to BookShelf might not be ideal
                 // depending on whether BookShelf can filter by borrow duration.
                 // Consider redirecting to a different page or not navigating for this chart.
                 // For now, implementing the requested navigation to BookShelf.
                 // You could add a query parameter like ?duration=... but BookShelf needs to handle it.
                router.push('/utilities/BookShelf'); // Simple navigation
            }
        },
      },
    },
    labels: durationLabels,
    series: durationData,
    dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
            const seriesName = opts.w.globals.seriesNames && opts.w.globals.seriesNames[opts.seriesIndex]
                                ? String(opts.w.globals.seriesNames[opts.seriesIndex])
                                : (durationLabels[opts.seriesIndex] || 'Category');
            return `${seriesName}: ${val.toFixed(1)}%`;
        }
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Borrows',
              formatter: (w: any) => w.globals.seriesTotals && w.globals.seriesTotals.length > 0 ? w.globals.seriesTotals.reduce((a: number, b: number) => a + (b || 0), 0) : 0
            }
          }
        }
      }
    },
    tooltip: { y: { formatter: (val: number, { seriesIndex, w }: any) => `${w.globals.labels[seriesIndex]}: ${val} borrows` }, theme: theme.palette.mode },
    colors: [theme.palette.primary.light, theme.palette.secondary.light, theme.palette.error.light, theme.palette.warning.light, theme.palette.info.light, theme.palette.success.light],
    legend: { position: 'bottom', formatter: (seriesName: string) => String(seriesName) }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" alignItems={{xs: 'flex-start', sm: 'center'}} mb={4} spacing={1}>
        <Typography variant="h4" fontWeight="bold">Library Statistics Overview</Typography>
        <Chip
            icon={<UpdateIcon fontSize="small"/>}
            label={`Last Updated: ${new Date(statistics.lastUpdated).toLocaleString()}`}
            size="small"
            variant="outlined"
        />
      </Stack>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Borrows" value={statistics.totalStudentsWithBorrows ?? 'N/A'} icon={<BookIcon fontSize="large"/>} muiColor="primary"/>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Registered Members" value={statistics.totalMembers ?? 'N/A'} icon={<PeopleAltIcon fontSize="large"/>} muiColor="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Books on Shelf" value={statistics.totalBooksOnShelf ?? 'N/A'} icon={<LibraryBooksIcon fontSize="large"/>} muiColor="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Overdue Books" value={statistics.overdueBooksCount ?? 'N/A'} icon={<ErrorOutlineIcon fontSize="large"/>} muiColor="error" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper elevation={3} sx={{ p: {xs: 1.5, sm: 2.5}, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>Book Distribution by Subject</Typography>
            {subjectDistributionArray && subjectDistributionArray.length > 0 ? (
                 <Chart options={subjectChartOptions} series={subjectChartSeries} type="bar" height={500} />
            ) : (
                <Typography sx={{textAlign: 'center', py: 10, color: 'text.secondary'}}>No subject distribution data available.</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Paper elevation={3} sx={{ p: {xs: 1.5, sm: 2.5}, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>Active Borrows by Duration</Typography>
             {durationDistributionArray && durationDistributionArray.length > 0 ? (
                <Chart options={durationChartOptions} series={durationData} type="donut" height={420} />
             ) : (
                <Typography sx={{textAlign: 'center', py: 10, color: 'text.secondary'}}>No borrow duration data available.</Typography>
             )}
          </Paper>
        </Grid>
      </Grid>

      {/* --- Removed Modal JSX --- */}
      {/*
      <Modal> ... </Modal>
      */}

    </Box>
  );
}

export default StatisticsPage;