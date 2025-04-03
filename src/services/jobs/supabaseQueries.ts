
import { supabase } from "@/integrations/supabase/client";

// Basic query functions for hr_jobs table
export const fetchAllJobs = async () => {
  const { data, error } = await supabase
    .from("hr_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }

  return { data, error };
};

export const fetchJobsByType = async (jobType: string) => {
  const { data, error } = await supabase
    .from("hr_jobs")
    .select("*")
    .eq("job_type_category", jobType)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error fetching ${jobType} jobs:`, error);
    throw error;
  }

  return { data, error };
};

export const fetchJobById = async (id: string) => {
  const { data, error } = await supabase
    .from("hr_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching job:", error);
    throw error;
  }

  return { data, error };
};

export const fetchJobsAssignedToUser = async (userId: string) => {
  try {
    // Query jobs where assigned_to.id equals userId or contains userId in a comma-separated list
    const { data, error } = await supabase
      .from('hr_jobs')
      .select('*')
      .or(
        `assigned_to->>id.eq.${userId},` + // Exact match for single assignment
        `assigned_to->>id.ilike.%${userId}%` // Pattern match for multiple assignments
      )
      .eq('assigned_to->>type', 'individual'); // Only individual assignments

    if (error) throw error;

    // Additional client-side filtering to ensure accuracy
    const filteredData = data.filter(job => {
      if (!job.assigned_to || job.assigned_to.type !== 'individual') return false;
      const assignedIds = job.assigned_to.id.split(',');
      return assignedIds.includes(userId);
    });

    return { data: filteredData };
  } catch (error) {
    throw error;
  }
};


export const insertJob = async (jobData: Record<string, any>) => {
  const { data, error } = await supabase
    .from("hr_jobs")
    .insert(jobData)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating job:", error);
    throw error;
  }

  return { data, error };
};

export const updateJobRecord = async (id: string, jobData: Record<string, any>) => {
  const { data, error } = await supabase
    .from("hr_jobs")
    .update(jobData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating job:", error);
    throw error;
  }

  return { data, error };
};

export const updateJobStatusRecord = async (jobId: string, status: string) => {
  const { data, error } = await supabase
    .from("hr_jobs")
    .update({ status })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating job status:", error);
    throw error;
  }

  return { data, error };
};

export const deleteJobRecord = async (id: string) => {
  const { error } = await supabase
    .from("hr_jobs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting job:", error);
    throw error;
  }

  return { error };
};

export const shareJob = async (jobId) => {
  const { data, error } = await supabase
    .from("shared_jobs")
    .insert([{ job_id: jobId }]);

  if (error) {
    console.error("Error sharing job:", error);
    return { success: false, error };
  }
  return { success: true, data };
};
