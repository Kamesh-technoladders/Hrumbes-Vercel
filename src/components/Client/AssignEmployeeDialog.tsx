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
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import supabase from "../../config/supabaseClient";
import { toast } from "sonner";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";

// Mock hr_clients data (replace with actual data fetching if needed)
const hrClients = [
  {
    id: "f25b71eb-283d-4e28-a3ea-8945ec379674",
    display_name: "Buhler",
    currency: "INR",
  },
  {
    id: "7fa12834-d986-478c-a583-1f25cf2af502",
    display_name: "CAI",
    currency: "INR",
  },
  {
    id: "7f890a98-3ad0-4856-b9e0-04059f2e2735",
    display_name: "Wilco Source a CitiusTech Company",
    currency: "INR",
  },
  {
    id: "63c69b34-d638-42e1-9b92-641d8f1ed436",
    display_name: "Spruce",
    currency: "INR",
  },
  {
    id: "0a401c89-a44a-4f24-ac7f-2f0ea5a5feda",
    display_name: "Sanbrix",
    currency: "INR",
  },
  {
    id: "292b757a-fc32-42be-9f5f-9bcddb470c4d",
    display_name: "Bruhm",
    currency: "INR",
  },
  {
    id: "835d036c-14bd-4747-9fdb-ff1018698d31",
    display_name: "Mindteck",
    currency: "INR",
  },
  {
    id: "8be04b1d-777b-43f5-9b83-ecfea0ce42a6",
    display_name: "FeOs Technologies",
    currency: "INR",
  },
  {
    id: "afb615d7-a7b7-42bf-b1bb-89cfe22a01d2",
    display_name: "Ascendion",
    currency: "INR",
  },
  {
    id: "fe0c65a5-62db-4b59-b939-899a7a121445",
    display_name: "Inno Valley Works",
    currency: "USD",
  },
  {
    id: "da30dcae-b3f2-43f6-b6ae-5f2a7e3fa37e",
    display_name: "Object Edge",
    currency: "USD",
  },
];

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
      billing_type: string; // Added billing_type
      status: string;
      sowFile: File | null;
      noOfDays: number;
    }[]
  >([]);

  // Get client currency
  const client = hrClients.find((c) => c.id === clientId);
  const currencySymbol = client?.currency === "USD" ? "$" : "₹";

  // Billing type options
  const billingTypeOptions = ["LPA", "Monthly", "Hourly"];

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
          billing_type: "Monthly", // Default billing type
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
    if (field === "start_date" || field === "end_date") {
      const dateStr = value instanceof Date ? format(value, "yyyy-MM-dd") : "";
      updatedList[index][field] = dateStr;
    } else {
      updatedList[index][field] = value;
    }

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
        if (
          !assignment.assign_employee ||
          !assignment.start_date ||
          !assignment.end_date ||
          !assignment.client_billing ||
          !assignment.billing_type
        ) {
          toast.error("Please fill in all required fields (Employee, Start Date, End Date, Client Billing, Billing Type)");
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
            billing_type: employee.billing_type, // Include billing_type
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
      <DialogContent className="w-full max-w-[90vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto p-4 sm:p-6 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Assign Employees to Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                      <span className="truncate max-w-[150px]">
                        {employee?.first_name} {employee?.last_name}
                      </span>
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
  <div className="space-y-4 border rounded-md p-4 overflow-x-auto">
    {/* Header Row */}
    <div className="grid grid-cols-7 gap-4 font-medium text-sm py-2 px-2 border-b min-w-[900px]">
      <div className="min-w-[120px]">Employee</div>
      <div className="min-w-[140px]">Start Date*</div>
      <div className="min-w-[140px]">End Date*</div>
      <div className="min-w-[80px]">Days</div>
      <div className="min-w-[100px]">Salary</div>
      <div className="min-w-[200px]">Client Billing*</div>
      <div className="min-w-[150px]">SOW</div>
    </div>
    {/* Employee Rows */}
    {employeeAssignments.map((assignment, index) => {
      const employee = employees.find((e) => e.id === assignment.assign_employee);
      const startDate = assignment.start_date ? new Date(assignment.start_date) : null;
      const endDate = assignment.end_date ? new Date(assignment.end_date) : null;
      return (
        <div
          key={index}
          className="grid grid-cols-7 gap-4 items-center py-2 px-2 min-w-[900px]"
        >
          {/* Employee Name */}
          <div className="text-sm min-w-[120px]">
            {employee?.first_name} {employee?.last_name}
          </div>
          {/* Start Date */}
          <div className="min-w-[140px]">
            <Label className="text-sm font-medium block mb-1">Start Date*</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-sm",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Select Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => handleFieldChange(index, "start_date", date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  fromDate={new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          {/* End Date */}
          <div className="min-w-[140px]">
            <Label className="text-sm font-medium block mb-1">End Date*</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-sm",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Select Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => handleFieldChange(index, "end_date", date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  fromDate={startDate || new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          {/* Days */}
          <div className="min-w-[80px]">
            <Label className="text-sm font-medium block mb-1">Days</Label>
            <Input
              type="number"
              value={assignment.noOfDays}
              disabled
              className="w-full text-sm bg-gray-100"
            />
          </div>
          {/* Salary */}
          <div className="min-w-[100px]">
            <Label className="text-sm font-medium block mb-1">Salary</Label>
            <Input
              type="number"
              value={assignment.salary}
              disabled
              className="w-full text-sm bg-gray-100"
            />
          </div>
          {/* Client Billing */}
          <div className="min-w-[200px] flex items-end gap-2">
            <div className="relative flex-1">
              <Label className="text-sm font-medium block mb-1">Client Billing*</Label>
              <span className="absolute left-2 top-[60%] -translate-y-1/2 text-sm text-gray-500">
                {currencySymbol}
              </span>
              <Input
                type="number"
                value={assignment.client_billing}
                onChange={(e) => handleFieldChange(index, "client_billing", e.target.value)}
                placeholder="Enter billing amount"
                required
                className="w-full pl-6 text-sm rounded-r-none"
              />
            </div>
            <Select
              value={assignment.billing_type}
              onValueChange={(value) => handleFieldChange(index, "billing_type", value)}
              required
            >
              <SelectTrigger className="w-[110px] text-sm rounded-l-none border-l-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {billingTypeOptions.map((type) => (
                  <SelectItem key={type} value={type} className="text-sm">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* SOW */}
          <div className="min-w-[150px]">
            <Label className="text-sm font-medium block mb-1">SOW</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg"
              onChange={(e) => handleFileUpload(index, e)}
              className="w-full text-sm file:mr-2 file:text-sm"
            />
          </div>
        </div>
      );
    })}
  </div>
)}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                employeeAssignments.length === 0 ||
                employeeAssignments.some(
                  (a) =>
                    !a.assign_employee ||
                    !a.start_date ||
                    !a.end_date ||
                    !a.client_billing ||
                    !a.billing_type
                )
              }
              className="w-full sm:w-auto"
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