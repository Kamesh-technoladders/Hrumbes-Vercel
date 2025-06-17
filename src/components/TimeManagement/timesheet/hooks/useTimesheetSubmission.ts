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
  clockIn?: string;
  clockOut?: string;
  organization_id: string;
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
    clockIn,
    clockOut,
    organization_id
  }: SubmissionParams): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      // Log top-level clockIn and clockOut
      if (clockIn == null) {
        console.warn('Debug: Top-level clockIn is null or undefined', { employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: Top-level clockIn', { clockIn, employeeId, date: date.toISOString() });
      }
      if (clockOut == null) {
        console.warn('Debug: Top-level clockOut is null or undefined', { employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: Top-level clockOut', { clockOut, employeeId, date: date.toISOString() });
      }

      // Calculate earliest clock-in and latest clock-out from projectEntries
      let earliestClockIn: string | null = null;
      let latestClockOut: string | null = null;

      if (employeeHasProjects && projectEntries.length > 0) {
        const validEntries = projectEntries.filter(
          (entry) => entry.clockIn && entry.clockOut && entry.hours > 0
        );
        if (validEntries.length > 0) {
          earliestClockIn = validEntries.reduce((earliest, entry) =>
            !earliest || (entry.clockIn && entry.clockIn < earliest) ? entry.clockIn : earliest,
            validEntries[0].clockIn || ''
          );
          latestClockOut = validEntries.reduce((latest, entry) =>
            !latest || (entry.clockOut && entry.clockOut > latest) ? entry.clockOut : latest,
            validEntries[0].clockOut || ''
          );
        }
      }

      // Log earliestClockIn and latestClockOut
      if (earliestClockIn == null) {
        console.warn('Debug: earliestClockIn is null (no valid project entries)', { employeeHasProjects, projectEntries, employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: earliestClockIn from projectEntries', { earliestClockIn, employeeId, date: date.toISOString() });
      }
      if (latestClockOut == null) {
        console.warn('Debug: latestClockOut is null (no valid project entries)', { employeeHasProjects, projectEntries, employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: latestClockOut from projectEntries', { latestClockOut, employeeId, date: date.toISOString() });
      }

      // Convert date and times to ISO format
      const dateString = date.toISOString().split('T')[0];
      const clockInTime = clockIn
        ? new Date(`${dateString}T${clockIn}:00Z`).toISOString()
        : earliestClockIn
          ? new Date(`${dateString}T${earliestClockIn}:00Z`).toISOString()
          : new Date().toISOString();
      const clockOutTime = clockOut
        ? new Date(`${dateString}T${clockOut}:00Z`).toISOString()
        : latestClockOut
          ? new Date(`${dateString}T${latestClockOut}:00Z`).toISOString()
          : null;

      // Log final clockInTime and clockOutTime
      console.log('Debug: Final clockInTime', { clockInTime, source: clockIn ? 'top-level' : earliestClockIn ? 'projectEntries' : 'default', employeeId, date: date.toISOString() });
      console.log('Debug: Final clockOutTime', { clockOutTime, source: clockOut ? 'top-level' : latestClockOut ? 'projectEntries' : 'null', employeeId, date: date.toISOString() });

      // Calculate duration_minutes
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

        // Log insertion payload
        const insertPayload = {
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
          organization_id,
        };
        console.log('Debug: Supabase insert payload', insertPayload);

        const { data, error: insertError } = await supabase
          .from('time_logs')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insertError) {
          console.error('Debug: Supabase insert error', insertError);
          throw insertError;
        }
        targetTimeLogId = data.id;
      } else {
        // Update existing time_log with clock_in_time and clock_out_time
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

        // Log update payload
        const updatePayload = {
          clock_in_time: clockInTime,
          clock_out_time: clockOutTime,
          notes: JSON.stringify(notesObject),
          total_working_hours: totalWorkingHours,
          duration_minutes: durationMinutes,
          project_time_data: projectTimeData,
          updated_at: new Date().toISOString(),
        };
        console.log('Debug: Supabase update payload', updatePayload);

        const { error: updateError } = await supabase
          .from('time_logs')
          .update(updatePayload)
          .eq('id', targetTimeLogId)
          .eq('employee_id', employeeId)
          .eq('is_submitted', false);

        if (updateError) {
          console.error('Debug: Supabase update error', updateError);
          throw updateError;
        }
      }

      // Log formData before submitTimesheet
      console.log('Debug: formData for submitTimesheet', formData);

      const success = await submitTimesheet(targetTimeLogId, formData);

      if (!success) {
        console.error('Debug: submitTimesheet failed', { targetTimeLogId, formData });
        throw new Error('Failed to submit timesheet');
      }

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