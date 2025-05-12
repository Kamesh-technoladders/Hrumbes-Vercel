// src/types/contact.ts

// --- Contact Type (for data fetched from the 'contacts' table) ---
// Manually define this to match your 'contacts' table schema precisely.
export interface Contact {
    id: string; // Assuming this is the UUID from your table
    name: string;
    email: string;
    mobile?: string | null;
    job_title?: string | null;
    linkedin_url?: string | null;
    contact_owner?: string | null;
    contact_stage?: string | null;
    created_at: string; // Supabase typically returns TIMESTAMPTZ as an ISO string
    updated_at: string; // Supabase typically returns TIMESTAMPTZ as an ISO string
    created_by?: string | null; // UUID, if you track this
    updated_by?: string | null; // UUID, if you track this
  }
  
  // --- Contact Insert Type (for creating new contacts) ---
  // Define fields that are set during an INSERT operation.
  // Exclude auto-generated fields like 'id', 'created_at', 'updated_at' (unless you specifically set them).
  export interface ContactInsert {
    name: string;
    email: string;
    mobile?: string | null;
    job_title?: string | null;
    linkedin_url?: string | null;
    contact_owner?: string | null;
    contact_stage?: string | null;
    created_by?: string | null; // Only if you are setting this from the client
  }
  
  // --- Contact Update Type (for updating existing contacts) ---
  // All fields are optional because you might only update a subset.
  // 'id' is usually not part of the update payload itself but used in the .eq() filter.
  export interface ContactUpdate {
    name?: string;
    email?: string; // Be cautious if email has a UNIQUE constraint and you allow updates
    mobile?: string | null;
    job_title?: string | null;
    linkedin_url?: string | null;
    contact_owner?: string | null;
    contact_stage?: string | null;
    // 'updated_at' is typically handled by a database trigger.
    // 'created_by' should generally not be updated.
    // 'updated_by' would also be handled by a trigger if implemented.
  }
  
  // You can add other related types for the Contacts module here if needed.
  // For example, if you have specific types for contact stages:
  // export type ContactStage = 'Cold' | 'Approaching' | 'Replied' | 'Interested' | 'Not Interested' | 'Un Responsive' | 'Do Not Contact' | 'Bad Data' | 'Changed Job' | 'Prospect';