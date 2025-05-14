import { FiUsers, FiBriefcase, FiCheckSquare, FiSettings, FiLogOut } from "react-icons/fi";
import { IoDiamondOutline } from "react-icons/io5";
import { SiAwsorganizations } from "react-icons/si";
import { MdDashboardCustomize, MdOutlineManageAccounts, MdOutlineEmojiPeople, MdOutlineAccountBalance } from "react-icons/md";
import { ImProfile } from "react-icons/im";
import { GoGoal } from "react-icons/go";
import { AiOutlineProfile } from "react-icons/ai";
import { FaFileInvoiceDollar, FaSackDollar, FaArrowsDownToPeople } from "react-icons/fa6";
import { TbDatabaseDollar } from "react-icons/tb";
import { GoOrganization } from "react-icons/go";
import { VscOrganization } from "react-icons/vsc";
import { useSelector } from "react-redux";

const menuItemsByRole = {
  global_superadmin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: SiAwsorganizations, label: "Organization", path: "/organization" },
    { icon: FiSettings, label: "Settings", path: "/settings" },
  ],
  organization_superadmin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiUsers, label: "Employees", path: "/employee" },
    { icon: MdOutlineEmojiPeople, label: "Projects", path: "/projects" },
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
    { icon: GoOrganization, label: "Company", path: "/companies" },
    { icon: VscOrganization, label: "Contacts", path: "/contacts" },
    { icon: MdOutlineManageAccounts, label: "User Management", path: "/user-management" },
    { icon: FiSettings, label: "Settings", path: "#" },
  ],
  admin: [
    { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
    { icon: FiUsers, label: "Employees", path: "/employee" },
    { icon: MdOutlineEmojiPeople, label: "Projects", path: "/projects" },
    { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
    { icon: GoGoal, label: "Goals", path: "/goals" },
    { icon: ImProfile, label: "My Profile", path: "/profile" },
    { icon: GoOrganization, label: "Company", path: "/companies" },
    { icon: VscOrganization, label: "Contacts", path: "/contacts" },
    { icon: AiOutlineProfile, label: "Reports", path: "/reports" },
    { icon: FiSettings, label: "Settings", path: "#" },
  ],
  employee: (departmentName) => {
    const baseMenu = [
      { icon: MdDashboardCustomize, label: "Dashboard", path: "/dashboard" },
      { icon: FiBriefcase, label: "Jobs", path: "/jobs" },
      { icon: ImProfile, label: "My Profile", path: "/profile" },
      { icon: GoGoal, label: "Goals", path: "/goalsview" },
      { icon: FiCheckSquare, label: "My Tasks", path: "#" },
    ];

    // Add Company and Contacts if the user's department is Sales & Marketing
    if (departmentName === "Sales & Marketing") {
      baseMenu.push(
        { icon: GoOrganization, label: "Company", path: "/companies" },
        { icon: VscOrganization, label: "Contacts", path: "/contacts" }
      );
    }

    return baseMenu;
  },
};

const extraMenuItems = [
  { icon: IoDiamondOutline, label: "Try Premium", path: "#" },
  { icon: FiLogOut, label: "Logout", action: "logout" },
];

// Function to get department name by ID
const getDepartmentName = (departments, departmentId) => {
  const dept = departments.find((d) => d.id === departmentId);
  return dept ? dept.name : "Unknown Department";
};

// Component or logic to render the menu
export const SidebarMenu = () => {
  const user = useSelector((state) => state.auth.user);
  const departments = useSelector((state) => state.departments.departments);
  const userRole = useSelector((state) => state.auth.role);

  // Get the user's department name
  const departmentName = user?.department_id
    ? getDepartmentName(departments, user.department_id)
    : "Unknown Department";

  // Get menu items based on role
  const menuItems =
    userRole === "employee"
      ? menuItemsByRole.employee(departmentName)
      : menuItemsByRole[userRole] || [];

  return (
    <div>
      {menuItems.map((item, index) => (
        <div key={index}>
          <a href={item.path}>{item.label}</a>
          {item.dropdown && (
            <div>
              {item.dropdown.map((subItem, subIndex) => (
                <a key={subIndex} href={subItem.path}>
                  {subItem.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
      {extraMenuItems.map((item, index) => (
        <div key={index}>
          <a href={item.path} onClick={item.action === "logout" ? () => console.log("Logout") : null}>
            {item.label}
          </a>
        </div>
      ))}
    </div>
  );
};

export { menuItemsByRole, extraMenuItems };