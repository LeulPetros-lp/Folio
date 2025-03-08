"use client";
import { Grid, Box } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import SalesOverview from '@/app/(DashboardLayout)/components/dashboard/SalesOverview';
import StudentClass from '@/app/(DashboardLayout)/components/dashboard/StudentClass';
import ProductPerformance from '@/app/(DashboardLayout)/components/dashboard/ProductPerformance';
import BookShelf from '@/app/(DashboardLayout)/components/dashboard/BookShelf';

const Dashboard = () => {
  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
        <Grid container spacing={3}>
          {/* Yearly Breakup and Monthly Earnings on top */}
          <Grid item xs={12} lg={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <StudentClass />
              </Grid>
              <Grid item xs={12} lg={6}>
                <BookShelf />
              </Grid>
            </Grid>
          </Grid>

          {/* Product Performance Table below */}
          <Grid item xs={12} lg={12}>
            <ProductPerformance />
            <br></br>
            {/* <SalesOverview /> */}
          </Grid>

          {/* Other components (commented out for now) */}
          {/* <Grid item xs={12} lg={4}> */}
          {/*   <RecentTransactions /> */}
          {/* </Grid> */}
          {/* <Grid item xs={12} lg={8}> */}
           
          {/* </Grid> */}
          {/* <Grid item xs={12}> */}
          {/*   <Blog /> */}
          {/* </Grid> */}
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Dashboard;
