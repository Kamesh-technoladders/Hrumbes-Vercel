
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/LoginPage";
import SignUp from "./pages/GlobalSuperAdmin";
import PrivateRoutes from "./utils/PrivateRoutes";
import GlobalSuperadminDashboard from "./pages/Global_Dashboard";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/dashboard";
import Employee from "./pages/Employee";
import UserManagement from "./pages/UserManagement";
import Clients from "./pages/Client";
import ClientDashboard from "./components/Client/ClientDashboard";
import ProjectDashboard from "./components/Client/ProjectDashboard";
import Index from "./pages/Index";

// Password change
import PasswordChange from "./pages/ChangeEmployeePassword";
// import EmployeeProfile from "./pages/EmployeeProfile";
import ProfilePageEmployee from "./pages/ProfilePageEmployee";
import EmployeeList from "./pages/EmployeeList";
import EmployeeForm from "./pages/EmployeeForm";
import EmployeeProfile from "./pages/EmployeeProfile";
import GoalPage from "./pages/goals/Index";
import GoalView from "./pages/goals/EmployeeView";
import GoalDetail from "./pages/goals/GoalDetail";
import EmployeeGoalView from "./components/goals/employee/EmployeeGoalDashboard"
import GoalDetailView from "./components/goals/dashboard/GoalDetailView";

// Jobs
import Jobs from "./pages/jobs/Jobs";
import JobView from "./pages/jobs/JobView";
import JobDescription from "./pages/jobs/JobDescription";
import Career from "./pages/careerPage/Index";
import CareerJobDetail from "./pages/careerPage/JobDetail";
import CareerJobApplication from "./pages/careerPage/JobApplication";
import StatusSettings from "./pages/jobs/StatusSettings";
import ResumeAnalysisDetailView from "./pages/jobs/ResumeAnalysisDetailView";
import SharedProfile from "./pages/jobs/SharedProfile"
import ReportsPage from "./pages/reports/Index";
import EmployeeProfilePage from "./components/MagicLinkView/EmployeeProfileDrawer";
// Finance & Accounts
import FinanceIndex from "./pages/finance/Index";
import PayrollEdit from "./pages/finance/PayrollEdit";
import InvoicesPage from "./pages/finance/accounts/InvoicesPage";
import ExpensesPage from "./pages/finance/accounts/ExpensesPage";
import Payroll from "./pages/payroll/index";
import AccountsOverview from "./pages/finance/accounts/AccountsOverview";
// Sales Companies and Contacts
import CompaniesPage from "./pages/sales/CompaniesPage";
import CompanyDetail from "./pages/sales/CompanyDetail";
import CompanyEdit from "./pages/sales/CompanyEdit";
import ContactsPage from "./pages/sales/ContactsPage";

// Clients
import ClientPage from "./pages/clients/ClientDashboard";
import ClientManagementDashboard from "./pages/client-dashboard/ClientManagementDashboard";
import ClientCandidatesView from "./pages/client-dashboard/ClientCandidatesView";
import ClientMetricsDashboard from "./pages/client-dashboard/ClientMetricsDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* career page */}
        <Route path="/careers" element={<Career />} />
          <Route path="/job/:jobId" element={<CareerJobDetail />} />
          <Route path="/job/:jobId/apply" element={<CareerJobApplication />} />

          {/* Candidate Profile Magic Link */}
          <Route path="/share/:shareId" element={<SharedProfile />} />


        {/* Protected Routes */}
        <Route
          element={
            <PrivateRoutes
              allowedRoles={[
                "global_superadmin",
                "organization_superadmin",
                "admin",
                "employee",
              ]}
            />
          }
        >
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Password Change */}
            <Route path="/password" element={<PasswordChange />} />

            {/* <Route path="/employees" element={<Employee/>} /> */}
            <Route path="/projects" element={<Clients />} />
            <Route path="/client/:id" element={<ClientDashboard />} />
            <Route path="/project/:id" element={<ProjectDashboard />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route
              path="/organization"
              element={<GlobalSuperadminDashboard />}
            />

            {/* Employee */}

            <Route path="employee" element={<EmployeeList />} />
            <Route path="employee/new" element={<EmployeeForm />} />
            <Route path="employee/:id" element={<EmployeeForm />} />
            <Route path="employee/profile/:id" element={<EmployeeProfile />} />

            {/* Employee Dashboard Routes */}
            <Route path="/profile" element={<ProfilePageEmployee />} />

            {/* Clients */}
            {/* <Route path="/clients" element={<ClientPage />} /> */}

                        {/* Client Dashboard (New) */}
                        <Route path="/clients" element={<ClientManagementDashboard />} />
            <Route path="/client-dashboard/:clientName/candidates" element={<ClientCandidatesView />} />
            <Route path="/client-metrics" element={<ClientMetricsDashboard />} />

            {/* Goals */}
            <Route path="/goals" element={<GoalPage />} />
            <Route path="/goals/:goalId" element={<GoalDetail />} />
            <Route path="/goalsview" element={<GoalView />} />
            <Route path="goalview" element={<EmployeeGoalView/>} />
            <Route path="/goals/:goalId/:goalType?" element={<GoalDetailView />} />

            {/* Jobs */}
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobView />} />
            <Route path="/resume-analysis/:candidateId" element={<ResumeAnalysisDetailView />} />
            <Route path="/jobs/:id/description" element={<JobDescription />} />
            <Route path="/jobs/edit/:id" element={<JobDescription />} />
            <Route path="/jobstatuses" element={<StatusSettings />} />
            <Route path="/employee/:candidateId/:jobId" element={<EmployeeProfilePage />} />



                        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />

        {/* Finance & Accounts */}
        <Route path="/finance" element={<FinanceIndex />} />
          <Route path="/payroll/:id/edit" element={<PayrollEdit />} />
          <Route path="/accounts/invoices" element={<InvoicesPage />} />
          <Route path="/accounts/expenses" element={<ExpensesPage />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/accounts/overall" element={<AccountsOverview />} />


          {/* Sales Companies and Contacts */}
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/companies/:id/edit" element={<CompanyEdit />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
