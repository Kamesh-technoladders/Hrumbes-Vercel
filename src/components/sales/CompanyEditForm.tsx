
// import React from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
// import { CompanyDetail } from "@/types/company";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useToast } from "@/hooks/use-toast";
// import { DialogFooter } from "@/components/ui/dialog";

// const formSchema = z.object({
//   name: z.string().min(1, "Company name is required"),
//   status: z.string().optional(),
//   domain: z.string().optional(),
//   website: z.string().optional(),
//   about: z.string().optional(),
//   logo_url: z.string().optional(),
//   employee_count: z.union([
//     z.string().transform(val => {
//       if (val === "") return null;
//       const parsed = parseInt(val);
//       return isNaN(parsed) ? null : parsed;
//     }),
//     z.number().nullable(),
//   ]).optional(),
//   revenue: z.union([ /* ... parsing logic ... */ ]).optional().nullable(),
//   cashflow: z.union([ /* ... parsing logic ... */ ]).optional().nullable(),
// });

// type FormValues = z.infer<typeof formSchema>;

// interface CompanyEditFormProps {
//   company: CompanyDetail | null;
// }

// const CompanyEditForm: React.FC<CompanyEditFormProps> = ({ company }) => {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();
  
//   const form = useForm<FormValues>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       name: company?.name || "",
//       status: company?.status || "Customer",
//       domain: company?.domain || "",
//       website: company?.website || "",
//       about: company?.about || "",
//       logo_url: company?.logo_url || "",
//       employee_count: company?.employee_count || null,
//     },
//   });
  
//   const updateCompany = useMutation({
//     mutationFn: async (data: FormValues) => {
//       if (!company) throw new Error("No company selected");
      
//       const { error } = await supabase
//         .from('companies')
//         .update(data)
//         .eq('id', company.id);
        
//       if (error) throw error;
//     },
//     onSuccess: () => {
//       toast({
//         title: "Company updated",
//         description: "Company information has been successfully updated",
//       });
//       queryClient.invalidateQueries({ queryKey: ['companies'] });
//       queryClient.invalidateQueries({ queryKey: ['company', company?.id] });
//     },
//     onError: (error) => {
//       toast({
//         title: "Update failed",
//         description: error.message,
//         variant: "destructive",
//       });
//     }
//   });
  
//   const onSubmit = (data: FormValues) => {
//     updateCompany.mutate(data);
//   };
  
//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
//         <FormField
//           control={form.control}
//           name="name"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Company Name*</FormLabel>
//               <FormControl>
//                 <Input placeholder="Enter company name" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />
        
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           <FormField
//             control={form.control}
//             name="status"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Status</FormLabel>
//                 <Select 
//                   onValueChange={field.onChange} 
//                   defaultValue={field.value}
//                 >
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select status" />
//                     </SelectTrigger>
//                   </FormControl>
//                   <SelectContent>
//                     <SelectItem value="Customer">Customer</SelectItem>
//                     <SelectItem value="Prospect">Prospect</SelectItem>
//                     <SelectItem value="Partner">Partner</SelectItem>
//                     <SelectItem value="Vendor">Vendor</SelectItem>
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
          
//           <FormField
//             control={form.control}
//             name="employee_count"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Employees</FormLabel>
//                 <FormControl>
//                   <Input 
//                     type="number" 
//                     placeholder="Number of employees" 
//                     {...field} 
//                     value={field.value === null ? "" : field.value}
//                     onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>
        
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           <FormField
//             control={form.control}
//             name="domain"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Domain</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Company domain" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
          
//           <FormField
//             control={form.control}
//             name="website"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Website</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Company website" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>
        
//         <FormField
//           control={form.control}
//           name="logo_url"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Logo URL</FormLabel>
//               <FormControl>
//                 <Input placeholder="URL of company logo" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />
        
//         <FormField
//           control={form.control}
//           name="about"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>About</FormLabel>
//               <FormControl>
//                 <Textarea 
//                   placeholder="Description of the company" 
//                   className="min-h-[60px] max-h-[120px]" 
//                   {...field} 
//                 />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />
        
