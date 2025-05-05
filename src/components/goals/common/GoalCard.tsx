
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  MoreHorizontal, 
  User, 
  Users 
} from "lucide-react";
import { GoalInstance, GoalWithDetails } from "@/types/goal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoalManagement } from "@/hooks/useGoalManagement";
import { format } from "date-fns";

interface GoalCardProps {
  goal: GoalWithDetails;
  goalInstance: GoalInstance;
  allowManagement?: boolean;
  onUpdate?: () => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  goalInstance, 
  allowManagement = false,
  onUpdate
}) => {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newTargetValue, setNewTargetValue] = useState(goalInstance.targetValue);
  const [additionalTargetValue, setAdditionalTargetValue] = useState(0);
  
  const { 
    isLoading,
    handleUpdateTarget,
    handleDeleteGoal,
    handleExtendGoal,
    handleStopGoal
  } = useGoalManagement();

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      console.error("Invalid date:", dateStr);
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "stopped":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const handleUpdateClick = async () => {
    if (newTargetValue <= 0) return;
    
    const result = await handleUpdateTarget(goalInstance.id, newTargetValue);
    if (result) {
      setIsUpdateDialogOpen(false);
      if (onUpdate) onUpdate();
    }
  };

  const handleExtendClick = async () => {
    if (additionalTargetValue <= 0) return;
    
    const result = await handleExtendGoal(goalInstance.id, additionalTargetValue);
    if (result) {
      setIsExtendDialogOpen(false);
      if (onUpdate) onUpdate();
    }
  };

  const handleDeleteClick = async () => {
    const result = await handleDeleteGoal(goal.id);
    if (result) {
      setIsDeleteDialogOpen(false);
      if (onUpdate) onUpdate();
    }
  };

  const handleStopClick = async () => {
    const result = await handleStopGoal(goalInstance.id);
    if (result && onUpdate) onUpdate();
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-bold mb-1">{goal.name}</CardTitle>
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 mb-2">
                {goal.sector}
              </Badge>
            </div>
            
            {allowManagement && goalInstance.status !== "completed" && goalInstance.status !== "stopped" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Goal Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsUpdateDialogOpen(true)}>
                    Update Target
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleStopClick}>
                    Stop Goal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                    Delete Goal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {allowManagement && goalInstance.status === "completed" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Goal Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsExtendDialogOpen(true)}>
                    Extend Target
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                    Delete Goal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-500">{goal.description}</div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-xs text-gray-500">
                <Target className="h-4 w-4 mr-1 text-gray-400" />
                <span>
                  {goalInstance.currentValue} / {goalInstance.targetValue} {goal.metricUnit}
                </span>
              </div>
              
              <Badge variant="outline" className={getStatusColor(goalInstance.status)}>
                <div className="flex items-center">
                  {getStatusIcon(goalInstance.status)}
                  <span className="ml-1 capitalize">{goalInstance.status}</span>
                </div>
              </Badge>
            </div>
            
            <div>
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{goalInstance.progress}%</span>
              </div>
              <Progress value={goalInstance.progress} className="h-2" />
            </div>
            
            <div className="flex justify-between items-center pt-1">
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(goalInstance.periodStart)} - {formatDate(goalInstance.periodEnd)}</span>
              </div>
              
              {goal.assignedTo && goal.assignedTo.length > 0 && (
                <div className="flex items-center text-xs text-gray-500">
                  {goal.assignedTo.length === 1 ? (
                    <User className="h-3 w-3 mr-1" />
                  ) : (
                    <Users className="h-3 w-3 mr-1" />
                  )}
                  <span>{goal.assignedTo.length} {goal.assignedTo.length === 1 ? 'employee' : 'employees'}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Update Target Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Target Value</DialogTitle>
            <DialogDescription>
              Update the target value for this goal instance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetValue">New Target Value</Label>
              <Input
                id="targetValue"
                type="number"
                min="1"
                value={newTargetValue}
                onChange={(e) => setNewTargetValue(Number(e.target.value))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateClick} disabled={isLoading || newTargetValue <= 0}>
              {isLoading ? "Updating..." : "Update Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Extend Target Dialog */}
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Goal Target</DialogTitle>
            <DialogDescription>
              Add additional target value to this completed goal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="additionalValue">Additional Target Value</Label>
              <Input
                id="additionalValue"
                type="number"
                min="1"
                value={additionalTargetValue}
                onChange={(e) => setAdditionalTargetValue(Number(e.target.value))}
              />
            </div>
            <div className="text-sm text-gray-500">
              Current target: {goalInstance.targetValue} {goal.metricUnit}
            </div>
            <div className="text-sm font-medium">
              New target will be: {Number(goalInstance.targetValue) + additionalTargetValue} {goal.metricUnit}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendClick} disabled={isLoading || additionalTargetValue <= 0}>
              {isLoading ? "Extending..." : "Extend Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this goal and all its tracking data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClick} className="bg-red-600 hover:bg-red-700">
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GoalCard;
