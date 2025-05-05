
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getGoals,
  getEmployees,
  assignGoalToEmployees,
} from "@/lib/supabaseData";
import { Employee, EmployeeGoalTarget, Goal, GoalType } from "@/types/goal";

interface AssignGoalsFormProps {
  onClose: () => void;
}

const AssignGoalsForm: React.FC<AssignGoalsFormProps> = ({ onClose }) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [goalType, setGoalType] = useState<GoalType>("Monthly");
  const [employeeTargets, setEmployeeTargets] = useState<Map<string, number>>(new Map());
  
  const queryClient = useQueryClient();

  // Fetch goals and employees
  const { data: goals, isLoading: isLoadingGoals } = useQuery({
    queryKey: ["goals"],
    queryFn: getGoals,
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  // Selected goal from the list
  const selectedGoal = goals?.find((goal) => goal.id === selectedGoalId);

  // Update employee targets when the selected goal changes
  useEffect(() => {
    if (selectedGoal) {
      const newMap = new Map<string, number>();
      selectedEmployees.forEach((employee) => {
        newMap.set(employee.id, selectedGoal.targetValue);
      });
      setEmployeeTargets(newMap);
    }
  }, [selectedGoal, selectedEmployees]);

  const handleEmployeeSelection = (employee: Employee, isSelected: boolean) => {
    if (isSelected) {
      setSelectedEmployees((prev) => [...prev, employee]);
      if (selectedGoal) {
        setEmployeeTargets((prev) => new Map(prev.set(employee.id, selectedGoal.targetValue)));
      }
    } else {
      setSelectedEmployees((prev) => prev.filter((e) => e.id !== employee.id));
      setEmployeeTargets((prev) => {
        const newMap = new Map(prev);
        newMap.delete(employee.id);
        return newMap;
      });
    }
  };

  const handleTargetChange = (employeeId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEmployeeTargets((prev) => new Map(prev.set(employeeId, numValue)));
    }
  };

  // Assign goals mutation
  const assignGoalsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGoalId || selectedEmployees.length === 0) {
        throw new Error("Please select a goal and at least one employee");
      }

      const employeeGoalTargets: EmployeeGoalTarget[] = selectedEmployees.map(
        (employee) => ({
          employee,
          targetValue: employeeTargets.get(employee.id) || (selectedGoal?.targetValue || 0),
        })
      );

      return await assignGoalToEmployees(selectedGoalId, selectedEmployees.map((e) => e.id), goalType, employeeGoalTargets);
    },
    onSuccess: () => {
      toast.success("Goals assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error assigning goals: ${error.message}`);
    },
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Assign Goals to Employees</DialogTitle>
      </DialogHeader>

      <form onSubmit={(e) => { e.preventDefault(); assignGoalsMutation.mutate(); }} className="space-y-6">
        {/* Goal Selection */}
        <div className="space-y-2">
          <Label htmlFor="goal">Select a Goal</Label>
          <Select
            value={selectedGoalId}
            onValueChange={(value) => setSelectedGoalId(value)}
            disabled={isLoadingGoals || assignGoalsMutation.isPending}
          >
            <SelectTrigger id="goal">
              <SelectValue placeholder="Select a goal to assign" />
            </SelectTrigger>
            <SelectContent>
              {goals?.map((goal) => (
                <SelectItem key={goal.id} value={goal.id}>
                  {goal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Goal Type (Daily, Weekly, Monthly, Yearly) */}
        <div className="space-y-2">
          <Label htmlFor="goalType">Goal Type</Label>
          <Select
            value={goalType}
            onValueChange={(value) => setGoalType(value as GoalType)}
            disabled={assignGoalsMutation.isPending}
          >
            <SelectTrigger id="goalType">
              <SelectValue placeholder="Select goal type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {goalType === "Daily" && "Daily goals reset each day. Progress is tracked daily."}
            {goalType === "Weekly" && "Weekly goals reset each week. Progress is tracked weekly from Monday to Sunday."}
            {goalType === "Monthly" && "Monthly goals reset each month. Progress is tracked monthly."}
            {goalType === "Yearly" && "Yearly goals reset each year. Progress is tracked annually."}
          </p>
        </div>

        <Separator />

        {/* Employee Selection */}
        <div className="space-y-2">
          <Label>Select Employees</Label>
          <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
            {isLoadingEmployees ? (
              <p className="text-center py-4 text-sm text-muted-foreground">
                Loading employees...
              </p>
            ) : employees && employees.length > 0 ? (
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={selectedEmployees.some((e) => e.id === employee.id)}
                        onCheckedChange={(checked) =>
                          handleEmployeeSelection(employee, checked === true)
                        }
                        disabled={assignGoalsMutation.isPending}
                      />
                      <Label
                        htmlFor={`employee-${employee.id}`}
                        className="cursor-pointer"
                      >
                        {employee.name}
                      </Label>
                    </div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-sm text-muted-foreground">
                No employees found
              </p>
            )}
          </div>
        </div>

        {/* Target Values for each employee */}
        {selectedEmployees.length > 0 && selectedGoal && (
          <div className="space-y-2">
            <Label>Set Target Values</Label>
            <div className="space-y-2 border rounded-md p-4">
              <div className="grid grid-cols-2 gap-4 font-medium text-sm py-2 px-1 border-b">
                <div>Employee</div>
                <div>Target Value ({selectedGoal.metricUnit})</div>
              </div>
              {selectedEmployees.map((employee) => (
                <div key={employee.id} className="grid grid-cols-2 gap-4 items-center">
                  <div>{employee.name}</div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={employeeTargets.get(employee.id) || selectedGoal.targetValue}
                    onChange={(e) => handleTargetChange(employee.id, e.target.value)}
                    disabled={assignGoalsMutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={assignGoalsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              !selectedGoalId ||
              selectedEmployees.length === 0 ||
              assignGoalsMutation.isPending
            }
          >
            {assignGoalsMutation.isPending ? "Assigning..." : "Assign Goals"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default AssignGoalsForm;
