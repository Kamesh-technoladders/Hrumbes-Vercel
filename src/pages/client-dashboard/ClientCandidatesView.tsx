import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ArrowLeft, Search, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import HiddenContactCell from "@/components/ui/HiddenContactCell";
import { format } from "date-fns";

// Status IDs for Offered and Joined candidates
const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";

// Static USD to INR conversion rate
const USD_TO_INR_RATE = 83.5;

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
  revenue: number;
  profit: number;
  candidateCount: number;
}

const ClientCandidatesView = () => {
  const { clientName } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredContractualCandidates, setFilteredContractualCandidates] = useState<Candidate[]>([]);
  const [filteredPermanentCandidates, setFilteredPermanentCandidates] = useState<Candidate[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics>({
    revenue: 0,
    profit: 0,
    candidateCount: 0,
  });
  const [serviceType, setServiceType] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();

  // Currency options for parsing
  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  // Parse salary strings with currency and type conversion
  const parseSalary = (salary: string | undefined): number => {
    if (!salary) return 0;
    const currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
    const parts = salary.replace(currency.symbol, "").trim().split(" ");
    const amount = parseFloat(parts[0]) || 0;
    const budgetType = parts[1] || "LPA";

    let convertedAmount = amount;

    if (currency.value === "USD") {
      convertedAmount *= USD_TO_INR_RATE;
    }

    if (budgetType === "Monthly") {
      convertedAmount *= 12;
    } else if (budgetType === "Hourly") {
      convertedAmount *= 2080;
    }

    return convertedAmount;
  };

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
      salaryAmount *= USD_TO_INR_RATE;
    }
    if (salaryType === "Monthly") {
      salaryAmount *= 12;
    } else if (salaryType === "Hourly") {
      salaryAmount *= 2080;
    }

    if (budgetCurrency === "USD") {
      budgetAmount *= USD_TO_INR_RATE;
    }
    if (budgetType === "Monthly") {
      budgetAmount *= 12;
    } else if (budgetType === "Hourly") {
      budgetAmount *= 2080;
    }

    if (client.currency === "USD" && client.commission_type === "fixed") {
      commissionValue *= USD_TO_INR_RATE;
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

  const fetchCandidatesForClient = async (client: string) => {
    try {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from("hr_clients")
        .select("id, client_name, commission_value, commission_type, currency, service_type")
        .eq("client_name", client)
        .single();

      if (clientError) throw clientError;

      setServiceType(clientData.service_type || []);

      const { data: jobsData, error: jobsError } = await supabase
        .from("hr_jobs")
        .select("id, title, client_owner, job_type_category, budget, budget_type")
        .eq("client_owner", client);

      if (jobsError) throw jobsError;

      if (!jobsData || jobsData.length === 0) {
        setMetrics({ revenue: 0, profit: 0, candidateCount: 0 });
        setCandidates([]);
        setFilteredContractualCandidates([]);
        setFilteredPermanentCandidates([]);
        setLoading(false);
        return;
      }

      const jobIds = jobsData.map(job => job.id);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("hr_job_candidates")
        .select(`
          id, name, email, phone, experience, skills, status, job_id,
          main_status_id, sub_status_id, ctc, accrual_ctc, expected_salary, joining_date,
          hr_jobs!hr_job_candidates_job_id_fkey(id, title, job_type_category, client_details)
        `)
        .in("job_id", jobIds)
        .in("main_status_id", [OFFERED_STATUS_ID, JOINED_STATUS_ID]);

      if (candidatesError) throw candidatesError;

      if (!candidatesData || candidatesData.length === 0) {
        setMetrics({ revenue: 0, profit: 0, candidateCount: 0 });
        setCandidates([]);
        setFilteredContractualCandidates([]);
        setFilteredPermanentCandidates([]);
        setLoading(false);
        return;
      }

      let revenue = 0;
      let profit = 0;

      const enhancedCandidates = candidatesData.map(candidate => {
        const job = jobsData.find(job => job.id === candidate.job_id);
        const candidateRevenue = candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0;
        const candidateProfit = job ? calculateProfit(candidate, job, clientData) : 0;

        revenue += candidateRevenue;
        profit += candidateProfit;

        return {
          ...candidate,
          job_title: job ? job.title : "Unknown",
          job_type_category: job ? job.job_type_category : "Unknown",
          profit: candidateProfit,
        };
      });

      setMetrics({
        revenue,
        profit,
        candidateCount: candidatesData.length,
      });

      setCandidates(enhancedCandidates);

      // Split candidates based on job_type_category
      const contractualCandidates = enhancedCandidates.filter(
        candidate => candidate.job_type_category === "Internal"
      );
      const permanentCandidates = enhancedCandidates.filter(
        candidate => candidate.job_type_category === "External"
      );

      setFilteredContractualCandidates(contractualCandidates);
      setFilteredPermanentCandidates(permanentCandidates);
    } catch (error) {
      toast({
        title: "Error fetching candidates",
        description: "An error occurred while fetching candidate data.",
        variant: "destructive",
      });
      console.error("Error fetching candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search

    if (!value.trim()) {
      setFilteredContractualCandidates(
        candidates.filter(c => c.job_type_category === "Internal")
      );
      setFilteredPermanentCandidates(
        candidates.filter(c => c.job_type_category === "External")
      );
      return;
    }

    const searchTermLower = value.toLowerCase();
    const filteredContractual = candidates.filter(
      candidate =>
        candidate.job_type_category === "Internal" &&
        (candidate.name.toLowerCase().includes(searchTermLower) ||
        candidate.email.toLowerCase().includes(searchTermLower) ||
        candidate.phone?.toLowerCase().includes(searchTermLower) ||
        candidate.skills?.some(skill =>
          skill.toLowerCase().includes(searchTermLower)
        ))
    );
    const filteredPermanent = candidates.filter(
      candidate =>
        candidate.job_type_category === "External" &&
        (candidate.name.toLowerCase().includes(searchTermLower) ||
        candidate.email.toLowerCase().includes(searchTermLower) ||
        candidate.phone?.toLowerCase().includes(searchTermLower) ||
        candidate.skills?.some(skill =>
          skill.toLowerCase().includes(searchTermLower)
        ))
    );

    setFilteredContractualCandidates(filteredContractual);
    setFilteredPermanentCandidates(filteredPermanent);
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
      return format(date, "dd/MM/yyyy");
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
        return "bg-yellow-500";
      case JOINED_STATUS_ID:
        return "bg-green-500";
      default:
        return "bg-gray-500";
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

  // Placeholder for CSV data
  const csvData = candidates.map(candidate => ({
    Name: candidate.name,
    Email: candidate.email,
    Phone: candidate.phone,
    Position: candidate.job_title,
    Experience: candidate.experience || "-",
    "Date of Join": formatDate(candidate.joining_date),
    Status: getStatusText(candidate.main_status_id),
    "Salary (LPA)": candidate.ctc
      ? formatCurrency(parseSalary(candidate.ctc))
      : candidate.expected_salary
      ? formatCurrency(candidate.expected_salary)
      : "-",
    "Profit (INR)": candidate.profit ? formatCurrency(candidate.profit) : "-",
  }));

  // Placeholder for PDF download
  const downloadPDF = () => {
    toast({
      title: "PDF Download",
      description: "PDF download functionality is not yet implemented.",
      variant: "default",
    });
  };

  // Pagination logic for contractual candidates
  const totalContractualPages = Math.ceil(filteredContractualCandidates.length / itemsPerPage);
  const contractualStartIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContractualCandidates = filteredContractualCandidates.slice(
    contractualStartIndex,
    contractualStartIndex + itemsPerPage
  );

  // Pagination logic for permanent candidates
  const totalPermanentPages = Math.ceil(filteredPermanentCandidates.length / itemsPerPage);
  const permanentStartIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPermanentCandidates = filteredPermanentCandidates.slice(
    permanentStartIndex,
    permanentStartIndex + itemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  console.log("candidates", candidates)
  const renderPagination = (totalPages: number, isContractual: boolean) => {
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
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="p-1 sm:p-2"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <span className="text-xs sm:text-sm text-gray-600">
          Showing {isContractual ? contractualStartIndex + 1 : permanentStartIndex + 1} to{" "}
          {isContractual
            ? Math.min(contractualStartIndex + itemsPerPage, filteredContractualCandidates.length)
            : Math.min(permanentStartIndex + itemsPerPage, filteredPermanentCandidates.length)} of{" "}
          {isContractual ? filteredContractualCandidates.length : filteredPermanentCandidates.length}
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

  const renderTable = (candidates: Candidate[], title: string, totalPages: number, isContractual: boolean) => (
    <div className="w-full min-w-0">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {/* Mobile: Card Layout */}
      <div className="md:hidden">
        {candidates.length > 0 ? (
          candidates.map(candidate => renderCandidateCard(candidate))
        ) : (
          <Card className="p-4 text-center">
            <p className="text-sm">
              {searchTerm
                ? "No candidates found matching your search."
                : `No ${title.toLowerCase()} candidates found for this client.`}
            </p>
          </Card>
        )}
      </div>
      {/* Tablet and Desktop: Table Layout */}
      <div className="hidden md:block rounded-md border max-h-[400px] overflow-y-auto overflow-x-auto">
        <Table className="report-table w-full">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-white min-w-[100px] lg:min-w-[150px]">Name</TableHead>
              <TableHead className="min-w-[80px] lg:min-w-[120px]">Contact</TableHead>
              <TableHead className="min-w-[100px] lg:min-w-[150px]">Position</TableHead>
              <TableHead className="min-w-[80px] hidden lg:table-cell">Experience</TableHead>
              <TableHead className="min-w-[80px] lg:min-w-[100px]">Date of Join</TableHead>
              <TableHead className="min-w-[80px] lg:min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[80px] lg:min-w-[100px]">Salary (LPA)</TableHead>
              <TableHead className="min-w-[80px] hidden lg:table-cell">Profit (INR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length > 0 ? (
              candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell className="sticky left-0 bg-white font-medium text-xs md:text-sm">
                    {candidate.name}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <HiddenContactCell
                      email={candidate.email}
                      phone={candidate.phone}
                      candidateId={candidate.id}
                      className="text-xs md:text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
  <Link to={`/jobs/${candidate.job_id}`} className="font-medium hover:underline">
    {candidate.job_title}
    {candidate?.hr_jobs?.client_details?.pointOfContact?.trim() ? (
      <> ({candidate.hr_jobs.client_details.pointOfContact})</>
    ) : null}
  </Link>
</TableCell>

                  <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                    {candidate.experience || "-"}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    {formatDate(candidate.joining_date)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeColor(candidate.main_status_id)} text-xs`}>
                      {getStatusText(candidate.main_status_id)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    {candidate.ctc
                      ? formatCurrency(parseSalary(candidate.ctc))
                      : candidate.expected_salary
                      ? formatCurrency(candidate.expected_salary)
                      : "-"}
                  </TableCell>
                  <TableCell className="font-medium text-xs md:text-sm hidden lg:table-cell">
                    <span className={candidate.profit && candidate.profit > 0 ? "text-green-600" : "text-red-600"}>
                      {candidate.profit ? formatCurrency(candidate.profit) : "-"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-sm">
                  {searchTerm
                    ? "No candidates found matching your search."
                    : `No ${title.toLowerCase()} candidates found for this client.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {candidates.length > 0 && renderPagination(totalPages, isContractual)}
    </div>
  );

  useEffect(() => {
    if (clientName) {
      fetchCandidatesForClient(decodeURIComponent(clientName));
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
                {clientName} - Candidates
              </CardTitle>
            </div>
            {/* <div className="flex flex-col sm:flex-row gap-2">
              <Button size="sm" className="text-xs sm:text-sm">
                Download CSV
              </Button>
              <Button size="sm" onClick={downloadPDF} className="text-xs sm:text-sm">
                Download PDF
              </Button>
            </div> */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">
                  {formatCurrency(metrics.revenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Profit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800">
                  {formatCurrency(metrics.profit)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Candidates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800">
                  {metrics.candidateCount}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center mb-4 sm:mb-6 relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search candidates..."
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
            <>
              {serviceType.includes("contractual") && serviceType.includes("permanent") ? (
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    {renderTable(paginatedContractualCandidates, "Contractual Candidates", totalContractualPages, true)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renderTable(paginatedPermanentCandidates, "Permanent Candidates", totalPermanentPages, false)}
                  </div>
                </div>
              ) : (
                renderTable(
                  serviceType.includes("contractual") ? paginatedContractualCandidates : paginatedPermanentCandidates,
                  serviceType.includes("contractual") ? "Contractual Candidates" : "Permanent Candidates",
                  serviceType.includes("contractual") ? totalContractualPages : totalPermanentPages,
                  serviceType.includes("contractual")
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientCandidatesView;