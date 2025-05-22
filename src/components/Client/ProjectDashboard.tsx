import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { useSelector } from "react-redux";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowLeft, Download, Plus, Search, Briefcase, Calendar, Clock, ChevronLeft, ChevronRight, Pencil, Trash2, DollarSign, TrendingUp, FileText } from "lucide-react";
import { Card } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Input } from "../ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import AssignEmployeeDialog from "./AssignEmployeeDialog";
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
} from "../ui/alert-dialog";

interface AssignEmployee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  salary: number;
  client_billing: number;
  status: string;
  sow: string | null;
  duration: number;
  billing_type?: string;
  hr_employees?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Client {
  id: string;
  currency: string;
}

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  duration: number;
  revenue: number;
  profit: number;
  status: string;
  employees_needed: number;
  employees_assigned: number;
}

const EXCHANGE_RATE_USD_TO_INR = 84;

const ProjectDashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const queryClient = useQueryClient();
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<AssignEmployee | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  if (!user || !organization_id) {
    return (
      <div className="text-center text-red-600 font-semibold mt-10">
        Authentication error: Missing user or organization ID
      </div>
    );
  }

  // Fetch project details
  const { data: project, isLoading: loadingProject, error: projectError } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      const { data, error } = await supabase
        .from("hr_projects")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization_id)
        .single();
      if (error) throw error;
      return {
        ...data,
        duration: data.duration ?? 0,
        start_date: data.start_date ?? "",
        end_date: data.end_date ?? "",
        status: data.status ?? "unknown",
        revenue: 0,
        profit: 0,
      } as Project;
    },
    enabled: !!id,
  });

  console.log("Project:", project);

  // Fetch assigned employees for the project
  const { data: assignEmployee = [], isLoading: loadingEmployees, error: employeesError } = useQuery<
    AssignEmployee[]
  >({
    queryKey: ["project-employee", id],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select(`
          id,
          assign_employee,
          project_id,
          client_id,
          start_date,
          end_date,
          salary,
          client_billing,
          status,
          sow,
          billing_type,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey (first_name, last_name)
        `)
        .eq("project_id", id)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data.map((employee) => ({
        ...employee,
        duration: employee.start_date && employee.end_date
          ? Math.ceil(
              (new Date(employee.end_date).getTime() - new Date(employee.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
        hr_employees: employee.hr_employees ?? null,
        sow: employee.sow ?? null,
      })) as AssignEmployee[];
    },
    enabled: !!id,
  });

  // Fetch clients to get currency information
  const { data: clients = [], isLoading: loadingClients, error: clientsError } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, currency")
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data as Client[];
    },
  });

  useEffect(() => {
    if (projectError || employeesError || clientsError) {
      toast.error("Failed to fetch data");
      console.error("Errors:", { projectError, employeesError, clientsError });
    }
    setLoading(loadingProject || loadingEmployees || loadingClients);
  }, [projectError, employeesError, clientsError, loadingProject, loadingEmployees, loadingClients]);

  // Convert client_billing to LPA
  const convertToLPA = (employee: AssignEmployee) => {
    const client = clients.find((c) => c.id === employee.client_id);
    const currency = client?.currency || "INR";
    let clientBilling = employee.client_billing || 0;

    // Convert USD to INR if necessary
    if (currency === "USD") {
      clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    // Convert client_billing to LPA based on billing_type
    switch (employee.billing_type) {
      case "Monthly":
        clientBilling *= 12; // Convert Monthly to LPA
        break;
      case "Hourly":
        clientBilling *= 8 * 22 * 12; // Convert Hourly to LPA (8 hours/day, 22 days/month, 12 months)
        break;
      case "LPA":
      default:
        // No conversion needed for LPA
        break;
    }

    return clientBilling;
  };

  // Calculate profit
  const calculateProfit = (employee: AssignEmployee) => {
    const clientBillingLPA = convertToLPA(employee);
    const salary = employee.salary || 0; // Salary is always in LPA
    return clientBillingLPA - salary;
  };

  // Calculate total revenue (sum of client_billing in LPA)
  const totalRevenue = assignEmployee.reduce((acc, emp) => acc + convertToLPA(emp), 0) || 0;

  // Calculate total profit
  const totalProfit = assignEmployee.reduce((acc, emp) => acc + calculateProfit(emp), 0) || 0;

  // Calculate employee counts from assignEmployee array
  const totalEmployees = assignEmployee.length;
  const workingCount = assignEmployee.filter((emp) => emp.status === "Working").length || 0;
  const relievedCount = assignEmployee.filter((emp) => emp.status === "Relieved").length || 0;
  const terminatedCount = assignEmployee.filter((emp) => emp.status === "Terminated").length || 0;

  // Delete employee mutation
  const deleteEmployee = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from("hr_project_employees")
        .delete()
        .eq("id", employeeId)
        .eq("organization_id", organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee", id] });
      toast.success("Employee removed successfully");
      setDeleteEmployeeId(null);
    },
    onError: () => {
      toast.error("Failed to remove employee");
    },
  });

  // Filter employees based on search and status
  const filteredEmployees = assignEmployee.filter((employee) => {
    const employeeName = employee.hr_employees
      ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
      : "";
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "working") return matchesSearch && employee.status === "Working";
    if (activeTab === "relieved") return matchesSearch && employee.status === "Relieved";
    if (activeTab === "terminated") return matchesSearch && employee.status === "Terminated";
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredEmployees.map((employee) => ({
      "Employee Name": employee.hr_employees
        ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
        : "N/A",
      Duration: `${employee.duration} days`,
      "Start Date": new Date(employee.start_date).toLocaleDateString(),
      "End Date": new Date(employee.end_date).toLocaleDateString(),
      Salary: `₹ ${employee.salary.toLocaleString()}`,
      "Client Billing (LPA)": `₹ ${convertToLPA(employee).toLocaleString()}`,
      Profit: `₹ ${calculateProfit(employee).toLocaleString()}`,
      Status: employee.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "Project_Employees.csv");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Project Employees Report", 14, 10);
    (doc as any).autoTable({
      head: [
        [
          "Employee Name",
          "Duration",
          "Start Date",
          "End Date",
          "Salary",
          "Client Billing (LPA)",
          "Profit",
          "Status",
        ],
      ],
      body: filteredEmployees.map((employee) => [
        employee.hr_employees
          ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
          : "N/A",
        `${employee.duration} days`,
        new Date(employee.start_date).toLocaleDateString(),
        new Date(employee.end_date).toLocaleDateString(),
        `₹ ${employee.salary.toLocaleString()}`,
        `₹ ${convertToLPA(employee).toLocaleString()}`,
        `₹ ${calculateProfit(employee).toLocaleString()}`,
        employee.status,
      ]),
      startY: 20,
    });
    doc.save("Project_Employees.pdf");
  };

  // Mutation for updating employee status
  const updateEmployeeStatus = useMutation({
    mutationFn: async ({ employeeId, newStatus }: { employeeId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("hr_project_employees")
        .update({ status: newStatus })
        .eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee", id] });
      toast.success("Employee status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update employee status.");
    },
  });

  const renderTable = (employees: AssignEmployee[]) => {
    if (employees.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500">
          <p>No employees found.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Employee Name
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Duration
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Start Date
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  End Date
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Salary
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Client Billing (LPA)
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Profit
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 font-medium">
                    {employee.hr_employees
                      ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-2">{employee.duration} days</td>
                  <td className="px-4 py-2">{new Date(employee.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{new Date(employee.end_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">₹ {employee.salary.toLocaleString()}</td>
                  <td className="px-4 py-2">₹ {convertToLPA(employee).toLocaleString()}</td>
                  <td className="px-4 py-2">₹ {calculateProfit(employee).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Select
                      defaultValue={employee.status}
                      onValueChange={(newStatus) =>
                        updateEmployeeStatus.mutate({ employeeId: employee.id, newStatus })
                      }
                    >
                      <SelectTrigger
                        className={`h-8 px-2 py-0 rounded-full text-[10px] ${
                          employee.status === "Working"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : employee.status === "Relieved"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : employee.status === "Terminated"
                            ? "bg-red-100 text-red-800 hover:bg-red-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Working" className="text-green-700">
                          Working
                        </SelectItem>
                        <SelectItem value="Relieved" className="text-yellow-700">
                          Relieved
                        </SelectItem>
                        <SelectItem value="Terminated" className="text-red-700">
                          Terminated
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setEditEmployee(employee);
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
                      onClick={() => setDeleteEmployeeId(employee.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    {employee.sow && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => window.open(employee.sow, "_blank")}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        SOW
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

  const renderPagination = () => {
    return (
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
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{" "}
          {filteredEmployees.length} employees
        </span>
      </div>
    );
  };

  if (loading) {
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
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{project?.name} Dashboard</h1>
                <p className="text-gray-500 text-sm sm:text-base">Manage and track all employees for this project</p>
              </div>
            </div>
            <Button
              onClick={() => setAddProjectOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Assign New Employee</span>
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Employees</p>
                <h3 className="text-2xl font-bold">{totalEmployees}</h3>
                <p className="text-xs text-gray-500 mt-1">All assigned employees</p>
              </div>
              <div className="stat-icon bg-blue-100 p-3 rounded-full">
                <Briefcase size={24} className="text-blue-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Working Employees</p>
                <h3 className="text-2xl font-bold">{workingCount}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalEmployees ? Math.round((workingCount / totalEmployees) * 100) : 0}% of total
                </p>
              </div>
              <div className="stat-icon bg-green-100 p-3 rounded-full">
                <Calendar size={24} className="text-green-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Relieved Employees</p>
                <h3 className="text-2xl font-bold">{relievedCount}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalEmployees ? Math.round((relievedCount / totalEmployees) * 100) : 0}% of total
                </p>
              </div>
              <div className="stat-icon bg-yellow-100 p-3 rounded-full">
                <Clock size={24} className="text-yellow-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Terminated Employees</p>
                <h3 className="text-2xl font-bold">{terminatedCount}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalEmployees ? Math.round((terminatedCount / totalEmployees) * 100) : 0}% of total
                </p>
              </div>
              <div className="stat-icon bg-red-100 p-3 rounded-full">
                <Briefcase size={24} className="text-red-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Revenue (LPA)</p>
                <h3 className="text-2xl font-bold">₹ {totalRevenue.toLocaleString()}</h3>
                <p className="text-xs text-gray-500 mt-1">From all employees</p>
              </div>
              <div className="stat-icon bg-blue-100 p-3 rounded-full">
                <DollarSign size={24} className="text-blue-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Profit (LPA)</p>
                <h3 className="text-2xl font-bold">₹ {totalProfit.toLocaleString()}</h3>
                <p className="text-xs text-gray-500 mt-1">From all employees</p>
              </div>
              <div className="stat-icon bg-green-100 p-3 rounded-full">
                <TrendingUp size={24} className="text-green-800" />
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Employee Financials (LPA)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={assignEmployee.map((employee) => ({
                    name: employee.hr_employees
                      ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
                      : "N/A",
                    revenue: convertToLPA(employee),
                    salary: employee.salary || 0,
                    profit: calculateProfit(employee),
                  }))}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Client Billing (LPA)" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="salary" fill="#10b981" name="Salary (LPA)" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="profit" fill="#f59e0b" name="Profit (LPA)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
              <h2 className="text-lgountry sm:text-xl font-semibold mb-4">Revenue vs Profit (LPA)</h2>
              <RevenueProfitChart revenue={totalRevenue} profit={totalProfit} />
            </Card>
          </div>

          {/* Table Section */}
          <Card className="rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full sm:w-[400px]">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="working" className="flex items-center gap-1">
                    <Briefcase size={14} />
                    <span>Working</span>
                  </TabsTrigger>
                  <TabsTrigger value="relieved" className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>Relieved</span>
                  </TabsTrigger>
                  <TabsTrigger value="terminated" className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>Terminated</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative flex-grow">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  placeholder="Search for employees..."
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
                {renderTable(paginatedEmployees)}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="working" className="space-y-6">
                {renderTable(paginatedEmployees.filter((employee) => employee.status === "Working"))}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="relieved" className="space-y-6">
                {renderTable(paginatedEmployees.filter((employee) => employee.status === "Relieved"))}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="terminated" className="space-y-6">
                {renderTable(paginatedEmployees.filter((employee) => employee.status === "Terminated"))}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
      {clientId && id && (
        <>
          <AssignEmployeeDialog
            open={addProjectOpen}
            onOpenChange={(open) => {
              setAddProjectOpen(open);
              if (!open) setEditEmployee(null);
            }}
            projectId={id}
            clientId={clientId}
            editEmployee={editEmployee}
          />
          <AlertDialog open={!!deleteEmployeeId} onOpenChange={() => setDeleteEmployeeId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently remove the employee from this project. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteEmployeeId && deleteEmployee.mutate(deleteEmployeeId)}
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

export default ProjectDashboard;