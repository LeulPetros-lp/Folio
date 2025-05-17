import Link from "next/link";
import { styled } from "@mui/material";
import Image from "next/image";

const LinkStyled = styled(Link)(() => ({
  height: "70px",
  width: "180px",
  overflow: "hidden",
  display: "block",
}));

const Logo = () => {
  return (
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
    <h1 style={{ margin: 0 }}>Folio Report</h1>{" "}
    {/* Remove default margin on h1 */}
  </div>
  );
};

export default Logo;
  