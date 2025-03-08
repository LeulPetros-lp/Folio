
import dynamic from "next/dynamic";
import axios from "axios";
import { useEffect, useState } from "react";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from '@mui/material/styles';
import { Grid, Stack, Typography, Avatar } from '@mui/material';
import { IconArrowUpLeft } from '@tabler/icons-react';

import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';

interface Student {
  _id: string;
  name: string;
  age: number;
  book: string;
  grade: string;
  section: string;
  duration: string;
  status?: string;
  isGood: boolean; // added since it was used in the logic but missing in the type
}
interface ShelfItem {
  _id: string;
  title: string;
}
const YearlyBreakup = () => {
  

  const [borrowed, setBorrowed] = useState<number>(0);
  const [redzone, setRedZone] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [response, setResponse] = useState<Student[]>([]);

  useEffect(() => {
    // First, update student statuses
    axios.put("http://localhost:5123/update-student-status")
      .then(() => {
        // Then, fetch updated student data
        axios.get("http://localhost:5123/list-students")
          .then((res) => {
            const data = res.data.data as Student[];
            setResponse(data);

            let borrowedCount = 0;
            let redzoneCount = 0;

            data.forEach((item) => {
              if (item.isGood) {
                borrowedCount++;
              } else {
                redzoneCount++;
              }
            });

            setBorrowed(borrowedCount);
            setRedZone(redzoneCount);
          }).catch((error) => {
            console.log(error);
          });
      }).catch((error) => {
        console.error('Error updating student statuses:', error);
      });

    // Fetch stock (books on shelf)
    axios.get("http://localhost:5123/shelf-item")
      .then((res) => {
        const shelfItems = res.data.data as ShelfItem[];
        setStock(shelfItems.length);
      }).catch((error) => {
        console.error('Error fetching shelf items:', error);
      });
  }, []);



  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primarylight = '#ecf2ff';
  const successlight = theme.palette.success.light;

  // chart
  const optionscolumnchart: any = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#38BDF8',
      toolbar: {
        show: false,
      },
      height: 155,
    },
    colors: [primary, primarylight, '#38BDF8'],
    plotOptions: {
      pie: {
        startAngle: 0,
        endAngle: 360,
        donut: {
          size: '75%',
          background: 'transparent',
        },
      },
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      fillSeriesColor: false,
    },
    stroke: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    responsive: [
      {
        breakpoint: 991,
        options: {
          chart: {
            width: 120,
          },
        },
      },
    ],
  };
  const seriescolumnchart: any = [borrowed, redzone];

  return (
    <DashboardCard title="Borrow Analytics">
      <Grid container spacing={3}>
        {/* column */}
        <Grid item xs={7} sm={7}>
          <Typography variant="h3" fontWeight="700">
            {redzone+borrowed}
          </Typography>
          <Stack direction="row" spacing={1} mt={1} alignItems="center">
            <Typography variant="subtitle2" fontWeight="600">
              Total Students
            </Typography>
           
          </Stack>
          <Stack spacing={3} mt={5} direction="row">
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{ width: 9, height: 9, bgcolor: primary, svg: { display: 'none' } }}
              ></Avatar>
              <Typography variant="subtitle2" color="textSecondary">
                Borrowed Status
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{ width: 9, height: 9, bgcolor: primarylight, svg: { display: 'none' } }}
              ></Avatar>
              <Typography variant="subtitle2" color="textSecondary">
                Overdue Status
              </Typography>
            </Stack>
          </Stack>
        </Grid>
        {/* column */}
        <Grid item xs={5} sm={5}>
          <Chart
            options={optionscolumnchart}
            series={seriescolumnchart}
            type="donut"
            height={150} width={"100%"}
          />
        </Grid>
      </Grid>
    </DashboardCard>
  );
};

export default YearlyBreakup;
