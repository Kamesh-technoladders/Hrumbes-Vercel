import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { submitTimesheet } from '@/api/timeTracker';

interface ProjectEntry {
  projectId: string;
  clockIn?: string;
  clockOut?: string;
  hours: number;
  report: string;
  clientId?: string;
}

interface SubmissionParams {
  employeeId: string;
  title: string;
  workReport: string;
  totalWorkingHours: number;
  employeeHasProjects: boolean;
  projectEntries: ProjectEntry[];
  detailedEntries: DetailedTimesheetEntry[];
  timeLogId?: string;
  date: Date;
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
    date,
  }: SubmissionParams): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      // Calculate earliest clock-in and latest clock-out for the time_logs table
      let earliestClockIn: string | null = null;
      let latestClockOut: string | null = null;

      if (employeeHasProjects && projectEntries.length > 0) {
        const validEntries = projectEntries.filter(
          (entry) => entry.clockIn && entry.clockOut && entry.hours > 0
        );
        if (validEntries.length > 0) {
          earliestClockIn = validEntries.reduce((earliest, entry) =>
            !earliest || (entry.clockIn && entry.clockIn < earliest) ? entry.clockIn : earliest,
            validEntries[0].clockIn!
          );
          latestClockOut = validEntries.reduce((latest, entry) =>
            !latest || (entry.clockOut && entry.clockOut > latest) ? entry.clockOut : latest,
            validEntries[0].clockOut!
          );
        }
      }

      // Convert date and times to ISO format for database
      const dateString = date.toISOString().split('T')[0];
      const clockInTime = earliestClockIn
        ? new Date(`${dateString}T${earliestClockIn}:00Z`).toISOString()
        : new Date().toISOString();
      const clockOutTime = latestClockOut
        ? new Date(`${dateString}T${latestClockOut}:00Z`).toISOString()
        : null;

      // Calculate duration_minutes from totalWorkingHours
      const durationMinutes = Math.round(totalWorkingHours * 60);

      const formData = {
        employeeId,
        title,
        workReport,
        totalWorkingHours,
        projectEntries: employeeHasProjects
          ? projectEntries
              .filter((entry) => entry.projectId && entry.hours > 0)
              .map(({ projectId, hours, report, clockIn, clockOut, clientId }) => ({
                projectId,
                hours,
                report,
                clockIn,
                clockOut,
                clientId,
              }))
          : [],
        detailedEntries,
      };

      let targetTimeLogId = timeLogId;

      if (!targetTimeLogId) {
        const { data: existingLogs, error: fetchError } = await supabase
          .from('time_logs')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('date', dateString)
          .eq('is_submitted', false)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        targetTimeLogId = existingLogs?.id;
      }

      if (!targetTimeLogId) {
        const notesObject = { title, workReport };
        const projectTimeData = employeeHasProjects
          ? {
              projects: projectEntries
                .filter((entry) => entry.projectId && entry.hours > 0)
                .map(({ projectId, hours, report, clockIn, clockOut, clientId }) => ({
                  projectId,
                  hours,
                  report,
                  clockIn,
                  clockOut,
                  clientId,
                })),
            }
          : { entries: detailedEntries };

        const { data, error: insertError } = await supabase
          .from('time_logs')
          .insert({
            employee_id: employeeId,
            date: dateString,
            clock_in_time: clockInTime,
            clock_out_time: clockOutTime,
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