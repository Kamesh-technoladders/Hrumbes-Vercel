
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Edit, Trash2, Loader2, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import AddClientDialog from "@/components/Client/AddClientDialog";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

// Status IDs for Offered and Joined candidates
const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";

// Static USD to INR conversion rates
const USD_TO_INR_RATE_CANDIDATES = 83.5;
const USD_TO_INR_RATE_EMPLOYEES = 84;

interface Client {
  id: string;
  display_name: string;
  client_name: string;
  service_type: string[];
  status: string;
  commission_value?: number;
  commission_type?: string;
  currency: string;
  internal_contact?: string;
  hr_employees?: {
    first_name?: string;
    last_name?: string;
  };
}

interface Candidate {
  id: string;
  name: string;
  job_id: string;
  ctc?: string;
  accrual_ctc?: string;
  expected_salary?: number;
  main_status_id?: string;
}

interface Employee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  salary: number;
  client_billing: number;
  billing_type: string;
  hr_employees?: {
    first_name?: string;
    last_name?: string;
  };
}

interface Job {
  id: string;
  title: string;
  client_owner: string;
  job_type_category: string;
  budget?: number;
  budget_type?: string;
}

interface Project {
  id: string;
  client_id: string;
}

interface Metrics {
  totalRevenue: number;
  totalProfit: number;
  totalCandidates: number;
  totalEmployees: number;
  permanentCandidates: number;
  contractualCandidates: number;
  bothCandidates: number;
  permanentEmployees: number;
  contractualEmployees: number;
  bothEmployees: number;
}

