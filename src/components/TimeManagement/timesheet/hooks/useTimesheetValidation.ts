import { toast } from "@/hooks/use-toast";
import { DetailedTimesheetEntry } from "@/types/time-tracker-types";

interface ValidationProps {
  employeeHasProjects: boolean;
  projectEntries: { projectId: string; hours: number; report: string }[];
  detailedEntries: DetailedTimesheetEntry[];
}

export const useTimesheetValidation = () => {
  const validateForm = ({
    employeeHasProjects,
    projectEntries,
    detailedEntries,
  }: ValidationProps): boolean => {
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
        !p.projectId || (p.hours > 0 && !p.report.trim())
      );
      
      if (invalidProject) {
        toast({
          title: "Invalid project entry",
          description: "Please provide a work summary for projects with non-zero hours",
          variant: "destructive"
        });
        return false;
      }

      const totalProjectHours = validProjectEntries.reduce((sum, entry) => sum + entry.hours, 0);
      if (totalProjectHours > 8) {
        toast({
          title: "Hours exceeded",
          description: "Total project hours cannot exceed 8 hours",
          variant: "destructive"
        });
        return false;
      }
    } else if (detailedEntries.length > 0) {
      const totalDetailedHours = detailedEntries.reduce((sum, entry) => sum + entry.hours, 0);
      if (totalDetailedHours > 8) {
        toast({
          title: "Hours exceeded",
          description: "Total detailed hours cannot exceed 8 hours",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  return { validateForm };
};