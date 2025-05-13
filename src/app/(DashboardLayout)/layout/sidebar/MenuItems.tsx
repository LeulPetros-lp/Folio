import {
  IconAperture,
  IconCopy,
  IconLayoutDashboard,
  IconBrandMyOppo,
  IconMoodHappy,
  IconBooks,
  IconChartInfographic,
  IconSearch,
  IconSquareRoundedPlusFilled,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "Home",
  },

  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    href: "/",
  },
  {
    navlabel: true,
    subheader: "Books & Shelf",
  },
  {
    id: uniqueId(),
    title: "Book Shelf",
    icon: IconBooks,
    href: "/utilities/BookShelf",
  },
  {
    id: uniqueId(),
    title: "BookDB",
    icon: IconSearch,
    href: "/utilities/BookDB",
  },
  {
    navlabel: true,
    subheader: "General",
  },
  {
    id: uniqueId(),
    title: "Add Student",
    icon: IconSquareRoundedPlusFilled,
    href: "/shelf-add",
  },
  {
    id: uniqueId(),
    title: "Membership",
    icon: IconBrandMyOppo,
     href: "/members",
  },
  {
    id: uniqueId(),
    title: "Statistics",
    icon: IconChartInfographic,
    href: "/statistics",
  },
  {
    navlabel: true,
    subheader: "System info",
  },
  // {
  //   id: uniqueId(),
  //   title: "Icons",
  //   icon: IconMoodHappy,
  //   href: "/icons",
  // },
  // {
  //   id: uniqueId(),
  //   title: "Sample Page",
  //   icon: IconAperture,
  //   href: "/sample-page",
  // },
];

export default Menuitems;
