import { useMediaQuery, Box, Drawer } from "@mui/material";
import SidebarItems from "./SidebarItems";
import { Upgrade } from "./Updrade";
import { Sidebar, Logo } from "react-mui-sidebar";
import logo_icon from "./logo-icon.svg";

interface ItemType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
  isSidebarOpen: boolean;
}

const MSidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
}: ItemType) => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up("lg"));

  const sidebarWidth = "270px";

  // Custom CSS for short scrollbar
  const scrollbarStyles = {
    "&::-webkit-scrollbar": {
      width: "7px",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#eff2f7",
      borderRadius: "15px",
    },
  };

  if (lgUp) {
    return (
      <Box
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
        }}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */}
        {/* ------------------------------------------- */}
        <Drawer
          anchor="left"
          open={isSidebarOpen}
          variant="permanent"
          PaperProps={{
            sx: {
              boxSizing: "border-box",
              ...scrollbarStyles,
            },
          }}
        >
          {/* ------------------------------------------- */}
          {/* Sidebar Box */}
          {/* ------------------------------------------- */}
          <Box
            sx={{
              height: "100%",
            }}
          >
            <Sidebar
              width={"270px"}
              collapsewidth="80px"
              open={isSidebarOpen}
              themeColor="#5d87ff"
              themeSecondaryColor="#49beff"
              showProfile={false}
            >
              {/* ------------------------------------------- */}
              {/* Logo */}
              {/* ------------------------------------------- */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center", // Aligns SVG and text vertically
                  margin: 10,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="50" // Keeps the icon size the same
                  height="50"
                  viewBox="0 0 100 50"
                  style={{
                    marginRight: 4, // Reduced space between the icon and text
                  }}
                >
                  <rect
                    x="20"
                    y="25"
                    width="60"
                    height="25"
                    fill="#6366F1"
                    transform="rotate(-30, 25, 17.5)"
                    rx="5"
                    ry="5"
                  />
                  <rect
                    x="40"
                    y="28"
                    width="60"
                    height="25"
                    fill="#38BDF8"
                    transform="rotate(-30, 45, 32.5)"
                    rx="5"
                    ry="5"
                  />
                </svg>
                <h1 style={{ margin: 0 }}>Folio</h1>{" "}
                {/* Remove default margin on h1 */}
              </div>

              <Box>
                {/* ------------------------------------------- */}
                {/* Sidebar Items */}
                {/* ------------------------------------------- */}
                <SidebarItems />
              </Box>
            </Sidebar>
          </Box>
        </Drawer>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant="temporary"
      PaperProps={{
        sx: {
          boxShadow: (theme) => theme.shadows[8],
          ...scrollbarStyles,
        },
      }}
    >
      {/* ------------------------------------------- */}
      {/* Sidebar Box */}
      {/* ------------------------------------------- */}
      <Box px={2}>
        <Sidebar
          width={"270px"}
          collapsewidth="80px"
          isCollapse={false}
          mode="light"
          direction="ltr"
          themeColor="#5d87ff"
          themeSecondaryColor="#49beff"
          showProfile={false}
        >
          {/* ------------------------------------------- */}
          {/* Logo */}
          {/* ------------------------------------------- */}
          <div
                style={{
                  display: "flex",
                  alignItems: "center", // Aligns SVG and text vertically
                  margin: 10,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="50" // Keeps the icon size the same
                  height="50"
                  viewBox="0 0 100 50"
                  style={{
                    marginRight: 4, // Reduced space between the icon and text
                  }}
                >
                  <rect
                    x="20"
                    y="25"
                    width="60"
                    height="25"
                    fill="#6366F1"
                    transform="rotate(-30, 25, 17.5)"
                    rx="5"
                    ry="5"
                  />
                  <rect
                    x="40"
                    y="28"
                    width="60"
                    height="25"
                    fill="#38BDF8"
                    transform="rotate(-30, 45, 32.5)"
                    rx="5"
                    ry="5"
                  />
                </svg>
                <h1 style={{ margin: 0 }}>OpFolio</h1>{" "}
                {/* Remove default margin on h1 */}
              </div>

          {/* ------------------------------------------- */}
          {/* Sidebar Items */}
          {/* ------------------------------------------- */}
          <SidebarItems />
          <Upgrade />
        </Sidebar>
      </Box>
      {/* ------------------------------------------- */}
      {/* Sidebar For Mobile */}
      {/* ------------------------------------------- */}
    </Drawer>
  );
};

export default MSidebar;