//         <DialogFooter className="mt-4">
//           <Button type="button" variant="outline" size="sm" className="h-9">
//             Cancel
//           </Button>
//           <Button type="submit" size="sm" className="h-9" disabled={updateCompany.isPending}>
//             {updateCompany.isPending ? "Saving..." : "Save Changes"}
//           </Button>
//         </DialogFooter>
//       </form>
//     </Form>
//   );
// };

// export default CompanyEditForm;




// // src/components/CompanyEditForm.tsx
// import React, { useEffect } from "react";
// // If used as a standalone page, uncomment:
// // import { useNavigate } from "react-router-dom";
// // import { useParams } from "react-router-dom";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm } from "react-hook-form";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"; // Keep Select import
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { useToast } from "@/hooks/use-toast";
// // Use the more detailed type if available, otherwise base Company
// import { CompanyDetail as CompanyDetailType, Company } from "@/types/company";
// import { Database } from "@/types/database.types"; // Import generated types

// // Define possible stages for dropdown (if used)
// const STAGES = ['Current Client', 'Cold', 'Active Opportunity', 'Dead Opportunity', 'Do Not Prospect'];

// // Define possible statuses for dropdown
// const STATUSES = ["Customer", "Prospect", "Partner", "Vendor", "Former Customer", "Other"]; // Add more as needed

// // Define props for the component
// interface CompanyEditFormProps {
//   company: Company | CompanyDetailType | null; // Accept the company data
//   onClose: () => void; // Callback to close the modal (required if used in modal)
// }

// // Alias for Supabase Update type
// type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

// // --- UPDATED Zod Schema ---
// // Includes all editable fields from your companies table definition
// const formSchema = z.object({
//   name: z.string().min(1, "Company name is required"),
//   website: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
//   domain: z.string().optional().nullable(),
//   status: z.string().optional().nullable(), // e.g., Customer, Prospect
//   about: z.string().optional().nullable(),
//   start_date: z.string().optional().nullable(), // Keep as string for date input
//   ceo: z.string().optional().nullable(),
//   employee_count: z.union([
//     z.string()
//       .transform(val => (val === "" || val == null || isNaN(Number(val))) ? null : parseInt(String(val), 10)) // Convert empty string/null/NaN to null, else parse
//       .refine(val => val === null || !isNaN(val), { message: "Must be a valid number" }), // Ensure result is null or number
//     z.number().int().positive().nullable() // Allow direct number input or null
//   ]).optional().nullable(), // Make the whole field optional and nullable
//   address: z.string().optional().nullable(),
//   linkedin: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
//   industry: z.string().optional().nullable(),
//   stage: z.string().optional().nullable(), // Consider enum if using Select
//   location: z.string().optional().nullable(),
//   account_owner: z.string().optional().nullable(), // <<< ADDED
//   twitter: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
//   facebook: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
//   // --- ADDED FINANCIAL FIELDS ---
//   revenue: z.union([
//      z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number" }).nullable(),
//      z.number().nullable()
//   ]).optional().nullable(),
//   cashflow: z.union([
//      z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number" }).nullable(),
//      z.number().nullable()
//   ]).optional().nullable(),
//   // Exclude: id, created_at, updated_at, logo_url (handle logo separately if needed)
// });

// // Infer TS type from Zod schema
// type FormValues = z.infer<typeof formSchema>;

// const CompanyEditForm = ({ company, onClose }: CompanyEditFormProps) => {
//   // If used as standalone page, uncomment:
//   // const navigate = useNavigate();
//   // const { id } = useParams<{ id: string }>();
//   // const companyId = company?.id || (id ? parseInt(id) : 0); // Get ID from prop or params

//   const companyId = company?.id; // Get ID from the passed company object
//   const queryClient = useQueryClient();
//   const { toast } = useToast();

//   const form = useForm<FormValues>({
//     resolver: zodResolver(formSchema),
//     // Initialize with empty strings or nulls, then populate via useEffect
//     defaultValues: {
//       name: "", website: "", domain: "", status: "Customer", // Default status
//       about: "", start_date: "", ceo: "", employee_count: null, address: "",
//       linkedin: "", industry: "", stage: "Cold", // Default stage
//       location: "", account_owner: "", twitter: "", facebook: "",
//       revenue: null, cashflow: null, // Initialize new fields
//     },
//   });

