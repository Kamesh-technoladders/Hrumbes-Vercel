
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TimeLog } from "@/types/time-tracker-types";

// Fetch pending timesheets that need approval
export const fetchPendingTimesheets = async (): Promise<TimeLog[]> => {
  try {
    const { data, error } = await supabase
      .from('timesheet_approvals')
      .select(`
        *,
        time_logs:time_log_id(
          *,
          employee:hr_employees!time_logs_employee_id_fkey(
        id,
        first_name,
        last_name,
        department_id,
        email
      )
        )
      `)
      .eq('status', 'pending')
      .is('clarification_status', null)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('Pending timesheets fetched:', data);
    
    // Transform data to match TimeLog type with approval info
    const typedData = (data || []).map(item => ({
      ...item.time_logs,
      approval_id: item.id,
      approval_status: item.status,
      clarification_status: item.clarification_status,
      clarification_response: item.clarification_response,
      clarification_submitted_at: item.clarification_submitted_at,
      rejection_reason: item.rejection_reason,
      submitted_at: item.submitted_at,
      updated_at: null, // Explicitly provide null for updated_at
      project: null // Ensure project property exists
    })) as TimeLog[];
    
    return typedData;
  } catch (error: any) {
    console.error("Error fetching pending timesheets:", error);
    toast.error("Failed to load pending timesheets");
    return [];
  }
};

// Fetch timesheets where clarification has been submitted
export const fetchClarificationTimesheets = async (): Promise<TimeLog[]> => {
  try {
    const { data, error } = await supabase
      .from('timesheet_approvals')
      .select(`
        *,
        time_logs:time_log_id(
          *,
          employee:hr_employees!time_logs_employee_id_fkey(
        id,
        first_name,
        last_name,
        department_id,
        email
      )
        )
      `)
      .eq('clarification_status', 'submitted');
    
    if (error) throw error;
    
    // Transform data to match TimeLog type with approval info
    const typedData = (data || []).map(item => ({
      ...item.time_logs,
      approval_id: item.id,
      approval_status: item.status,
      clarification_status: item.clarification_status,
      clarification_response: item.clarification_response,
      clarification_submitted_at: item.clarification_submitted_at,
      rejection_reason: item.rejection_reason,
      submitted_at: item.submitted_at,
      updated_at: null, // Explicitly provide null for updated_at
      project: null // Ensure project property exists
    })) as TimeLog[];
    
    return typedData;
  } catch (error: any) {
    console.error("Error fetching clarification timesheets:", error);
    toast.error("Failed to load clarification timesheets");
    return [];
  }
};

// Fetch approved timesheets
export const fetchApprovedTimesheets = async (): Promise<TimeLog[]> => {
  try {
    const { data, error } = await supabase
      .from('timesheet_approvals')
      .select(`
        *,
        time_logs:time_log_id(
          *,
         employee:hr_employees!time_logs_employee_id_fkey(
        id,
        first_name,
        last_name,
        department_id,
        email
      )
        )
      `)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Transform data to match TimeLog type with approval info
    const typedData = (data || []).map(item => ({
      ...item.time_logs,
      approval_id: item.id,
      approval_status: item.status,
      clarification_status: item.clarification_status,
      clarification_response: item.clarification_response,
      clarification_submitted_at: item.clarification_submitted_at,
      rejection_reason: item.rejection_reason,
      submitted_at: item.submitted_at,
      updated_at: null, // Explicitly provide null for updated_at
      project: null // Ensure project property exists
    })) as TimeLog[];
    
    return typedData;
  } catch (error: any) {
    console.error("Error fetching approved timesheets:", error);
    toast.error("Failed to load approved timesheets");
    return [];
  }
};

// Approve a timesheet using the new timesheet_approvals table
export const approveTimesheet = async (approvalId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('timesheet_approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        clarification_status: null
      })
      .eq('id', approvalId);
    
    if (error) throw error;
    
    toast.success("Timesheet approved successfully");
    return true;
  } catch (error: any) {
    console.error("Error approving timesheet:", error);
    toast.error("Failed to approve timesheet");
    return false;
  }
};

// Request clarification using the new timesheet_approvals table
export const requestClarification = async (approvalId: string, reason: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('timesheet_approvals')
      .update({
        clarification_status: 'needed',
        rejection_reason: reason
      })
      .eq('id', approvalId);
    
    if (error) throw error;
    
    toast.success("Clarification requested successfully");
    return true;
  } catch (error: any) {
    console.error("Error requesting clarification:", error);
    toast.error("Failed to request clarification");
    return false;
  }
};
