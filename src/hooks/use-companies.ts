

// // src/hooks/use-companies.ts
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from "@/integrations/supabase/client";
// // Import the UPDATED types reflecting the new schema
// import { Company, CompanyDetail, EmployeeAssociation, CandidateDetail } from '@/types/company';
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// import { Database } from '@/types/database.types'; // Assuming generated types are here

// // --- Gemini Config ---
// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// const MODEL_NAME = "gemini-1.5-pro"; // Or your preferred model

// // --- Helper Function to Extract JSON (Keep as is) ---
// function extractJson(text: string): any | null {
//   if (!text) return null;
//   const jsonMarkdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
//   if (jsonMarkdownMatch && jsonMarkdownMatch[1]) { try { return JSON.parse(jsonMarkdownMatch[1]); } catch (e) { console.warn("Failed to parse JSON within markdown markers:", e); } }
//   const firstBrace = text.indexOf('{');
//   const lastBrace = text.lastIndexOf('}');
//   if (firstBrace !== -1 && lastBrace > firstBrace) { const potentialJson = text.substring(firstBrace, lastBrace + 1); try { return JSON.parse(potentialJson); } catch (e) { console.warn("Failed to parse JSON object match:", e); } }
//   try { return JSON.parse(text); } catch (e) { console.error("Could not parse JSON from text:", text); return null; }
// }

// // --- Hook to fetch the list of companies ---
// export const useCompanies = () => {
//   return useQuery({
//     queryKey: ['companies'],
//     queryFn: async (): Promise<Company[]> => {
//       console.log("Fetching companies list with stable ordering (created_at DESC, id ASC)...");
//       const { data, error } = await supabase
//         .from('companies')
//         // Select only columns needed for the list view for efficiency
//         .select('id, name, logo_url, employee_count, industry, stage, location, account_owner, website, linkedin, twitter, facebook, created_at')
//         .order('created_at', { ascending: false }) // Primary: Newest first
//         .order('id', { ascending: true });         // Secondary: Tie-breaker

//       if (error) {
//         console.error('Error fetching ordered companies:', error);
//         throw error;
//       }
//       console.log('Ordered companies data fetched successfully:', data?.length);
//       return (data as Company[]) || []; // Cast to Company[]
//     },
//     // Add caching options if desired
//     // staleTime: 5 * 60 * 1000,
//     // gcTime: 10 * 60 * 1000,
//   });
// };

// // --- Hook to fetch details for a single company ---
// export const useCompanyDetails = (id: number) => {
//   return useQuery({
//     queryKey: ['company', id],
//     queryFn: async (): Promise<CompanyDetail | null> => { // Return type can be null if not found
//       if (!id) return null; // Prevent fetch if ID is invalid
//       console.log(`Fetching company details for ID: ${id}`);
//       const { data, error } = await supabase
//         .from('companies')
//         .select('*') // Select all details for the detail view
//         .eq('id', id)
//         .maybeSingle(); // Use maybeSingle to return null instead of erroring if not found

//       if (error) {
//         console.error(`Error fetching company details for ID ${id}:`, error);
//         throw error; // Throw other errors
//       }

//       console.log('Company details fetched successfully:', data);
//       return data as CompanyDetail | null; // Cast result
//     },
//     enabled: !!id // Only run if id is truthy
//   });
// };

// // --- Hook to fetch associated employees (using the new structure) ---
// export const useCompanyEmployees = (companyId: number) => {
//   return useQuery({
//     queryKey: ['company-employees', companyId], // Use companyId in the key
//     queryFn: async (): Promise<CandidateDetail[]> => { // Return type based on CandidateDetail interface
//       console.log(`Fetching employee associations for company ID: ${companyId}`);

//       if (!companyId) return []; // Prevent fetch if companyId is invalid

//       try {
//         // Fetch from the NEW employee_associations table, joining with hr_candidates
//         const { data: associations, error } = await supabase
//           .from('employee_associations')
//           .select(`
//             id,  
//             candidate_id,
//             company_id,
//             job_id,
//             designation,
//             contact_owner,
//             contact_stage,
//             start_date,
//             end_date,
//             is_current,
//             created_by, 
//             updated_by, 
//             hr_candidates ( 
//               id,
//               name,
//               email,
//               phone_number,
//               linkedin_url 
//             )
//           `)
//           .eq('company_id', companyId)
//           .order('is_current', { ascending: false }) // Example order: current employees first
//           .order('created_at', { ascending: false }); // Then by association creation date

//         if (error) {
//           console.error(`Error fetching employee associations for company ${companyId}:`, error);
//           throw error;
//         }

//         console.log('Fetched associations:', associations);

//         if (!associations || associations.length === 0) {
//           console.log('No employee associations found for this company ID');
//           return [];
//         }

//         // Map the joined data to the CandidateDetail structure
//         const employeeDetails: CandidateDetail[] = associations.map(assoc => {
//           // Supabase returns the joined table as an object or array. Handle potential null.
//           // Using 'as any' for simplicity, define proper types if needed.
//           const candidate = assoc.hr_candidates as any;

//           // If the join failed or candidate was deleted, provide fallback data
//           if (!candidate) {
//               console.warn(`Candidate details missing for association id ${assoc.id}, candidate_id ${assoc.candidate_id}`);
//               return {
//                    id: assoc.candidate_id, // Candidate UUID
//                    name: `Unknown Candidate (ID: ${assoc.candidate_id?.substring(0, 5)}...)`,
//                    email: 'N/A',
//                    phone_number: 'N/A',
//                    linkedin: 'N/A',
//                    association_id: assoc.id,
//                    company_id: assoc.company_id,
//                    job_id: assoc.job_id,
//                    designation: assoc.designation || 'N/A',
//                    contact_owner: assoc.contact_owner || 'N/A',
//                    contact_stage: assoc.contact_stage || 'N/A',
//                    association_start_date: assoc.start_date,
//                    association_end_date: assoc.end_date,
//                    association_is_current: assoc.is_current,
//                    // created_by: assoc.created_by, // Add if needed
//                    // updated_by: assoc.updated_by, // Add if needed
//               };
//           }

//           // Map to the CandidateDetail interface
//           return {
//             id: candidate.id, // Candidate's UUID
//             name: candidate.name,
//             email: candidate.email || 'N/A',
//             phone_number: candidate.phone_number || 'N/A',
//             linkedin: candidate.linkedin_url || 'N/A', // Map linkedin_url to linkedin field
//             // avatar_url: candidate.avatar_url, // Add if you have this field

//             // Association specific details
//             association_id: assoc.id,
//             company_id: assoc.company_id,
//             job_id: assoc.job_id,
//             designation: assoc.designation || 'N/A',
//             contact_owner: assoc.contact_owner || 'N/A',
//             contact_stage: assoc.contact_stage || 'N/A',
//             association_start_date: assoc.start_date,
//             association_end_date: assoc.end_date,
//             association_is_current: assoc.is_current,
//             // created_by: assoc.created_by, // Add if needed
//             // updated_by: assoc.updated_by, // Add if needed
//           };
//         }).filter(Boolean); // Filter out any potential nulls if skipping missing candidates

//         console.log('Mapped employee details for table:', employeeDetails);
//         return employeeDetails;

//       } catch (error) {
//         console.error('Error in useCompanyEmployees hook:', error);
//         throw error; // Re-throw for React Query error handling
//       }
//     },
//     enabled: !!companyId, // Only run query if companyId is valid
//     // Add caching options if desired
//   });
// };


// // --- Hook to get company and employee counts ---
// export const useCompanyCounts = () => {
//   return useQuery({
//     queryKey: ['company-counts'],
//     queryFn: async () => {
//       try {
//           // Get count of companies
//           const { count: companyCount, error: companyError } = await supabase
//             .from('companies')
//             .select('*', { count: 'exact', head: true }); // Use head: true for efficiency

//           if (companyError) throw companyError;
//           console.log('Company count:', companyCount);

//           const { data: uniqueCandidates, error: employeeError } = await supabase
//                 .rpc('get_unique_associated_candidate_count'); // Assumes you create this function

