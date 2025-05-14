import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import supabase from "../../config/supabaseClient";
import { toast } from "sonner";
import { X } from "lucide-react";

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientId: string;
}

const AssignEmployeeDialog = ({ open, onOpenChange, projectId, clientId }: AssignEmployeeDialogProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // State for selected employees and form data
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeAssignments, setEmployeeAssignments] = useState<
    {
      assign_employee: string;
      start_date: string;
      end_date: string;
      salary: string;
      client_billing: string;
      status: string;
      sowFile: File | null;
      noOfDays: number;
    }[]
  >([]); // Initialize as empty array

  // Fetch employees from `hr_employees`
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name, salary")
        .eq("organization_id", organization_id);
      if (!error && data) {
        setEmployees(data);
      } else {
        toast.error("Failed to fetch employees");
      }
    };
    if (organization_id) fetchEmployees();
  }, [organization_id]);

  // Handle employee selection
  const handleEmployeeSelection = (employeeId: string) => {
    if (!employeeId || selectedEmployeeIds.includes(employeeId)) return;

    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setSelectedEmployeeIds((prev) => [...prev, employeeId]);
      setEmployeeAssignments((prev) => [
        ...prev,
        {
          assign_employee: employeeId,
          start_date: "",
          end_date: "",
          salary: employee.salary?.toString() || "0",
          client_billing: "",
          status: "active",
          sowFile: null,
          noOfDays: 0,
        },
      ]);
    }
    setSelectedEmployeeId(""); // Reset dropdown
  };

  // Handle removing an employee
  const handleRemoveEmployee = (employeeId: string, index: number) => {
    setSelectedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
    setEmployeeAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle field changes
  const handleFieldChange = (index: number, field: string, value: any) => {
    const updatedList = [...employeeAssignments];
    updatedList[index][field] = value;

    // Calculate duration dynamically when start or end date changes
    if (field === "start_date" || field === "end_date") {
      if (updatedList[index].start_date && updatedList[index].end_date) {
        const duration = Math.ceil(
          (new Date(updatedList[index].end_date).getTime() -
            new Date(updatedList[index].start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        updatedList[index].noOfDays = duration > 0 ? duration : 0;
      } else {
        updatedList[index].noOfDays = 0;
      }
    }

    setEmployeeAssignments(updatedList);
  };

  // Handle file upload
  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFieldChange(index, "sowFile", e.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!user || !organization_id) {
        toast.error("Authentication error: Missing user or organization ID");
        return;
      }

      if (employeeAssignments.length === 0) {
        toast.error("Please select at least one employee");
        return;
      }

      // Validate required fields
      for (const assignment of employeeAssignments) {
        if (!assignment.assign_employee || !assignment.start_date || !assignment.end_date || !assignment.client_billing) {
          toast.error("Please fill in all required fields (Employee, Start Date, End Date, Client Billing)");
          return;
        }
      }

      const newAssignments = await Promise.all(
        employeeAssignments.map(async (employee) => {
          let sowUrl: string | null = null;
          if (employee.sowFile) {
            const fileName = `assignments/${Date.now()}-${employee.sowFile.name}`;
            const { data, error } = await supabase.storage
              .from("hr_project_files")
              .upload(fileName, employee.sowFile);
            if (error) throw error;
            sowUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/hr_project_files/${fileName}`;
          }

          return {
            id: crypto.randomUUID(),
            project_id: projectId,
            client_id: clientId,
            assign_employee: employee.assign_employee,
            start_date: employee.start_date,
            end_date: employee.end_date,
            salary: parseFloat(employee.salary) || 0,
            client_billing: parseFloat(employee.client_billing) || 0,
            status: employee.status,
            sow: sowUrl,
            organization_id,
            created_by: user.id,
            updated_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        })
      );

      const { error } = await supabase.from("hr_project_employees").insert(newAssignments);
      if (error) throw error;

      toast.success("Employees assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["project-employees"] });
      onOpenChange(false);
      setSelectedEmployeeIds([]);
      setEmployeeAssignments([]);
    } catch (error) {
      console.error("Error assigning employees:", error);
      toast.error("Failed to assign employees");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-6 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle>Assign Employees to Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div>
            <Label htmlFor="employee" className="text-sm font-medium">
              Select Employees*
            </Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={handleEmployeeSelection}
              disabled={!employees.length}
            >
              <SelectTrigger id="employee" className="mt-1.5">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem
                    key={employee.id}
                    value={employee.id}
                    disabled={selectedEmployeeIds.includes(employee.id)}
                  >
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEmployeeIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedEmployeeIds.map((employeeId, index) => {
                  const employee = employees.find((e) => e.id === employeeId);
                  return (
                    <Badge key={employeeId} variant="secondary" className="p-1 px-2">
                      {employee?.first_name} {employee?.last_name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleRemoveEmployee(employeeId, index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Employee Assignment Details */}
          {employeeAssignments.length > 0 && (
            <div className="space-y-4 border rounded-md p-4">
              <div className="grid grid-cols-7 gap-4 font-medium text-sm py-2 px-1 border-b">
                <div>Employee</div>
                <div>Start Date*</div>
                <div>End Date*</div>
                <div>Days</div>
                <div>Salary</div>
                <div>Client Billing*</div>
                <div>SOW</div>
              </div>
              {employeeAssignments.map((assignment, index) => {
                const employee = employees.find((e) => e.id === assignment.assign_employee);
                return (
                  <div key={index} className="grid grid-cols-7 gap-4 items-center">
                    <div>
                      {employee?.first_name} {employee?.last_name}
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={assignment.start_date}
                        onChange={(e) => handleFieldChange(index, "start_date", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="date"
                        value={assignment.end_date}
                        onChange={(e) => handleFieldChange(index, "end_date", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Input type="number" value={assignment.noOfDays} disabled />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={assignment.salary}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={assignment.client_billing}
                        onChange={(e) => handleFieldChange(index, "client_billing", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg"
                        onChange={(e) => handleFileUpload(index, e)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                employeeAssignments.length === 0 ||
                employeeAssignments.some(
                  (a) => !a.assign_employee || !a.start_date || !a.end_date || !a.client_billing
                )
              }
            >
              Assign Employees
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignEmployeeDialog;