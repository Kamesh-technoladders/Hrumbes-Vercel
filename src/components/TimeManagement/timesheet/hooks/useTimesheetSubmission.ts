
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';

interface SubmissionParams {
  employeeId: string;
  title: string;
  workReport: string;
  totalWorkingHours: number;
  employeeHasProjects: boolean;
  projectEntries: { projectId: string; hours: number; report: string }[];
  detailedEntries: DetailedTimesheetEntry[];
}

export const useTimesheetSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitTimesheet = async ({
    employeeId,
    title,
    workReport,
    totalWorkingHours,
    employeeHasProjects,
    projectEntries,
    detailedEntries
  }: SubmissionParams): Promise<boolean> => {
    setIsSubmitting(true);
    
    try {
      // Prepare notes object
      const notesObject = {
        title,
        workReport
      };
      
      // Prepare project time data
      let projectTimeData;
      
      if (employeeHasProjects) {
        projectTimeData = {
          projects: projectEntries.filter(entry => entry.projectId && entry.hours > 0),
        };
      } else {
        projectTimeData = {
          entries: detailedEntries
        };
      }
      
      // Calculate duration in minutes from total working hours
      const durationMinutes = Math.round(totalWorkingHours * 60);
      
      const { error } = await supabase
        .from('time_logs')
        .insert({
          employee_id: employeeId,
          date: new Date().toISOString(),
          notes: JSON.stringify(notesObject),
          total_working_hours: totalWorkingHours,
          duration_minutes: durationMinutes,
          project_time_data: projectTimeData,
          is_submitted: true  // Mark as submitted right away
        });
      
      if (error) throw error;
      
      toast("Timesheet created successfully");
      return true;
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast("Failed to create timesheet");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submitTimesheet };
};
