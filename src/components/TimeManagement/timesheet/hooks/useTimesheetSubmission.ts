import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { submitTimesheet } from '@/api/timeTracker';

interface SubmissionParams {
  employeeId: string;
  title: string;
  workReport: string;
  totalWorkingHours: number;
  employeeHasProjects: boolean;
  projectEntries: { projectId: string; hours: number; report: string; clientId?: string }[];
  detailedEntries: DetailedTimesheetEntry[];
  timeLogId?: string;
}

export const useTimesheetSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitTimesheetHook = async ({
    employeeId,
    title,
    workReport,
    totalWorkingHours,
    employeeHasProjects,
    projectEntries,
    detailedEntries,
    timeLogId,
  }: SubmissionParams): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      const formData = {
        employeeId,
        title,
        workReport,
        totalWorkingHours,
        projectEntries: employeeHasProjects
          ? projectEntries.filter((entry) => entry.projectId && entry.hours > 0)
          : [],
        detailedEntries,
      };

      let targetTimeLogId = timeLogId;

      if (!targetTimeLogId) {
        const today = new Date().toISOString().split('T')[0];
        const { data: existingLogs, error: fetchError } = await supabase
          .from('time_logs')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('date', today)
          .eq('is_submitted', false)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        targetTimeLogId = existingLogs?.id;
      }

      if (!targetTimeLogId) {
        const notesObject = { title, workReport };
        const durationMinutes = Math.round(totalWorkingHours * 60);
        const projectTimeData = employeeHasProjects
          ? { projects: projectEntries.filter((entry) => entry.projectId && entry.hours > 0) }
          : { entries: detailedEntries };

        const { data, error: insertError } = await supabase
          .from('time_logs')
          .insert({
            employee_id: employeeId,
            date: new Date().toISOString().split('T')[0],
            clock_in_time: new Date().toISOString(),
            notes: JSON.stringify(notesObject),
            total_working_hours: totalWorkingHours,
            duration_minutes: durationMinutes,
            project_time_data: projectTimeData,
            status: 'normal',
            is_submitted: false,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        targetTimeLogId = data.id;
      }

      const success = await submitTimesheet(targetTimeLogId, formData);

      if (!success) throw new Error('Failed to submit timesheet');

      toast.success('Timesheet submitted successfully');
      return true;
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Failed to submit timesheet');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submitTimesheet: submitTimesheetHook };
};