//            // Fallback if RPC doesn't exist yet: Less efficient count
//            let uniqueEmployeeCount = 0;
//            if (employeeError || !uniqueCandidates) {
//                 console.warn("RPC get_unique_associated_candidate_count failed or doesn't exist. Falling back to less efficient count.", employeeError);
//                 const { data: employeeData, error: fallbackError } = await supabase
//                     .from('employee_associations') // Count from the NEW table
//                     .select('candidate_id');

//                 if (fallbackError) {
//                     console.error('Error fetching employee associations for counting:', fallbackError);
//                     // Decide how to handle - return 0 or throw?
//                 } else {
//                      const uniqueSet = new Set(employeeData?.map(e => e.candidate_id));
//                      uniqueEmployeeCount = uniqueSet.size;
//                 }
//            } else {
//                 // Assuming the RPC returns an object like { count: number }
//                 uniqueEmployeeCount = (uniqueCandidates as any)?.count ?? 0;
//            }


//           console.log('Unique associated employee count:', uniqueEmployeeCount);

//           return {
//             companies: companyCount ?? 0,
//             employees: uniqueEmployeeCount // Use the count from RPC or fallback
//           };
//       } catch(error) {
//            console.error('Error fetching counts:', error);
//            // Return default counts or throw error based on desired behavior
//             return { companies: 0, employees: 0 };
//       }
//     }
//   });
// };

// // --- Hook to fetch details from Gemini AI ---
// export const useFetchCompanyDetails = () => {
//   // Check if API key is available (basic check)
//   if (!GEMINI_API_KEY) {
//     console.error("Gemini API key (VITE_GEMINI_API_KEY) is missing.");
//     return async (_companyName: string): Promise<Partial<CompanyDetail>> => {
//       throw new Error("AI Service Key not configured.");
//     };
//   }

//   return async (companyName: string): Promise<Partial<CompanyDetail>> => {
//     console.log('Fetching company details via Gemini for:', companyName);
//     if (!GEMINI_API_KEY) throw new Error("AI Service Key not configured.");

//     try {
//       const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
//       const model = genAI.getGenerativeModel({ model: MODEL_NAME });

//       const generationConfig = { temperature: 0.4, topK: 1, topP: 1, maxOutputTokens: 1024 };
//       const safetySettings = [
//         { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//         { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//       ];

//       // The prompt requesting various details including logo_url
//       const prompt = `
//         Provide the following details for the company named "${companyName}":
//         1. Founding date/year (key: "founded")
//         2. CEO name (key: "ceo")
//         3. Approx employee count (integer, key: "employees")
//         4. HQ address (key: "address")
//         5. Website URL (key: "website")
//         6. LinkedIn URL (key: "linkedin")
//         7. Industry (key: "industry")
//         8. HQ Location (City, Country) (key: "location")
//         9. Twitter URL (key: "twitter")
//         10. Facebook URL (key: "facebook")
//         11. Publicly accessible logo URL (key: "logo_url")

//         Return ONLY a single, valid JSON object with these keys. Use null if info not found. No extra text or markdown.
//         Example: {"founded":"2006","ceo":"Some Name","employees":1000,"address":"123 Street","website":"https://...","linkedin":"https://...","industry":"Tech","location":"City, Country","twitter":null,"facebook":null,"logo_url":"https://.../logo.png"}
//       `;

//       const parts = [{ text: prompt }];
//       console.log("Sending prompt to Gemini...");

//       const result = await model.generateContent({ contents: [{ role: "user", parts }], generationConfig, safetySettings });

//       // Response checking (keep as is)
//       if (!result.response?.candidates?.length) { /* ... handle blocked/missing response ... */ }
//       const response = result.response;
//       const responseText = response.text();
//       console.log("Raw response text from Gemini:", responseText);

//       const data = extractJson(responseText);
//       if (!data || typeof data !== 'object') throw new Error("AI failed to return valid JSON.");
//       console.log("Parsed company details from Gemini:", data);

//       // Map Gemini response to CompanyDetail fields
//       const mappedDetails: Partial<CompanyDetail> = {
//           start_date: typeof data.founded === 'string' ? data.founded : null,
//           ceo: typeof data.ceo === 'string' ? data.ceo : null,
//           employee_count: typeof data.employees === 'number' ? Math.floor(data.employees) : null,
//           address: typeof data.address === 'string' ? data.address : null,
//           website: typeof data.website === 'string' ? data.website : null,
//           linkedin: typeof data.linkedin === 'string' ? data.linkedin : null,
//           industry: typeof data.industry === 'string' ? data.industry : null,
//           location: typeof data.location === 'string' ? data.location : null,
//           twitter: typeof data.twitter === 'string' ? data.twitter : null,
//           facebook: typeof data.facebook === 'string' ? data.facebook : null,
//           logo_url: typeof data.logo_url === 'string' ? data.logo_url : null,
//       };

//       console.log("Mapped details for update:", mappedDetails);
//       return mappedDetails;

//     } catch (error: any) {
//       console.error('Error fetching company details from Gemini:', error);
//       throw new Error(`Failed to fetch details from AI: ${error.message}`);
//     }
//   };
// };

// src/hooks/use-companies.ts


import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
// Import the types reflecting the desired schema (including EmployeeAssociation if needed elsewhere, CandidateDetail for display)
import { Company, CompanyDetail, CandidateDetail } from '@/types/company';
// Removed EmployeeAssociation if not directly used after mapping
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Database } from '@/types/database.types'; // Assuming generated types are here

// --- Gemini Config ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-pro"; // Or your preferred model

// --- UPDATED Helper to parse currency/number strings ---
function parseFinancialValue(value: any): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return !isNaN(value) ? value : null;
  }

  if (typeof value === 'string') {
    try {
      let numStr = value.replace(/[$,€£¥₹,\s]/g, ''); // Remove common symbols/commas/spaces (added INR ₹)
      let multiplier = 1;

      // Check for Million (M) or Billion (B) suffixes (case-insensitive)
      if (numStr.toUpperCase().endsWith('B')) {
        multiplier = 1_000_000_000;
        numStr = numStr.slice(0, -1); // Remove the 'B'
      } else if (numStr.toUpperCase().endsWith('M')) {
        multiplier = 1_000_000;
        numStr = numStr.slice(0, -1); // Remove the 'M'
      } else if (numStr.toUpperCase().endsWith('K')) { // Less common for revenue, but possible
         multiplier = 1_000;
         numStr = numStr.slice(0, -1); // Remove the 'K'
      }


      if (numStr === '' || numStr.toUpperCase() === 'N/A') return null;

      const number = parseFloat(numStr);
      if (isNaN(number)) return null; // Failed to parse number part

      return number * multiplier; // Apply multiplier

    } catch (e) {
      console.warn("Could not parse financial value string:", value, e);
      return null;
    }
  }
  return null; // Handle other types
}
// --- END UPDATED Helper ---

// --- Helper Function to Extract JSON ---
function extractJson(text: string): any | null {
  if (!text) return null;
  const jsonMarkdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMarkdownMatch && jsonMarkdownMatch[1]) { try { return JSON.parse(jsonMarkdownMatch[1]); } catch (e) { console.warn("Failed to parse JSON within markdown markers:", e); } }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) { const potentialJson = text.substring(firstBrace, lastBrace + 1); try { return JSON.parse(potentialJson); } catch (e) { console.warn("Failed to parse JSON object match:", e); } }
  try { return JSON.parse(text); } catch (e) { console.error("Could not parse JSON from text:", text); return null; }
}

// --- Hook to fetch the list of companies ---
export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async (): Promise<Company[]> => {
      console.log("Fetching companies list with stable ordering (created_at DESC, id ASC)...");
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, employee_count, industry, stage, location, account_owner, website, linkedin, twitter, facebook, created_at') // Select specific columns
        .order('created_at', { ascending: false })
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching ordered companies:', error);
        throw error;
      }
      console.log('Ordered companies data fetched successfully:', data?.length);
      return (data as Company[]) || [];
    },
    // staleTime: 5 * 60 * 1000,
    // gcTime: 10 * 60 * 1000,
  });
};