//   // Populate form when company data is loaded or changes
//   useEffect(() => {
//     if (company) {
//       form.reset({
//         name: company.name || "",
//         website: company.website || "",
//         domain: company.domain || "",
//         status: company.status || "Customer", // Use default if null
//         about: company.about || "",
//         start_date: company.start_date || "", // Assuming start_date is string YYYY-MM-DD
//         ceo: company.ceo || "",
//         employee_count: company.employee_count ?? null, // Handle potential null
//         address: company.address || "",
//         linkedin: company.linkedin || "",
//         industry: company.industry || "",
//         stage: company.stage || "Cold", // Use default if null
//         location: company.location || "",
//         account_owner: company.account_owner || "", // <<< ADDED
//         twitter: company.twitter || "",
//         facebook: company.facebook || "",
//         revenue: company.revenue ?? null, // <<< ADDED
//         cashflow: company.cashflow ?? null, // <<< ADDED
//       });
//     }
//   }, [company, form]); // Rerun effect if company data changes

//   // Mutation for updating the company
//   const updateCompanyMutation = useMutation({
//     mutationFn: async (data: FormValues) => {
//       if (!companyId) throw new Error("Company ID is missing for update.");

//       // Prepare data for Supabase, ensuring correct types and nulls
//       // Explicitly type to ensure all fields are considered
//       const updateData: CompanyUpdate = {
//         name: data.name,
//         website: data.website || null,
//         domain: data.domain || null,
//         status: data.status || null,
//         about: data.about || null,
//         start_date: data.start_date || null,
//         ceo: data.ceo || null,
//         employee_count: data.employee_count ?? null, // Already number | null from Zod
//         address: data.address || null,
//         linkedin: data.linkedin || null,
//         industry: data.industry || null,
//         stage: data.stage || null,
//         location: data.location || null,
//         account_owner: data.account_owner || null, // <<< ADDED
//         twitter: data.twitter || null,
//         facebook: data.facebook || null,
//         revenue: data.revenue ?? null, // <<< ADDED (already number | null from Zod)
//         cashflow: data.cashflow ?? null, // <<< ADDED (already number | null from Zod)
//         // Exclude non-editable fields like id, created_at, updated_at, logo_url
//       };

//       // Remove undefined properties just in case (though Zod should handle it)
//       Object.keys(updateData).forEach(key => updateData[key as keyof CompanyUpdate] === undefined && delete updateData[key as keyof CompanyUpdate]);


//       console.log("Updating company ID:", companyId, "with data:", updateData);

//       const { error } = await supabase
//         .from('companies')
//         .update(updateData)
//         .eq('id', companyId); // Use the correct company ID

//       if (error) {
//           console.error("Supabase update error:", error);
//           throw error;
//       }
//     },
//     onSuccess: () => {
//       toast({
//         title: "Company Updated",
//         description: "Information saved successfully.",
//       });
//       // Invalidate queries to refetch data
//       queryClient.invalidateQueries({ queryKey: ['company', companyId] }); // Detail view
//       queryClient.invalidateQueries({ queryKey: ['companies'] }); // List view
//       onClose(); // Close the modal passed from parent
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Update Failed",
//         description: error.message || "Could not save changes.",
//         variant: "destructive",
//       });
//     }
//   });

//   // Form submission handler
//   const onSubmit = (data: FormValues) => {
//     updateCompanyMutation.mutate(data);
//   };

//   // Prevent rendering if essential data is missing
//   if (!company) {
//     return <div className="p-4 text-center text-muted-foreground">Company data not available.</div>;
//   }

//   return (
//     // Removed outer Card, assuming this is inside DialogContent
//     <Form {...form}>
//       {/* Added more vertical spacing between field groups */}
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">

//         {/* Grouping related fields */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Company Name*</FormLabel><FormControl><Input placeholder="Enter company name" {...field} /></FormControl><FormMessage /></FormItem>)} />
//             <FormField control={form.control} name="domain" render={({ field }) => (<FormItem><FormLabel>Domain</FormLabel><FormControl><Input placeholder="example.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//             <FormField control={form.control} name="linkedin" render={({ field }) => (<FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input type="url" placeholder="https://linkedin.com/company/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//             <FormField control={form.control} name="twitter" render={({ field }) => (<FormItem><FormLabel>Twitter / X</FormLabel><FormControl><Input type="url" placeholder="https://twitter.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//             <FormField control={form.control} name="facebook" render={({ field }) => (<FormItem><FormLabel>Facebook</FormLabel><FormControl><Input type="url" placeholder="https://facebook.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <FormField control={form.control} name="ceo" render={({ field }) => (<FormItem><FormLabel>CEO</FormLabel><FormControl><Input placeholder="CEO name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//             <FormField control={form.control} name="start_date" render={({ field }) => (<FormItem><FormLabel>Founded Date</FormLabel><FormControl><Input placeholder="YYYY or YYYY-MM-DD" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//              {/* Consider using a proper Date Picker component */}
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//              <FormField control={form.control} name="employee_count" render={({ field }) => (<FormItem><FormLabel>Employees</FormLabel><FormControl><Input type="number" placeholder="Approximate count" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//              <FormField control={form.control} name="industry" render={({ field }) => (<FormItem><FormLabel>Industry</FormLabel><FormControl><Input placeholder="e.g., Software, Finance" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//         </div>

//          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//              <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="City, Country" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Full Address</FormLabel><FormControl><Input placeholder="Company address" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//          </div>

//          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* --- ADDED Account Owner Field --- */}
//              <FormField control={form.control} name="account_owner" render={({ field }) => (<FormItem><FormLabel>Account Owner</FormLabel><FormControl><Input placeholder="Internal owner name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//               {/* --- END Account Owner Field --- */}
//               <FormField control={form.control} name="stage" render={({ field }) => (<FormItem><FormLabel>Company Stage</FormLabel>
//                 <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined} value={field.value ?? undefined}>
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select stage" />
//                     </SelectTrigger>
//                   </FormControl>
//                   <SelectContent>
//                     <SelectItem value="">(Clear Stage)</SelectItem>
//                     {STAGES.map(stage => (
//                       <SelectItem key={stage} value={stage}>{stage}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               <FormMessage /></FormItem>)} />
//                {/* --- ADDED Status Field (using Select) --- */}
//               <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel>
//                   <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined} value={field.value ?? undefined}>
//                       <FormControl>
//                           <SelectTrigger>
//                               <SelectValue placeholder="Select status" />
//                           </SelectTrigger>
//                       </FormControl>
//                       <SelectContent>
//                            <SelectItem value="">(Clear Status)</SelectItem>
//                            {STATUSES.map(status => (
//                                <SelectItem key={status} value={status}>{status}</SelectItem>
//                            ))}
//                       </SelectContent>
//                   </Select>
//               <FormMessage /></FormItem>)} />
//                {/* --- END Status Field --- */}
//          </div>

//           {/* --- ADDED Financial Fields --- */}
//          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <FormField control={form.control} name="revenue" render={({ field }) => (<FormItem><FormLabel>Est. Revenue</FormLabel><FormControl><Input type="text" placeholder="e.g., 50M or 50000000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//               <FormField control={form.control} name="cashflow" render={({ field }) => (<FormItem><FormLabel>Est. Cash Flow</FormLabel><FormControl><Input type="text" placeholder="e.g., 10M or 10000000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
//          </div>
//          {/* --- END Financial Fields --- */}

//         <FormField control={form.control} name="about" render={({ field }) => (<FormItem><FormLabel>About</FormLabel><FormControl><Textarea placeholder="Brief description..." className="min-h-[80px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

//         {/* Footer with buttons */}
//         {/* Using div instead of CardFooter as Card is removed */}
//         <div className="flex justify-end gap-2 pt-6">
//           {/* Use the onClose prop passed from the parent modal */}
//           <Button type="button" variant="outline" onClick={onClose}>
//             Cancel
//           </Button>
//           <Button type="submit" disabled={updateCompanyMutation.isPending}>
//             {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
//           </Button>
//         </div>
//       </form>
//     </Form>
//   );
// };

// export default CompanyEditForm;


// src/components/CompanyEditForm.tsx
import React, { useEffect } from "react";
// If used as a standalone page, you might need useNavigate
// import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
// Import the specific type needed, likely CompanyDetail for editing
import { CompanyDetail as CompanyDetailType, Company } from "@/types/company";
import { Database } from "@/types/database.types"; // Import generated types

// Define possible stages for dropdown
const STAGES = ['Current Client', 'Cold', 'Active Opportunity', 'Dead Opportunity', 'Do Not Prospect'];
// Define possible statuses for dropdown
const STATUSES = ["Customer", "Prospect", "Partner", "Vendor", "Former Customer", "Other"];

