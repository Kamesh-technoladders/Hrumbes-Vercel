import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics>({
    revenue: 0,
    profit: 0,
    candidateCount: 0,
  });
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
        .select("id, client_name, commission_value, commission_type, currency")
        .eq("client_name", client)
        .single();

      if (clientError) throw clientError;

      const { data: jobsData, error: jobsError } = await supabase
        .from("hr_jobs")
        .select("id, title, client_owner, job_type_category, budget, budget_type")
        .eq("client_owner", client);

      if (jobsError) throw jobsError;

      if (!jobsData || jobsData.length === 0) {
        setMetrics({ revenue: 0, profit: 0, candidateCount: 0 });
        setCandidates([]);
        setFilteredCandidates([]);
        setLoading(false);
        return;
      }

      const jobIds = jobsData.map(job => job.id);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("hr_job_candidates")
        .select(`
          id, name, email, phone, experience, skills, status, job_id,
          main_status_id, sub_status_id, ctc, accrual_ctc, expected_salary
        `)
        .in("job_id", jobIds)
        .in("main_status_id", [OFFERED_STATUS_ID, JOINED_STATUS_ID]);

      if (candidatesError) throw candidatesError;

      if (!candidatesData || candidatesData.length === 0) {
        setMetrics({ revenue: 0, profit: 0, candidateCount: 0 });
        setCandidates([]);
        setFilteredCandidates([]);
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
          profit: candidateProfit,
        };
      });

      setMetrics({
        revenue,
        profit,
        candidateCount: candidatesData.length,
      });

      setCandidates(enhancedCandidates);
      setFilteredCandidates(enhancedCandidates);
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
      setFilteredCandidates(candidates);
      return;
    }

    const searchTermLower = value.toLowerCase();
    const filtered = candidates.filter(
      candidate =>
        candidate.name.toLowerCase().includes(searchTermLower) ||
        candidate.email.toLowerCase().includes(searchTermLower) ||
        candidate.phone?.toLowerCase().includes(searchTermLower) ||
        candidate.skills?.some(skill =>
          skill.toLowerCase().includes(searchTermLower)
        )
    );

    setFilteredCandidates(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const goBack = () => {
    navigate("/client-dashboard");
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

  // Pagination logic
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
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
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, filteredCandidates.length)} of{" "}
          {filteredCandidates.length} candidates
        </span>
      </div>
    );
  };

  useEffect(() => {
    if (clientName) {
      fetchCandidatesForClient(decodeURIComponent(clientName));
    }
  }, [clientName]);

  return (
    <div className="max-w-8xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-xl sm:text-2xl">{clientName} - Candidates (Offered & Joined)</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                View all offered and joined candidates for {clientName} with profit calculations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl font-bold text-green-800">
                  {formatCurrency(metrics.revenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl font-bold text-green-800">
                  {formatCurrency(metrics.profit)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl font-bold text-blue-800">
                  {metrics.candidateCount}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center mb-6 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search candidates..."
              className="pl-8"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple"></div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px] sm:w-[200px]">Name</TableHead>
                      <TableHead className="w-[100px] sm:w-[150px]">Contact</TableHead>
                      <TableHead className="w-[80px] sm:w-[100px]">Experience</TableHead>
                      {/* <TableHead className="w-[120px] sm:w-[150px]">Skills</TableHead> */}
                      <TableHead className="w-[120px] sm:w-[200px]">Job</TableHead>
                      <TableHead className="w-[80px] sm:w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px] sm:w-[120px]">Salary (LPA)</TableHead>
                      <TableHead className="w-[100px] sm:w-[120px]">Profit (INR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCandidates.length > 0 ? (
                      paginatedCandidates.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            {candidate.name}
                          </TableCell>
                          <TableCell>
                            <HiddenContactCell
                              email={candidate.email}
                              phone={candidate.phone}
                              candidateId={candidate.id}
                            />
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {candidate.experience || "-"}
                          </TableCell>
                          {/* <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills && candidate.skills.length > 0 ? (
                                candidate.skills.slice(0, 3).map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                              {candidate.skills && candidate.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{candidate.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell> */}
                          <TableCell className="text-xs sm:text-sm">
                            {candidate.job_title}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeColor(candidate.main_status_id)} text-xs`}>
                              {getStatusText(candidate.main_status_id)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {candidate.ctc
                              ? formatCurrency(parseSalary(candidate.ctc))
                              : candidate.expected_salary
                              ? formatCurrency(candidate.expected_salary)
                              : "-"}
                          </TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm">
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
                            : "No offered or joined candidates found for this client."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredCandidates.length > 0 && renderPagination()}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {filteredCandidates.length} {filteredCandidates.length === 1 ? 'candidate' : 'candidates'} found
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClientCandidatesView;