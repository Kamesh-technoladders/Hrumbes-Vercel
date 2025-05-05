
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeGoals } from "@/lib/supabaseData";
import { Employee, GoalType, GoalWithDetails, GoalInstance } from "@/types/goal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  PieChart,
  Calendar 
} from "lucide-react";
import EmployeeGoalCard from "./EmployeeGoalCard";
import GoalPieChart from "../charts/GoalPieChart";
import GoalProgressTable from "../common/GoalProgressTable";
import { useSelector } from "react-redux";

interface EmployeeGoalDashboardProps {
  employee: Employee;
  goalTypeFilter?: GoalType;
}

const EmployeeGoalDashboard: React.FC<EmployeeGoalDashboardProps> = ({
  employee,
  goalTypeFilter
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const user = useSelector((state: any) => state.auth.user);
  const selectedId = employee?.id || user?.id;

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ["employeeGoals", selectedId],
    queryFn: () => getEmployeeGoals(selectedId),
  });

  const filteredByType = useMemo(() => {
    if (!goals) return [];
    return goalTypeFilter
      ? goals.filter(goal => goal.assignmentDetails?.goalType === goalTypeFilter)
      : goals;
  }, [goals, goalTypeFilter]);

  // Filter by status and include history based on showHistory state
  const filteredGoals = useMemo(() => {
    return filteredByType.flatMap(goal => {
      const instances = goal.instances || [];
      
      // Filter instances by selected status
      const statusFilteredInstances = selectedStatus === "all"
        ? instances
        : instances.filter(instance => instance.status === selectedStatus);
      
      // Then filter by history/current if needed
      const historyFilteredInstances = showHistory
        ? statusFilteredInstances
        : statusFilteredInstances.filter(instance => {
            const now = new Date();
            const endDate = new Date(instance.periodEnd);
            const startDate = new Date(instance.periodStart);
            return (startDate <= now && endDate >= now) || endDate >= now;
          });

      return historyFilteredInstances.map(instance => ({ goal, instance }));
    });
  }, [filteredByType, selectedStatus, showHistory]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalGoals = filteredByType.reduce((sum, goal) => sum + (goal.instances?.length || 0), 0);
    const completedGoals = filteredByType.reduce(
      (sum, goal) => sum + (goal.instances?.filter(i => i.status === "completed").length || 0), 0);
    const inProgressGoals = filteredByType.reduce(
      (sum, goal) => sum + (goal.instances?.filter(i => i.status === "in-progress").length || 0), 0);
    const overdueGoals = filteredByType.reduce(
      (sum, goal) => sum + (goal.instances?.filter(i => i.status === "overdue").length || 0), 0);
    const pendingGoals = filteredByType.reduce(
      (sum, goal) => sum + (goal.instances?.filter(i => i.status === "pending").length || 0), 0);
    
    // Chart data for goal types
    const goalsByType = filteredByType.reduce((acc, goal) => {
      if (goal.assignmentDetails?.goalType) {
        const type = goal.assignmentDetails.goalType;
        acc[type] = (acc[type] || 0) + (goal.instances?.length || 0);
      }
      return acc;
    }, {} as Record<string, number>);

    // Chart data for goal statuses
    const goalsByStatus = {
      completed: completedGoals,
      inProgress: inProgressGoals, 
      overdue: overdueGoals,
      pending: pendingGoals
    };

    return {
      totalGoals,
      completedGoals,
      inProgressGoals,
      overdueGoals,
      pendingGoals,
      goalsByType,
      goalsByStatus,
      completionRate: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }, [filteredByType]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !goals || goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Goals Assigned</h3>
            <p className="text-gray-500 mt-2">
              This employee doesn't have any goals assigned yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{stats.totalGoals}</CardTitle>
            <CardDescription>Total Goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(stats.goalsByType).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {count} {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle className="text-2xl font-bold">{stats.completedGoals}</CardTitle>
            </div>
            <CardDescription>Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={stats.totalGoals > 0 ? (stats.completedGoals / stats.totalGoals) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-2xl font-bold">{stats.inProgressGoals}</CardTitle>
            </div>
            <CardDescription>In Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={stats.totalGoals > 0 ? (stats.inProgressGoals / stats.totalGoals) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-2xl font-bold">{stats.overdueGoals}</CardTitle>
            </div>
            <CardDescription>Overdue</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={stats.totalGoals > 0 ? (stats.overdueGoals / stats.totalGoals) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Goal performance visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Goal Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            <GoalPieChart 
              data={[
                { name: 'Completed', value: stats.completedGoals, color: '#10b981' },
                { name: 'In Progress', value: stats.inProgressGoals, color: '#3b82f6' },
                { name: 'Overdue', value: stats.overdueGoals, color: '#ef4444' },
                { name: 'Pending', value: stats.pendingGoals, color: '#f59e0b' }
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalProgressTable 
              employee={employee} 
              goalStats={stats}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Goal Status</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={showHistory ? "default" : "outline"} 
                className="cursor-pointer" 
                onClick={() => setShowHistory(!showHistory)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                {showHistory ? "Showing All History" : "Showing Current Only"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setSelectedStatus}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="in-progress">
                <BarChart3 className="h-4 w-4 mr-2" />
                In Progress
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completed
              </TabsTrigger>
              <TabsTrigger value="overdue">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Overdue
              </TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGoals.map(({ goal, instance }) => (
                  <EmployeeGoalCard
                    key={`${goal.id}-${instance.id}`}
                    goal={goal}
                    goalInstance={instance}
                    employee={employee}
                  />
                ))}
              </div>
              {filteredGoals.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-500">No goals found with the selected filter</p>
                </div>
              )}
            </TabsContent>

            {["in-progress", "completed", "overdue", "pending"].map((status) => (
              <TabsContent key={status} value={status} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGoals.map(({ goal, instance }) => (
                    <EmployeeGoalCard
                      key={`${goal.id}-${instance.id}`}
                      goal={goal}
                      goalInstance={instance}
                      employee={employee}
                    />
                  ))}
                </div>
                {filteredGoals.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No {status.replace('-', ' ')} goals found</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeGoalDashboard;