// Special value for clearing selection in Select components
const CLEAR_SELECTION_VALUE = "__clear__";

// Define props for the component
interface CompanyEditFormProps {
  company: Company | CompanyDetailType | null; // Accept the full company data for editing
  onClose: () => void; // Callback to close the modal
}

// Alias for Supabase Update type from generated types
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

// --- UPDATED Zod Schema ---
// Includes all relevant editable fields from your companies table definition
const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
  domain: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(), // Keep as string for simple date input for now
  ceo: z.string().optional().nullable(),
  employee_count: z.union([
    z.string()
      .transform(val => (val === "" || val == null || isNaN(Number(val))) ? null : parseInt(String(val), 10))
      .refine(val => val === null || (!isNaN(val) && Number.isInteger(val) && val >= 0), { message: "Must be a valid non-negative whole number" }),
    z.number().int().nonnegative().nullable() // Allow direct non-negative integer input or null
  ]).optional().nullable(),
  address: z.string().optional().nullable(),
  linkedin: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
  industry: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  account_owner: z.string().optional().nullable(), // Added
  twitter: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
  facebook: z.string().url({ message: "Invalid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
  // Added financial fields with parsing for strings like "$10M" or numbers
  revenue: z.union([
     z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number format" }).nullable(),
     z.number().nullable() // Allow direct number input
  ]).optional().nullable(),
  cashflow: z.union([
     z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number format" }).nullable(),
     z.number().nullable() // Allow direct number input
  ]).optional().nullable(),
  // Excluded: id, created_at, updated_at, logo_url (assuming logo is handled elsewhere or not editable here)
  // Excluded: license_usage (assuming not user-editable)
});

// Infer TS type from Zod schema
type FormValues = z.infer<typeof formSchema>;

