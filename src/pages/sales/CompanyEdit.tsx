
import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCompanyDetails } from "@/hooks/use-companies";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  ceo: z.string().optional(),
  start_date: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  employee_count: z.union([
    z.string().transform(val => {
      if (val === "") return null;
      const parsed = parseInt(val);
      return isNaN(parsed) ? null : parsed;
    }),
    z.number().nullable()
  ]),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CompanyEdit = () => {
  const { id } = useParams<{ id: string }>();
  const companyId = id ? parseInt(id) : 0;
  const { data: company, isLoading } = useCompanyDetails(companyId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      ceo: "",
      start_date: "",
      website: "",
      linkedin: "",
      employee_count: null,
      address: "",
    },
  });
  
  // Update form when company data is loaded
  React.useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        ceo: company.ceo || "",
        start_date: company.start_date || "",
        website: company.website || "",
        linkedin: company.linkedin || "",
        employee_count: company.employee_count,
        address: company.address || "",
      });
    }
  }, [company, form]);
  
  const updateCompany = useMutation({
    mutationFn: async (data: FormValues) => {
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', companyId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Company updated",
        description: "Company information has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      navigate(`/companies/${companyId}`);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormValues) => {
    updateCompany.mutate(data);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
        <p className="text-xl">Loading company details...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link to={`/companies/${companyId}`}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Company
        </Link>
      </Button>
      
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Edit Company</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ceo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEO</FormLabel>
                      <FormControl>
                        <Input placeholder="CEO name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founded Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="Company website" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input placeholder="LinkedIn profile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employee_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Employees</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Employee count" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Company address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <CardFooter className="flex justify-between px-0">
                <Button type="button" variant="outline" onClick={() => navigate(`/companies/${companyId}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCompany.isPending}>
                  {updateCompany.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyEdit;
