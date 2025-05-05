
import React, { useState, useEffect } from "react";
import EnhancedGoalCard from "@/components/goals/common/EnhancedGoalCard";
import EmployeeGoalDashboard from "@/components/goals/dashboard/EmployeeGoalDashboard";
import AnimatedCard from "@/components/ui/custom/AnimatedCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Calendar, 
  Goal, 
  Users, 
  CheckCircle2, 
  Clock,
  Target,
  AlertTriangle,
  CalendarDays,
  Filter,
} from "lucide-react";
import { getGoalsWithDetails, getSectorsWithCounts } from "@/lib/supabaseData";
import { GoalType, GoalWithDetails } from "@/types/goal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreateGoalForm from "@/components/goals/goals/CreateGoalForm";
import AssignGoalsForm from "@/components/goals/goals/AssignGoalsForm";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateGoalStatistics } from "@/lib/goalService";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const GoalStatusFilter = {
  ALL: "all",
  PENDING: "pending",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  OVERDUE: "overdue"
};

const GoalsIndex = () => {
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [sectors, setSectors] = useState<{name: string, count: number}[]>([]);
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"all" | GoalType>("all");
  const [selectedStatus, setSelectedStatus] = useState(GoalStatusFilter.ALL);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);
  const [assignGoalDialogOpen, setAssignGoalDialogOpen] = useState(false);
  const [showAllGoals, setShowAllGoals] = useState(true); // State to control showing all goals including expired
  
  useEffect(() => {
    fetchData();
  }, [createGoalDialogOpen, assignGoalDialogOpen]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoalsWithDetails();
      const sectorsData = await getSectorsWithCounts();
      
      // Fetch departments
      const { data: departmentsData, error } = await supabase
        .from('hr_departments')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error("Error fetching departments:", error);
      } else {
        setDepartments(departmentsData || []);
      }
      
      setGoals(goalsData);
      setSectors(sectorsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter goals by sector, timeframe, and status
  const filteredGoals = goals
    .filter(goal => {
      // First, filter by expired status if needed
      if (!showAllGoals) {
        const now = new Date();
        const endDate = new Date(goal.endDate);
        if (endDate < now) return false;
      }
      
      // Then filter by sector
      if (selectedSector !== "all") {
        return goal.sector.toLowerCase() === selectedSector.toLowerCase();
      }
      return true;
    });
    
  // Count goals by timeframe
  const dailyGoals = filteredGoals.filter(goal => 
    goal.assignments?.some(a => a.goalType === 'Daily')
  );
  
  const weeklyGoals = filteredGoals.filter(goal => 
    goal.assignments?.some(a => a.goalType === 'Weekly')
  );
  
  const monthlyGoals = filteredGoals.filter(goal => 
    goal.assignments?.some(a => a.goalType === 'Monthly')
  );
  
  const yearlyGoals = filteredGoals.filter(goal => 
    goal.assignments?.some(a => a.goalType === 'Yearly')
  );
  
  // Apply timeframe filter when a specific timeframe is selected
  let timeframeFilteredGoals = filteredGoals;
  if (selectedTimeframe !== 'all') {
    timeframeFilteredGoals = filteredGoals.filter(goal =>
      goal.assignments?.some(a => a.goalType === selectedTimeframe)
    );
  }
  
  // Apply status filter if selected
  if (selectedStatus !== GoalStatusFilter.ALL) {
    timeframeFilteredGoals = timeframeFilteredGoals.filter(goal =>
      goal.assignments?.some(a => a.status === selectedStatus)
    );
  }
  
  // Calculate goals statistics
  const goalStats = calculateGoalStatistics(filteredGoals);
  
  // Count unique employees assigned to goals
  const uniqueEmployeeIds = new Set<string>();
  goals.forEach(goal => {
    if (goal.assignedTo) {
      goal.assignedTo.forEach(employee => uniqueEmployeeIds.add(employee.id));
    }
  });
  const assignedEmployeesCount = uniqueEmployeeIds.size;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 pt-24 pb-12">
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start mb-8">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Goal Management</h1>
              <p className="text-gray-600">
                Track and manage employee goals across all departments
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Dialog open={createGoalDialogOpen} onOpenChange={setCreateGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Goal className="h-4 w-4" />
                    <span>Create Goal</span>
                  </Button>
                </DialogTrigger>
                <CreateGoalForm onClose={() => setCreateGoalDialogOpen(false)} />
              </Dialog>
              
              <Dialog open={assignGoalDialogOpen} onOpenChange={setAssignGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Assign Goals</span>
                  </Button>
                </DialogTrigger>
                <AssignGoalsForm onClose={() => setAssignGoalDialogOpen(false)} />
              </Dialog>
            </div>
          </div>
          
          {/* Statistics cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start">
                    <div className="h-12 w-12 rounded-full bg-gray-100 mr-4"></div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
              <AnimatedCard 
                animation="fade" 
                delay={100}
                className="bg-white flex items-start p-6"
              >
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <Goal className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Goals</p>
                  <h3 className="text-2xl font-bold">{goalStats.totalGoals}</h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-100">
                      {sectors.length} Sectors
                    </Badge>
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard 
                animation="fade" 
                delay={200}
                className="bg-white flex items-start p-6"
              >
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mr-4">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">In Progress</p>
                  <h3 className="text-2xl font-bold">{goalStats.inProgressGoals}</h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-100">
                      {goalStats.totalGoals > 0 ? Math.round((goalStats.inProgressGoals / goalStats.totalGoals) * 100) : 0}% of total
                    </Badge>
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard 
                animation="fade" 
                delay={300}
                className="bg-white flex items-start p-6"
              >
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Completed</p>
                  <h3 className="text-2xl font-bold">{goalStats.completedGoals}</h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-100">
                      {goalStats.totalGoals > 0 ? Math.round((goalStats.completedGoals / goalStats.totalGoals) * 100) : 0}% of total
                    </Badge>
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard 
                animation="fade" 
                delay={300}
                className="bg-white flex items-start p-6"
              >
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Overdue</p>
                  <h3 className="text-2xl font-bold">{goalStats.overdueGoals}</h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-100">
                      {goalStats.totalGoals > 0 ? Math.round((goalStats.overdueGoals / goalStats.totalGoals) * 100) : 0}% of total
                    </Badge>
                  </div>
                </div>
              </AnimatedCard>
              
              <AnimatedCard 
                animation="fade" 
                delay={400}
                className="bg-white flex items-start p-6"
              >
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Assigned To</p>
                  <h3 className="text-2xl font-bold">{assignedEmployeesCount}</h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-100">
                      {goalStats.completionRate}% completion rate
                    </Badge>
                  </div>
                </div>
              </AnimatedCard>
            </div>
          )}

          {/* Department Tabs */}
          <Tabs defaultValue="all" className="w-full mb-6">
            <TabsList className="flex overflow-x-auto max-w-full">
              <TabsTrigger 
                value="all" 
                onClick={() => setSelectedSector("all")}
                className="px-4 py-2"
              >
                All
              </TabsTrigger>
              
              {departments.map(department => (
                <TabsTrigger 
                  key={department.id}
                  value={department.name.toLowerCase()} 
                  onClick={() => setSelectedSector(department.name.toLowerCase())}
                  className="px-4 py-2"
                >
                  {department.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {/* Main filtering tabs */}
          <div className="flex flex-col gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Filter Goals</h3>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="show-all-switch"
                  checked={showAllGoals} 
                  onCheckedChange={setShowAllGoals} 
                />
                <Label htmlFor="show-all-switch">
                  {showAllGoals ? "Showing All Goals" : "Showing Active Goals Only"}
                </Label>
              </div>
            </div>
            
            {/* Timeframe filter */}
            <div>
              <h4 className="text-sm text-gray-500 mb-2">Timeframe</h4>
              <div className="flex flex-wrap gap-2">
                {["all", "Daily", "Weekly", "Monthly", "Yearly"].map((timeframe) => (
                  <Button
                    key={timeframe}
                    variant={selectedTimeframe === timeframe ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setSelectedTimeframe(timeframe as any)}
                  >
                    {timeframe === "all" ? <Calendar className="h-4 w-4 mr-1" /> : 
                     timeframe === "Daily" ? <CalendarDays className="h-4 w-4 mr-1" /> :
                     <Calendar className="h-4 w-4 mr-1" />}
                    <span>{timeframe === "all" ? "All Timeframes" : timeframe}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Status filter */}
            <div>
              <h4 className="text-sm text-gray-500 mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  {id: GoalStatusFilter.ALL, name: "All Statuses", icon: <Filter className="h-4 w-4 mr-1" />},
                  {id: GoalStatusFilter.PENDING, name: "Pending", icon: <Clock className="h-4 w-4 mr-1 text-amber-500" />},
                  {id: GoalStatusFilter.IN_PROGRESS, name: "In Progress", icon: <BarChart3 className="h-4 w-4 mr-1 text-blue-500" />},
                  {id: GoalStatusFilter.COMPLETED, name: "Completed", icon: <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />},
                  {id: GoalStatusFilter.OVERDUE, name: "Overdue", icon: <AlertTriangle className="h-4 w-4 mr-1 text-red-500" />}
                ].map((status) => (
                  <Button
                    key={status.id}
                    variant={selectedStatus === status.id ? "default" : "outline"}
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => setSelectedStatus(status.id)}
                  >
                    {status.icon}
                    <span>{status.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-500">Loading goals data...</p>
            </div>
          ) : (
            <EmployeeGoalDashboard 
              goals={timeframeFilteredGoals}
              loading={loading}
              onRefresh={fetchData}
              title={
                selectedTimeframe !== "all" 
                  ? `${selectedTimeframe} Goals${selectedStatus !== GoalStatusFilter.ALL ? ` (${selectedStatus})` : ""}` 
                  : `${selectedStatus !== GoalStatusFilter.ALL ? `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Goals` : "All Goals"}`
              }
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default GoalsIndex;

// 