// --- Hook to fetch details for a single company ---
export const useCompanyDetails = (id: number) => {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async (): Promise<CompanyDetail | null> => {
      if (!id || isNaN(id) || id <= 0) {
          console.warn(`Invalid company ID requested: ${id}`);
          return null;
      }
      console.log(`Fetching company details for ID: ${id}`);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching company details for ID ${id}:`, error);
        throw error;
      }
      console.log(`Company details fetched for ID ${id}:`, data ? 'Data found' : 'Not found');
      return data as CompanyDetail | null;
    },
    enabled: !!id && !isNaN(id) && id > 0
  });
};

// --- Hook to fetch associated employees (HYBRID APPROACH) ---
// Fetches from both candidate_companies (legacy) and employee_associations (new)

export const useCompanyEmployees = (companyId: number) => {
  return useQuery({
    queryKey: ["company-employees", companyId],
    queryFn: async (): Promise<CandidateDetail[]> => {
      console.log(`Fetching ALL employee associations for company ID: ${companyId}`);
      if (!companyId || isNaN(companyId) || companyId <= 0) {
        console.warn(`Invalid company ID for fetching employees: ${companyId}`);
        return [];
      }

      try {
        // --- Fetch from candidate_companies (Legacy Data) ---
        type CandidateCompanyRow = Database["public"]["Tables"]["candidate_companies"]["Row"];
        const { data: legacyLinks, error: legacyError } = await supabase
          .from("candidate_companies")
          .select("candidate_id, job_id, company_id, designation, contact_owner, contact_stage")
          .eq("company_id", companyId);

        if (legacyError) {
          console.error(`Error fetching legacy candidate_companies for company ${companyId}:`, legacyError);
          throw legacyError;
        }
        console.log(`Fetched ${legacyLinks?.length ?? 0} legacy candidate_companies links.`);

        // --- Fetch from employee_associations (New Data) ---
        type EmployeeAssociationRow = Database["public"]["Tables"]["employee_associations"]["Row"];
        const { data: newAssociations, error: newAssocError } = await supabase
          .from("employee_associations")
          .select(
            "id, candidate_id, company_id, job_id, designation, contact_owner, contact_stage, start_date, end_date, is_current, created_by"
          )
          .eq("company_id", companyId);

        if (newAssocError) {
          console.error(`Error fetching new employee_associations for company ${companyId}:`, newAssocError);
          throw newAssocError;
        }
        console.log(`Fetched ${newAssociations?.length ?? 0} new employee_associations.`);

        // --- Combine Candidate IDs ---
        const legacyCandidateIds = (legacyLinks || [])
          .map((l) => l.candidate_id)
          .filter(Boolean) as string[];
        const newCandidateIds = (newAssociations || [])
          .map((a) => a.candidate_id)
          .filter(Boolean) as string[];
        const allUniqueCandidateIds = [...new Set([...legacyCandidateIds, ...newCandidateIds])];

        // --- Fetch hr_job_candidates Details ---
        let hrCandidateDetails: Database["public"]["Tables"]["hr_job_candidates"]["Row"][] | null = null;
        if (allUniqueCandidateIds.length > 0) {
          console.log(`Fetching hr_job_candidates details for ${allUniqueCandidateIds.length} unique IDs.`);
          const { data, error: cdError } = await supabase
            .from("hr_job_candidates") // Changed to hr_job_candidates
            .select("id, name, email, phone")
            .in("id", allUniqueCandidateIds);

          if (cdError) {
            console.error("Error fetching hr_job_candidates details:", cdError);
            // Proceed with missing details, as some candidate_ids may not exist
          } else {
            hrCandidateDetails = data;
            console.log(`Fetched ${hrCandidateDetails?.length ?? 0} hr_job_candidates details.`);
          }
        } else {
          console.log("No candidate IDs found from either association table.");
          return [];
        }

        // Create a map for quick lookup of hr_job_candidates details by their ID
        const candidateDetailsMap = new Map<string, Database["public"]["Tables"]["hr_job_candidates"]["Row"]>();
        hrCandidateDetails?.forEach((cd) => candidateDetailsMap.set(cd.id, cd));

        // --- Map Legacy Data to CandidateDetail ---
        const mappedLegacyDetails: CandidateDetail[] = (legacyLinks || []).map((ccLink): CandidateDetail => {
          const coreDetail = candidateDetailsMap.get(ccLink.candidate_id || "");
          return {
            id: ccLink.candidate_id || "unknown",
            name: coreDetail?.name || "N/A",
            email: coreDetail?.email || "N/A",
            phone_number: coreDetail?.phone_number || "N/A",
            linkedin: coreDetail?.linkedin_url || "N/A",
            designation: ccLink.designation || "N/A",
            contact_owner: ccLink.contact_owner || "N/A",
            contact_stage: ccLink.contact_stage || "N/A",
            source_table: "candidate_companies",
            company_id: ccLink.company_id,
            job_id: ccLink.job_id,
            association_id: null,
          };
        });

        // --- Map New Data to CandidateDetail ---
        const mappedNewDetails: CandidateDetail[] = (newAssociations || []).map((assoc): CandidateDetail => {
          const coreDetail = candidateDetailsMap.get(assoc.candidate_id);
          return {
            id: assoc.candidate_id,
            name: coreDetail?.name || `Associated Candidate ${assoc.candidate_id.substring(0, 5)}...`,
            email: coreDetail?.email || "N/A",
            phone_number: coreDetail?.phone_number || "N/A",
            linkedin: coreDetail?.linkedin_url || "N/A",
            designation: assoc.designation || "N/A",
            contact_owner: assoc.contact_owner || "N/A",
            contact_stage: assoc.contact_stage || "N/A",
            source_table: "employee_associations",
            company_id: assoc.company_id,
            job_id: assoc.job_id,
            association_id: assoc.id,
            association_start_date: assoc.start_date,
            association_end_date: assoc.end_date,
            association_is_current: assoc.is_current,
            association_created_by: assoc.created_by,
          };
        });

        // --- Combine and Deduplicate ---
        const combinedMap = new Map<string, CandidateDetail>();
        mappedLegacyDetails.forEach((detail) => {
          if (!combinedMap.has(detail.id)) {
            combinedMap.set(detail.id, detail);
          }
        });
        mappedNewDetails.forEach((detail) => {
          combinedMap.set(detail.id, detail);
        });

        const finalDetails = Array.from(combinedMap.values());
        finalDetails.sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Final combined employee details for company ${companyId}:`, finalDetails.length);
        return finalDetails;
      } catch (error) {
        console.error(`Error processing employees for company ${companyId}:`, error);
        throw error;
      }
    },
    enabled: !!companyId && !isNaN(companyId) && companyId > 0,
  });
};

