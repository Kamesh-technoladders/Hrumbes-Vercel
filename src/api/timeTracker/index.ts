import { supabase } from "@/integrations/supabase/client";
import { TimeLog } from "@/types/time-tracker-types";
import { fetchActiveTimeLog } from "./activeTimeLogAPI";

// Active Time Log API
export const checkActiveTimeLog = async (employeeId: string): Promise<TimeLog | null> => {
  return await fetchActiveTimeLog(employeeId);
};

// Clock In/Out API
export const clockIn = async (
  employeeId: string,
  notes: string,
  projectTimeData?: any,
  totalWorkingHours?: number
): Promise<TimeLog | null> => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        employee_id: employeeId,
        date: today,
        clock_in_time: now.toISOString(),
        notes: notes,
        status: 'normal',
        project_time_data: projectTimeData || null,
        total_working_hours: totalWorkingHours || 8
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data as TimeLog;
  } catch (error) {
    console.error('Error clocking in:', error);
    return null;
  }
};

export const clockOut = async (
  timeLogId: string,
  elapsedSeconds: number,
  inGracePeriod: boolean
): Promise<boolean> => {
  try {
    const now = new Date();
    const durationMinutes = Math.floor(elapsedSeconds / 60);
    
    const { error } = await supabase
      .from('time_logs')
      .update({
        clock_out_time: now.toISOString(),
        duration_minutes: durationMinutes,
        status: inGracePeriod ? 'grace_period' : 'normal'
      })
      .eq('id', timeLogId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clocking out:', error);
    return false;
  }
};

export const autoTerminateTimeLog = async (
  timeLogId: string,
  elapsedSeconds: number
): Promise<boolean> => {
  try {
    const now = new Date();
    const durationMinutes = Math.floor(elapsedSeconds / 60);
    
    const { error } = await supabase
      .from('time_logs')
      .update({
        clock_out_time: now.toISOString(),
        duration_minutes: durationMinutes,
        status: 'auto_terminated'
      })
      .eq('id', timeLogId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error auto terminating time log:', error);
    return false;
  }
};

// Time Logs API
export const fetchTimeLogs = async (employeeId: string): Promise<TimeLog[]> => {
  try {
    // Remove the project relationship from the query since it's causing errors
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .order('clock_in_time', { ascending: false });
    
    if (error) throw error;
    
    // Transform the data to ensure it matches the TimeLog interface
    const typedData: TimeLog[] = (data || []).map(item => {
      return {
        id: item.id,
        employee_id: item.employee_id,
        date: item.date,
        clock_in_time: item.clock_in_time,
        clock_out_time: item.clock_out_time,
        duration_minutes: item.duration_minutes,
        project_id: item.project_id,
        notes: item.notes,
        status: item.status as TimeLog['status'],
        is_submitted: item.is_submitted || false,
        is_approved: item.is_approved || false,
        approved_at: item.approved_at || null,
        approved_by: item.approved_by || null,
        rejection_reason: item.rejection_reason || null,
        project_time_data: item.project_time_data || null,
        created_at: item.created_at || null,
        updated_at: null, // Set this to null as it's required by the type but not returned from the database
        project: item.project_id ? { name: `Project ${item.project_id.substring(0, 8)}` } : null,
        clarification_status: item.clarification_status || null,
        clarification_response: item.clarification_response || null,
        clarification_submitted_at: item.clarification_submitted_at || null,
        total_working_hours: item.total_working_hours || null
      };
    });
    
    return typedData;
  } catch (error) {
    console.error('Error fetching time logs:', error);
    return [];
  }
};

// Timesheet submission API
export const submitTimesheet = async (
  timeLogId: string,
  formData: any
): Promise<boolean> => {
  try {
    // Update the timesheet with submitted status
    const { error } = await supabase
      .from('time_logs')
      .update({
        is_submitted: true,
        notes: formData.workReport || formData.notes,
        project_time_data: formData.projectAllocations || null,
        created_at: new Date().toISOString()
      })
      .eq('id', timeLogId);
    
    if (error) throw error;
    
    // Create a timesheet approval entry (simulated)
    console.log(`Submitting timesheet for time log ${timeLogId}`);
    
    return true;
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    return false;
  }
};

// Add a consistent function to submit clarification responses
export const submitClarificationResponse = async (
  timeLogId: string,
  clarificationResponse: string
): Promise<boolean> => {
  try {
    // Update the timesheet with clarification response
    const { error } = await supabase
      .from('time_logs')
      .update({
        clarification_status: 'submitted',
        clarification_response: clarificationResponse,
        clarification_submitted_at: new Date().toISOString()
      })
      .eq('id', timeLogId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error submitting clarification:', error);
    return false;
  }
};
