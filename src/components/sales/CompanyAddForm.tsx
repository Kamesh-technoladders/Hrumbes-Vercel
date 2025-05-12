// src/components/CompanyAddForm.tsx
import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardFooter } from "@/components/ui/card"; // Using CardFooter for consistency maybe? or just div
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
// Import only the base Company type or define necessary fields
import { Company } from "@/types/company";

// Define props for the Add form
interface CompanyAddFormProps {
  onClose: () => void; // Function to close the dialog
}

// Zod schema for ADDING a company
// Make fields optional based on your DB constraints, except for 'name'
const addFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  domain: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  // Add other fields that can be set during creation
  industry: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  account_owner: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  employee_count: z.union([
      z.string().transform(val => (val === "" || val == null) ? null : parseInt(val)).refine(val => val === null || !isNaN(val), { message: "Must be a number" }).nullable(),
      z.number().nullable()
    ]).optional().nullable(),
  linkedin: z.string().optional().nullable(),
  // Explicitly exclude fields not set on creation like id, logo_url (handled separately?), status (has default?)
});

// Infer type from Zod schema
type AddFormValues = z.infer<typeof addFormSchema>;

const CompanyAddForm = ({ onClose }: CompanyAddFormProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addFormSchema),
    // Default values for a new company form
    defaultValues: {
      name: "",
      domain: "",
      website: "",
      industry: "",
      stage: "Cold", // Sensible default?
      location: "",
      account_owner: "",
      about: "",
      employee_count: null,
      linkedin: "",
    },
  });

  const addCompanyMutation = useMutation({
    mutationFn: async (data: AddFormValues) => {
       // Prepare data, ensuring numeric fields are handled
       const insertData: Partial<Company> = {
          ...data,
          employee_count: typeof data.employee_count === 'string'
              ? parseInt(data.employee_count) || null
              : data.employee_count ?? null,
          // Set default status if needed, or let DB handle it
          // status: 'Prospect',
       };

      // Use insert instead of update
      const { error, data: newCompany } = await supabase
        .from('companies')
        .insert(insertData)
        .select() // Select the newly created row to confirm
        .single(); // Expecting only one row back

      if (error) throw error;
      return newCompany; // Return the new company data (optional)
    },
    onSuccess: (newCompany) => {
      toast({ title: "Company Added", description: `${newCompany?.name || 'New company'} created successfully.` });
      queryClient.invalidateQueries({ queryKey: ['companies'] }); // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['company-counts'] }); // Invalidate counts
      onClose(); // Close the dialog on successful save
    },
    onError: (error) => {
      console.error("Add company failed:", error);
      toast({ title: "Add failed", description: error.message, variant: "destructive" });
      // Keep dialog open for correction
    }
  });

  const onSubmit = (data: AddFormValues) => {
    console.log("Submitting new company data:", data);
    addCompanyMutation.mutate(data);
  };

  return (
    <Form {...form}>
      {/* Use space-y-4 for spacing */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">

        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Company Name*</FormLabel><FormControl><Input placeholder="Company name" {...field} /></FormControl><FormMessage /></FormItem>)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <FormField control={form.control} name="domain" render={({ field }) => (<FormItem><FormLabel>Domain</FormLabel><FormControl><Input placeholder="example.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
           <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
           <FormField control={form.control} name="industry" render={({ field }) => (<FormItem><FormLabel>Industry</FormLabel><FormControl><Input placeholder="e.g., Financial Services" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
           <FormField control={form.control} name="stage" render={({ field }) => (<FormItem><FormLabel>Stage</FormLabel><FormControl><Input placeholder="e.g., Cold, Prospect" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            {/* Consider using a Select component for Stage if you have predefined options */}
           <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., United States" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
           <FormField control={form.control} name="account_owner" render={({ field }) => (<FormItem><FormLabel>Account Owner</FormLabel><FormControl><Input placeholder="Owner name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="employee_count" render={({ field }) => (<FormItem><FormLabel># Employees</FormLabel><FormControl><Input type="number" placeholder="Approx number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="linkedin" render={({ field }) => (<FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/company/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>

         <FormField control={form.control} name="about" render={({ field }) => (<FormItem><FormLabel>About</FormLabel><FormControl><Textarea placeholder="Brief description..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        {/* Footer with buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={addCompanyMutation.isPending}>
            {addCompanyMutation.isPending ? "Saving..." : "Add Company"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CompanyAddForm;