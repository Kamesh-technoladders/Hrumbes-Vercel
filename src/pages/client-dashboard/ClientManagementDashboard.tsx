import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Status IDs for Offered and Joined candidates
const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";

// Static USD to INR conversion rate
const USD_TO_INR_RATE = 83.5;

interface Client {
  id: string;
  display_name: string;
  client_name: string;
  service_type: string[];
  status: string;
  commission_value?: number;
  commission_type?: string;
  currency: string;
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

interface Job {
  id: string;
  title: string;
  client_owner: string;
  job_type_category: string;
  budget?: number;
  budget_type?: string;
}

interface Metrics {
  totalRevenue: number;
  totalProfit: number;
  totalCandidates: number;
  permanentCandidates: number;
  contractualCandidates: number;
  bothCandidates: number;
}

const ClientManagementDashboard = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalProfit: 0,
    totalCandidates: 0,
    permanentCandidates: 0,
    contractualCandidates: 0,
    bothCandidates: 0,
  });
  const [chartData, setChartData] = useState<any>({});
  const [clientChartData, setClientChartData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();
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

  // Calculate profit
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

      if (!candidatesData || candidatesData.length === 0) {
        setMetrics({
          totalRevenue: 0,
          totalProfit: 0,
          totalCandidates: 0,
          permanentCandidates: 0,
          contractualCandidates: 0,
          bothCandidates: 0,
        });
        setChartData({});
        setClientChartData({});
        setLoading(false);
        return;
      }

      let totalRevenue = 0;
      let totalProfit = 0;
      let permanentCandidates = 0;
      let contractualCandidates = 0;
      let bothCandidates = 0;

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

      setMetrics({
        totalRevenue,
        totalProfit,
        totalCandidates: candidatesData.length,
        permanentCandidates,
        contractualCandidates,
        bothCandidates,
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
        return "bg-green-500 hover:bg-green-600";
      case "inactive":
        return "bg-red-500 hover:bg-red-600";
      case "pending":
        return "bg-yellow-500 hover:bg-yellow-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  console.log("client", paginatedClients)

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
    <div className="max-w-8xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Client Dashboard</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            View and manage your clients. Click on a client to see associated candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl sm:text-2xl font-bold text-green-800">
                      {formatCurrency(metrics.totalRevenue)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Total Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl sm:text-2xl font-bold text-green-800">
                      {formatCurrency(metrics.totalProfit)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Total Candidates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl sm:text-2xl font-bold text-blue-800">
                      {metrics.totalCandidates}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-2">
                      Permanent: {metrics.permanentCandidates} | Contractual: {metrics.contractualCandidates} | Both: {metrics.bothCandidates}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Revenue and Profit by Service Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] sm:h-[350px] lg:h-[400px]">
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: "top" },
                          title: {
                            display: true,
                            text: "Revenue and Profit (INR LPA)",
                            font: { size: 14 },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "Amount (INR LPA)",
                              font: { size: 12 },
                            },
                            ticks: { font: { size: 10 } },
                          },
                          x: {
                            title: {
                              display: true,
                              text: "Service Type",
                              font: { size: 12 },
                            },
                            ticks: { font: { size: 10 } },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Revenue and Profit by Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] sm:h-[350px] lg:h-[400px]">
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
                            font: { size: 14 },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "Amount (INR LPA)",
                              font: { size: 12 },
                            },
                            ticks: { font: { size: 10 } },
                          },
                          x: {
                            title: {
                              display: true,
                              text: "Client",
                              font: { size: 12 },
                            },
                            ticks: {
                              autoSkip: false,
                              maxRotation: 0,
                              minRotation: 0,
                              font: { size: 10 },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Tabs defaultValue="all" value={activeFilter} onValueChange={filterClients} className="mb-4">
                <TabsList className="flex flex-wrap justify-start">
                  <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
                  <TabsTrigger value="permanent" className="flex-1 sm:flex-none">Permanent</TabsTrigger>
                  <TabsTrigger value="contractual" className="flex-1 sm:flex-none">Contractual</TabsTrigger>
                  <TabsTrigger value="both" className="flex-1 sm:flex-none">Both</TabsTrigger>
                </TabsList>
                <TabsContent value={activeFilter}>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          
                          {/* <TableHead className="w-[120px] sm:w-[200px]">Display Name</TableHead> */}
                          <TableHead className="w-[120px] sm:w-[200px]">Client Name</TableHead>
                          <TableHead className="w-[120px] sm:w-[200px]">Internal Contact</TableHead>

                          <TableHead className="w-[120px] sm:w-[150px]">Service Type</TableHead>
                          <TableHead className="w-[120px] sm:w-[150px]">Currency</TableHead>
                          <TableHead className="w-[80px] sm:w-[100px]">Status</TableHead>
                          <TableHead className="w-[120px] sm:w-[150px]">Created By</TableHead>

                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedClients.length > 0 ? (
                          paginatedClients.map((client) => (
                            <TableRow
                              key={client.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleClientClick(client.client_name)}
                            >
                            
                              <TableCell className="font-medium text-purple text-xs sm:text-sm">
                                {client.display_name}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {client.internal_contact}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {client.service_type ? (
                                    client.service_type.map((type, index) => (
                                      <Badge key={index} variant="outline" className="capitalize text-xs">
                                        {type}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {client.currency}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${getStatusBadgeColor(client.status)} text-xs`}>
                                  {client.status || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {client?.hr_employees?.first_name}  {client?.hr_employees?.last_name}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-sm">
                              No clients found matching the selected filter.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredClients.length > 0 && renderPagination()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientManagementDashboard;