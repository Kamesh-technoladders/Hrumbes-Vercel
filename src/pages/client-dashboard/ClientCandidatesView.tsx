import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Search, TrendingUp, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HiddenContactCell from "@/components/ui/HiddenContactCell";
import { format } from "date-fns";
import moment from "moment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/jobs/ui/dropdown-menu";

// Status IDs for Offered and Joined candidates
const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";

// Static USD to INR conversion rates
const USD_TO_INR_RATE_CANDIDATES = 83.5;
const USD_TO_INR_RATE_EMPLOYEES = 84;

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string[];
  status: string;
  job_id: string;
  job_title?: string;
  main_status_id?: string;
  sub_status_id?: string;
  ctc?: string;
  accrual_ctc?: string;
  expected_salary?: number;
  profit?: number;
  job_type_category?: string;
  joining_date?: string;
  hr_jobs?: {
    client_details?: {
      pointOfContact?: string;
    };
  };
}

interface Employee {
  id: string;
  employee_name: string;
  project_id: string;
  project_name?: string;
  salary: number;
  client_billing: number;
  billing_type: string;
  currency: string;
  revenue_inr: number;
  revenue_usd: number;
  profit_inr: number;
  profit_usd: number;
}

interface Job {
  id: string;
  title: string;
  client_owner: string;
  job_type_category: string;
  budget?: number;
  budget_type?: string;
}

interface Client {
  id: string;
  client_name: string;
  commission_value?: number;
  commission_type?: string;
  currency: string;
  service_type: string[];
}

interface ClientMetrics {
  candidateRevenue: number;
  candidateProfit: number;
  candidateCount: number;
  employeeRevenueINR: number;
  employeeProfitINR: number;
  employeeCount: number;
}

