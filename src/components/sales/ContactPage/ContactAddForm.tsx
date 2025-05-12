// src/components/ContactAddForm.tsx
import React from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ContactInsert } from '@/types/contact'; // Use ContactInsert type

const CONTACT_STAGES = ['Cold', 'Approaching', 'Replied', 'Interested', 'Not Interested', 'Un Responsive', 'Do Not Contact', 'Bad Data', 'Changed Job', 'Prospect'];


interface ContactAddFormProps {
  onClose: () => void;
}

const addContactSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "A valid email address is required." }),
  mobile: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  linkedin_url: z.string().url({ message: "Please enter a valid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

const ContactAddForm: React.FC<ContactAddFormProps> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<AddContactFormValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      name: '', email: '', mobile: '', job_title: '',
      linkedin_url: '', contact_owner: '', contact_stage: 'Prospect',
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (formData: AddContactFormValues) => {
      const insertData: ContactInsert = {
        name: formData.name,
        email: formData.email.toLowerCase(), // Store email in lowercase for consistency
        mobile: formData.mobile || null,
        job_title: formData.job_title || null,
        linkedin_url: formData.linkedin_url || null,
        contact_owner: formData.contact_owner || null,
        contact_stage: formData.contact_stage || 'Prospect', // Default stage
        // created_by will be null if not logged in, or set via DB default/trigger
      };
      console.log("Inserting new contact:", insertData);
      const { error, data: newContact } = await supabase.from('contacts').insert(insertData).select().single();
      if (error) {
        if (error.code === '23505') { // Unique constraint violation (likely email)
          throw new Error(`A contact with email ${formData.email} already exists.`);
        }
        throw error;
      }
      return newContact;
    },
    onSuccess: (newContact) => {
      toast({ title: "Contact Added", description: `${newContact?.name || 'New contact'} created successfully.` });
      queryClient.invalidateQueries({ queryKey: ['contacts'] }); // Invalidate contacts list
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Add Failed", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: AddContactFormValues) => {
    addContactMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name*</FormLabel><FormControl><Input placeholder="Contact's full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" placeholder="contact@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>Mobile</FormLabel><FormControl><Input placeholder="+1 123 456 7890" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="job_title" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g., Sales Manager" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="linkedin_url" render={({ field }) => (<FormItem><FormLabel>LinkedIn Profile URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="contact_owner" render={({ field }) => (<FormItem><FormLabel>Contact Owner</FormLabel><FormControl><Input placeholder="Your name or team" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="contact_stage" render={({ field }) => (<FormItem><FormLabel>Contact Stage</FormLabel><FormControl><Input placeholder="e.g., Prospect" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          {/* TODO: Replace Contact Stage Input with a Select component later */}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={addContactMutation.isPending}>
            {addContactMutation.isPending ? 'Adding...' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
export default ContactAddForm;