const CompanyEditForm = ({ company, onClose }: CompanyEditFormProps) => {
  // If used as standalone page, uncomment/adjust:
  // const navigate = useNavigate();
  // const { id } = useParams<{ id: string }>();
  // const companyId = company?.id || (id ? parseInt(id) : 0);

  const companyId = company?.id; // Get ID from the passed company object
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // Initialize with defaults, will be overwritten by useEffect
    defaultValues: {
      name: "", website: "", domain: "", status: "Customer", about: "", start_date: "",
      ceo: "", employee_count: null, address: "", linkedin: "", industry: "",
      stage: "Cold", location: "", account_owner: "", twitter: "", facebook: "",
      revenue: null, cashflow: null,
    },
  });

  // Populate form when company data is loaded or changes
  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        website: company.website || "",
        domain: company.domain || "",
        status: company.status || null, // Use null if empty, let Select handle placeholder
        about: company.about || "",
        start_date: company.start_date || "",
        ceo: company.ceo || "",
        employee_count: company.employee_count ?? null,
        address: company.address || "",
        linkedin: company.linkedin || "",
        industry: company.industry || "",
        stage: company.stage || null, // Use null if empty
        location: company.location || "",
        account_owner: company.account_owner || "", // Added
        twitter: company.twitter || "",
        facebook: company.facebook || "",
        revenue: company.revenue ?? null, // Added
        cashflow: company.cashflow ?? null, // Added
      });
    }
  }, [company, form]); // Rerun effect if company data changes

  // Mutation for updating the company
  const updateCompanyMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      if (!companyId) throw new Error("Company ID is missing for update.");

      // Prepare data for Supabase update, ensuring correct types and nulls
      const updateData: CompanyUpdate = {
        name: formData.name,
        website: formData.website || null,
        domain: formData.domain || null,
        status: formData.status || null, // Ensure null if cleared
        about: formData.about || null,
        start_date: formData.start_date || null,
        ceo: formData.ceo || null,
        employee_count: formData.employee_count ?? null, // Zod already handled parsing
        address: formData.address || null,
        linkedin: formData.linkedin || null,
        industry: formData.industry || null,
        stage: formData.stage || null, // Ensure null if cleared
        location: formData.location || null,
        account_owner: formData.account_owner || null, // Added
        twitter: formData.twitter || null,
        facebook: formData.facebook || null,
        revenue: formData.revenue ?? null, // Added (Zod handled parsing)
        cashflow: formData.cashflow ?? null, // Added (Zod handled parsing)
        // Ensure non-editable fields are not included
      };

      // Remove undefined properties (though Zod/defaults should prevent this)
      Object.keys(updateData).forEach(key => updateData[key as keyof CompanyUpdate] === undefined && delete updateData[key as keyof CompanyUpdate]);

      console.log("Updating company ID:", companyId, "with data:", updateData);

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (error) {
          console.error("Supabase update error:", error);
          throw error; // Let onError handle toast
      }
    },
    onSuccess: () => {
      toast({ title: "Company Updated", description: "Information saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onClose(); // Close the modal
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Could not save changes.", variant: "destructive" });
    }
  });

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    updateCompanyMutation.mutate(data);
  };

  if (!company) {
    return <div className="p-4 text-center text-muted-foreground">Loading company data...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">

        {/* Group 1: Core Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Company Name*</FormLabel><FormControl><Input placeholder="Enter company name" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="domain" render={({ field }) => (<FormItem><FormLabel>Domain</FormLabel><FormControl><Input placeholder="example.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        {/* Group 2: Online Presence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="linkedin" render={({ field }) => (<FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input type="url" placeholder="https://linkedin.com/company/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="twitter" render={({ field }) => (<FormItem><FormLabel>Twitter / X</FormLabel><FormControl><Input type="url" placeholder="https://twitter.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="facebook" render={({ field }) => (<FormItem><FormLabel>Facebook</FormLabel><FormControl><Input type="url" placeholder="https://facebook.com/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        {/* Group 3: Leadership & Founding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="ceo" render={({ field }) => (<FormItem><FormLabel>CEO</FormLabel><FormControl><Input placeholder="CEO name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="start_date" render={({ field }) => (<FormItem><FormLabel>Founded Date</FormLabel><FormControl><Input placeholder="YYYY or YYYY-MM-DD" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        {/* Group 4: Size & Industry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="employee_count" render={({ field }) => (<FormItem><FormLabel>Employees</FormLabel><FormControl><Input type="number" placeholder="Approximate count" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="industry" render={({ field }) => (<FormItem><FormLabel>Industry</FormLabel><FormControl><Input placeholder="e.g., Software, Finance" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>

         {/* Group 5: Location */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="City, Country" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Full Address</FormLabel><FormControl><Input placeholder="Company address" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
         </div>

         {/* Group 6: Internal/Sales Info */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="account_owner" render={({ field }) => (<FormItem><FormLabel>Account Owner</FormLabel><FormControl><Input placeholder="Internal owner name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="stage" render={({ field }) => (<FormItem><FormLabel>Company Stage</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === CLEAR_SELECTION_VALUE ? null : value)} value={field.value ?? ""} >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={CLEAR_SELECTION_VALUE}>(Clear Stage)</SelectItem>
                    {STAGES.map(stage => (<SelectItem key={stage} value={stage}>{stage}</SelectItem>))}
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === CLEAR_SELECTION_VALUE ? null : value)} value={field.value ?? ""} >
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                           <SelectItem value={CLEAR_SELECTION_VALUE}>(Clear Status)</SelectItem>
                           {STATUSES.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                      </SelectContent>
                  </Select>
              <FormMessage /></FormItem>)} />
         </div>

          {/* Group 7: Financials */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="revenue" render={({ field }) => (<FormItem><FormLabel>Est. Revenue</FormLabel><FormControl><Input type="text" placeholder="e.g., 50M or 50000000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cashflow" render={({ field }) => (<FormItem><FormLabel>Est. Cash Flow</FormLabel><FormControl><Input type="text" placeholder="e.g., 10M or 10000000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
         </div>

         {/* Group 8: About */}
        <FormField control={form.control} name="about" render={({ field }) => (<FormItem><FormLabel>About</FormLabel><FormControl><Textarea placeholder="Brief description..." className="min-h-[80px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        {/* Footer with buttons */}
        <div className="flex justify-end gap-2 pt-6">
          <Button type="button" variant="outline" onClick={onClose}> Cancel </Button>
          <Button type="submit" disabled={updateCompanyMutation.isPending}> {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"} </Button>
        </div>
      </form>
    </Form>
  );
};

export default CompanyEditForm;