
import { toast } from "@/hooks/use-toast";
import { DetailedTimesheetEntry } from "@/types/time-tracker-types";

interface ValidationProps {
  title: string;
  employeeHasProjects: boolean;
  projectEntries: { projectId: string; hours: number; report: string }[];
  detailedEntries: DetailedTimesheetEntry[];
  totalWorkingHours: number;
}

export const useTimesheetValidation = () => {
  const validateForm = ({
    title,
    employeeHasProjects,
    projectEntries,
    detailedEntries,
    totalWorkingHours
  }: ValidationProps): boolean => {
    if (!title.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a timesheet title",
        variant: "destructive"
      });
      return false;
    }

    if (employeeHasProjects) {
      const validProjectEntries = projectEntries.filter(p => p.projectId);

      if (validProjectEntries.length === 0) {
        toast({
          title: "Missing information",
          description: "Please add at least one project",
          variant: "destructive"
        });
        return false;
      }

      const invalidProject = validProjectEntries.find(p => 
        !p.projectId || p.hours <= 0 || !p.report.trim()
      );
      
      if (invalidProject) {
        toast({
          title: "Invalid project entry",
          description: "Please complete all project details including hours and project report",
          variant: "destructive"
        });
        return false;
      }

      const totalProjectHours = validProjectEntries.reduce((sum, entry) => sum + entry.hours, 0);
      if (totalProjectHours > totalWorkingHours) {
        toast({
          title: "Hours exceeded",
          description: "Total project hours cannot exceed total working hours",
          variant: "destructive"
        });
        return false;
      }
    } else if (detailedEntries.length > 0) {
      const totalDetailedHours = detailedEntries.reduce((sum, entry) => sum + entry.hours, 0);
      if (totalDetailedHours > totalWorkingHours) {
        toast({
          title: "Hours exceeded",
          description: "Total detailed hours cannot exceed total working hours",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  return { validateForm };
};
