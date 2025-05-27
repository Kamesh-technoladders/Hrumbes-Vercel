import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface OnboardingChartCardProps {
  employeeId: string;
}

interface ChartData {
  name: string;
  count: number;
}

export const OnboardingChartCard: React.FC<OnboardingChartCardProps> = ({ employeeId }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"week" | "month" | "year">("week");

  useEffect(() => {
    const fetchOnboardingCount = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from("hr_status_change_counts")
          .select("count, created_at")
          .eq("candidate_owner", employeeId)
          .eq("sub_status_id", "c9716374-3477-4606-877a-dfa5704e7680");

        const now = new Date();
        let data: ChartData[] = [];

        if (activeTab === "week") {
          // Current week: Monday to Sunday
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const { data: counts, error } = await query
            .gte("created_at", startOfWeek.toISOString())
            .lte("created_at", endOfWeek.toISOString());

          if (error) throw error;

          // Initialize data for each day of the week
          const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          data = days.map((day, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            const dayCount = counts
              .filter((record) => {
                const recordDate = new Date(record.created_at);
                return recordDate.toDateString() === dayDate.toDateString();
              })
              .reduce((sum, record) => sum + record.count, 0);
            return { name: day, count: dayCount };
          });
        } else if (activeTab === "month") {
          // Current month: May 2025
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

          const { data: counts, error } = await query
            .gte("created_at", startOfMonth.toISOString())
            .lte("created_at", endOfMonth.toISOString());

          if (error) throw error;

          // Group by week (Week 1, Week 2, etc.)
          const weeks: { [key: string]: number } = {};
          counts.forEach((record) => {
            const date = new Date(record.created_at);
            const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
            const weekKey = `Week ${weekNumber}`;
            weeks[weekKey] = (weeks[weekKey] || 0) + record.count;
          });

          // Initialize data for 4-5 weeks
          data = Array.from({ length: 5 }, (_, i) => `Week ${i + 1}`).map((week) => ({
            name: week,
            count: weeks[week] || 0,
          }));
        } else if (activeTab === "year") {
          // Current year: 2025
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

          const { data: counts, error } = await query
            .gte("created_at", startOfYear.toISOString())
            .lte("created_at", endOfYear.toISOString());

          if (error) throw error;

          // Group by month
          const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
          ];
          data = months.map((month, index) => {
            const monthCount = counts
              .filter((record) => new Date(record.created_at).getMonth() === index)
              .reduce((sum, record) => sum + record.count, 0);
            return { name: month, count: monthCount };
          });
        }

        setChartData(data);
      } catch (error: any) {
        console.error("Error fetching onboarding count:", error);
        toast.error(`Error loading onboarding data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchOnboardingCount();
    }
  }, [employeeId, activeTab]);

  return (
    <Card className="shadow-md rounded-xl h-[300px] md:h-[325px] lg:h-[300px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BarChart2 className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Onboarding Count</h3>
          </div>
          <Tabs defaultValue="week" onValueChange={(value) => setActiveTab(value as "week" | "month" | "year")}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400 italic">Loading chart...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic">No onboarding data available</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};