// src/components/ContactEditForm.tsx
import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Contact, ContactUpdate } from '@/types/contact'; // Use Contact types

const CONTACT_STAGES = ['Cold', 'Approaching', 'Replied', 'Interested', 'Not Interested', 'Un Responsive', 'Do Not Contact', 'Bad Data', 'Changed Job', 'Prospect'];


interface ContactEditFormProps {
  contact: Contact | null;
  onClose: () => void;
}

// Schema for editing - email might not be editable or needs careful handling if unique
const editContactSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "A valid email address is required." }), // Keep email, but handle if it's changed
  mobile: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  linkedin_url: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')).nullable(),
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
});

type EditContactFormValues = z.infer<typeof editContactSchema>;

const ContactEditForm: React.FC<ContactEditFormProps> = ({ contact, onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<EditContactFormValues>({
    resolver: zodResolver(editContactSchema),
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      mobile: contact?.mobile || '',
      job_title: contact?.job_title || '',
      linkedin_url: contact?.linkedin_url || '',
      contact_owner: contact?.contact_owner || '',
      contact_stage: contact?.contact_stage || 'Prospect',
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name || '',
        email: contact.email || '',
        mobile: contact.mobile || '',
        job_title: contact.job_title || '',
        linkedin_url: contact.linkedin_url || '',
        contact_owner: contact.contact_owner || '',
        contact_stage: contact.contact_stage || 'Prospect',
      });
    }
  }, [contact, form]);

  const editContactMutation = useMutation({
    mutationFn: async (formData: EditContactFormValues) => {
      if (!contact?.id) throw new Error("Contact ID is missing for update.");

      const updateData: ContactUpdate = {
        name: formData.name,
        // If email is changed, it might conflict if another contact has the new email.
        // Supabase will throw an error if the new email violates the unique constraint.
        email: formData.email.toLowerCase(),
        mobile: formData.mobile || null,
        job_title: formData.job_title || null,
        linkedin_url: formData.linkedin_url || null,
        contact_owner: formData.contact_owner || null,
        contact_stage: formData.contact_stage || null,
      };
      console.log("Updating contact ID:", contact.id, "with:", updateData);
      const { error } = await supabase.from('contacts').update(updateData).eq('id', contact.id);
      if (error) {
        if (error.code === '23505') { // Unique constraint (email)
          throw new Error(`A contact with email ${formData.email} already exists.`);
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Contact Updated", description: "Contact details saved." });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contact?.id] }); // If you have a detail query
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: EditContactFormValues) => {
    editContactMutation.mutate(data);
  };

  if (!contact) return <div className="p-4 text-center">Loading contact...</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>Mobile</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="job_title" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="linkedin_url" render={({ field }) => (<FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="contact_owner" render={({ field }) => (<FormItem><FormLabel>Contact Owner</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="contact_stage" render={({ field }) => (<FormItem><FormLabel>Contact Stage</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
           {/* TODO: Replace Contact Stage Input with a Select component later */}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={editContactMutation.isPending}>
            {editContactMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
export default ContactEditForm;