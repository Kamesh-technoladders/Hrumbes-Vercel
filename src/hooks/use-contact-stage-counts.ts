// src/hooks/use-contact-stage-counts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

// Define the expected structure of the count object
export interface ContactStageCounts {
  prospect: number;
  interested: number;
  unresponsive: number;
  // Add other stages you want to count
}

// Default empty counts
const defaultCounts: ContactStageCounts = {
    prospect: 0,
    interested: 0,
    unresponsive: 0,
};

// Name of your Supabase RPC function (you'll create this in SQL)
const RPC_FUNCTION_NAME = 'get_contact_stage_counts_for_dashboard';

export const useContactStageCounts = () => {
  return useQuery({
    queryKey: ['contact-stage-counts'], // Unique query key
    queryFn: async (): Promise<ContactStageCounts> => {
      console.log("Fetching contact stage counts via RPC...");
      const { data, error } = await supabase.rpc(RPC_FUNCTION_NAME);

      if (error) {
        console.error(`Error calling RPC function ${RPC_FUNCTION_NAME}:`, error);
        // Return default counts on error, or re-throw based on desired behavior
        return defaultCounts;
      }

      console.log("RPC contact stage counts received:", data);

      // Assuming the RPC function returns an array like:
      // [{ stage: 'Prospect', count: 150 }, { stage: 'Interested', count: 50 }, ...]
      // We need to transform it into the ContactStageCounts object structure.
      const counts: ContactStageCounts = { ...defaultCounts }; // Start with defaults

      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.stage && typeof item.count === 'number') {
             const stageKey = item.stage.toLowerCase().replace(/\s+/g, ''); // Normalize key
             if (stageKey === 'prospect') counts.prospect = item.count;
             if (stageKey === 'interested') counts.interested = item.count;
             if (stageKey === 'unresponsive') counts.unresponsive = item.count;
             // Add mappings for other stages if needed
          }
        });
      } else {
          console.warn("RPC function did not return the expected array format.");
      }

      return counts;
    },
    // Add caching strategy
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};