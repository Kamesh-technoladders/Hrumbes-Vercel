// src/hooks/use-contacts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { UnifiedContactListItem } from '@/types/contact'; 
import { Database } from '@/types/database.types'; 

// Define types for rows from Supabase for better type safety during mapping
type ContactFromDB = Database['public']['Tables']['contacts']['Row'] & { 
    // Using 'company_data_from_join' as the alias for the joined company data
    company_data_from_join: Pick<Database['public']['Tables']['companies']['Row'], 'name'> | null 
};

// For candidate_companies, hr_candidates is fetched separately
type CandidateCompanyBaseFromDB = Database['public']['Tables']['candidate_companies']['Row'] & { 
    companies: Pick<Database['public']['Tables']['companies']['Row'], 'name'> | null;
};
// Explicitly define the fields we expect from hr_candidates
type HrCandidateInfo = Pick<Database['public']['Tables']['hr_candidates']['Row'], 'id' | 'name' | 'email' | 'phone_number' | 'linkedin_url'>;

// For employee_associations, hr_candidates and companies are joined via Supabase shorthand
type EmployeeAssociationFromDB = Database['public']['Tables']['employee_associations']['Row'] & {
    companies: Pick<Database['public']['Tables']['companies']['Row'], 'name'> | null;
    hr_candidates: HrCandidateInfo | null; 
};


