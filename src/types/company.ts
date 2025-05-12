
export interface Company {
  id: number;
  name: string;
  status?: string;
  domain?: string;
  about?: string;
  license_usage?: number;
  website?: string;
  logo_url?: string;
  employee_count?: number;
    // --- NEW FIELDS ---
    industry?: string | null;
    stage?: string | null; // Add this field
    location?: string | null;
    account_owner?: string | null;
    linkedin?: string | null; // Already potentially in CompanyDetail, ensure here if needed for list
    twitter?: string | null; // Added
    facebook?: string | null; // Added
    created_at: string; // Added if needed for display/logic
      // --- NEW FINANCIAL FIELDS ---
  revenue?: string | null; // Store as string from AI
  cash_flow?: string | null; // Store as string from AI

  }

export interface EmployeeAssociation {
  id: number; // association ID
  candidate_id: string; // UUID
  company_id: number;
  job_id?: string | null; // Nullable text/uuid
  designation?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  created_at: string;
  updated_at?: string | null;
 // These remain optional (nullable in DB)
 created_by?: string | null; // UUID or null
 updated_by?: string | null; // UUID or null
}
export interface CompanyDetail extends Company {
  start_date?: string;
  ceo?: string;
 
  address?: string;
}

export interface CandidateCompany {
  candidate_id: string; // text or uuid (ensure consistency or handle conversion)
  job_id: string; // text, likely part of PK
  company_id: number;
  designation?: string | null;
  // years?: string | null; // Keep if used, otherwise remove
  contact_owner?: string | null;
  contact_stage?: string | null;
  // Add created_by if you add it to this table
}

export interface CandidateDetail {
    // Core Candidate Info (from hr_candidates)
    id: string; // candidate_id (UUID) - The common link
    name: string;
    email?: string | null;
    phone_number?: string | null; // For Contact column
    linkedin?: string | null; // For potential actions
    avatar_url?: string | null;
  
    // Association Info (potentially from either table)
    designation?: string | null; // Job Title
    contact_owner?: string | null;
    contact_stage?: string | null;
  
    // --- Source & Key Info (Crucial for Editing/Merging) ---
    source_table: 'candidate_companies' | 'employee_associations';
    company_id: number; // Needed for context/updates
    // Keys needed to update the specific source row
    association_id?: number | null; // ID from employee_associations (if applicable)
    job_id?: string | null; // job_id from the source table (needed for candidate_companies PK)
  
    // Optional fields from employee_associations if needed for display/logic
    association_start_date?: string | null;
    association_end_date?: string | null;
    association_is_current?: boolean | null;
    association_created_by?: string | null;
}
