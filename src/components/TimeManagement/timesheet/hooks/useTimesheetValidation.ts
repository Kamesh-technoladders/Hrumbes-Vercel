import { toast } from "@/hooks/use-toast";
import { DetailedTimesheetEntry } from "@/types/time-tracker-types";

interface ValidationProps {
  employeeHasProjects: boolean;
  projectEntries: { projectId: string; hours: number; report: string }[];
  detailedEntries: DetailedTimesheetEntry[];
  clockIn?: string; // Added for clock-in validation
  clockOut?: string; // Added for clock-out validation
}

export const useTimesheetValidation = () => {
  const validateForm = ({
    employeeHasProjects,
    projectEntries,
    detailedEntries,
    clockIn,
    clockOut,
  }: ValidationProps): boolean => {
    // Validate clockIn and clockOut
    if (!clockIn || !clockOut) {
      toast({
        title: "Missing time information",
        description: "Please provide both clock-in and clock-out times.",
        variant: "destructive",
      });
      return false;
    }

    const timeFormat = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeFormat.test(clockIn) || !timeFormat.test(clockOut)) {
      toast({
        title: "Invalid time format",
        description: "Clock-in and clock-out times must be in HH:mm format (e.g., 08:30).",
        variant: "destructive",
      });
      return false;
    }

    if (employeeHasProjects) {
      const validProjectEntries = projectEntries.filter(p => p.projectId);

      if (validProjectEntries.length === 0) {
        toast({
          title: "Missing information",
          description: "Please add at least one project",
          variant: "destructive",
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
          variant: "destructive",
        });
        return false;
      }

      // Removed 8-hour validation for project entries
    } else if (detailedEntries.length > 0) {
      // Removed 8-hour validation for detailed entries
    }

    return true;
  };

  return { validateForm };
};