const ClientCandidatesView = () => {
  const { clientName } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics>({
    candidateRevenue: 0,
    candidateProfit: 0,
    candidateCount: 0,
    employeeRevenueINR: 0,
    employeeProfitINR: 0,
    employeeCount: 0,
  });
  const [serviceType, setServiceType] = useState<string[]>([]);
  const [clientCurrency, setClientCurrency] = useState<string>("INR");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPageCandidates, setCurrentPageCandidates] = useState(1);
  const [currentPageEmployees, setCurrentPageEmployees] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const isEmployee = false;

  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

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

  const calculateCandidateProfit = (
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

  const convertToLPA = (employee: any, clientCurrency: string) => {
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

  const calculateEmployeeProfit = (employee: any, clientCurrency: string) => {
    const clientBillingLPA = convertToLPA(employee, clientCurrency);
    const salary = Number(employee.salary) || 0;
    return clientBillingLPA - salary;
  };

  const fetchCandidatesAndEmployees = async (client: string) => {
    try {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from("hr_clients")
        .select("id, client_name, commission_value, commission_type, currency, service_type")
        .eq("client_name", client)
        .single();

      if (clientError) throw clientError;

      setServiceType(clientData.service_type || []);
      setClientCurrency(clientData.currency || "INR");

      const { data: jobsData, error: jobsError } = await supabase
        .from("hr_jobs")
        .select("id, title, client_owner, job_type_category, budget, budget_type")
        .eq("client_owner", client);

      if (jobsError) throw jobsError;

      let candidateRevenue = 0;
      let candidateProfit = 0;
      let candidateCount = 0;
      let employeeRevenueINR = 0;
      let employeeProfitINR = 0;
      let employeeCount = 0;

      if (jobsData && jobsData.length > 0) {
        const jobIds = jobsData.map(job => job.id);

        const { data: candidatesData, error: candidatesError } = await supabase
          .from("hr_job_candidates")
          .select(`
            id, name, email, phone, experience, skills, status, job_id,
            main_status_id, sub_status_id, ctc, accrual_ctc, expected_salary, joining_date, applied_from,
            hr_jobs!hr_job_candidates_job_id_fkey(id, title, job_type_category, client_details)
          `)
          .in("job_id", jobIds)
          .in("main_status_id", [OFFERED_STATUS_ID, JOINED_STATUS_ID]);

        if (candidatesError) throw candidatesError;

        if (candidatesData && candidatesData.length > 0) {
          const enhancedCandidates = candidatesData.map(candidate => {
            const job = jobsData.find(job => job.id === candidate.job_id);
            const candRevenue = candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0;
            const candProfit = job ? calculateCandidateProfit(candidate, job, clientData) : 0;

            candidateRevenue += candRevenue;
            candidateProfit += candProfit;

            return {
              ...candidate,
              job_title: job ? job.title : "Unknown",
              job_type_category: job ? job.job_type_category : "Unknown",
              profit: candProfit,
            };
          });

          candidateCount = candidatesData.length;
          setCandidates(enhancedCandidates);
          setFilteredCandidates(enhancedCandidates);
        } else {
          setCandidates([]);
          setFilteredCandidates([]);
        }
      } else {
        setCandidates([]);
        setFilteredCandidates([]);
      }

      if (clientData.service_type.includes("contractual")) {
        const { data: projectsData, error: projectsError } = await supabase
          .from("hr_projects")
          .select("id, client_id, name")
          .eq("client_id", clientData.id);

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
          `)
          .eq("client_id", clientData.id);

        if (employeesError) throw employeesError;

        if (employeesData && employeesData.length > 0) {
          const enhancedEmployees = employeesData.map(employee => {
            const project = projectsData?.find(p => p.id === employee.project_id);
            const revenueINR = convertToLPA(employee, clientData.currency);
            const profitINR = calculateEmployeeProfit(employee, clientData.currency);
            const employeeName = employee.hr_employees
              ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
              : "Unknown";

            employeeRevenueINR += revenueINR;
            employeeProfitINR += profitINR;

            return {
              id: employee.id,
              employee_name: employeeName,
              project_id: employee.project_id,
              project_name: project ? project.name : "Unknown",
              salary: Number(employee.salary) || 0,
              client_billing: Number(employee.client_billing) || 0,
              billing_type: employee.billing_type || "LPA",
              currency: clientData.currency,
              revenue_inr: revenueINR,
              revenue_usd: revenueINR / USD_TO_INR_RATE_EMPLOYEES,
              profit_inr: profitINR,
              profit_usd: profitINR / USD_TO_INR_RATE_EMPLOYEES,
            };
          });

          employeeCount = employeesData.length;
          setEmployees(enhancedEmployees);
          setFilteredEmployees(enhancedEmployees);
        } else {
          setEmployees([]);
          setFilteredEmployees([]);
        }
      } else {
        setEmployees([]);
        setFilteredEmployees([]);
      }

      setMetrics({
        candidateRevenue,
        candidateProfit,
        candidateCount,
        employeeRevenueINR,
        employeeProfitINR,
        employeeCount,
      });
    } catch (error) {
      toast({
        title: "Error fetching data",
        description: "An error occurred while fetching candidate or employee data.",
        variant: "destructive",
      });
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPageCandidates(1);
    setCurrentPageEmployees(1);

    if (!value.trim()) {
      setFilteredCandidates(candidates);
      setFilteredEmployees(employees);
      return;
    }

    const searchTermLower = value.toLowerCase();
    const filteredCandidates = candidates.filter(
      candidate =>
        candidate.name.toLowerCase().includes(searchTermLower) ||
        candidate.email.toLowerCase().includes(searchTermLower) ||
        candidate.phone?.toLowerCase().includes(searchTermLower) ||
        candidate.skills?.some(skill => skill.toLowerCase().includes(searchTermLower)) ||
        candidate.job_title?.toLowerCase().includes(searchTermLower)
    );

    const filteredEmployees = employees.filter(
      employee =>
        employee.employee_name.toLowerCase().includes(searchTermLower) ||
        employee.project_name?.toLowerCase().includes(searchTermLower)
    );

    setFilteredCandidates(filteredCandidates);
    setFilteredEmployees(filteredEmployees);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return moment(date).format("DD MMM YYYY");
    } catch {
      return "-";
    }
  };

  const goBack = () => {
    navigate("/clients");
  };

  const getStatusBadgeColor = (statusId: string | undefined) => {
    switch (statusId) {
      case OFFERED_STATUS_ID:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case JOINED_STATUS_ID:
        return "bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getStatusText = (statusId: string | undefined) => {
    switch (statusId) {
      case OFFERED_STATUS_ID:
        return "Offered";
      case JOINED_STATUS_ID:
        return "Joined";
      default:
        return "Unknown";
    }
  };

  const handleStatusChange = async (candidateId: string, statusId: string) => {
    setStatusUpdateLoading(candidateId);
    try {
      const { error } = await supabase
        .from("hr_job_candidates")
        .update({ main_status_id: statusId })
        .eq("id", candidateId);

      if (error) throw error;

      await fetchCandidatesAndEmployees(decodeURIComponent(clientName || ""));
      toast({
        title: "Status Updated",
        description: "Candidate status updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update candidate status.",
        variant: "destructive",
      });
      console.error("Error updating status:", error);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const handleEditCandidate = (candidate: Candidate) => {
    toast({
      title: "Edit Candidate",
      description: "Edit candidate functionality is not yet implemented.",
    });
  };

  const handleDeleteCandidate = async (candidate: Candidate) => {
    try {
      const { error } = await supabase
        .from("hr_job_candidates")
        .delete()
        .eq("id", candidate.id);

      if (error) throw error;

      await fetchCandidatesAndEmployees(decodeURIComponent(clientName || ""));
      toast({
        title: "Candidate Deleted",
        description: "Candidate deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete candidate.",
        variant: "destructive",
      });
      console.error("Error deleting candidate:", error);
    }
  };

  const totalCandidatePages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const candidateStartIndex = (currentPageCandidates - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(
    candidateStartIndex,
    candidateStartIndex + itemsPerPage
  );

  const totalEmployeePages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const employeeStartIndex = (currentPageEmployees - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(
    employeeStartIndex,
    employeeStartIndex + itemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPageCandidates(1);
    setCurrentPageEmployees(1);
  };

  const renderPagination = (totalPages: number, isCandidates: boolean) => {
    const currentPage = isCandidates ? currentPageCandidates : currentPageEmployees;
    const setCurrentPage = isCandidates ? setCurrentPageCandidates : setCurrentPageEmployees;
    const startIndex = isCandidates ? candidateStartIndex : employeeStartIndex;
    const itemCount = isCandidates ? filteredCandidates.length : filteredEmployees.length;

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[60px] sm:w-[70px] text-xs sm:text-sm">
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

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 sm:p-2"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 2),
                Math.min(totalPages, currentPage + 1)
              )
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="px-2 py-1 text-xs sm:text-sm"
                >
                  {page}
                </Button>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 sm:p-2"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <span className="text-xs sm:text-sm text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, itemCount)} of {itemCount}
        </span>
      </div>
    );
  };

  const renderCandidateCard = (candidate: Candidate) => (
    <Card key={candidate.id} className="mb-4 p-4">
      <div className="space-y-2">
        <div>
          <strong className="text-sm">Name:</strong>
          <p className="text-sm">{candidate.name}</p>
        </div>
        <div>
          <strong className="text-sm">Contact:</strong>
          <HiddenContactCell
            email={candidate.email}
            phone={candidate.phone}
            candidateId={candidate.id}
            className="text-sm"
          />
        </div>
        <div>
          <strong className="text-sm">Position:</strong>
          <Link to={`/jobs/${candidate.job_id}`} className="text-sm text-blue-600 hover:underline">
            {candidate.job_title}
          </Link>
        </div>
        <div>
          <strong className="text-sm">Experience:</strong>
          <p className="text-sm">{candidate.experience || "-"}</p>
        </div>
        <div>
          <strong className="text-sm">Date of Join:</strong>
          <p className="text-sm">{formatDate(candidate.joining_date)}</p>
        </div>
        <div>
          <strong className="text-sm">Status:</strong>
          <Badge className={`${getStatusBadgeColor(candidate.main_status_id)} text-xs mt-1`}>
            {getStatusText(candidate.main_status_id)}
          </Badge>
        </div>
        <div>
          <strong className="text-sm">Salary (LPA):</strong>
          <p className="text-sm">
            {candidate.ctc
              ? formatCurrency(parseSalary(candidate.ctc))
              : candidate.expected_salary
              ? formatCurrency(candidate.expected_salary)
              : "-"}
          </p>
        </div>
        <div>
          <strong className="text-sm">Profit (INR):</strong>
          <p className={`text-sm ${candidate.profit && candidate.profit > 0 ? "text-green-600" : "text-red-600"}`}>
            {candidate.profit ? formatCurrency(candidate.profit) : "-"}
          </p>
        </div>
      </div>
    </Card>
  );

  const renderEmployeeCard = (employee: Employee) => (
    <Card key={`${employee.id}`} className="mb-4 p-4">
      <div className="space-y-2">
        <div>
          <strong className="text-sm">Name:</strong>
          <p className="text-sm">{employee.employee_name}</p>
        </div>
        <div>
          <strong className="text-sm">Project:</strong>
          <p className="text-sm">{employee.project_name || "Unknown"}</p>
        </div>
        <div>
          <strong className="text-sm">Salary (LPA):</strong>
          <p className="text-sm">{formatCurrency(employee.salary)}</p>
        </div>
        <div>
          <strong className="text-sm">Revenue:</strong>
          <p className="text-sm">
            {formatCurrency(employee.revenue_inr)}<br />
            {/* <span className="text-xs text-gray-500">
              $ {employee.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span> */}
          </p>
        </div>
        <div>
          <strong className="text-sm">Profit:</strong>
          <p className={`text-sm ${employee.profit_inr >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(employee.profit_inr)}<br />
            {/* <span className="text-xs text-gray-500">
              $ {employee.profit_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span> */}
          </p>
        </div>
        <div>
          <strong className="text-sm">Currency:</strong>
          <p className="text-sm">{employee.currency}</p>
        </div>
      </div>
    </Card>
  );

  console.log("candidates", candidates)
  const renderCandidateTable = (candidates: Candidate[], title: string) => (
    <div className="w-full min-w-0">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="md:hidden">
        {candidates.length > 0 ? (
          candidates.map(candidate => renderCandidateCard(candidate))
        ) : (
          <Card className="p-4 text-center">
            <p className="text-sm">
              {searchTerm
                ? "No candidates found matching your search."
                : "No candidates found for this client."}
            </p>
          </Card>
        )}
      </div>
      <div className="hidden md:block rounded-md border max-h-[400px] overflow-y-auto overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Name
                  <button aria-label="Sort by Name">
                    <ArrowUpDown size={14} />
                  </button>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Position
                  <button aria-label="Sort by Position">
                    <ArrowUpDown size={14} />
                  </button>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Experience</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Join</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary (LPA)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Profit (INR)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.length > 0 ? (
              candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <Link to={`/employee/${candidate.id}/${candidate.job_id}`} className="font-medium text-black-600 hover:underline">
                        {candidate.name}
                      </Link>
                      <span className="text-xs text-gray-500">
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]"
                        >
                          {candidate?.applied_from ?? 'N/A'}
                        </Badge>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <HiddenContactCell
                      email={candidate.email ?? 'N/A'}
                      phone={candidate.phone ?? 'N/A'}
                      candidateId={candidate.id}
                      className="text-xs md:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <Link to={`/jobs/${candidate.job_id}`} className="font-medium text-black-600 hover:underline">
                        {candidate.job_title || 'Unknown'}
                      </Link>
                       
                      <span className="text-xs text-gray-500">
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]"
                        >
                          {candidate?.hr_jobs?.client_details?.pointOfContact?.trim() ?? 'N/A'}
                        </Badge>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                    {candidate.experience || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate.joining_date ? `${formatDate(candidate.joining_date)} (${moment(candidate.joining_date).fromNow()})` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isEmployee ? (
                      <Badge variant="outline" className={getStatusBadgeColor(candidate.main_status_id)}>
                        {getStatusText(candidate.main_status_id)}
                      </Badge>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="transparent" className="h-8 px-2 py-0">
                            {statusUpdateLoading === candidate.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Badge
                                variant="outline"
                                className={getStatusBadgeColor(candidate.main_status_id)}
                              >
                                {getStatusText(candidate.main_status_id)}
                              </Badge>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          <DropdownMenuItem
                            className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
                            onClick={() => handleStatusChange(candidate.id, OFFERED_STATUS_ID)}
                          >
                            Offered
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-green-600 focus:text-green-600 focus:bg-green-50"
                            onClick={() => handleStatusChange(candidate.id, JOINED_STATUS_ID)}
                          >
                            Joined
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate.ctc
                      ? formatCurrency(parseSalary(candidate.ctc))
                      : candidate.expected_salary
                      ? formatCurrency(candidate.expected_salary)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium hidden lg:table-cell">
                    <span className={candidate.profit && candidate.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                      {candidate.profit ? formatCurrency(candidate.profit) : '-'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                  {searchTerm
                    ? 'No candidates found matching your search.'
                    : 'No candidates found for this client.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {candidates.length > 0 && renderPagination(totalCandidatePages, true)}
    </div>
  );

  console.log("employees", employees)

  const renderEmployeeTable = (employees: Employee[], title: string) => (
    <div className="w-full min-w-0">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="md:hidden">
        {employees.length > 0 ? (
          employees.map(employee => renderEmployeeCard(employee))
        ) : (
          <Card className="p-4 text-center">
            <p className="text-sm">
              {searchTerm
                ? "No employees found matching your search."
                : "No employees assigned to projects for this client."}
            </p>
          </Card>
        )}
      </div>
      <div className="hidden md:block rounded-md border max-h-[400px] overflow-y-auto overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Name
                  <button aria-label="Sort by Name">
                    <ArrowUpDown size={14} />
                  </button>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Project
                  <button aria-label="Sort by Project">
                    <ArrowUpDown size={14} />
                  </button>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary (LPA)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
              {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th> */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.length > 0 ? (
              employees.map((employee) => (
                <tr key={`${employee.id}`} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.employee_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.project_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(employee.salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(employee.revenue_inr)}<br />
                    {/* <span className="text-xs text-gray-500">
                      $ {employee.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span> */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={employee.profit_inr >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(employee.profit_inr)}<br />
                      {/* <span className="text-xs text-gray-500">
                        $ {employee.profit_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span> */}
                    </span>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.currency}
                  </td> */}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  {searchTerm
                    ? 'No employees found matching your search.'
                    : 'No employees assigned to projects for this client.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {employees.length > 0 && renderPagination(totalEmployeePages, false)}
    </div>
  );

  useEffect(() => {
    if (clientName) {
      fetchCandidatesAndEmployees(decodeURIComponent(clientName));
    }
  }, [clientName]);

  return (
    <div className="w-full max-w-[95vw] py-2 sm:py-4 px-2 sm:px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                {clientName} - Candidates and Employees
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">
                  {formatCurrency(metrics.candidateRevenue + metrics.employeeRevenueINR)}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {/* <p className="text-xs text-gray-500 mt-1">
                        $ {((metrics.candidateRevenue + metrics.employeeRevenueINR) / USD_TO_INR_RATE_EMPLOYEES).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
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
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">
                  {formatCurrency(metrics.candidateProfit + metrics.employeeProfitINR)}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {/* <p className="text-xs text-gray-500 mt-1">
                        $ {((metrics.candidateProfit + metrics.employeeProfitINR) / USD_TO_INR_RATE_EMPLOYEES).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
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
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Total Count
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800">
                  {metrics.candidateCount + metrics.employeeCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.candidateCount} Candidates, {metrics.employeeCount} Employees
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center mb-4 sm:mb-6 relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search candidates and employees..."
              className="pl-8 w-full text-xs sm:text-sm"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-6 sm:py-8">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple"></div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4">
              {renderCandidateTable(paginatedCandidates, "All Candidates")}
              {serviceType.length === 1 && serviceType[0] === "permanent" ? null : (
                renderEmployeeTable(paginatedEmployees, "Assigned Employees in Projects")
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientCandidatesView;