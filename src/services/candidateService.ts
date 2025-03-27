
import { supabase } from "@/integrations/supabase/client";
import { CandidateStatus } from "@/lib/types";
import { MainStatus, SubStatus } from "@/services/statusService";

// Interfaces remain unchanged
export interface HrJobCandidate {
  location: any;
  id: string;
  job_id: string;
  name: string;
  status: CandidateStatus;
  experience: string | null;
  match_score: number | null;
  applied_date: string;
  skills: string[] | null;
  email: string | null;
  phone: string | null;
  resume_url: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any> | null;
  skill_ratings: Record<string, any> | Array<{ name: string; rating: number }> | null;
  applied_from?: string;
  expected_salary: any;
  current_salary: any;
  main_status_id: string | null;
  sub_status_id: string | null;
  main_status?: Partial<MainStatus> | null;
  sub_status?: Partial<SubStatus> | null;
}

export interface CandidateData {
  location: any;
  expectedSalary: any;
  currentSalary: any;
  appliedFrom?: string;
  id: string;
  name: string;
  status: CandidateStatus;
  experience: string;
  matchScore: number;
  appliedDate: string;
  skills: string[];
  email?: string;
  phone?: string;
  resumeUrl?: string;
  metadata?: Record<string, any>;
  skillRatings?: Array<{ name: string; rating: number }>;
  main_status?: Partial<MainStatus> | null;
  sub_status?: Partial<SubStatus> | null;
  progress: {
    screening: boolean;
    interview: boolean;
    offer: boolean;
    hired: boolean;
    joined: boolean;
  };
}

// Updated mapDbCandidateToData function
export const mapDbCandidateToData = (candidate: HrJobCandidate): CandidateData => {
  console.log("Candidate from DB:", candidate); // Debug log

  const rawStatus = candidate.status || "New";
  const cleanedStatus = rawStatus.replace(/'::text$/, "") as CandidateStatus;

  // Parse skills from JSON strings to an array of skill names
  const skills = candidate.skills
    ? candidate.skills.map((skill) => {
        try {
          const parsed = JSON.parse(skill);
          return parsed.name || skill; // Extract name if it’s an object, fallback to raw string
        } catch {
          return skill; // If parsing fails, use the raw string
        }
      })
    : [];

  // Calculate progress based solely on main_status.name
  const mainStatusName = candidate.main_status?.name;
  const progress = {
    screening: false,
    interview: false,
    offer: false,
    hired: false,
    joined: false
  };

  if (mainStatusName) {
    const stageOrder = ['Screening', 'Interview', 'Offer', 'Hired', 'Joined'];
    const stageIndex = stageOrder.indexOf(mainStatusName);

    if (stageIndex >= 0) {
      progress.screening = true;
      if (stageIndex >= 1) progress.interview = true;
      if (stageIndex >= 2) progress.offer = true;
      if (stageIndex >= 3) progress.hired = true;
      if (stageIndex >= 4) progress.joined = true;
    }
  }

  return {
    id: candidate.id,
    name: candidate.name,
    status: cleanedStatus,
    experience: candidate.experience || "",
    matchScore: candidate.match_score || 0,
    appliedDate: candidate.applied_date,
    skills,
    email: candidate.email || undefined,
    phone: candidate.phone || undefined,
    resumeUrl: candidate.resume_url || undefined,
    metadata: candidate.metadata || undefined,
    skillRatings: candidate.skill_ratings || undefined,
    appliedFrom: candidate.applied_from ?? undefined,
    currentSalary: candidate.current_salary ?? undefined,
    expectedSalary: candidate.expected_salary ?? undefined,
    location: candidate.location ?? undefined,
    main_status: candidate.main_status || undefined,
    sub_status: candidate.sub_status || undefined,
    progress,
  };
};

// Rest of the file (mapCandidateToDbData, getCandidatesByJobId, etc.) remains unchanged
// ... [Your other functions here] ...

export const mapCandidateToDbData = (candidate: CandidateData): Partial<HrJobCandidate> => {
  console.log("skillRatings in CandidateData:", candidate.skillRatings); // Debug log

  return {
    name: candidate.name,
    status: candidate.status,
    experience: candidate.experience || null,
    match_score: candidate.matchScore,
    applied_date: candidate.appliedDate,
    skills: candidate.skills || [],
    email: candidate.email || null,
    phone: candidate.phone || null,
    resume_url: candidate.resumeUrl || null,
    metadata: candidate.metadata || null,
    skill_ratings: candidate.skillRatings || null, // This can now be of type Record<string, any>
    applied_from: candidate.appliedFrom || null,
    current_salary: candidate.currentSalary || null,
    expected_salary: candidate.expectedSalary || null,
  };
};


// Get all candidates for a job
export const getCandidatesByJobId = async (jobId: string): Promise<CandidateData[]> => {
  try {
    const { data, error } = await supabase
      .from('hr_job_candidates')
      .select(`
        id, 
        job_id, 
        name, 
        status, 
        experience, 
        match_score, 
        applied_date, 
        skills, 
        email, 
        phone, 
        resume_url, 
        metadata, 
        skill_ratings, 
        applied_from, 
        current_salary, 
        expected_salary, 
        location, 
        main_status_id, 
        sub_status_id,
        main_status:job_statuses!main_status_id (
          id,
          name,
          color,
          type
        ),
        sub_status:job_statuses!sub_status_id (
          id,
          name,
          color,
          type
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching candidates:", error);
      throw error;
    }

    return (data || []).map(mapDbCandidateToData);
  } catch (error) {
    console.error(`Failed to fetch candidates for job ${jobId}:`, error);
    throw error;
  }
};
// Create a new candidate
export const createCandidate = async (jobId: string, candidate: CandidateData): Promise<CandidateData> => {
  try {
    const dbCandidate = mapCandidateToDbData(candidate);
    
    // Using raw SQL query since the table isn't in the TypeScript types yet
    const { data, error } = await supabase
      .from('hr_job_candidates')
      .insert({
        ...dbCandidate,
        job_id: jobId,
        name: candidate.name // Ensure name is included
      })
      .select('*')
      .single();

    if (error) {
      console.error("Error creating candidate:", error);
      throw error;
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to create candidate for job ${jobId}:`, error);
    throw error;
  }
};

// Update a candidate
export const updateCandidate = async (id: string, candidate: CandidateData): Promise<CandidateData> => {
  try {
    const dbCandidate = mapCandidateToDbData(candidate);
    
    // Using raw SQL query since the table isn't in the TypeScript types yet
    const { data, error } = await supabase
      .from('hr_job_candidates')
      .update(dbCandidate)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error("Error updating candidate:", error);
      throw error;
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to update candidate with ID ${id}:`, error);
    throw error;
  }
};
export const editCandidate = async (id: string, candidate: CandidateData): Promise<CandidateData> => {
  try {
    const dbCandidate = mapCandidateToDbData(candidate);
    console.log("Payload being sent to DB:", dbCandidate); // Debug log

    const { data, error } = await supabase
      .from('hr_job_candidates')
      .update(dbCandidate)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error("Error updating candidate:", error);
      throw error;
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to update candidate with ID ${id}:`, error);
    throw error;
  }
};

// Update candidate status
export const updateCandidateStatus = async (id: string, status: CandidateStatus): Promise<void> => {
  try {
    const { error } = await supabase
      .from('hr_job_candidates')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error("Error updating candidate status:", error);
      throw error;
    }
  } catch (error) {
    console.error(`Failed to update status for candidate with ID ${id}:`, error);
    throw error;
  }
};

// Update Skill Ratings alone Tab
// Update only the skill_ratings field for a candidate
export const updateCandidateSkillRatings = async (
  id: string,
  skillRatings: Array<{ name: string; rating: number }>
): Promise<CandidateData> => {
  try {
    // Using raw SQL query since the table isn't in the TypeScript types yet
    const { data, error } = await supabase
      .from('hr_job_candidates')
      .update({ skill_ratings: skillRatings }) // Update only skill_ratings
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error("Error updating candidate skill ratings:", error);
      throw error;
    }

    return mapDbCandidateToData(data as HrJobCandidate);
  } catch (error) {
    console.error(`Failed to update skill ratings for candidate with ID ${id}:`, error);
    throw error;
  }
};

// Delete a candidate
export const deleteCandidate = async (id: string): Promise<void> => {
  try {
    // Using raw SQL query since the table isn't in the TypeScript types yet
    const { error } = await supabase
      .from('hr_job_candidates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting candidate:", error);
      throw error;
    }
  } catch (error) {
    console.error(`Failed to delete candidate with ID ${id}:`, error);
    throw error;
  }
};