const ClientManagementDashboard = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalProfit: 0,
    totalCandidates: 0,
    totalEmployees: 0,
    permanentCandidates: 0,
    contractualCandidates: 0,
    bothCandidates: 0,
    permanentEmployees: 0,
    contractualEmployees: 0,
    bothEmployees: 0,
  });
  const [chartData, setChartData] = useState<any>({});
  const [clientChartData, setClientChartData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Assume isEmployee is derived from context or auth (placeholder)
  const isEmployee = false; // Adjust based on your auth logic

  // Currency options for parsing
  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  console.log("metrics", metrics)


  // Parse salary strings with currency and type conversion for candidates
  const parseSalary = (salary: string | undefined): number => {
    if (!salary) return 0;
    const currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
    const parts = salary.replace(currency.symbol, "").trim().split(" ");
    const amount = parseFloat(parts[0]) || 0;
    const budgetType = parts[1] || "LPA";

    let convertedAmount = amount;

    if (currency.value === "USD") {
      convertedAmount *= USD_TO_INR_RATE_CANDIDATES;
    }

    if (budgetType === "Monthly") {
      convertedAmount *= 12;
    } else if (budgetType === "Hourly") {
      convertedAmount *= 2016;
    }

    return convertedAmount;
  };

  // Convert employee billing to LPA
  const convertToLPA = (employee: Employee, clientCurrency: string): number => {
    let clientBilling = Number(employee.client_billing) || 0;

    if (clientCurrency === "USD") {
      clientBilling *= USD_TO_INR_RATE_EMPLOYEES;
    }

    switch (employee.billing_type) {
      case "Monthly":
        clientBilling *= 12;
        break;
      case "Hourly":
        clientBilling *= 8 * 22 * 12;
        break;
      case "LPA":
      default:
        break;
    }

    return clientBilling;
  };

  // Calculate candidate profit
  const calculateProfit = (
    candidate: Candidate,
    job: Job,
    client: Client
  ): number => {
    let salary = candidate.ctc || candidate.expected_salary || 0;
    let budget = candidate.accrual_ctc || 0;
    let commissionValue = client.commission_value || 0;

    let salaryAmount = 0;
    let salaryCurrency = "INR";
    let salaryType = "LPA";

    if (typeof salary === "string" && candidate.ctc) {
      const currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
      const parts = salary.replace(currency.symbol, "").trim().split(" ");
      salaryAmount = parseFloat(parts[0]) || 0;
      salaryCurrency = currency.value;
      salaryType = parts[1] || "LPA";
    } else if (typeof salary === "number" && candidate.expected_salary) {
      salaryAmount = salary;
      salaryCurrency = "INR";
      salaryType = "LPA";
    }

    let budgetAmount = 0;
    let budgetCurrency = "INR";
    let budgetType = "LPA";

    if (typeof budget === "string" && candidate.accrual_ctc) {
      const currency = currencies.find((c) => budget.startsWith(c.symbol)) || currencies[0];
      const parts = budget.replace(currency.symbol, "").trim().split(" ");
      budgetAmount = parseFloat(parts[0]) || 0;
      budgetCurrency = currency.value;
      budgetType = parts[1] || "LPA";
    }

    if (salaryCurrency === "USD") {
      salaryAmount *= USD_TO_INR_RATE_CANDIDATES;
    }
    if (salaryType === "Monthly") {
      salaryAmount *= 12;
    } else if (salaryType === "Hourly") {
      salaryAmount *= 2016;
    }

    if (budgetCurrency === "USD") {
      budgetAmount *= USD_TO_INR_RATE_CANDIDATES;
    }
    if (budgetType === "Monthly") {
      budgetAmount *= 12;
    } else if (budgetType === "Hourly") {
      budgetAmount *= 2016;
    }

    if (client.currency === "USD" && client.commission_type === "fixed") {
      commissionValue *= USD_TO_INR_RATE_CANDIDATES;
    }

    if (job.job_type_category === "Internal") {
      const profit = budgetAmount - salaryAmount;
      return profit;
    } else {
      if (client.commission_type === "percentage" && client.commission_value) {
        return (salaryAmount * client.commission_value) / 100;
      } else if (client.commission_type === "fixed" && commissionValue) {
        return commissionValue;
      }
    }

    return 0;
  };

  // Calculate employee profit
  const calculateEmployeeProfit = (employee: Employee, clientCurrency: string): number => {
    const clientBillingLPA = convertToLPA(employee, clientCurrency);
    const salary = Number(employee.salary) || 0;
    return clientBillingLPA - salary;
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, display_name, client_name, service_type, status, commission_value, commission_type, currency, internal_contact, hr_employees!hr_clients_created_by_fkey(first_name, last_name)");

      if (error) throw error;

      if (data) {
        setClients(data);
        setFilteredClients(data);
      }
    } catch (error) {
      toast({
        title: "Error fetching clients",
        description: "An error occurred while fetching client data.",
        variant: "destructive",
      });
      console.error("Error fetching clients:", error);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      const { data: clientsData, error: clientsError } = await supabase
        .from("hr_clients")
        .select("id, client_name, service_type, commission_value, commission_type, currency");

      if (clientsError) throw clientsError;

      if (!clientsData || clientsData.length === 0) {
        setLoading(false);
        return;
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from("hr_jobs")
        .select("id, title, client_owner, job_type_category, budget, budget_type");

      if (jobsError) throw jobsError;

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("hr_job_candidates")
        .select(`
          id, name, job_id, ctc, accrual_ctc, expected_salary, main_status_id
        `)
        .in("main_status_id", [OFFERED_STATUS_ID, JOINED_STATUS_ID]);

      if (candidatesError) throw candidatesError;

      const { data: projectsData, error: projectsError } = await supabase
        .from("hr_projects")
        .select("id, client_id");

      if (projectsError) throw projectsError;

      const { data: employeesData, error: employeesError } = await supabase
        .from("hr_project_employees")
        .select(`
          id,
          assign_employee,
          project_id,
          client_id,
          salary,
          client_billing,
          billing_type,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey(first_name, last_name)
        `);

      if (employeesError) throw employeesError;

      let totalRevenue = 0;
      let totalProfit = 0;
      let permanentCandidates = 0;
      let contractualCandidates = 0;
      let bothCandidates = 0;
      let permanentEmployees = 0;
      let contractualEmployees = 0;
      let bothEmployees = 0;

      const metricsByServiceType: {
        [key: string]: { revenue: number; profit: number };
      } = {
        permanent: { revenue: 0, profit: 0 },
        contractual: { revenue: 0, profit: 0 },
        both: { revenue: 0, profit: 0 },
      };

      const metricsByClient: {
        [clientName: string]: { revenue: number; profit: number };
      } = {};

      // Process candidates
      if (candidatesData && candidatesData.length > 0) {
        candidatesData.forEach((candidate) => {
          const job = jobsData?.find((j) => j.id === candidate.job_id);
          const client = clientsData?.find((c) => c.client_name === job?.client_owner);

          if (!job || !client) return;

          const revenue = candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0;
          const profit = calculateProfit(candidate, job, client);

          totalRevenue += revenue;
          totalProfit += profit;

          if (!metricsByClient[client.client_name]) {
            metricsByClient[client.client_name] = { revenue: 0, profit: 0 };
          }
          metricsByClient[client.client_name].revenue += revenue;
          metricsByClient[client.client_name].profit += profit;

          const isPermanent = client.service_type.includes("permanent") && !client.service_type.includes("contractual");
          const isContractual = client.service_type.includes("contractual") && !client.service_type.includes("permanent");
          const isBoth = client.service_type.includes("permanent") && client.service_type.includes("contractual");

          if (isPermanent) {
            permanentCandidates++;
            metricsByServiceType.permanent.revenue += revenue;
            metricsByServiceType.permanent.profit += profit;
          } else if (isContractual) {
            contractualCandidates++;
            metricsByServiceType.contractual.revenue += revenue;
            metricsByServiceType.contractual.profit += profit;
          } else if (isBoth) {
            bothCandidates++;
            metricsByServiceType.both.revenue += revenue;
            metricsByServiceType.both.profit += profit;
          }
        });
      }

      // Process employees
      if (employeesData && employeesData.length > 0) {
        employeesData.forEach((employee) => {
          const project = projectsData?.find((p) => p.id === employee.project_id);
          const client = clientsData?.find((c) => c.id === project?.client_id || c.id === employee.client_id);

          if (!client) return;

          const revenue = convertToLPA(employee, client.currency);
          const profit = calculateEmployeeProfit(employee, client.currency);

          totalRevenue += revenue;
          totalProfit += profit;

          if (!metricsByClient[client.client_name]) {
            metricsByClient[client.client_name] = { revenue: 0, profit: 0 };
          }
          metricsByClient[client.client_name].revenue += revenue;
          metricsByClient[client.client_name].profit += profit;

          const isPermanent = client.service_type.includes("permanent") && !client.service_type.includes("contractual");
          const isContractual = client.service_type.includes("contractual") && !client.service_type.includes("permanent");
          const isBoth = client.service_type.includes("permanent") && client.service_type.includes("contractual");

          if (isPermanent) {
            permanentEmployees++;
            metricsByServiceType.permanent.revenue += revenue;
            metricsByServiceType.permanent.profit += profit;
          } else if (isContractual) {
            contractualEmployees++;
            metricsByServiceType.contractual.revenue += revenue;
            metricsByServiceType.contractual.profit += profit;
          } else if (isBoth) {
            bothEmployees++;
            metricsByServiceType.both.revenue += revenue;
            metricsByServiceType.both.profit += profit;
          }
        });
      }

      setMetrics({
        totalRevenue,
        totalProfit,
        totalCandidates: candidatesData?.length || 0,
        totalEmployees: employeesData?.length || 0,
        permanentCandidates,
        contractualCandidates,
        bothCandidates,
        permanentEmployees,
        contractualEmployees,
        bothEmployees,
      });

      setChartData({
        labels: ["Permanent", "Contractual", "Both"],
        datasets: [
          {
            label: "Revenue (INR LPA)",
            data: [
              metricsByServiceType.permanent.revenue,
              metricsByServiceType.contractual.revenue,
              metricsByServiceType.both.revenue,
            ],
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
          {
            label: "Profit (INR LPA)",
            data: [
              metricsByServiceType.permanent.profit,
              metricsByServiceType.contractual.profit,
              metricsByServiceType.both.profit,
            ],
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      });

      setClientChartData({
        labels: Object.keys(metricsByClient),
        datasets: [
          {
            label: "Revenue (INR LPA)",
            data: Object.values(metricsByClient).map(m => m.revenue),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
          {
            label: "Profit (INR LPA)",
            data: Object.values(metricsByClient).map(m => m.profit),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      toast({
        title: "Error fetching metrics",
        description: "An error occurred while fetching data.",
        variant: "destructive",
      });
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);

    if (filter === "all") {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter((client) => {
      if (!client.service_type || !Array.isArray(client.service_type)) {
        return false;
      }

      if (filter === "both") {
        return (
          client.service_type.includes("permanent") &&
          client.service_type.includes("contractual")
        );
      }

      if (filter === "permanent") {
        return (
          client.service_type.includes("permanent") &&
          !client.service_type.includes("contractual")
        );
      }

      if (filter === "contractual") {
        return (
          client.service_type.includes("contractual") &&
          !client.service_type.includes("permanent")
        );
      }

      return false;
    });

    setFilteredClients(filtered);
  };

  const handleClientClick = (clientName: string) => {
    navigate(`/client-dashboard/${encodeURIComponent(clientName)}/candidates`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Handlers for actions
  const handleStatusChange = async (clientId: string, status: string) => {
    setStatusUpdateLoading(clientId);
    try {
      const { error } = await supabase
        .from("hr_clients")
        .update({ status })
        .eq("id", clientId);

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Status Updated",
        description: "Client status updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client status.",
        variant: "destructive",
      });
      console.error("Error updating status:", error);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditClient(client);
    setAddClientOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("hr_clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Client Deleted",
        description: "Client deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client.",
        variant: "destructive",
      });
      console.error("Error deleting client:", error);
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col items-center gap-4 mt-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[60px] sm:w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs sm:text-sm text-gray-600">per page</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-xs sm:text-sm text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, filteredClients.length)} of{" "}
          {filteredClients.length} clients
        </span>
      </div>
    );
  };

  useEffect(() => {
    Promise.all([fetchClients(), fetchMetrics()]).then(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-full mx-auto py-2 sm:py-4 px-2 sm:px-4 lg:px-8">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">Client Dashboard</CardTitle>
            <Button 
              onClick={() => setAddClientOpen(true)}
              className="flex items-center gap-2 text-xs sm:text-sm"
              size="sm"
            >
              <Plus size={14} />
              <span>Create New Client</span>
            </Button>
          </div>
          <CardDescription className="text-xs sm:text-sm mt-2">
            View and manage your clients. Click on a client to see associated candidates and employees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="py-2 sm:py-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 sm:py-3">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">
                      {formatCurrency(metrics.totalRevenue)}
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {/* <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                            $ {(metrics.totalRevenue / USD_TO_INR_RATE_EMPLOYEES).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                          </p> */}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Converted at 1 USD = ₹ {USD_TO_INR_RATE_EMPLOYEES}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="py-2 sm:py-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      Total Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 sm:py-3">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">
                      {formatCurrency(metrics.totalProfit)}
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {/* <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                            $ {(metrics.totalProfit / USD_TO_INR_RATE_EMPLOYEES).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                          </p> */}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Converted at 1 USD = ₹ {USD_TO_INR_RATE_EMPLOYEES}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="py-2 sm:py-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      Total Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 sm:py-3">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800">
                      {metrics.totalCandidates + metrics.totalEmployees}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-1 sm:mt-2">
                     Permanent Candidates: {metrics.bothCandidates} <br />
                     Contractual Employees:  {metrics.bothEmployees}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card className="mb-4 sm:mb-6">
                <CardHeader className="py-2 sm:py-3">
                  <CardTitle className="text-sm sm:text-base lg:text-lg">Revenue and Profit by Client</CardTitle>
                </CardHeader>
                <CardContent className="py-2 sm:py-3">
                  <div className="h-[200px] sm:h-[300px] lg:h-[400px]">
                    <Bar
                      data={clientChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: "top" },
                          title: {
                            display: true,
                            text: "Revenue and Profit (INR LPA)",
                            font: { size: 12 },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "Amount (INR LPA)",
                              font: { size: 10 },
                            },
                            ticks: { font: { size: 8 } },
                          },
                          x: {
                            title: {
                              display: true,
                              text: "Client",
                              font: { size: 10 },
                            },
                            ticks: {
                              autoSkip: false,
                              maxRotation: 0,
                              minRotation: 0,
                              font: { size: 8 },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Tabs defaultValue="all" value={activeFilter} onValueChange={filterClients} className="mb-4">
                <TabsList className="flex flex-col sm:flex-row justify-start w-full">
                  <TabsTrigger value="all" className="flex-1 sm:flex-none text-xs sm:text-sm">All</TabsTrigger>
                  <TabsTrigger value="permanent" className="flex-1 sm:flex-none text-xs sm:text-sm">Permanent</TabsTrigger>
                  <TabsTrigger value="contractual" className="flex-1 sm:flex-none text-xs sm:text-sm">Contractual</TabsTrigger>
                  <TabsTrigger value="both" className="flex-1 sm:flex-none text-xs sm:text-sm">Both</TabsTrigger>
                </TabsList>
                <TabsContent value={activeFilter}>
                  {/* Mobile Card View */}
                  <div className="sm:hidden flex flex-col gap-3">
                    {paginatedClients.length > 0 ? (
                      paginatedClients.map((client) => (
                        <Card key={client.id} className="p-3">
                          <div className="flex flex-col gap-2">
                            <div>
                              <span
                                className="font-medium text-black text-sm hover:underline cursor-pointer"
                                onClick={() => handleClientClick(client.client_name)}
                              >
                                {client.client_name}
                              </span>
                              <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]">
                                {client.display_name || 'N/A'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">Status:</span>
                              {isEmployee ? (
                                <Badge variant="outline" className={getStatusBadgeColor(client.status)}>
                                  {client.status || 'Unknown'}
                                </Badge>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="transparent" className="h-7 px-2 py-0">
                                      {statusUpdateLoading === client.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className={getStatusBadgeColor(client.status)}
                                        >
                                          {client.status || 'Unknown'}
                                        </Badge>
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem
                                      className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                      onClick={() => handleStatusChange(client.id, 'Active')}
                                    >
                                      Active
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => handleStatusChange(client.id, 'Inactive')}
                                    >
                                      Inactive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
                                      onClick={() => handleStatusChange(client.id, 'Pending')}
                                    >
                                      Pending
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleClientClick(client.client_name);
                                      }}
                                      aria-label="View Client"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Client</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {!isEmployee && (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClient(client);
                                          }}
                                          aria-label="Edit Client"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit Client</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClient(client);
                                          }}
                                          aria-label="Delete Client"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete Client</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-4 text-center">
                        <p className="text-sm text-gray-500">No clients found matching the selected filter.</p>
                      </Card>
                    )}
                  </div>
                  {/* Desktop Table View */}
                  <div className="hidden sm:block rounded-md border overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              Client Name
                              <button aria-label="Sort by Client Name">
                                <ArrowUpDown size={12} />
                              </button>
                            </div>
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              Internal Contact
                              <button aria-label="Sort by Internal Contact">
                                <ArrowUpDown size={12} />
                              </button>
                            </div>
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                          <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                          <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                          <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedClients.length > 0 ? (
                          paginatedClients.map((client) => (
                            <tr
                              key={client.id}
                              className="hover:bg-gray-50 transition"
                            >
                              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                <div className="flex flex-col">
                                  <span
                                    className="font-medium text-black-600 hover:underline cursor-pointer"
                                    onClick={() => handleClientClick(client.client_name)}
                                  >
                                    {client.client_name}
                                  </span>
                                  {/* <Badge variant="outline" className="mt-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[8px] sm:text-[10px]">
                                    {client.display_name || 'N/A'}
                                  </Badge> */}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                {client.internal_contact || '-'}
                              </td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                <div className="flex flex-wrap gap-1">
                                  {client.service_type?.length ? (
                                    client.service_type.map((type, index) => (
                                      <Badge key={index} variant="outline" className="capitalize text-[8px] sm:text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
                                        {type}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                {client.currency || '-'}
                              </td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                {isEmployee ? (
                                  <Badge variant="outline" className={getStatusBadgeColor(client.status)}>
                                    {client.status || 'Unknown'}
                                  </Badge>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="transparent" className="h-7 sm:h-8 px-2 py-0">
                                        {statusUpdateLoading === client.id ? (
                                          <Loader2 className="h-3 sm:h-4 w-3 sm:w-4 animate-spin mr-1" />
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className={getStatusBadgeColor(client.status)}
                                          >
                                            {client.status || 'Unknown'}
                                          </Badge>
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center">
                                      <DropdownMenuItem
                                        className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                        onClick={() => handleStatusChange(client.id, 'Active')}
                                      >
                                        Active
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                        onClick={() => handleStatusChange(client.id, 'Inactive')}
                                      >
                                        Inactive
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
                                        onClick={() => handleStatusChange(client.id, 'Pending')}
                                      >
                                        Pending
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                {client.hr_employees?.first_name && client.hr_employees?.last_name
                                  ? `${client.hr_employees.first_name} ${client.hr_employees.last_name}`
                                  : '-'}
                              </td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                <div className="flex space-x-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 sm:h-8 w-7 sm:w-8"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClientClick(client.client_name);
                                          }}
                                          aria-label="View Client"
                                        >
                                          <Eye className="h-3 sm:h-4 w-3 sm:w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Client</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  {!isEmployee && (
                                    <>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 sm:h-8 w-7 sm:w-8"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditClient(client);
                                              }}
                                              aria-label="Edit Client"
                                            >
                                              <Edit className="h-3 sm:h-4 w-3 sm:w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Edit Client</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 sm:h-8 w-7 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClient(client);
                                              }}
                                              aria-label="Delete Client"
                                            >
                                              <Trash2 className="h-3 sm:h-4 w-3 sm:w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Delete Client</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 sm:px-6 py-6 sm:py-8 text-center text-[10px] sm:text-sm text-gray-500">
                              No clients found matching the selected filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredClients.length > 0 && renderPagination()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Client Dialog */}
      <AddClientDialog
        open={addClientOpen}
        onOpenChange={(open) => {
          setAddClientOpen(open);
          if (!open) setEditClient(null);
        }}
        clientToEdit={editClient}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the client "{clientToDelete?.client_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteClient}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientManagementDashboard;
