import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import supabase from "../config/supabaseClient";
import ClientTable from "../components/Client/ClientTable";
import AddClientDialog from "../components/Client/AddClientDialog";
import { Button } from "../components/ui/button";
import { Plus, Briefcase, Calendar, Clock, DollarSign, TrendingUp } from "lucide-react";
import { Card } from "../components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import RevenueProfitChart from "../components/Client/RevenueProfitChart";
import Loader from "@/components/ui/Loader";
import { useSelector } from "react-redux";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

const EXCHANGE_RATE_USD_TO_INR = 84;

const ClientManagement = () => {
  const [addClientOpen, setAddClientOpen] = useState(false);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Fetch Clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, display_name, status, internal_contact, currency")
        .eq("organization_id", organization_id)
        .contains("service_type", ["contractual"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // Fetch Project Employees
  const { data: projectEmployees } = useQuery({
    queryKey: ["project-employees", organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select("client_id, project_id, salary, client_billing, billing_type")
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // Convert client_billing to LPA
  const convertToLPA = (employee: any, clientCurrency: string) => {
    let clientBilling = Number(employee.client_billing) || 0;

    // Convert USD to INR if necessary
    if (clientCurrency === "USD") {
      clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    // Convert client_billing to LPA based on billing_type
    switch (employee.billing_type) {
      case "Monthly":
        clientBilling *= 1; // Convert Monthly to LPA
        break;
      case "Hourly":
        clientBilling *= 168; // Convert Hourly to LPA (8 hours/day, 22 days/month, 12 months)
        break;
      case "LPA":
      default:
        // No conversion needed for LPA
        break;
    }

    return clientBilling;
  };

  // Calculate profit
  const calculateProfit = (employee: any, clientCurrency: string) => {
    const clientBillingLPA = convertToLPA(employee, clientCurrency);
    const salary = Number(employee.salary)/12 || 0; // Salary is always in LPA, INR
    return clientBillingLPA - salary;
  };

  // Calculate Revenue & Profit Per Client
  const clientFinancials = clients?.map((client) => {
    const clientProjects = projectEmployees?.filter((pe) => pe.client_id === client.id) || [];
    const totalRevenueINR = clientProjects.reduce(
      (acc, pe) => acc + convertToLPA(pe, client.currency || "INR"),
      0
    );
    const totalProfitINR = clientProjects.reduce(
      (acc, pe) => acc + calculateProfit(pe, client.currency || "INR"),
      0
    );
    return {
      ...client,
      total_projects: new Set(clientProjects.map((pe) => pe.project_id)).size,
      revenue_inr: totalRevenueINR,
      revenue_usd: totalRevenueINR / EXCHANGE_RATE_USD_TO_INR,
      profit_inr: totalProfitINR,
      profit_usd: totalProfitINR / EXCHANGE_RATE_USD_TO_INR,
    };
  }) || [];

  // Calculate Overall Stats
  const totalClients = clientFinancials.length;
  const activeClients = clientFinancials.filter((client) => client.status === "active").length;
  const inactiveClients = clientFinancials.filter((client) => client.status === "inactive").length;
  const totalProjects = clientFinancials.reduce((acc, c) => acc + c.total_projects, 0) || 0;
  const totalRevenueINR = clientFinancials.reduce((acc, c) => acc + c.revenue_inr, 0) || 0;
  const totalProfitINR = clientFinancials.reduce((acc, c) => acc + c.profit_inr, 0) || 0;
  const totalRevenueUSD = totalRevenueINR / EXCHANGE_RATE_USD_TO_INR;
  const totalProfitUSD = totalProfitINR / EXCHANGE_RATE_USD_TO_INR;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size={60} className="border-[6px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 sm:px-6 lg:px-0 py-8">
        <div className="mb-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Project Management</h1>
              <p className="text-gray-500 text-sm sm:text-base">Manage and track all project activities</p>
            </div>
            {/* <Button
              onClick={() => setAddClientOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Create New Client</span>
            </Button> */}
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Clients</p>
                <h3 className="text-2xl font-bold">{totalClients}</h3>
                <p className="text-xs text-gray-500 mt-1">All clients</p>
              </div>
              <div className="stat-icon bg-blue-100 p-3 rounded-full">
                <Briefcase size={24} className="text-blue-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Active Clients</p>
                <h3 className="text-2xl font-bold">{activeClients}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalClients ? Math.round((activeClients / totalClients) * 100) : 0}% of total
                </p>
              </div>
              <div className="stat-icon bg-green-100 p-3 rounded-full">
                <Calendar size={24} className="text-green-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Inactive Clients</p>
                <h3 className="text-2xl font-bold">{inactiveClients}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalClients ? Math.round((inactiveClients / totalClients) * 100) : 0}% of total
                </p>
              </div>
              <div className="stat-icon bg-yellow-100 p-3 rounded-full">
                <Clock size={24} className="text-yellow-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Projects</p>
                <h3 className="text-2xl font-bold">{totalProjects}</h3>
                <p className="text-xs text-gray-500 mt-1">Across all clients</p>
              </div>
              <div className="stat-icon bg-purple-100 p-3 rounded-full">
                <Briefcase size={24} className="text-purple-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Revenue</p>
                <h3 className="text-2xl font-bold">₹ {totalRevenueINR.toLocaleString()}</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {/* <p className="text-xs text-gray-500 mt-1">
                        ${totalRevenueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                      </p> */}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="stat-icon bg-blue-100 p-3 rounded-full">
                <DollarSign size={24} className="text-blue-800" />
              </div>
            </Card>
            <Card className="stat-card p-6 rounded-xl flex items-center justify-between bg-white shadow-sm border border-gray-200 transition-transform hover:scale-[1.02]">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Profit</p>
                <h3 className="text-2xl font-bold">₹ {totalProfitINR.toLocaleString()}</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {/* <p className="text-xs text-gray-500 mt-1">
                        ${totalProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                      </p> */}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="stat-icon bg-green-100 p-3 rounded-full">
                <TrendingUp size={24} className="text-green-800" />
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Projects & Revenue per Client</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clientFinancials}>
                  <XAxis dataKey="display_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const val = Number(value);
                      const usd = val / EXCHANGE_RATE_USD_TO_INR;
                      return [
                        `₹ ${val.toLocaleString()} `,
                        name,
                      ];
                    }}
                  />
                  <Bar dataKey="total_projects" fill="#8b5cf6" name="Projects" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="revenue_inr" fill="#3b82f6" name="Revenue" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="profit_inr" fill="#10b981" name="Profit" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Revenue vs Profit</h2>
              <RevenueProfitChart revenue={totalRevenueINR} profit={totalProfitINR} exchangeRate={EXCHANGE_RATE_USD_TO_INR} />
            </Card>
          </div>

          {/* Table Section */}
          <Card className="rounded-2xl p-4 sm:p-6">
            <ClientTable clientFinancials={clientFinancials} setAddClientOpen={setAddClientOpen} />
          </Card>
        </div>
      </main>

      {/* Add Client Dialog */}
      <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} />
    </div>
  );
};

export default ClientManagement;