// --- Hook to get company and employee counts ---
export const useCompanyCounts = () => {
  return useQuery({
    queryKey: ['company-counts'],
    queryFn: async () => {
      console.log("Fetching company and employee counts...");
      try {
          const { count: companyCount, error: companyError } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true });
          if (companyError) throw companyError;
          console.log('Company count:', companyCount);

          let uniqueEmployeeCount = 0;
          try {
              const { data: uniqueCandidates, error: rpcError } = await supabase
                    .rpc('get_unique_associated_candidate_count'); // Tries RPC first
              if (rpcError) throw rpcError;
              uniqueEmployeeCount = (uniqueCandidates as any)?.count ?? 0;
              console.log('Unique associated employee count (via RPC):', uniqueEmployeeCount);
          } catch (rpcOrFallbackError) {
                console.warn("RPC count failed or missing. Falling back to client-side count.", rpcOrFallbackError);
                // Fallback counts from BOTH tables and combines unique IDs
                const [legacyRes, newRes] = await Promise.all([
                     supabase.from('candidate_companies').select('candidate_id'),
                     supabase.from('employee_associations').select('candidate_id')
                 ]);
                 if(legacyRes.error) console.error("Error counting legacy:", legacyRes.error);
                 if(newRes.error) console.error("Error counting new assoc:", newRes.error);

                 const legacyIds = legacyRes.data?.map(e => e.candidate_id) || [];
                 const newIds = newRes.data?.map(e => e.candidate_id) || [];
                 const uniqueSet = new Set([...legacyIds, ...newIds]);
                 uniqueEmployeeCount = uniqueSet.size;
                 console.log('Unique associated employee count (via fallback):', uniqueEmployeeCount);
           }

          return { companies: companyCount ?? 0, employees: uniqueEmployeeCount };
      } catch(error) {
           console.error('Error fetching counts:', error);
            return { companies: 0, employees: 0 }; // Return default on error
      }
    }
  });
};

