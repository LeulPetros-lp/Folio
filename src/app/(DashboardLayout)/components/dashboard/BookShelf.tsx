import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from "@mui/material/styles";
import { Grid, Stack, Typography, Chip } from "@mui/material";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import Image from "next/image";

const MonthlyEarnings = () => {
  // chart color
  const theme = useTheme();
  const secondary = theme.palette.secondary.main;
  const secondarylight = "#f5fcff";
  const errorlight = "#fdede8";

  // chart
  const optionscolumnchart: any = {
    chart: {
      type: "area",
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: "#adb0bb",
      toolbar: {
        show: false,
      },
      height: 60,
      sparkline: {
        enabled: true,
      },
      group: "sparklines",
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      colors: [secondarylight],
      type: "solid",
      opacity: 0.05,
    },
    markers: {
      size: 0,
    },
    tooltip: {
      theme: theme.palette.mode === "dark" ? "dark" : "light",
    },
  };

  const seriescolumnchart: any = [
    {
      name: "",
      color: secondary,
      data: [25, 66, 20, 40, 12, 58, 20],
    },
  ];

  return (
    <DashboardCard title="Library Shelf">
      <Grid container spacing={3} alignItems="center">
        {/* column 1: Text content */}
        <Grid item xs={7} sm={7}>
          <Typography variant="h3" fontWeight="700" mt="-20px">
            57+
          </Typography>
          <Stack direction="row" spacing={1} my={1} alignItems="center">
            <Typography variant="subtitle2" fontWeight="600">
              Books
            </Typography>
          </Stack>
        </Grid>

        {/* column 2: Chips */}
        <Grid item xs={5} sm={5}>
          <Stack direction="column" spacing={1}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Chip label="Science Fiction" color="primary" />
              </Grid>
              <Grid item xs={6}>
                <Chip label="Fantasy" color="secondary" />
              </Grid>
              <Grid item xs={6}>
                <Chip label="Mystery" color="default" />
              </Grid>
              <Grid item xs={6}>
                <Chip label="Non-fiction" color="success" />
              </Grid>
              <Grid item xs={6}>
                <Chip label="Romance" color="error" />
              </Grid>
              <Grid item xs={6}>
                <Chip label="Biography" color="info" />
              </Grid>
            </Grid>
          </Stack>
        </Grid>
      </Grid>
    </DashboardCard>
  );
};

export default MonthlyEarnings;
