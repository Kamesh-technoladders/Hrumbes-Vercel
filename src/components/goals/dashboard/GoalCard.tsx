
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Users, 
  CheckCircle, 
  Calendar, 
  Clock, 
  BarChart3, 
  Target, 
  ArrowUpRight 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GoalWithDetails } from "@/types/goal";
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GoalCardProps {
  goal: GoalWithDetails;
  delay?: number;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, delay = 0 }) => {
  const navigate = useNavigate();
  
  // Calculate aggregated values from all assignments
  const totalTargetValue = goal.assignments?.reduce((sum, assignment) => sum + assignment.targetValue, 0) || 0;
  const totalCurrentValue = goal.assignments?.reduce((sum, assignment) => sum + assignment.currentValue, 0) || 0;
  const overallProgress = totalTargetValue > 0 ? Math.min(Math.round((totalCurrentValue / totalTargetValue) * 100), 100) : 0;
  
  // Determine overall status
  const getOverallStatus = () => {
    if (!goal.assignments || goal.assignments.length === 0) return 'pending';
    
    if (goal.assignments.every(a => a.status === 'completed')) {
      return 'completed';
    }
    
    if (goal.assignments.some(a => a.status === 'overdue')) {
      return 'overdue';
    }
    
    if (goal.assignments.some(a => a.status === 'in-progress')) {
      return 'in-progress';
    }
    
    return 'pending';
  };
  
  const status = getOverallStatus();
  
  // Get all goal types for this goal
  const goalTypes = Array.from(new Set(goal.assignments?.map(a => a.goalType) || []));
  
  // Get employee count
  const employeeCount = goal.assignedTo?.length || 0;
  
  const handleClick = () => {
    navigate(`/goals/${goal.id}`);
  };

  // Get the appropriate status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  // Get badge classes based on status
  const getStatusBadgeClasses = () => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 border-green-200";
      case 'in-progress':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'overdue':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col animate-in fade-in-50 slide-in-from-bottom-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <Badge variant="outline" className="mb-2">
            {goal.sector}
          </Badge>
          <Badge variant="outline" className={getStatusBadgeClasses()}>
            <span className="flex items-center">
              {getStatusIcon()}
              <span className="ml-1 capitalize">{status}</span>
            </span>
          </Badge>
        </div>
        <CardTitle className="text-xl">{goal.name}</CardTitle>
      </CardHeader>

      <CardContent className="py-2 flex-grow">
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {goal.description}
        </p>

        <div className="space-y-4">
          {/* Goal Types */}
          <div className="flex flex-wrap gap-2 mb-3">
            {goalTypes.map(type => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>

          {/* Employee Assignment */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>Assigned to:</span>
            </div>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">
              {employeeCount} {employeeCount === 1 ? 'Employee' : 'Employees'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Target Values */}
          <div className="flex justify-between text-sm">
            <div className="flex items-center text-gray-500">
              <Target className="h-4 w-4 mr-1" />
              <span>Target:</span>
            </div>
            <div className="font-medium">
              {totalCurrentValue} / {totalTargetValue}
              <span className="ml-1 text-xs text-gray-500">{goal.metricUnit}</span>
            </div>
          </div>

          {/* Employee Tooltips */}
          {employeeCount > 0 && (
            <div className="flex items-center mt-2">
              <TooltipProvider>
                <div className="flex -space-x-2 overflow-hidden">
                  {goal.assignedTo?.slice(0, 3).map((employee, idx) => (
                    <Tooltip key={employee.id}>
                      <TooltipTrigger asChild>
                        <div 
                          className="inline-block h-8 w-8 rounded-full border-2 border-white bg-gray-200 text-xs flex items-center justify-center font-medium"
                          style={{ zIndex: 10 - idx }}
                        >
                          {employee.avatar ? (
                            <img 
                              src={employee.avatar} 
                              alt={employee.name} 
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            employee.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{employee.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  
                  {employeeCount > 3 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="inline-block h-8 w-8 rounded-full border-2 border-white bg-gray-200 text-xs flex items-center justify-center font-medium"
                          style={{ zIndex: 7 }}
                        >
                          +{employeeCount - 3}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{employeeCount - 3} more employees</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button 
          onClick={handleClick} 
          variant="default" 
          className="w-full"
        >
          View Details
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GoalCard;
