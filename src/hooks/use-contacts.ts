// src/hooks/use-contacts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client"; // Adjust path if your client is elsewhere
import { Contact } from '@/types/contact'; // Assuming your Contact type is defined here
                                        // Or import from database.types.ts if using generated types directly
// import { Database } from '@/types/database.types';
// type Contact = Database['public']['Tables']['contacts']['Row'];


// Hook to fetch all contacts, ordered by creation date (newest first)
export const useContacts = () => {
  return useQuery<Contact[], Error>({ // Explicitly type queryFn return and error
    queryKey: ['contacts'], // Unique query key for this fetch operation
    queryFn: async (): Promise<Contact[]> => {
      console.log("Fetching all contacts from database...");
      const { data, error } = await supabase
        .from('contacts') // Your contacts table name
        .select(`
          id,
          name,
          email,
          mobile,
          job_title,
          linkedin_url,
          contact_owner,
          contact_stage,
          created_at,
          updated_at
        `) // Select the columns you need for the list view
        .order('created_at', { ascending: false }); // Order by newest first

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error; // Throw error for React Query to handle
      }

      console.log(`Successfully fetched ${data?.length || 0} contacts.`);
      return data || []; // Return the data or an empty array
    },
    // Optional: Configure caching behavior
    // staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    // gcTime: 10 * 60 * 1000,  // Cache is kept for 10 minutes after unmount
  });
};

// Optional: Hook to fetch a single contact by ID (if you have a contact detail page)
export const useContactDetails = (contactId: string | undefined) => {
  return useQuery<Contact | null, Error>({
    queryKey: ['contact', contactId],
    queryFn: async (): Promise<Contact | null> => {
      if (!contactId) {
        console.log("No contactId provided for useContactDetails.");
        return null;
      }
      console.log(`Fetching details for contact ID: ${contactId}`);
      const { data, error } = await supabase
        .from('contacts')
        .select('*') // Select all details for a single contact view
        .eq('id', contactId)
        .maybeSingle(); // Returns one row or null, doesn't error if not found

      if (error) {
        console.error(`Error fetching contact details for ID ${contactId}:`, error);
        throw error;
      }
      console.log(`Details fetched for contact ID ${contactId}:`, data ? 'Found' : 'Not found');
      return data;
    },
    enabled: !!contactId, // Only run query if contactId is truthy
  });
};

// You can add more hooks here as needed, e.g., for mutations (add, update, delete contacts)
// or for fetching contact stage counts.