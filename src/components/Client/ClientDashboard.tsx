import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { useSelector } from "react-redux";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  ArrowLeft,
  Download,
  Plus,
  Search,
  Briefcase,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import AddProjectDialog from "./AddProjectDialog";
import Loader from "@/components/ui/Loader";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import RevenueProfitChart from "../Client/RevenueProfitChart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  start_date: string;
  revenue: number;
  profit: number;
  status: string;
  attachment?: string | null;
  numberOfEmployees: number;
  activeEmployees: number;
}

interface Client {
  id: string;
  display_name: string;
  total_projects: number;
  ongoing_projects: number;
  completed_projects: number;
  active_employees: number;
  revenue: number;
  profit: number;
  currency: string;
}

interface AssignEmployee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  salary: number;
  client_billing: number;
  status: string;
  billing_type?: string;
  start_date: string;
  end_date: string;
  hr_employees?: {
    salary_type: string;
  } | null;
}

interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  project_time_data: {
    projects: { hours: number; report: string; clientId: string; projectId: string }[];
  };
  total_working_hours: string;
}

const EXCHANGE_RATE_USD_TO_INR = 84;

const formatINR = (number: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(number);

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  if (!user || !organization_id) {
    return (
      <div className="text-center text-red-600 font-semibold mt-10">
        Authentication error: Missing user or organization ID
      </div>
    );
  }

  // Fetch client details
  const { data: client, isLoading: loadingClient, error: clientError } = useQuery<Client>({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, display_name, total_projects, ongoing_projects, completed_projects, active_employees, revenue, profit, currency")
        .eq("id", id)
        .eq("organization_id", organization_id)
        .single();
      if (error) throw error;
      return {
        ...data,
        total_projects: data.total_projects ?? 0,
        ongoing_projects: data.ongoing_projects ?? 0,
        completed_projects: data.completed_projects ?? 0,
        active_employees: data.active_employees ?? 0,
        revenue: data.revenue ?? 0,
        profit: data.profit ?? 0,
        currency: data.currency ?? "INR",
      };
    },
    enabled: !!id && !!organization_id,
  });

  // Fetch projects for the client
  const { data: projects = [], isLoading: loadingProjects, error: projectsError } = useQuery<Project[]>({
    queryKey: ["client-projects", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_projects")
        .select("*, attachment")
        .eq("client_id", id)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data.map((project) => ({
        ...project,
        start_date: project.start_date ?? "",
        status: project.status ?? "unknown",
        revenue: 0,
        profit: 0,
        attachment: project.attachment ?? null,
        numberOfEmployees: 0,
        activeEmployees: 0,
      }));
    },
    enabled: !!id && !!organization_id,
  });

  // Fetch assigned employees for the client’s projects
  const { data: assignedEmployees = [], isLoading: loadingEmployees, error: employeesError } = useQuery<
    AssignEmployee[]
  >({
    queryKey: ["project-employees", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select(`
          id,
          assign_employee,
          project_id,
          client_id,
          salary,
          client_billing,
          status,
          billing_type,
          start_date,
          end_date,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey (salary_type)
        `)
        .eq("client_id", id)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data.map((employee) => ({
        id: employee.id,
        assign_employee: employee.assign_employee ?? "",
        project_id: employee.project_id,
        client_id: employee.client_id ?? "",
        salary: employee.salary ?? 0,
        client_billing: employee.client_billing ?? 0,
        status: employee.status ?? "No Status",
        billing_type: employee.billing_type ?? "LPA",
        start_date: employee.start_date ?? "",
        end_date: employee.end_date ?? "",
        hr_employees: employee.hr_employees ?? null,
      }));
    },
    enabled: !!id && !!organization_id,
  });

  // Fetch time logs for actual calculations
  const { data: timeLogs = [], isLoading: loadingTimeLogs, error: timeLogsError } = useQuery<
    TimeLog[]
  >({
    queryKey: ["time_logs", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        // .eq("organization_id", organization_id);
      if (error) throw error;
      return data.filter((log) =>
        log.project_time_data?.projects?.some((proj) => projects.some((p) => p.id === proj.projectId))
      );
    },
    enabled: !!id && !!organization_id && projects.length > 0,
  });

  // Combine loading states
  const isLoading = loadingClient || loadingProjects || loadingEmployees || loadingTimeLogs;

  // Error handling
  if (clientError || projectsError || employeesError || timeLogsError) {
    toast.error("Failed to fetch data");
    console.error("Errors:", { clientError, projectsError, employeesError, timeLogsError });
  }

  // Reset currentPage when searchQuery or activeTab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Calculate total hours per employee from time logs
  const calculateEmployeeHours = (employeeId: string, projectId: string) =>
    timeLogs
      .filter((log) => log.employee_id === employeeId)
      .reduce((acc, log) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === projectId
        );
        return acc + (projectEntry?.hours || 0);
      }, 0);

  // Convert client_billing to hourly rate
  const convertToHourly = (employee: AssignEmployee) => {
    const currency = client?.currency || "INR";
    let clientBilling = employee.client_billing || 0;

    if (currency === "USD") {
      clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    switch (employee.billing_type) {
      case "Monthly":
        clientBilling = (clientBilling * 12) / (365 * 8);
        break;
      case "Hourly":
        break;
      case "LPA":
        clientBilling = clientBilling / (365 * 8);
        break;
      default:
        break;
    }

    return clientBilling;
  };

  // Calculate revenue for an employee
  const calculateRevenue = (employee: AssignEmployee, projectId: string) => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId);
    const hourlyRate = convertToHourly(employee);
    return hours * hourlyRate;
  };

  // Calculate profit for an employee
  const calculateProfit = (employee: AssignEmployee, projectId: string) => {
    const revenue = calculateRevenue(employee, projectId);
    let salary = employee.salary || 0;
    const salaryType = employee.hr_employees?.salary_type || "LPA";
    const hours = calculateEmployeeHours(employee.assign_employee, projectId);

    if (salaryType === "LPA") {
      const hourlySalary = salary / (365 * 8);
      salary = hours * hourlySalary;
    } else if (salaryType === "Monthly") {
      const monthlyToHourly = (salary / 30) / 8;
      salary = hours * monthlyToHourly;
    } else if (salaryType === "Hourly") {
      salary = hours * salary;
    }

    return revenue - salary;
  };

  // Calculate project financials and employee counts
  const calculateProjectFinancials = (projectId: string) => {
    const projectEmployees = assignedEmployees.filter((emp) => emp.project_id === projectId);
    const totalRevenue = projectEmployees.reduce(
      (acc, emp) => acc + calculateRevenue(emp, projectId),
      0
    );
    const totalProfit = projectEmployees.reduce(
      (acc, emp) => acc + calculateProfit(emp, projectId),
      0
    );
    const numberOfEmployees = projectEmployees.length;
    const activeEmployees = projectEmployees.filter((emp) => emp.status === "Working").length;
    return { totalRevenue, totalProfit, numberOfEmployees, activeEmployees };
  };

  // Map projects with financials and employee counts
  const projectData = projects.map((project) => {
    const { totalRevenue, totalProfit, numberOfEmployees, activeEmployees } = calculateProjectFinancials(project.id);
    return {
      ...project,
      revenue: totalRevenue,
      profit: totalProfit,
      numberOfEmployees,
      activeEmployees,
    };
  });

  // Calculate total revenue and profit
  const totalRevenue = projectData.reduce((acc, project) => acc + project.revenue, 0) || 0;
  const totalProfit = projectData.reduce((acc, project) => acc + project.profit, 0) || 0;
  const workingCount = assignedEmployees.filter((emp) => emp.status === "Working").length || 0;

  // Calculate project counts
  const totalProjects = projects.length;
  const ongoingProjects = projects.filter((project) => project.status === "ongoing").length;
  const completedProjects = projects.filter((project) => project.status === "completed").length;

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("hr_projects")
        .delete()
        .eq("id", projectId)
        .eq("organization_id", organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-projects", id] });
      toast.success("Project deleted successfully");
      setDeleteProjectId(null);
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  // Filter projects based on search and status
  const filteredProjects = projectData.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "ongoing") return matchesSearch && project.status === "ongoing";
    if (activeTab === "completed") return matchesSearch && project.status === "completed";
    if (activeTab === "cancelled") return matchesSearch && project.status === "cancelled";
    return matchesSearch;
  });

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredProjects.map((project) => ({
      Name: project.name,
      "Start Date": new Date(project.start_date).toLocaleDateString(),
      "No. of Employees": project.numberOfEmployees,
      "Active Employees": project.activeEmployees,
      Revenue: formatINR(project.revenue),
      Profit: formatINR(project.profit),
      Status: project.status,
      Attachment: project.attachment || "None",
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
    XLSX.writeFile(workbook, "Projects_actual.csv");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Projects Report", 14, 10);
    (doc as any).autoTable({
      head: [["Project Name", "Start Date", "No. of Employees", "Active Employees", "Revenue", "Profit", "Status", "Attachment"]],
      body: filteredProjects.map((project) => [
        project.name,
        new Date(project.start_date).toLocaleDateString(),
        project.numberOfEmployees,
        project.activeEmployees,
        formatINR(project.revenue),
        formatINR(project.profit),
        project.status,
        project.attachment || "None",
      ]),
      startY: 20,
    });
    doc.save("Projects_actual.pdf");
  };

  // Update project status mutation
  const updateProjectStatus = useMutation({
    mutationFn: async ({ projectId, newStatus }: { projectId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("hr_projects")
        .update({ status: newStatus })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-projects", id] });
      toast.success("Project status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update project status.");
    },
  });

  const renderTable = (projects: Project[]) => {
    if (projects.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500">
          <p>No projects found.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. of Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td
                    className="px-6 py-4 whitespace-nowrap font-medium cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/project/${project.id}?client_id=${id}`)}
                  >
                    {project.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(project.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{project.numberOfEmployees}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{project.activeEmployees}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatINR(project.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatINR(project.profit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      defaultValue={project.status}
                      onValueChange={(newStatus) =>
                        updateProjectStatus.mutate({ projectId: project.id, newStatus })
                      }
                    >
                      <SelectTrigger
                        className={`h-8 px-2 py-0 rounded-full text-xs ${
                          project.status === "ongoing"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : project.status === "completed"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : project.status === "cancelled"
                            ? "bg-red-100 text-red-800 hover:bg-red-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing" className="text-yellow-700">
                          Ongoing
                        </SelectItem>
                        <SelectItem value="completed" className="text-green-700">
                          Completed
                        </SelectItem>
                        <SelectItem value="cancelled" className="text-red-700">
                          Cancelled
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setEditProject(project);
                        setAddProjectOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => setDeleteProjectId(project.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    {project.attachment && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => window.open(project.attachment, "_blank")}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Attachment
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show</span>
        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">per page</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
            .map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-sm text-gray-600">
        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of{" "}
        {filteredProjects.length} projects
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size={60} className="border-[6px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{client?.display_name} Dashboard</h1>
                <p className="text-gray-500 text-sm sm:text-base">Manage and track all projects for this client</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditProject(null);
                setAddProjectOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Create New Project
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Projects</p>
                <h3 className="text-2xl font-bold">{totalProjects}</h3>
                <p className="text-xs text-gray-500 mt-1">All projects</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Briefcase size={24} className="text-blue-800" />
              </div>
            </Card>
            <Card className="p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Ongoing Projects</p>
                <h3 className="text-2xl font-bold">{ongoingProjects}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalProjects ? Math.round((ongoingProjects / totalProjects) * 100) : 0}% of total
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Calendar size={24} className="text-green-800" />
              </div>
            </Card>
            <Card className="p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Completed Projects</p>
                <h3 className="text-2xl font-bold">{completedProjects}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0}% of total
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Calendar size={24} className="text-yellow-800" />
              </div>
            </Card>
            <Card className="p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Working Employees</p>
                <h3 className="text-2xl font-bold">{workingCount}</h3>
                <p className="text-xs text-gray-500 mt-1">Currently active</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Briefcase size={24} className="text-purple-800" />
              </div>
            </Card>
            <Card className="p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Revenue</p>
                <h3 className="text-2xl font-bold">{formatINR(totalRevenue)}</h3>
                <p className="text-xs text-gray-500 mt-1">From all projects</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign size={24} className="text-blue-800" />
              </div>
            </Card>
            <Card className="p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Profit</p>
                <h3 className="text-2xl font-bold">{formatINR(totalProfit)}</h3>
                <p className="text-xs text-gray-500 mt-1">From all projects</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp size={24} className="text-green-800" />
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Project Financials</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatINR(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Revenue vs Profit</h2>
              <RevenueProfitChart revenue={totalRevenue} profit={totalProfit} />
            </Card>
          </div>

          {/* Table Section */}
          <Card className="rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full sm:w-[400px]">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="ongoing" className="flex items-center gap-1">
                    <Briefcase size={14} />
                    Ongoing
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-1">
                    <Calendar size={14} />
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="flex items-center gap-1">
                    <Clock size={14} />
                    Cancelled
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative flex-grow">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  placeholder="Search for projects..."
                  className="pl-10 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="all" className="space-y-6">
                {renderTable(paginatedProjects)}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="ongoing" className="space-y-6">
                {renderTable(paginatedProjects.filter((project) => project.status === "ongoing"))}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="completed" className="space-y-6">
                {renderTable(paginatedProjects.filter((project) => project.status === "completed"))}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="cancelled" className="space-y-6">
                {renderTable(paginatedProjects.filter((project) => project.status === "cancelled"))}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
      {id && (
        <>
          <AddProjectDialog
            open={addProjectOpen}
            onOpenChange={(open) => {
              setAddProjectOpen(open);
              if (!open) setEditProject(null);
            }}
            clientId={id}
            editProject={editProject}
          />
          <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete the project and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteProjectId && deleteProject.mutate(deleteProjectId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default ClientDashboard;