// --- Hook to fetch details from Gemini AI ---
export const useFetchCompanyDetails = () => {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key (VITE_GEMINI_API_KEY) is missing.");
    return async (_companyName: string): Promise<Partial<CompanyDetail>> => { throw new Error("AI Service Key not configured."); };
  }

  return async (companyName: string): Promise<Partial<CompanyDetail>> => {
    if (!GEMINI_API_KEY) throw new Error("AI Service Key not configured.");
    console.log('Fetching company details via Gemini for:', companyName);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const generationConfig = { temperature: 0.4, topK: 1, topP: 1, maxOutputTokens: 1024 };
      const safetySettings = [
                 { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
              ];
      const prompt = ` Provide the following details for the company named "${companyName}":
        1. Founding date/year (key: "founded")
        2. CEO name (key: "ceo")
        3. Approx employee count (integer, key: "employees")
        4. HQ address (key: "address")
        5. Website URL (key: "website")
        6. LinkedIn URL (key: "linkedin")
        7. Industry (key: "industry")
        8. HQ Location (City, Country) (key: "location")
        9. Twitter URL (key: "twitter")
        10. Facebook URL (key: "facebook")
        11. Publicly accessible logo URL (key: "logo_url")
         12. Estimated Annual Revenue (key: "revenue"). If possible, include currency symbol and scale (e.g., "$61.6B", "€50M", "10000000 INR"). If only number is known, provide just the number.
        13. Estimated Cash Flow (key: "cashflow"). Format similarly to revenue if possible.

        Return ONLY a single, valid JSON object with these keys. Use null if info not found. No extra text or markdown.
        Example: {"founded":"2006",...,"location":"City, Country","twitter":null,"facebook":null,"logo_url":null,"revenue":"$61.6B","cashflow":"$10B"}`; // Your full Gemini prompt

      const parts = [{ text: prompt }];
      console.log("Sending prompt to Gemini...");
      const result = await model.generateContent({ contents: [{ role: "user", parts }], generationConfig, safetySettings });

      if (!result.response?.candidates?.length) { throw new Error("AI service did not provide a valid response."); }
      const responseText = result.response.text();
      console.log("Raw response text from Gemini:", responseText);

      const data = extractJson(responseText);
      if (!data || typeof data !== 'object') throw new Error("AI failed to return valid JSON.");
      console.log("Parsed company details from Gemini:", data);

       // --- UPDATE MAPPED DETAILS ---
       const mappedDetails: Partial<CompanyDetail> = {
        start_date: typeof data.founded === 'string' ? data.founded : null,
        ceo: typeof data.ceo === 'string' ? data.ceo : null,
        employee_count: typeof data.employees === 'number' ? Math.floor(data.employees) : null,
        address: typeof data.address === 'string' ? data.address : null,
        website: typeof data.website === 'string' ? data.website : null,
        linkedin: typeof data.linkedin === 'string' ? data.linkedin : null,
        industry: typeof data.industry === 'string' ? data.industry : null,
        location: typeof data.location === 'string' ? data.location : null,
        twitter: typeof data.twitter === 'string' ? data.twitter : null,
        facebook: typeof data.facebook === 'string' ? data.facebook : null,
        logo_url: typeof data.logo_url === 'string' ? data.logo_url : null,
       // Add Revenue and Cashflow with parsing
       revenue: parseFinancialValue(data.revenue),
       cashflow: parseFinancialValue(data.cashflow),
    };
    // --- END UPDATE MAPPED DETAILS ---
      console.log("Mapped details for update:", mappedDetails);
      return mappedDetails;

    } catch (error: any) {
      console.error('Error fetching company details from Gemini:', error);
      throw new Error(`Failed to fetch details from AI: ${error.message}`);
    }
  };
};