export const useContacts = () => {
  return useQuery<UnifiedContactListItem[], Error>({
    queryKey: ['combinedContactsList'], 
    queryFn: async (): Promise<UnifiedContactListItem[]> => {
      console.log("Fetching combined list from 'contacts', 'employee_associations', and 'candidate_companies' tables with LinkedIn filter for candidates...");

      // --- 1. Fetch from contacts table ---
      // Using EXPLICIT JOIN HINT with the correct foreign key name
      const { data: manualContactsData, error: manualContactsError } = await supabase
        .from('contacts')
        .select(`
          id, name, email, mobile, job_title, linkedin_url, contact_owner, contact_stage, created_at, updated_at, company_id,
          company_data_from_join:companies!fk_contacts_to_companies ( name ) 
        `) as { data: ContactFromDB[] | null; error: any };

      if (manualContactsError) {
        console.error('Error fetching manual contacts:', manualContactsError);
        // If this still fails, check RLS on 'contacts' and 'companies', 
        // and ensure 'companies' table has a 'name' column.
        // Also, ensure Supabase schema cache is reloaded after any DB changes.
        throw manualContactsError;
      }

      const processedManualContacts: UnifiedContactListItem[] = (manualContactsData || []).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        mobile: c.mobile,
        job_title: c.job_title,
        linkedin_url: c.linkedin_url, 
        contact_owner: c.contact_owner,
        contact_stage: c.contact_stage,
        created_at: c.created_at,
        updated_at: c.updated_at,
        company_id: c.company_id,
        company_name: c.company_data_from_join?.name || null, // Use the alias here
        source_table: 'contacts', 
      }));

      // --- 2. Fetch from employee_associations table ---
      // This join relies on employee_associations.candidate_id -> hr_candidates.id FK (fk_assoc_candidate)
      // AND employee_associations.company_id -> companies.id FK (fk_assoc_company) 
      // being correctly set up and recognized.
      const { data: associationsData, error: assocError } = await supabase
        .from('employee_associations')
        .select(`
          id, candidate_id, company_id, job_id, designation, contact_owner, contact_stage, created_at, start_date, end_date, is_current,
          hr_candidates ( id, name, email, phone_number, linkedin_url ),
          companies ( name )
        `) as { data: EmployeeAssociationFromDB[] | null; error: any };

      if (assocError) {
        console.error('Error fetching employee_associations:', assocError);
        // If this fails, verify fk_assoc_candidate, fk_assoc_company, RLS, and schema cache.
        throw assocError; 
      }
      
      let processedEmployeeAssociations: UnifiedContactListItem[] = (associationsData || []).map(assoc => ({
        id: `assoc-${assoc.id}`, 
        association_id: assoc.id, 
        original_candidate_id: assoc.hr_candidates?.id || assoc.candidate_id, 
        name: assoc.hr_candidates?.name || 'N/A (Associated Candidate)',
        email: assoc.hr_candidates?.email || null,
        mobile: assoc.hr_candidates?.phone_number || null,
        job_title: assoc.designation || null, 
        linkedin_url: assoc.hr_candidates?.linkedin_url || null, 
        contact_owner: assoc.contact_owner,
        contact_stage: assoc.contact_stage,
        created_at: assoc.created_at,
        company_id: assoc.company_id,
        company_name: assoc.companies?.name || null,
        source_table: 'employee_associations',
        candidate_job_id: assoc.job_id,
        association_start_date: assoc.start_date,
        association_end_date: assoc.end_date,
        association_is_current: assoc.is_current,
      }));

      // --- 3. Fetch from candidate_companies table (WORKAROUND: Fetch hr_candidates separately) ---
      // This is because the FK candidate_companies.candidate_id -> hr_candidates.id is missing or not working.
      const { data: candidateCompanyBaseData, error: ccBaseError } = await supabase
        .from('candidate_companies')
        .select(`
          candidate_id, job_id, company_id, designation, years, contact_owner, contact_stage,
          companies ( name ) // This join relies on candidate_companies.company_id -> companies.id FK (fk_company)
        `) as { data: CandidateCompanyBaseFromDB[] | null; error: any };

      if (ccBaseError) {
        console.error('Error fetching base candidate_companies:', ccBaseError);
        throw ccBaseError;
      }

      let processedCandidateContacts: UnifiedContactListItem[] = [];
      if (candidateCompanyBaseData && candidateCompanyBaseData.length > 0) {
        const candidateIds = [...new Set(candidateCompanyBaseData.map(cc => cc.candidate_id).filter(Boolean))];
        
        let hrCandidatesMap = new Map<string, HrCandidateInfo>();
        if (candidateIds.length > 0) {
          const { data: hrData, error: hrError } = await supabase
            .from('hr_candidates')
            .select('id, name, email, phone_number, linkedin_url') 
            .in('id', candidateIds) as { data: HrCandidateInfo[] | null; error: any };

          if (hrError) {
            console.error('Error fetching hr_candidates for candidate_companies:', hrError);
          } else {
            (hrData || []).forEach(hr => hrCandidatesMap.set(hr.id, hr));
          }
        }

        processedCandidateContacts = (candidateCompanyBaseData || []).map(cc => {
          const candidateInfo = cc.candidate_id ? hrCandidatesMap.get(cc.candidate_id) : null;
          return {
            id: `candcomp-${cc.candidate_id}-${cc.company_id}-${cc.job_id}`,
            original_candidate_id: cc.candidate_id,
            name: candidateInfo?.name || `Candidate ID: ${cc.candidate_id || 'Unknown'}`,
            email: candidateInfo?.email || null,
            mobile: candidateInfo?.phone_number || null,
            job_title: cc.designation,
            linkedin_url: candidateInfo?.linkedin_url || null,
            contact_owner: cc.contact_owner,
            contact_stage: cc.contact_stage,
            created_at: null,
            company_id: cc.company_id,
            company_name: cc.companies?.name || null,
            source_table: 'candidate_companies',
            candidate_job_id: cc.job_id,
            candidate_years: cc.years,
          };
        });
      }

      // --- Filter items from 'employee_associations' and 'candidate_companies' based on LinkedIn URL ---
      processedEmployeeAssociations = processedEmployeeAssociations.filter(
        item => item.linkedin_url && item.linkedin_url.trim() !== ''
      );
      processedCandidateContacts = processedCandidateContacts.filter(
        item => item.linkedin_url && item.linkedin_url.trim() !== ''
      );

      // --- 4. Combine all processed data ---
      const combinedListUnfiltered = [
        ...processedManualContacts, 
        ...processedEmployeeAssociations, 
        ...processedCandidateContacts
      ];
      
      // --- De-duplicate based on email, prioritizing 'contacts' source ---
      const uniqueContactsMap = new Map<string, UnifiedContactListItem>();
      for (const item of combinedListUnfiltered) {
        const key = (item.email && item.email.trim() !== '') ? item.email.toLowerCase() : item.id; 
        const existingItem = uniqueContactsMap.get(key);

        if (existingItem) {
          if (item.source_table === 'contacts' && existingItem.source_table !== 'contacts') {
            uniqueContactsMap.set(key, item); 
          } else if (item.source_table === 'employee_associations' && existingItem.source_table === 'candidate_companies') {
            uniqueContactsMap.set(key, item); 
          }
        } else {
          uniqueContactsMap.set(key, item);
        }
      }
      const combinedData = Array.from(uniqueContactsMap.values());

      // --- 5. Sort combined data ---
      combinedData.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : null;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : null;

        if (aDate && bDate) return bDate - aDate; 
        if (aDate && !bDate) return -1; 
        if (!aDate && bDate) return 1;  
        
        const nameA = a.name?.toLowerCase() || '\uffff'; 
        const nameB = b.name?.toLowerCase() || '\uffff';
        return nameA.localeCompare(nameB);
      });
      
      console.log(`Successfully fetched, filtered (by LinkedIn for candidates), and combined ${combinedData.length} items for the contact list.`);
      return combinedData;
    },
  });
};

export const useContactDetails = (contactId: string | undefined) => {
  return useQuery<UnifiedContactListItem | null, Error>({ 
    queryKey: ['contact', contactId], 
    queryFn: async (): Promise<UnifiedContactListItem | null> => {
      if (!contactId) {
        return null;
      }
      
      // Using explicit join hint here as well, with the confirmed FK name
      const { data, error } = await supabase
        .from('contacts')
        .select(`*, company_data_from_join:companies!fk_contacts_to_companies (name)`) 
        .eq('id', contactId)
        .maybeSingle() as { data: (Database['public']['Tables']['contacts']['Row'] & { company_data_from_join: { name: string } | null }) | null; error: any };

      if (error) throw error;

      if (data) {
        const contactData: UnifiedContactListItem = {
          ...data, 
          company_name: data.company_data_from_join?.name || null, // Use the alias
          source_table: 'contacts',
          association_id: null,
          original_candidate_id: data.id, 
          candidate_job_id: null,
          candidate_years: null,
          association_start_date: null,
          association_end_date: null,
          association_is_current: null,
        };
        return contactData;
      }
      return null;
    },
    enabled: !!contactId, 
  });
};