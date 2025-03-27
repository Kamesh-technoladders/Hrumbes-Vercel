
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MainStatus, SubStatus } from "@/types/supabase-extensions";
import { useSelector } from "react-redux";

// Fetch all statuses with their sub-statuses
export const fetchAllStatuses = async (organizationId?: string): Promise<MainStatus[]> => {
  try {
    // First, get all main statuses
    const { data: mainStatuses, error: mainError } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('type', 'main')
      .order('display_order', { ascending: true });

    if (mainError) throw mainError;

    // Then, get all sub-statuses
    const { data: subStatuses, error: subError } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('type', 'sub')
      .order('display_order', { ascending: true });

    if (subError) throw subError;

    // Map sub-statuses to their parent statuses
    const result = mainStatuses.map(mainStatus => {
      const subs = subStatuses.filter(sub => sub.parent_id === mainStatus.id);
      return {
        ...mainStatus,
        subStatuses: subs
      };
    });

    return result;
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return [];
  }
};

// Get a specific status by ID
export const getStatusById = async (statusId: string): Promise<MainStatus | SubStatus | null> => {
  try {
    const { data, error } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('id', statusId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching status:', error);
    return null;
  }
};

// Update candidate status
export const updateCandidateStatus = async (
  candidateId: string | number, 
  subStatusId: string,
  userId?: string,
  organizationId?: string
): Promise<boolean> => {
  try {
    // Get the sub status to find its parent
    const { data: subStatus, error: subError } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('id', subStatusId)
      .single();
    
    if (subError) throw subError;
    
    // Now update the candidate with both main and sub status
    const { error } = await supabase
      .from('hr_job_candidates')
      .update({
        main_status_id: subStatus.parent_id,
        sub_status_id: subStatusId,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
        organization_id: organizationId || null
      })
      .eq('id', candidateId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating candidate status:', error);
    return false;
  }
};

// Create a new status
export const createStatus = async (
  status: Partial<MainStatus> | Partial<SubStatus>, 
  organizationId?: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('job_statuses')
      .insert({ ...status, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating status:', error);
    return null;
  }
};

// Get progress mapping for a status
export const getProgressForStatus = async (statusId: string): Promise<{
  screening: boolean;
  interview: boolean;
  offer: boolean;
  hired: boolean;
  joined: boolean;
}> => {
  try {
    // Default progress state (all false)
    const defaultProgress = {
      screening: false,
      interview: false,
      offer: false,
      hired: false,
      joined: false
    };
    
    if (!statusId) return defaultProgress;
    
    // Get the status
    const { data: status, error } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('id', statusId)
      .single();
    
    if (error) return defaultProgress;
    
    // If it's a sub-status, get its parent
    let mainStatus = status;
    if (status.type === 'sub') {
      const { data: parent, error: parentError } = await supabase
        .from('job_statuses')
        .select('*')
        .eq('id', status.parent_id)
        .single();
      
      if (parentError) return defaultProgress;
      mainStatus = parent;
    }
    
    // Map the main status name to progress
    // Create a progress map based on the sequence of stages
    const stages = ['Screening', 'Interview', 'Offer', 'Hired', 'Joined'];
    const stageIndex = stages.indexOf(mainStatus.name);
    
    if (stageIndex === -1) return defaultProgress;
    
    // Set progress based on the stage index
    return {
      screening: stageIndex >= 0,
      interview: stageIndex >= 1,
      offer: stageIndex >= 2,
      hired: stageIndex >= 3,
      joined: stageIndex >= 4
    };
  } catch (error) {
    console.error('Error getting progress for status:', error);
    return {
      screening: false,
      interview: false,
      offer: false,
      hired: false,
      joined: false
    };
  }
};
