import { FiUsers, FiBriefcase, FiCheckSquare, FiSettings, FiLogOut } from "react-icons/fi";
import { IoDiamondOutline } from "react-icons/io5";
import { SiAwsorganizations } from "react-icons/si";
import { MdDashboardCustomize, MdOutlineManageAccounts, MdOutlineEmojiPeople, MdOutlineAccountBalance } from "react-icons/md";
import { ImProfile } from "react-icons/im";
import { GoGoal } from "react-icons/go";
import { AiOutlineProfile } from "react-icons/ai";
import { FaFileInvoiceDollar, FaSackDollar } from "react-icons/fa6";
import { TbDatabaseDollar } from "react-icons/tb";

const menuItemsByRole = {
  global_superadmin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: SiAwsorganizations, label: "Organization", path: "/organization" },
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
  organization_superadmin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiUsers, label: "Employees", path: "/employee" },
    { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: GoGoal, label: "Goals", path: "/goals" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
    {
      icon: MdOutlineAccountBalance,
      label: "Finance",
      path: "/finance", 
      dropdown: [
        { icon: FaFileInvoiceDollar, label: "Invoices", path: "/accounts/invoices" },
        { icon: FaSackDollar, label: "Expenses", path: "/accounts/expenses" },
        { icon: TbDatabaseDollar, label: "Overall", path: "/accounts/overall" },
      ],
    },
    { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },
    { icon: FiSettings, label: "Settings", path: "#" },
  ],
  admin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiUsers, label: "Employees", path: "/employee" },
    { icon: MdOutlineEmojiPeople, label: "Clients", path: "/clients" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: GoGoal, label: "Goals", path: "/goals" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
    { icon: FiSettings, label: "Settings", path: "#" },
  ],
  employee: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: GoGoal, label: "Goals", path: "/goalsview" },
    { icon: FiCheckSquare, label: "My Tasks", path: "#" },
  ],
};

const extraMenuItems = [
  { icon: IoDiamondOutline, label: "Try Premium", path: "#" },
  { icon: FiLogOut, label: "Logout", action: "logout" },
];

export { menuItemsByRole, extraMenuItems };