
// import React, { useState, useEffect } from "react";
// import { useParams, Link } from "react-router-dom";
// import { useCompanyDetails, useCompanyEmployees, useFetchCompanyDetails } from "@/hooks/use-companies";
// import { 
//   Building2, Calendar, User, Globe, Linkedin, MapPin, Edit, ChevronLeft, 
//   RefreshCw, Search, Filter, FileDown, Plus, Columns2, Users
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { supabase } from "@/integrations/supabase/client";
// import { useToast } from "@/hooks/use-toast";
// import EmployeeTable from "@/components/EmployeeTable";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// const CompanyDetail = () => {
//   const { toast } = useToast();
//   const { id } = useParams<{ id: string }>();
//   const companyId = parseInt(id || "0");
//   const { data: company, isLoading, error, refetch } = useCompanyDetails(companyId);
//   const { 
//     data: employees = [], 
//     isLoading: isLoadingEmployees,
//     error: employeesError
//   } = useCompanyEmployees(companyId);
  
//   const fetchCompanyDetails = useFetchCompanyDetails();
//   const [activeTab, setActiveTab] = useState("details");
//   const [isFetchingDetails, setIsFetchingDetails] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");

//   // Transform employees data to match the demo data
//   const transformedEmployees = employees.map((employee, index) => ({
//     ...employee,
//     job_title: employee.designation || ["Head of Design", "Fullstack Engineer", "Mobile Lead", "Sales Manager", "Network engineer"][index % 5],
//     department: ["Product", "Engineering", "Product", "Operations", "Product"][index % 5],
//     site: ["Stockholm", "Miami", "Kyiv", "Ottawa", "Sao Paulo"][index % 5],
//     salary: ["$1,350", "$1,500", "$2,600", "$900", "$1,000"][index % 5],
//     start_date: ["Mar 13, 2023", "Oct 13, 2023", "Nov 4, 2023", "Sep 4, 2021", "Feb 21, 2023"][index % 5],
//     status: ["Invited", "Absent", "Invited", "Invited", "Invited"][index % 5],
//     lifecycle: ["Hired", "Hired", "Employed", "Employed", "Hired"][index % 5]
//   }));

//   // Fetch company details from external API
//   const handleFetchCompanyDetails = async () => {
//     if (!company?.name) {
//       toast({
//         title: "Error",
//         description: "Company name is required to fetch details",
//         variant: "destructive",
//       });
//       return;
//     }

//     setIsFetchingDetails(true);
    
//     try {
//       const companyDetails = await fetchCompanyDetails(company.name);
      
//       // Update company details in Supabase
//       const { error } = await supabase
//         .from('companies')
//         .update({
//           start_date: companyDetails.start_date,
//           ceo: companyDetails.ceo,
//           employee_count: companyDetails.employee_count,
//           address: companyDetails.address,
//           website: companyDetails.website,
//           linkedin: companyDetails.linkedin,
//         })
//         .eq('id', companyId);
        
//       if (error) {
//         throw error;
//       }
      
//       // Refetch to update UI
//       refetch();
      
//       toast({
//         title: "Success",
//         description: "Company details have been updated",
//       });
//     } catch (error) {
//       console.error("Error fetching company details:", error);
//       toast({
//         title: "Error",
//         description: "Failed to fetch company details",
//         variant: "destructive",
//       });
//     } finally {
//       setIsFetchingDetails(false);
//     }
//   };

//   // Handle errors
//   useEffect(() => {
//     if (error) {
//       toast({
//         title: "Error loading company details",
//         description: error.message,
//         variant: "destructive",
//       });
//       console.error("Company details error:", error);
//     }

//     if (employeesError) {
//       toast({
//         title: "Error loading employees",
//         description: employeesError.message,
//         variant: "destructive",
//       });
//       console.error("Employees error:", employeesError);
//     }
//   }, [error, employeesError, toast]);

//   if (isLoading) {
//     return (
//       <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
//         <p className="text-xl">Loading company details...</p>
//       </div>
//     );
//   }

//   if (!company) {
//     return (
//       <div className="container mx-auto px-4 py-8">
//         <div className="text-center">
//           <h2 className="text-2xl font-bold mb-4">Company not found</h2>
//           <Button asChild>
//             <Link to="/">Back to Companies</Link>
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto px-4 py-6">
//       <div className="flex items-center justify-between mb-6">
//         <div className="flex items-center gap-4">
//           <Button variant="outline" size="sm" asChild className="h-9">
//             <Link to="/">
//               <ChevronLeft className="h-4 w-4 mr-1" /> Back
//             </Link>
//           </Button>
//           <div className="flex items-center">
//             <Avatar className="h-12 w-12 mr-3 border">
//               <AvatarImage src={company.logo_url} alt={company.name} />
//               <AvatarFallback>{company.name.charAt(0)}</AvatarFallback>
//             </Avatar>
//             <div>
//               <h1 className="text-2xl font-bold">{company.name}</h1>
//               {company.domain && (
//                 <p className="text-sm text-muted-foreground">{company.domain}</p>
//               )}
//             </div>
//           </div>
//         </div>
//         <div className="flex gap-2">
//           <Button 
//             variant="outline"
//             onClick={handleFetchCompanyDetails} 
//             disabled={isFetchingDetails}
//             className="flex items-center gap-2 h-9"
//           >
//             <RefreshCw className={`h-4 w-4 ${isFetchingDetails ? 'animate-spin' : ''}`} />
//             {isFetchingDetails ? 'Fetching...' : 'Refresh Data'}
//           </Button>
//           <Button asChild className="h-9">
//             <Link to={`/companies/${company.id}/edit`}>
//               <Edit className="h-4 w-4 mr-1" /> Edit
//             </Link>
//           </Button>
//         </div>
//       </div>
      
//       <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
//         <TabsList className="inline-flex h-9 w-full max-w-md">
//           <TabsTrigger value="details" className="flex-1">Company Details</TabsTrigger>
//           <TabsTrigger value="employees" className="flex-1">
//             Employees ({transformedEmployees?.length || 0})
//           </TabsTrigger>
//         </TabsList>
        
//         <TabsContent value="details">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2">
//               <CardTitle className="text-lg">Company Information</CardTitle>
//             </CardHeader>
//             <CardContent className="pt-0">
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                   <h3 className="font-medium text-sm border-b pb-1 mb-3">Overview</h3>
                  
//                   <div className="flex items-center gap-3">
//                     <Building2 className="h-4 w-4 text-muted-foreground" />
//                     <div>
//                       <p className="text-xs text-muted-foreground">Status</p>
//                       <Badge className="mt-1" variant={company.status === "Customer" ? "default" : "secondary"}>
//                         {company.status || "Customer"}
//                       </Badge>
//                     </div>
//                   </div>
                  
//                   <div className="flex items-center gap-3">
//                     <Calendar className="h-4 w-4 text-muted-foreground" />
//                     <div>
//                       <p className="text-xs text-muted-foreground">Founded</p>
//                       <p className="text-sm font-medium">{company.start_date || "N/A"}</p>
//                     </div>
//                   </div>
                  
//                   <div className="flex items-center gap-3">
//                     <User className="h-4 w-4 text-muted-foreground" />
//                     <div>
//                       <p className="text-xs text-muted-foreground">CEO</p>
//                       <p className="text-sm font-medium">{company.ceo || "N/A"}</p>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                   <h3 className="font-medium text-sm border-b pb-1 mb-3">Details</h3>
                  
//                   <div className="flex items-center gap-3">
//                     <Users className="h-4 w-4 text-muted-foreground" />
//                     <div>
//                       <p className="text-xs text-muted-foreground">Employees</p>
//                       <p className="text-sm font-medium">{company.employee_count || "N/A"}</p>
//                     </div>
//                   </div>
                  
//                   <div className="flex items-center gap-3">
//                     <MapPin className="h-4 w-4 text-muted-foreground" />
//                     <div>
//                       <p className="text-xs text-muted-foreground">Address</p>
//                       <p className="text-sm font-medium line-clamp-1">{company.address || "N/A"}</p>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                   <h3 className="font-medium text-sm border-b pb-1 mb-3">Contact</h3>
                  
//                   <div className="flex items-center gap-3">
//                     <Globe className="h-4 w-4 text-muted-foreground" />
//                     <div>
//                       <p className="text-xs text-muted-foreground">Website</p>
//                       {company.website ? (
//                         <a 
//                           href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-sm text-primary hover:underline font-medium"
//                         >
//                           {company.website}
//                         </a>
//                       ) : (
//                         <p className="text-sm font-medium">N/A</p>
//                       )}
//                     </div>
//                   </div>
                  
//                   <div className="flex items-center gap-3">
//                     <Linkedin className="h-4 w-4 text-muted-foreground" />
//                     <div>
//                       <p className="text-xs text-muted-foreground">LinkedIn</p>
//                       {company.linkedin ? (
//                         <a 
//                           href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`} 
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-sm text-primary hover:underline font-medium"
//                         >
//                           {company.linkedin}
//                         </a>
//                       ) : (
//                         <p className="text-sm font-medium">N/A</p>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {company.about && (
//                 <div className="mt-4 p-4 bg-muted/30 rounded-md">
//                   <h3 className="font-medium text-sm border-b pb-1 mb-3">About</h3>
//                   <p className="text-sm">{company.about}</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
        
//         <TabsContent value="employees">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2">
//               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                 <CardTitle className="text-lg">Associated Employees</CardTitle>
//                 <div className="flex flex-wrap gap-2">
//                   <Button variant="outline" size="sm" className="h-8">
//                     <Columns2 className="h-4 w-4 mr-1" /> Columns
//                   </Button>
//                   <Button variant="outline" size="sm" className="h-8">
//                     <Filter className="h-4 w-4 mr-1" /> Filter
//                   </Button>
//                   <Button variant="outline" size="sm" className="h-8">
//                     <FileDown className="h-4 w-4 mr-1" /> Export
//                   </Button>
//                   {/* <Button size="sm" className="h-8">
//                     <Plus className="h-4 w-4 mr-1" /> Add
//                   </Button> */}
//                 </div>
//               </div>
//               <div className="relative mt-2">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
//                 <Input
//                   placeholder="Search employees..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-10 h-8"
//                 />
//               </div>
//             </CardHeader>
//             <CardContent>
//               {isLoadingEmployees ? (
//                 <div className="flex justify-center items-center h-40">
//                   <span className="loading">Loading...</span>
//                 </div>
//               ) : employeesError ? (
//                 <div className="flex justify-center items-center h-40 text-red-500">
//                   <p>Error loading employees: {employeesError.message}</p>
//                 </div>
//               ) : transformedEmployees && transformedEmployees.length > 0 ? (
//                 <EmployeeTable employees={transformedEmployees} />
//               ) : (
//                 <div className="text-center py-8">
//                   <p className="text-muted-foreground">No employees associated with this company</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// };

// export default CompanyDetail;



// import React, { useState, useEffect } from "react";
// import { useQueryClient } from "@tanstack/react-query";
// import { useParams, Link } from "react-router-dom"; // Keep Link
// import { useCompanyDetails, useCompanyEmployees, useFetchCompanyDetails } from "@/hooks/use-companies";
// import {
//   Building2, Calendar, User, Globe, Linkedin, MapPin, Edit, ChevronLeft,
//   RefreshCw, Search, Filter, FileDown, Plus, Columns2, Users, Mail, Phone // Added Mail, Phone for potential future use maybe? Keep icons imported.
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { supabase } from "@/integrations/supabase/client";
// import { useToast } from "@/hooks/use-toast";
// import EmployeeTable from "@/components/EmployeeTable"; // Renders the employee list
// import CompanyEditForm from "@/components/CompanyEditForm"; // Form used in the modal
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// // Import necessary types
// import { CompanyDetail as CompanyDetailType, CandidateDetail } from "@/types/company";

// const CompanyDetail = () => {
//   const { toast } = useToast();
//   const { id } = useParams<{ id: string }>();
//   const companyId = parseInt(id || "0");
//   const queryClient = useQueryClient();
//   // --- Data Fetching ---
//   const { data: company, isLoading, error, refetch } = useCompanyDetails(companyId);
//   const {
//     data: employees = [], // USE RAW DATA FROM HOOK
//     isLoading: isLoadingEmployees,
//     error: employeesError
//   } = useCompanyEmployees(companyId);

//   const fetchCompanyDetails = useFetchCompanyDetails();

//   // --- State ---
//   const [activeTab, setActiveTab] = useState("details");
//   const [isFetchingDetails, setIsFetchingDetails] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false); // <<< State for company edit modal

//   // --- REMOVED MOCK DATA TRANSFORMATION ---
//   // const transformedEmployees = ...; // No longer needed

//   // --- Handlers ---
//   // Handler to close the company edit modal
//   const handleCloseCompanyEditDialog = () => {
//     setIsCompanyEditDialogOpen(false);
//   };

//   // Fetch company details from external API (using safe updates)
//   const handleFetchCompanyDetails = async () => {
//     if (!company?.name) {
//       toast({ title: "Error", description: "Company name is required", variant: "destructive" });
//       return;
//     }
//     setIsFetchingDetails(true);
//     try {
//       const detailsFromAI = await fetchCompanyDetails(company.name);
//       const updatesToApply: Partial<CompanyDetailType> = {};

//       // Only add non-null values to the update object
//       if (detailsFromAI.start_date !== null && detailsFromAI.start_date !== undefined) updatesToApply.start_date = detailsFromAI.start_date;
//       if (detailsFromAI.ceo !== null && detailsFromAI.ceo !== undefined) updatesToApply.ceo = detailsFromAI.ceo;
//       if (detailsFromAI.employee_count !== null && detailsFromAI.employee_count !== undefined) updatesToApply.employee_count = detailsFromAI.employee_count;
//       if (detailsFromAI.address !== null && detailsFromAI.address !== undefined) updatesToApply.address = detailsFromAI.address;
//       if (detailsFromAI.website !== null && detailsFromAI.website !== undefined) updatesToApply.website = detailsFromAI.website;
//       if (detailsFromAI.linkedin !== null && detailsFromAI.linkedin !== undefined) updatesToApply.linkedin = detailsFromAI.linkedin;
//        // --- ADD NEW FIELDS ---
//        if (detailsFromAI.industry) updatesToApply.industry = detailsFromAI.industry;
//        if (detailsFromAI.location) updatesToApply.location = detailsFromAI.location;
//        if (detailsFromAI.twitter) updatesToApply.twitter = detailsFromAI.twitter; // Add if type has 'twitter'
//        if (detailsFromAI.facebook) updatesToApply.facebook = detailsFromAI.facebook; // Add if type has 'facebook'

//        // --- SPECIAL HANDLING FOR LOGO ---
//        // Only update logo_url if Gemini provided a non-empty string URL
//        if (detailsFromAI.logo_url && typeof detailsFromAI.logo_url === 'string' && detailsFromAI.logo_url.trim() !== '') {
//             console.log("Updating logo_url from AI:", detailsFromAI.logo_url);
//             updatesToApply.logo_url = detailsFromAI.logo_url;
//        } else {
//             console.log("No valid logo_url received from AI, existing logo will be kept.");
//        }
//        // --- END SPECIAL HANDLING ---


//       if (Object.keys(updatesToApply).length > 0) {
//         console.log("Applying updates to Supabase:", updatesToApply);
//         const { error: updateError } = await supabase.from('companies').update(updatesToApply).eq('id', companyId);
//         if (updateError) throw updateError;
//         refetch();
//         queryClient.invalidateQueries({ queryKey: ['companies'] }); 
//         toast({ title: "Success", description: "Company details updated." });
//       } else {
//         console.log("No new details found by AI.");
//         toast({ title: "No new data", description: "AI could not find new details." });
//       }
//     } catch (fetchError: any) {
//       console.error("Error fetching/updating company details:", fetchError);
//       toast({ title: "Error", description: `Operation failed: ${fetchError.message}`, variant: "destructive" });
//     } finally {
//       setIsFetchingDetails(false);
//     }
//   };

//   // --- Effects ---
//   // Handle initial load errors
//   useEffect(() => {
//     if (error) {
//       toast({ title: "Error loading company", description: error.message, variant: "destructive" });
//       console.error("Company details error:", error);
//     }
//     if (employeesError) {
//       toast({ title: "Error loading employees", description: employeesError.message, variant: "destructive" });
//       console.error("Employees error:", employeesError);
//     }
//   }, [error, employeesError, toast]);

//   // --- Render Logic ---
//   if (isLoading) {
//     return <div className="container mx-auto p-6 flex justify-center items-center h-64"><p className="text-xl">Loading...</p></div>;
//   }
//   if (!company) {
//     return <div className="container mx-auto p-6"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Company Not Found</h2><Button asChild><Link to="/">Back to List</Link></Button></div></div>;
//   }

//   // Filter employees based on search term (applied to real data)
//   const filteredEmployees = employees.filter(emp =>
//     emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="container mx-auto px-4 py-6">
//       {/* --- Header Section --- */}
//       <div className="flex items-center justify-between mb-6 gap-4">
//         <div className="flex items-center gap-4 flex-grow min-w-0"> {/* Allow left side to shrink */}
//           <Button variant="outline" size="sm" asChild className="h-9 flex-shrink-0">
//             {/* Link back to the main companies list page */}
//             <Link to="/">
//               <ChevronLeft className="h-4 w-4 mr-1" /> Back
//             </Link>
//           </Button>
//           <div className="flex items-center min-w-0"> {/* Ensure avatar section can shrink */}
//             <Avatar className="h-12 w-12 mr-3 border flex-shrink-0">
//               <AvatarImage src={company.logo_url} alt={company.name} />
//               <AvatarFallback>{company.name?.charAt(0) || '?'}</AvatarFallback>
//             </Avatar>
//             <div className="min-w-0"> {/* Allow text to truncate */}
//               <h1 className="text-2xl font-bold truncate" title={company.name}>{company.name}</h1>
//               {company.domain && (<p className="text-sm text-muted-foreground truncate" title={company.domain}>{company.domain}</p>)}
//             </div>
//           </div>
//         </div>
//         {/* Action Buttons */}
//         <div className="flex gap-2 flex-shrink-0">
//           <Button
//             variant="outline"
//             onClick={handleFetchCompanyDetails}
//             disabled={isFetchingDetails}
//             className="flex items-center gap-2 h-9"
//             title="Fetch latest details via AI"
//           >
//             <RefreshCw className={`h-4 w-4 ${isFetchingDetails ? 'animate-spin' : ''}`} />
//             {isFetchingDetails ? 'Fetching...' : 'Refresh Data'}
//           </Button>
//           {/* --- EDIT BUTTON WITH MODAL --- */}
//           <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
//             <DialogTrigger asChild>
//               <Button className="h-9" title="Edit Company Details">
//                 <Edit className="h-4 w-4 mr-1" /> Edit
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"> {/* Slightly wider modal */}
//               <DialogHeader>
//                 <DialogTitle>Edit Company</DialogTitle>
//                 <DialogDescription>
//                   Update details for {company.name}.
//                 </DialogDescription>
//               </DialogHeader>
//               {/* Pass the full company detail and the close handler */}
//               {/* Ensure CompanyEditForm handles the CompanyDetailType correctly */}
//               <CompanyEditForm
//                   company={company} // Pass the full company detail object
//                   onClose={handleCloseCompanyEditDialog}
//               />
//             </DialogContent>
//           </Dialog>
//           {/* --- END EDIT BUTTON MODAL --- */}
//         </div>
//       </div>

//       {/* --- Tabs Section --- */}
//       <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
//         <TabsList className="inline-flex h-9 w-full max-w-md">
//           <TabsTrigger value="details" className="flex-1">Company Details</TabsTrigger>
//           <TabsTrigger value="employees" className="flex-1">
//             {/* Use actual employee count */}
//             Employees ({employees?.length || 0})
//           </TabsTrigger>
//         </TabsList>

//         {/* --- Company Details Tab --- */}
//         <TabsContent value="details">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2">
//               <CardTitle className="text-lg">Company Information</CardTitle>
//             </CardHeader>
//             <CardContent className="pt-0">
//               {/* Grid layout for details */}
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                  {/* Overview */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Overview</h3>
//                     <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Status</p><Badge className="mt-1" variant={company.status === "Customer" ? "default" : "secondary"}>{company.status || "Customer"}</Badge></div></div>
//                     <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Founded</p><p className="text-sm font-medium">{company.start_date || "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">CEO</p><p className="text-sm font-medium">{company.ceo || "N/A"}</p></div></div>
//                  </div>
//                  {/* Details */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Details</h3>
//                     <div className="flex items-start gap-3"><Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Employees</p><p className="text-sm font-medium">{company.employee_count ?? "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{company.address || "N/A"}</p></div></div>
//                  </div>
//                  {/* Contact */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Contact</h3>
//                     <div className="flex items-start gap-3"><Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Website</p>{company.website ? (<a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.website}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
//                     <div className="flex items-start gap-3"><Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">LinkedIn</p>{company.linkedin ? (<a href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.linkedin}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
//                  </div>
//               </div>
//               {/* About Section */}
//               {company.about && (<div className="mt-4 p-4 bg-muted/30 rounded-md"><h3 className="font-medium text-sm border-b pb-1 mb-3">About</h3><p className="text-sm whitespace-pre-wrap">{company.about}</p></div>)}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* --- Employees Tab --- */}
//         <TabsContent value="employees">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2">
//               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                 <CardTitle className="text-lg">Associated Employees</CardTitle>
//                 {/* Action Buttons - Keep or remove as needed */}
//                  <div className="flex flex-wrap gap-2">
//                   {/* Example buttons - uncomment/modify if needed */}
//                   {/* <Button variant="outline" size="sm" className="h-8"><Columns2 className="h-4 w-4 mr-1" /> Columns</Button> */}
//                   {/* <Button variant="outline" size="sm" className="h-8"><Filter className="h-4 w-4 mr-1" /> Filter</Button> */}
//                   {/* <Button variant="outline" size="sm" className="h-8"><FileDown className="h-4 w-4 mr-1" /> Export</Button> */}
//                   {/* <Button size="sm" className="h-8"><Plus className="h-4 w-4 mr-1" /> Add Employee</Button> */}
//                 </div>
//               </div>
//               {/* Search Input */}
//               <div className="relative mt-2">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
//                 <Input
//                   placeholder="Search employees by name, email, designation..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-10 h-8" // Reduced height for compactness
//                 />
//               </div>
//             </CardHeader>
//             <CardContent>
//               {isLoadingEmployees ? (
//                 <div className="flex justify-center items-center h-40"><p>Loading employees...</p></div>
//               ) : employeesError ? (
//                 <div className="flex justify-center items-center h-40 text-red-500"><p>Error: {employeesError.message}</p></div>
//               ) : filteredEmployees && filteredEmployees.length > 0 ? (
//                  // PASS THE FILTERED, REAL EMPLOYEE DATA to the updated table component
//                 <EmployeeTable employees={filteredEmployees} />
//               ) : (
//                 <div className="text-center py-8">
//                   <p className="text-muted-foreground">
//                     {searchTerm ? 'No matching employees found.' : 'No employees associated with this company.'}
//                   </p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// };

// export default CompanyDetail;


// src/pages/CompanyDetail.tsx

// import React, { useState, useEffect } from "react";
// import { useParams, Link } from "react-router-dom";
// import { useQueryClient } from "@tanstack/react-query"; // Essential for invalidation
// import {
//   useCompanyDetails,
//   useCompanyEmployees,
//   useFetchCompanyDetails,
// } from "@/hooks/use-companies"; // Your main data hooks
// import { useUpdateCompanyLogo } from "@/hooks/use-company-logo"; // Hook for Brandfetch logo
// import {
//   Building2, Calendar, User, Globe, Linkedin, MapPin, Edit, ChevronLeft,
//   RefreshCw, Search, UserPlus, Image, // Added UserPlus, Image
// } from "lucide-react"; // Import necessary icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { supabase } from "@/integrations/supabase/client"; // Direct Supabase client for updates
// import { useToast } from "@/hooks/use-toast";
// import EmployeeTable from "@/components/EmployeeTable"; // Renders the employee list
// import CompanyEditForm from "@/components/CompanyEditForm"; // Form for editing COMPANY details
// import CandidateCompanyAddForm from "@/components/CandidateCompanyAddForm"; // Form for ADDING employee association
// import CandidateCompanyEditForm from "@/components/CandidateCompanyEditForm"; // Form for EDITING employee association
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// // Import necessary types
// import { CompanyDetail as CompanyDetailType, CandidateDetail } from "@/types/company";

// const CompanyDetail = () => {
//   // --- Hooks ---
//   const { toast } = useToast();
//   const { id } = useParams<{ id: string }>();
//   const companyId = parseInt(id || "0");
//   const queryClient = useQueryClient(); // Get client instance

//   // --- Data Fetching ---
//   const { data: company, isLoading, error: companyError, refetch } = useCompanyDetails(companyId);
//   const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError } = useCompanyEmployees(companyId);
//   const fetchCompanyDetails = useFetchCompanyDetails(); // Hook for Gemini fetch
//   const { mutate: updateLogo, isPending: isUpdatingLogo } = useUpdateCompanyLogo(); // Hook for logo fetch/update

//   // --- State ---
//   const [activeTab, setActiveTab] = useState("details");
//   const [isFetchingDetails, setIsFetchingDetails] = useState(false); // For Gemini fetch button state
//   const [searchTerm, setSearchTerm] = useState(""); // For employee search
//   const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false); // Company Edit Modal
//   const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false); // Add Employee Modal
//   const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false); // Edit Employee Modal
//   const [editingEmployee, setEditingEmployee] = useState<CandidateDetail | null>(null); // Data for Edit Employee Modal

//   // --- Handlers ---

//   // Close Company Edit Modal
//   const handleCloseCompanyEditDialog = () => {
//     setIsCompanyEditDialogOpen(false);
//   };

//   // Fetch details via Gemini AI (excluding logo)
//   const handleFetchCompanyDetails = async () => {
//     if (!company?.name) {
//       toast({ title: "Error", description: "Company name is required", variant: "destructive" });
//       return;
//     }
//     setIsFetchingDetails(true);
//     try {
//       const detailsFromAI = await fetchCompanyDetails(company.name);
//       const updatesToApply: Partial<CompanyDetailType> = {};

//       // Build update object (only non-null values, exclude logo_url and created_at)
//       if (detailsFromAI.start_date) updatesToApply.start_date = detailsFromAI.start_date;
//       if (detailsFromAI.ceo) updatesToApply.ceo = detailsFromAI.ceo;
//       if (typeof detailsFromAI.employee_count === 'number') updatesToApply.employee_count = detailsFromAI.employee_count;
//       if (detailsFromAI.address) updatesToApply.address = detailsFromAI.address;
//       if (detailsFromAI.website) updatesToApply.website = detailsFromAI.website;
//       if (detailsFromAI.linkedin) updatesToApply.linkedin = detailsFromAI.linkedin;
//       if (detailsFromAI.industry) updatesToApply.industry = detailsFromAI.industry;
//       if (detailsFromAI.location) updatesToApply.location = detailsFromAI.location;
//       if (detailsFromAI.twitter) updatesToApply.twitter = detailsFromAI.twitter;
//       if (detailsFromAI.facebook) updatesToApply.facebook = detailsFromAI.facebook;

//       // Verify created_at is not included (Safety Check)
//       if (updatesToApply.hasOwnProperty('created_at')) {
//            console.error("CRITICAL: Attempting to update created_at in handleFetchCompanyDetails!", updatesToApply);
//            throw new Error("Internal error: Cannot update creation timestamp.");
//       }


//       if (Object.keys(updatesToApply).length > 0) {
//         console.log("Applying AI updates (excluding logo) to Supabase:", updatesToApply);
//         const { error: updateError } = await supabase.from('companies').update(updatesToApply).eq('id', companyId);
//         if (updateError) throw updateError;

//         // Invalidate queries to refetch data
//         refetch(); // Refetch current company details
//         queryClient.invalidateQueries({ queryKey: ['companies'] }); // Invalidate the main list

//         toast({ title: "Success", description: "Company details updated." });
//       } else {
//         console.log("No new details found by AI.");
//         toast({ title: "No Update", description: "AI did not provide new details to update." });
//       }
//     } catch (fetchError: any) {
//       console.error("Error fetching/updating company details:", fetchError);
//       toast({ title: "Error", description: `Operation failed: ${fetchError.message}`, variant: "destructive" });
//     } finally {
//       setIsFetchingDetails(false);
//     }
//   };

//   // Fetch logo via Brandfetch Edge Function
//   const handleFetchLogo = () => {
//     // Try domain first, then parse website
//     const domainToFetch = company?.domain || company?.website?.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
//     if (companyId && domainToFetch) {
//       updateLogo({ companyId, domain: domainToFetch }); // Call the mutation from useUpdateCompanyLogo hook
//     } else {
//       toast({ title: "Cannot Fetch Logo", description: "Company domain or website is missing.", variant: "destructive" });
//     }
//   };

//   // Add Employee Modal Handlers
//   const handleAddEmployeeClick = () => setIsAddEmployeeDialogOpen(true);
//   const handleCloseAddEmployeeDialog = () => setIsAddEmployeeDialogOpen(false);

//   // Edit Employee Modal Handlers
//   const handleEditEmployeeClick = (employee: CandidateDetail) => {
//     setEditingEmployee(employee);
//     setIsEditEmployeeDialogOpen(true);
//   };
//   const handleCloseEditEmployeeDialog = () => {
//     setIsEditEmployeeDialogOpen(false);
//     // Delay setting to null for smoother animation if needed
//     setTimeout(() => setEditingEmployee(null), 300);
//   };

//   // --- Effects ---
//   // Handle initial load errors
//   useEffect(() => {
//     if (companyError) {
//       toast({ title: "Error loading company", description: companyError.message, variant: "destructive" });
//       console.error("Company details error:", companyError);
//     }
//     if (employeesError) {
//       toast({ title: "Error loading employees", description: employeesError.message, variant: "destructive" });
//       console.error("Employees error:", employeesError);
//     }
//   }, [companyError, employeesError, toast]);

//   // --- Render Logic ---
//   if (isLoading) {
//     return <div className="container mx-auto p-6 flex justify-center items-center h-64"><p className="text-xl">Loading...</p></div>;
//   }
//   if (!company) {
//     return <div className="container mx-auto p-6"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Company Not Found</h2><Button asChild><Link to="/">Back to List</Link></Button></div></div>;
//   }

//   // Filter employees based on search term (applied to real fetched data)
//   const filteredEmployees = employees.filter(emp =>
//     (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.contact_owner?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.contact_stage?.toLowerCase() || '').includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="container mx-auto px-4 py-6">
//       {/* --- Header Section --- */}
//       <div className="flex items-center justify-between mb-6 gap-4">
//         {/* Left Side: Back Button, Avatar, Name, Domain */}
//         <div className="flex items-center gap-4 flex-grow min-w-0">
//           <Button variant="outline" size="sm" asChild className="h-9 flex-shrink-0">
//             <Link to="/"> {/* Ensure this link points to your company list page */}
//               <ChevronLeft className="h-4 w-4 mr-1" /> Back
//             </Link>
//           </Button>
//           <div className="flex items-center min-w-0">
//             <Avatar className="h-12 w-12 mr-3 border flex-shrink-0">
//               {/* Display logo from company data */}
//               <AvatarImage src={company.logo_url} alt={company.name} />
//               <AvatarFallback>{company.name?.charAt(0) || '?'}</AvatarFallback>
//             </Avatar>
//             <div className="min-w-0">
//               <h1 className="text-2xl font-bold truncate" title={company.name}>{company.name}</h1>
//               {company.domain && (<p className="text-sm text-muted-foreground truncate" title={company.domain}>{company.domain}</p>)}
//             </div>
//           </div>
//         </div>
//         {/* Right Side: Action Buttons */}
//         <div className="flex gap-2 flex-shrink-0">
//           {/* Refresh Data Button (Gemini) */}
//           <Button
//             variant="outline"
//             onClick={handleFetchCompanyDetails}
//             disabled={isFetchingDetails}
//             className="flex items-center gap-2 h-9"
//             title="Fetch latest details via AI"
//           >
//             <RefreshCw className={`h-4 w-4 ${isFetchingDetails ? 'animate-spin' : ''}`} />
//             {isFetchingDetails ? 'Fetching...' : 'Refresh Data'}
//           </Button>
//           {/* Fetch Logo Button (Brandfetch) */}
//            <Button
//               variant="outline"
//               onClick={handleFetchLogo}
//               disabled={isUpdatingLogo || (!company?.domain && !company?.website)} // Disable if no domain/website
//               className="flex items-center gap-2 h-9"
//               title="Attempt to fetch logo from domain/website"
//           >
//               <Image className={`h-4 w-4 ${isUpdatingLogo ? 'animate-spin' : ''}`} />
//               {isUpdatingLogo ? 'Fetching...' : 'Fetch Logo'}
//           </Button>
//           {/* Company Edit Button (Modal) */}
//           <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
//             <DialogTrigger asChild>
//               <Button className="h-9" title="Edit Company Details">
//                 <Edit className="h-4 w-4 mr-1" /> Edit
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle>Edit Company</DialogTitle>
//                 <DialogDescription>Update details for {company.name}.</DialogDescription>
//               </DialogHeader>
//               {/* Pass company data and close handler */}
//               <CompanyEditForm company={company} onClose={handleCloseCompanyEditDialog} />
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       {/* --- Tabs Section --- */}
//       <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
//         <TabsList className="inline-flex h-9 w-full max-w-md">
//           <TabsTrigger value="details" className="flex-1">Company Details</TabsTrigger>
//           <TabsTrigger value="employees" className="flex-1">Employees ({employees?.length || 0})</TabsTrigger>
//         </TabsList>

//         {/* Company Details Tab */}
//         <TabsContent value="details">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2">
//               <CardTitle className="text-lg">Company Information</CardTitle>
//             </CardHeader>
//             <CardContent className="pt-0">
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                  {/* Overview Card */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Overview</h3>
//                     <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Status</p><Badge className="mt-1" variant={company.status === "Customer" ? "default" : "secondary"}>{company.status || "Customer"}</Badge></div></div>
//                     <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Founded</p><p className="text-sm font-medium">{company.start_date || "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">CEO</p><p className="text-sm font-medium">{company.ceo || "N/A"}</p></div></div>
//                  </div>
//                  {/* Details Card */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Details</h3>
//                     <div className="flex items-start gap-3"><Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Employees</p><p className="text-sm font-medium">{company.employee_count ?? "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{company.address || "N/A"}</p></div></div>
//                      {/* Display location if available */}
//                      <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{company.location || "N/A"}</p></div></div>
//                      {/* Display industry if available */}
//                      <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Industry</p><p className="text-sm font-medium">{company.industry || "N/A"}</p></div></div>
//                  </div>
//                  {/* Contact Card */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Contact & Social</h3>
//                     <div className="flex items-start gap-3"><Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Website</p>{company.website ? (<a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.website}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
//                     <div className="flex items-start gap-3"><Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">LinkedIn</p>{company.linkedin ? (<a href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.linkedin}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
//                     {/* Display Twitter if available */}
//                     {/* <div className="flex items-start gap-3"><Twitter className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Twitter</p>{company.twitter ? (<a href={company.twitter.startsWith('http') ? company.twitter : `https://${company.twitter}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.twitter}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div> */}
//                     {/* Display Facebook if available */}
//                     {/* <div className="flex items-start gap-3"><Facebook className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Facebook</p>{company.facebook ? (<a href={company.facebook.startsWith('http') ? company.facebook : `https://${company.facebook}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.facebook}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div> */}
//                  </div>
//               </div>
//               {/* About Section */}
//               {company.about && (<div className="mt-4 p-4 bg-muted/30 rounded-md"><h3 className="font-medium text-sm border-b pb-1 mb-3">About</h3><p className="text-sm whitespace-pre-wrap">{company.about}</p></div>)}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Employees Tab */}
//         <TabsContent value="employees">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2">
//               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                 <CardTitle className="text-lg">Associated Employees</CardTitle>
//                 {/* Add Employee Button & Modal */}
//                  <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
//                      <DialogTrigger asChild>
//                          <Button size="sm" className="h-8" onClick={handleAddEmployeeClick}>
//                              <UserPlus className="h-4 w-4 mr-2" /> Add Employee
//                          </Button>
//                      </DialogTrigger>
//                      <DialogContent className="sm:max-w-lg">
//                           <DialogHeader>
//                              <DialogTitle>Add Employee Association</DialogTitle>
//                              <DialogDescription>Associate an existing candidate.</DialogDescription>
//                           </DialogHeader>
//                           <CandidateCompanyAddForm companyId={companyId} onClose={handleCloseAddEmployeeDialog} />
//                      </DialogContent>
//                  </Dialog>
//               </div>
//               {/* Search Input */}
//               <div className="relative mt-4">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
//                 <Input
//                   placeholder="Search employees..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-10 h-8"
//                 />
//               </div>
//             </CardHeader>
//             <CardContent>
//               {/* Employee Table */}
//               {isLoadingEmployees ? (
//                  <div className="text-center py-10 text-muted-foreground">Loading employees...</div>
//               ) : employeesError ? (
//                  <div className="text-center py-10 text-red-600">Error: {employeesError.message}</div>
//               ) : (
//                 <EmployeeTable
//                     employees={filteredEmployees} // Pass filtered data
//                     onEdit={handleEditEmployeeClick} // Pass edit handler
//                  />
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>

//       {/* --- EDIT EMPLOYEE ASSOCIATION MODAL --- */}
//       {/* Renders outside the TabsContent, controlled by state */}
//       <Dialog open={isEditEmployeeDialogOpen} onOpenChange={setIsEditEmployeeDialogOpen}>
//         <DialogContent className="sm:max-w-lg">
//           <DialogHeader>
//             <DialogTitle>Edit Employee Association</DialogTitle>
//             <DialogDescription>
//               Update details for {editingEmployee?.name ?? 'this employee'} at {company.name}.
//             </DialogDescription>
//           </DialogHeader>
//           {/* Render edit form only when employee data is available */}
//           {editingEmployee && (
//             <CandidateCompanyEditForm
//               employee={editingEmployee}
//               onClose={handleCloseEditEmployeeDialog}
//             />
//           )}
//         </DialogContent>
//       </Dialog>
//       {/* --- END EDIT EMPLOYEE MODAL --- */}

//       {/* Edit Company Modal is handled by its own DialogTrigger/Dialog structure in the header */}

//     </div> // End main container
//   );
// };

// export default CompanyDetail;


// src/pages/CompanyDetail.tsx
// src/pages/CompanyDetail.tsx

// import React, { useState, useEffect } from "react";
// import { useParams, Link } from "react-router-dom";
// import { useQueryClient } from "@tanstack/react-query"; // Essential for invalidation
// import {
//   useCompanyDetails,
//   useCompanyEmployees,
//   useFetchCompanyDetails,
// } from "@/hooks/use-companies"; // Your main data hooks
// // REMOVED: import { useUpdateCompanyLogo } from '@/hooks/use-company-logo';
// import {
//   Building2, Calendar, User, Globe, Linkedin, MapPin, Edit, ChevronLeft,
//   RefreshCw, Search, UserPlus, Image,Users, // Keep Image if used elsewhere, otherwise remove
//   Mail, Phone // Icons for EmployeeTable (though rendered there)
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { supabase } from "@/integrations/supabase/client"; // Direct Supabase client for updates
// import { useToast } from "@/hooks/use-toast";
// import EmployeeTable from "@/components/EmployeeTable"; // Renders the employee list
// import CompanyEditForm from "@/components/CompanyEditForm"; // Form for editing COMPANY details
// import AddNewCandidateAndAssociationForm from "@/components/AddNewCandidateAndAssociationForm";
// import CandidateCompanyEditForm from "@/components/CandidateCompanyEditForm"; // Form for EDITING employee association
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import EmployeeAssociationEditForm from "@/components/EmployeeAssociationEditForm";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// // Import necessary types
// import { CompanyDetail as CompanyDetailType, CandidateDetail } from "@/types/company";
// import { TooltipProvider } from "@/components/ui/tooltip";

// const CompanyDetail = () => {
//   // --- Hooks ---
//   const { toast } = useToast();
//   const { id } = useParams<{ id: string }>();
//   const companyId = parseInt(id || "0");
//   const queryClient = useQueryClient(); // Get client instance

//   // --- Data Fetching ---
//   const { data: company, isLoading, error: companyError, refetch } = useCompanyDetails(companyId);
//   const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError } = useCompanyEmployees(companyId);
//   const fetchCompanyDetails = useFetchCompanyDetails(); // Hook for Gemini fetch
//   // REMOVED: const { mutate: updateLogo, isPending: isUpdatingLogo } = useUpdateCompanyLogo();

//   // --- State ---
//   const [activeTab, setActiveTab] = useState("details");
//   const [isFetchingDetails, setIsFetchingDetails] = useState(false); // For Gemini fetch button state
//   const [searchTerm, setSearchTerm] = useState(""); // For employee search
//   const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false); // Company Edit Modal
//   const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false); // Add Employee Modal
//   const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false); // Edit Employee Modal
//   const [editingEmployee, setEditingEmployee] = useState<CandidateDetail | null>(null); // Data for Edit Employee Modal

//   // --- Handlers ---

//   // Close Company Edit Modal
//   const handleCloseCompanyEditDialog = () => {
//     setIsCompanyEditDialogOpen(false);
//   };

//   // Fetch details via Gemini AI (now including logo attempt)
//   const handleFetchCompanyDetails = async () => {
//     if (!company?.name) {
//       toast({ title: "Error", description: "Company name is required", variant: "destructive" });
//       return;
//     }
//     setIsFetchingDetails(true);
//     try {
//       const detailsFromAI = await fetchCompanyDetails(company.name);
//       const updatesToApply: Partial<CompanyDetailType> = {};

//       // Build update object (only non-null values, exclude created_at)
//       if (detailsFromAI.start_date) updatesToApply.start_date = detailsFromAI.start_date;
//       if (detailsFromAI.ceo) updatesToApply.ceo = detailsFromAI.ceo;
//       if (typeof detailsFromAI.employee_count === 'number') updatesToApply.employee_count = detailsFromAI.employee_count;
//       if (detailsFromAI.address) updatesToApply.address = detailsFromAI.address;
//       if (detailsFromAI.website) updatesToApply.website = detailsFromAI.website;
//       if (detailsFromAI.linkedin) updatesToApply.linkedin = detailsFromAI.linkedin;
//       if (detailsFromAI.industry) updatesToApply.industry = detailsFromAI.industry;
//       if (detailsFromAI.location) updatesToApply.location = detailsFromAI.location;
//       // if (detailsFromAI.twitter) updatesToApply.twitter = detailsFromAI.twitter;
//       // if (detailsFromAI.facebook) updatesToApply.facebook = detailsFromAI.facebook;
//       // Include logo_url fetched by Gemini if it's valid
//        if (detailsFromAI.logo_url && typeof detailsFromAI.logo_url === 'string' && detailsFromAI.logo_url.trim() !== '') {
//             console.log("Updating logo_url from AI (Gemini):", detailsFromAI.logo_url);
//             updatesToApply.logo_url = detailsFromAI.logo_url;
//        } else {
//             console.log("No valid logo_url received from AI (Gemini), existing logo will be kept if present.");
//        }
//        if (typeof detailsFromAI.revenue === 'number') updatesToApply.revenue = detailsFromAI.revenue;
//        if (typeof detailsFromAI.cash_flow === 'number') updatesToApply.cash_flow = detailsFromAI.cash_flow;

//       // Verify created_at is not included (Safety Check)
//       if (updatesToApply.hasOwnProperty('created_at')) {
//            console.error("CRITICAL: Attempting to update created_at in handleFetchCompanyDetails!", updatesToApply);
//            throw new Error("Internal error: Cannot update creation timestamp.");
//       }

//       if (Object.keys(updatesToApply).length > 0) {
//         console.log("Applying AI updates (incl. Gemini logo) to Supabase:", updatesToApply);
//         const { error: updateError } = await supabase.from('companies').update(updatesToApply).eq('id', companyId);
//         if (updateError) throw updateError;

//         // Invalidate queries to refetch data
//         refetch(); // Refetch current company details
//         queryClient.invalidateQueries({ queryKey: ['companies'] }); // Invalidate the main list

//         toast({ title: "Success", description: "Company details updated." });
//       } else {
//         console.log("No new details found by AI.");
//         toast({ title: "No Update", description: "AI did not provide new details to update." });
//       }
//     } catch (fetchError: any) {
//       console.error("Error fetching/updating company details:", fetchError);
//       toast({ title: "Error", description: `Operation failed: ${fetchError.message}`, variant: "destructive" });
//     } finally {
//       setIsFetchingDetails(false);
//     }
//   };

//   // REMOVED: handleFetchLogo handler (as logo fetching is now part of handleFetchCompanyDetails)

//   // Add Employee Modal Handlers
//   const handleAddEmployeeClick = () => setIsAddEmployeeDialogOpen(true);
//   const handleCloseAddEmployeeDialog = () => setIsAddEmployeeDialogOpen(false);

//   // Edit Employee Modal Handlers
//   const handleEditEmployeeClick = (employee: CandidateDetail) => {
//     setEditingEmployee(employee);
//     setIsEditEmployeeDialogOpen(true);
//   };
//   const handleCloseEditEmployeeDialog = () => {
//     setIsEditEmployeeDialogOpen(false);
//     setTimeout(() => setEditingEmployee(null), 300); // Optional delay
//   };

//   // --- Effects ---
//   // Handle initial load errors
//   useEffect(() => {
//     if (companyError) {
//       toast({ title: "Error loading company", description: companyError.message, variant: "destructive" });
//       console.error("Company details error:", companyError);
//     }
//     if (employeesError) {
//       toast({ title: "Error loading employees", description: employeesError.message, variant: "destructive" });
//       console.error("Employees error:", employeesError);
//     }
//   }, [companyError, employeesError, toast]);

//   // --- Render Logic ---
//   if (isLoading) {
//     return <div className="container mx-auto p-6 flex justify-center items-center h-64"><p className="text-xl">Loading...</p></div>;
//   }
//   if (!company) {
//     return <div className="container mx-auto p-6"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Company Not Found</h2><Button asChild><Link to="/">Back to List</Link></Button></div></div>;
//   }

//   // Filter employees for search
//   const filteredEmployees = employees.filter(emp =>
//     (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.contact_owner?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//     (emp.contact_stage?.toLowerCase() || '').includes(searchTerm.toLowerCase())
//   );

//   return (
//     <TooltipProvider>
//     <div className="container mx-auto px-4 py-6">
//       {/* --- Header Section --- */}
//       <div className="flex items-center justify-between mb-6 gap-4">
//          {/* Left Side */}
//         <div className="flex items-center gap-4 flex-grow min-w-0">
//           <Button variant="outline" size="sm" asChild className="h-9 flex-shrink-0">
//             <Link to="/"> {/* Link back to the main companies list */}
//               <ChevronLeft className="h-4 w-4 mr-1" /> Back
//             </Link>
//           </Button>
//           <div className="flex items-center min-w-0">
//             <Avatar className="h-12 w-12 mr-3 border flex-shrink-0">
//               <AvatarImage src={company.logo_url} alt={company.name} />
//               <AvatarFallback>{company.name?.charAt(0) || '?'}</AvatarFallback>
//             </Avatar>
//             <div className="min-w-0">
//               <h1 className="text-2xl font-bold truncate" title={company.name}>{company.name}</h1>
//               {company.domain && (<p className="text-sm text-muted-foreground truncate" title={company.domain}>{company.domain}</p>)}
//             </div>
//           </div>
//         </div>
//         {/* Right Side Actions */}
//         <div className="flex gap-2 flex-shrink-0">
//           {/* Refresh Data Button (Gemini - now includes logo attempt) */}
//           <Button
//             variant="outline"
//             onClick={handleFetchCompanyDetails}
//             disabled={isFetchingDetails}
//             className="flex items-center gap-2 h-9"
//             title="Fetch latest details via AI"
//           >
//             <RefreshCw className={`h-4 w-4 ${isFetchingDetails ? 'animate-spin' : ''}`} />
//             {isFetchingDetails ? 'Fetching...' : 'Refresh Data'}
//           </Button>
//           {/* REMOVED: Fetch Logo Button */}
//           {/* Company Edit Button (Modal) */}
//           <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
//             <DialogTrigger asChild>
//               <Button className="h-9" title="Edit Company Details">
//                 <Edit className="h-4 w-4 mr-1" /> Edit
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle>Edit Company</DialogTitle>
//                 <DialogDescription>Update details for {company.name}.</DialogDescription>
//               </DialogHeader>
//               <CompanyEditForm company={company} onClose={handleCloseCompanyEditDialog} />
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       {/* --- Tabs Section --- */}
//       <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
//         <TabsList className="inline-flex h-9 w-full max-w-md">
//           <TabsTrigger value="details" className="flex-1">Company Details</TabsTrigger>
//           <TabsTrigger value="employees" className="flex-1">Employees ({employees?.length || 0})</TabsTrigger>
//         </TabsList>

//         {/* Company Details Tab */}
//         <TabsContent value="details">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2"><CardTitle className="text-lg">Company Information</CardTitle></CardHeader>
//             <CardContent className="pt-0">
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                  {/* Overview Card */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Overview</h3>
//                     <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Status</p><Badge className="mt-1" variant={company.status === "Customer" ? "default" : "secondary"}>{company.status || "Customer"}</Badge></div></div>
//                     <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Founded</p><p className="text-sm font-medium">{company.start_date || "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">CEO</p><p className="text-sm font-medium">{company.ceo || "N/A"}</p></div></div>
//                  </div>
//                  {/* Details Card */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Details</h3>
//                     <div className="flex items-start gap-3"><Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Employees</p><p className="text-sm font-medium">{company.employee_count ?? "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{company.address || "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{company.location || "N/A"}</p></div></div>
//                     <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Industry</p><p className="text-sm font-medium">{company.industry || "N/A"}</p></div></div>
//                  </div>
//                  {/* Contact Card */}
//                  <div className="space-y-4 bg-muted/30 p-4 rounded-md">
//                     <h3 className="font-medium text-sm border-b pb-1 mb-3">Contact & Social</h3>
//                     <div className="flex items-start gap-3"><Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Website</p>{company.website ? (<a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.website}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
//                     <div className="flex items-start gap-3"><Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">LinkedIn</p>{company.linkedin ? (<a href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.linkedin}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
//                     {/* Add Twitter/Facebook display here if needed */}
//                  </div>
//               </div>
//               {/* About Section */}
//               {company.about && (<div className="mt-4 p-4 bg-muted/30 rounded-md"><h3 className="font-medium text-sm border-b pb-1 mb-3">About</h3><p className="text-sm whitespace-pre-wrap">{company.about}</p></div>)}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Employees Tab */}
//         <TabsContent value="employees">
//           <Card className="shadow-sm">
//             <CardHeader className="pb-2">
//               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                 <CardTitle className="text-lg">Associated Employees</CardTitle>
//                 {/* Add Employee Button & Modal */}
//                  <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
//                      <DialogTrigger asChild>
//                          <Button size="sm" className="h-8" onClick={handleAddEmployeeClick}>
//                              <UserPlus className="h-4 w-4 mr-2" /> Add New Candidate
//                          </Button>
//                      </DialogTrigger>
//                      <DialogContent className="sm:max-w-lg">
//                           <DialogHeader>
//                              <DialogTitle>Add  Association</DialogTitle>
//                              <DialogDescription>Enter details to create a new candidate (or find existing by email) and link them to this company.</DialogDescription>
//                           </DialogHeader>
//                           <AddNewCandidateAndAssociationForm companyId={companyId} onClose={handleCloseAddEmployeeDialog} />
//                      </DialogContent>
//                  </Dialog>
//               </div>
//               {/* Search Input */}
//               <div className="relative mt-4">
//                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
//                  <Input
//                     placeholder="Search associated employees..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="pl-10 h-8"
//                  />
//               </div>
//             </CardHeader>
//             <CardContent>
//               {/* Employee Table */}
//               {isLoadingEmployees ? (
//                  <div className="text-center py-10 text-muted-foreground">Loading employees...</div>
//               ) : employeesError ? (
//                  <div className="text-center py-10 text-red-600">Error: {employeesError.message}</div>
//               ) : (
//                 <EmployeeTable
//                     employees={filteredEmployees} // Pass filtered data
//                     onEdit={handleEditEmployeeClick} // Pass edit handler
//                  />
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>

//       {/* --- EDIT EMPLOYEE ASSOCIATION MODAL --- */}
//       <Dialog open={isEditEmployeeDialogOpen} onOpenChange={setIsEditEmployeeDialogOpen}>
//           <DialogContent className="sm:max-w-lg">
//                <DialogHeader>
//                    <DialogTitle>Edit Employee Association</DialogTitle>
//                    <DialogDescription>
//                        Update association details for {editingEmployee?.name ?? 'this employee'} at {company.name}. Only 'N/A' fields are editable.
//                    </DialogDescription>
//                </DialogHeader>
//                {editingEmployee && (
//                    <CandidateCompanyEditForm
//                        employee={editingEmployee}
//                        onClose={handleCloseEditEmployeeDialog}
//                    />
//                )}
//           </DialogContent>
//       </Dialog>
//       {/* --- END EDIT EMPLOYEE MODAL --- */}

//       {/* Company Edit Modal */}
//        <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
//           <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
//              <DialogHeader>
//                  <DialogTitle>Edit Company</DialogTitle>
//                  <DialogDescription>Update details for {company.name}.</DialogDescription>
//              </DialogHeader>
//              <CompanyEditForm company={company} onClose={handleCloseCompanyEditDialog} />
//           </DialogContent>
//        </Dialog>

//     </div> 
//     </TooltipProvider>
//   );
// };

// // --- ADD THIS EXPORT LINE ---
// export default CompanyDetail;
// // ---------------------------


// src/pages/CompanyDetail.tsx

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query"; // Essential for invalidation
import {
  useCompanyDetails,
  useCompanyEmployees,
  useFetchCompanyDetails,
} from "@/hooks/use-companies"; // Your main data hooks
// REMOVED: import { useUpdateCompanyLogo } from '@/hooks/use-company-logo'; // If logo handled separately
import {
  Building2, Calendar, User, Globe, Linkedin, MapPin, Edit, ChevronLeft,
  RefreshCw, Search, UserPlus, Image, Users, // Added Users
  Mail, Phone, // Icons for EmployeeTable
  DollarSign, TrendingUp // <<<--- ADDED Icons for Financials
} from "lucide-react"; // Ensure all needed icons are imported
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client"; // Direct Supabase client for updates
import { useToast } from "@/hooks/use-toast";
import EmployeeTable from "@/components/sales/EmployeeTable"; // Renders the employee list
import CompanyEditForm from "@/components/sales/CompanyEditForm"; // Form for editing COMPANY details
import AddNewCandidateAndAssociationForm from "@/components/sales/AddNewCandidateAndAssociationForm"; // Form for ADDING candidate/association
import CandidateCompanyEditForm from "@/components/sales/CandidateCompanyEditForm"; // <<< Keep this if needed for legacy data editing
import EmployeeAssociationEditForm from "@/components/sales/EmployeeAssociationEditForm"; // <<< Keep this for new data editing
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Import necessary types
import { CompanyDetail as CompanyDetailType, CandidateDetail } from "@/types/company";
import { TooltipProvider } from "@/components/ui/tooltip"; // Needed for EmployeeTable

// // Helper to format currency (basic example, consider Intl.NumberFormat)
// const formatCurrency = (value: number |string| null | undefined): string => {
//     if (value === null || value === undefined || isNaN(value)) return "N/A";
//     if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
//     if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
//     if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`; // No decimals for K
//     return `$${value.toFixed(0)}`; // Whole number for smaller values
// };


const formatCurrency = (
  value: number | string | null | undefined,
  currencySymbol: string = '$' // Default to USD symbol
): string => {
  if (value === null || value === undefined) return "N/A";

  let numericValue: number;

  // Try to parse if it's a string (same parsing logic as before)
  if (typeof value === 'string') {
      try {
          let numStr = value.replace(/[$,€£¥₹,\s]/g, '');
          let multiplier = 1;
          if (numStr.toUpperCase().endsWith('B')) { multiplier = 1e9; numStr = numStr.slice(0, -1); }
          else if (numStr.toUpperCase().endsWith('M')) { multiplier = 1e6; numStr = numStr.slice(0, -1); }
          else if (numStr.toUpperCase().endsWith('K')) { multiplier = 1e3; numStr = numStr.slice(0, -1); }
          if (numStr === '' || numStr.toUpperCase() === 'N/A') return "N/A";
          numericValue = parseFloat(numStr);
          if (isNaN(numericValue)) return "N/A";
          numericValue *= multiplier;
      } catch (e) { return "N/A"; }
  } else if (typeof value === 'number') {
      if (isNaN(value)) return "N/A";
      numericValue = value;
  } else { return "N/A"; }

  // Formatting logic using the provided currencySymbol
  if (numericValue >= 1_000_000_000) return `${currencySymbol}${(numericValue / 1_000_000_000).toFixed(1)}B`;
  if (numericValue >= 1_000_000) return `${currencySymbol}${(numericValue / 1_000_000).toFixed(1)}M`;
  if (numericValue >= 1_000) return `${currencySymbol}${(numericValue / 1_000).toFixed(0)}K`;
  return `${currencySymbol}${numericValue.toFixed(0)}`;
};


const CompanyDetail = () => {
  // --- Hooks ---
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const companyId = parseInt(id || "0");
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: company, isLoading, error: companyError, refetch } = useCompanyDetails(companyId);
  const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError } = useCompanyEmployees(companyId);
  const fetchCompanyDetails = useFetchCompanyDetails(); // Hook for Gemini fetch
  // REMOVED: Logo fetching logic if Gemini handles it now

  // --- State ---
  const [activeTab, setActiveTab] = useState("details");
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false); // Company Edit Modal
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false); // Add Employee Modal
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false); // Edit Employee Modal
  const [editingEmployee, setEditingEmployee] = useState<CandidateDetail | null>(null); // Data for Edit Employee Modal

  // --- Handlers ---
  const handleCloseCompanyEditDialog = () => setIsCompanyEditDialogOpen(false);

  // Fetch details via Gemini AI (includes revenue, cashflow, logo)
  const handleFetchCompanyDetails = async () => {
    if (!company?.name) {
      toast({ title: "Error", description: "Company name is required", variant: "destructive" });
      return;
    }
    setIsFetchingDetails(true);
    try {
      const detailsFromAI = await fetchCompanyDetails(company.name); // This hook fetches all including revenue/cashflow
      const updatesToApply: Partial<CompanyDetailType> = {};

      // Build update object from AI results
      if (detailsFromAI.start_date) updatesToApply.start_date = detailsFromAI.start_date;
      if (detailsFromAI.ceo) updatesToApply.ceo = detailsFromAI.ceo;
      if (typeof detailsFromAI.employee_count === 'number') updatesToApply.employee_count = detailsFromAI.employee_count;
      if (detailsFromAI.address) updatesToApply.address = detailsFromAI.address;
      if (detailsFromAI.website) updatesToApply.website = detailsFromAI.website;
      if (detailsFromAI.linkedin) updatesToApply.linkedin = detailsFromAI.linkedin;
      if (detailsFromAI.industry) updatesToApply.industry = detailsFromAI.industry;
      if (detailsFromAI.location) updatesToApply.location = detailsFromAI.location;
      if (detailsFromAI.twitter) updatesToApply.twitter = detailsFromAI.twitter;
      if (detailsFromAI.facebook) updatesToApply.facebook = detailsFromAI.facebook;
      // Logo from Gemini
       if (detailsFromAI.logo_url && typeof detailsFromAI.logo_url === 'string' && detailsFromAI.logo_url.trim() !== '') {
            updatesToApply.logo_url = detailsFromAI.logo_url;
       }
       // <<<--- ADDED REVENUE/CASHFLOW ---<<<
       if (typeof detailsFromAI.revenue === 'number') updatesToApply.revenue = detailsFromAI.revenue;
       if (typeof detailsFromAI.cash_flow === 'number') updatesToApply.cash_flow = detailsFromAI.cash_flow; // Use correct key if Gemini provides 'cashflow'
       // If Gemini key is different (e.g., cash_flow), adjust here:
       // if (typeof detailsFromAI.cash_flow === 'number') updatesToApply.cashflow = detailsFromAI.cash_flow;
       // --- END ADDED ---

      // Safety check
      if (updatesToApply.hasOwnProperty('created_at')) { throw new Error("Cannot update creation timestamp."); }

      if (Object.keys(updatesToApply).length > 0) {
        console.log("Applying AI updates to Supabase:", updatesToApply);
        const { error: updateError } = await supabase.from('companies').update(updatesToApply).eq('id', companyId);
        if (updateError) throw updateError;
        refetch(); // Refetch current company details
        queryClient.invalidateQueries({ queryKey: ['companies'] }); // Invalidate list
        toast({ title: "Success", description: "Company details updated." });
      } else {
        console.log("No new details found by AI.");
        toast({ title: "No Update", description: "AI did not provide new details." });
      }
    } catch (fetchError: any) {
      console.error("Error fetching/updating company details:", fetchError);
      toast({ title: "Error", description: `Operation failed: ${fetchError.message}`, variant: "destructive" });
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Add/Edit Employee Handlers (keep as is)
  const handleAddEmployeeClick = () => setIsAddEmployeeDialogOpen(true);
  const handleCloseAddEmployeeDialog = () => setIsAddEmployeeDialogOpen(false);
  const handleEditEmployeeClick = (employee: CandidateDetail) => { setEditingEmployee(employee); setIsEditEmployeeDialogOpen(true); };
  const handleCloseEditEmployeeDialog = () => { setIsEditEmployeeDialogOpen(false); setTimeout(() => setEditingEmployee(null), 300); };

  // --- Effects ---
  useEffect(() => { // Error handling
    if (companyError) { toast({ title: "Error loading company", description: companyError.message, variant: "destructive" }); console.error("Company details error:", companyError); }
    if (employeesError) { toast({ title: "Error loading employees", description: employeesError.message, variant: "destructive" }); console.error("Employees error:", employeesError); }
  }, [companyError, employeesError, toast]);

  // --- Render Logic ---
  if (isLoading) { return <div className="container mx-auto p-6 flex justify-center items-center h-64"><p className="text-xl">Loading...</p></div>; }
  if (!company) { return <div className="container mx-auto p-6"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Company Not Found</h2><Button asChild><Link to="/companies">Back to List</Link></Button></div></div>; }

  // Filter employees
  const filteredEmployees = employees.filter(emp =>
    (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.contact_owner?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.contact_stage?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    // Needs TooltipProvider for EmployeeTable tooltips
    <TooltipProvider>
      <div className="container mx-auto px-4 py-6">
        {/* --- Header Section --- */}
        <div className="flex items-center justify-between mb-6 gap-4">
           {/* Left Side */}
          <div className="flex items-center gap-4 flex-grow min-w-0">
            <Button variant="outline" size="sm" asChild className="h-9 flex-shrink-0"><Link to="/companies"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
            <div className="flex items-center min-w-0">
              <Avatar className="h-12 w-12 mr-3 border flex-shrink-0"><AvatarImage src={company.logo_url} alt={company.name} /><AvatarFallback>{company.name?.charAt(0) || '?'}</AvatarFallback></Avatar>
              <div className="min-w-0"><h1 className="text-2xl font-bold truncate" title={company.name}>{company.name}</h1>{company.domain && (<p className="text-sm text-muted-foreground truncate" title={company.domain}>{company.domain}</p>)}</div>
            </div>
          </div>
          {/* Right Side Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" onClick={handleFetchCompanyDetails} disabled={isFetchingDetails} className="flex items-center gap-2 h-9" title="Fetch latest details via AI"><RefreshCw className={`h-4 w-4 ${isFetchingDetails ? 'animate-spin' : ''}`} /> {isFetchingDetails ? 'Fetching...' : 'Refresh Data'}</Button>
            {/* REMOVED Fetch Logo Button */}
            <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
              <DialogTrigger asChild><Button className="h-9" title="Edit Company Details"><Edit className="h-4 w-4 mr-1" /> Edit</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Company</DialogTitle><DialogDescription>Update details for {company.name}.</DialogDescription></DialogHeader><CompanyEditForm company={company} onClose={handleCloseCompanyEditDialog} /></DialogContent>
            </Dialog>
          </div>
        </div>

        {/* --- Tabs Section --- */}
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="inline-flex h-9 w-full max-w-md">
            <TabsTrigger value="details" className="flex-1">Company Details</TabsTrigger>
            <TabsTrigger value="employees" className="flex-1">Employees ({employees?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Company Details Tab */}
          <TabsContent value="details">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-lg">Company Information</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {/* --- UPDATED GRID LAYOUT --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Now potentially 4 columns */}
                   {/* Overview Card */}
                   <div className="space-y-4 bg-muted/30 p-4 rounded-md">
                      <h3 className="font-medium text-sm border-b pb-1 mb-3">Overview</h3>
                      <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Status</p><Badge className="mt-1" variant={company.status === "Customer" ? "default" : "secondary"}>{company.status || "N/A"}</Badge></div></div>
                      <div className="flex items-start gap-3"><Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Founded</p><p className="text-sm font-medium">{company.start_date || "N/A"}</p></div></div>
                      <div className="flex items-start gap-3"><User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">CEO</p><p className="text-sm font-medium">{company.ceo || "N/A"}</p></div></div>
                   </div>
                   {/* Details Card */}
                   <div className="space-y-4 bg-muted/30 p-4 rounded-md">
                      <h3 className="font-medium text-sm border-b pb-1 mb-3">Details</h3>
                      <div className="flex items-start gap-3"><Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Employees</p><p className="text-sm font-medium">{company.employee_count ?? "N/A"}</p></div></div>
                      <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium line-clamp-2">{company.address || "N/A"}</p></div></div> {/* Allow 2 lines for address */}
                      <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{company.location || "N/A"}</p></div></div>
                      <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Industry</p><p className="text-sm font-medium">{company.industry || "N/A"}</p></div></div>
                   </div>
                   {/* --- ADDED Financials Card --- */}
                   <div className="space-y-4 bg-muted/30 p-4 rounded-md">
                      <h3 className="font-medium text-sm border-b pb-1 mb-3">Financials (Est.)</h3>
                       <div className="flex items-start gap-3">
                          <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                              <p className="text-xs text-muted-foreground">Revenue</p>
                              <p className="text-sm font-medium">{formatCurrency(company.revenue)}</p>
                          </div>
                      </div>
                       <div className="flex items-start gap-3">
                          <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                              <p className="text-xs text-muted-foreground">Cash Flow</p>
                              <p className="text-sm font-medium">{formatCurrency(company.cash_flow)}</p>
                          </div>
                      </div>
                       <div className="flex items-start gap-3">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                              <p className="text-xs text-muted-foreground">Account Owner</p>
                              <p className="text-sm font-medium">{company.account_owner || 'N/A'}</p>
                          </div>
                      </div>
                   </div>
                   {/* --- END Financials Card --- */}
                   {/* Contact Card */}
                   <div className="space-y-4 bg-muted/30 p-4 rounded-md">
                      <h3 className="font-medium text-sm border-b pb-1 mb-3">Contact & Social</h3>
                      <div className="flex items-start gap-3"><Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">Website</p>{company.website ? (<a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.website}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
                      <div className="flex items-start gap-3"><Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" /><div><p className="text-xs text-muted-foreground">LinkedIn</p>{company.linkedin ? (<a href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium break-all">{company.linkedin}</a>) : (<p className="text-sm font-medium">N/A</p>)}</div></div>
                      {/* Add Twitter/Facebook display here if needed */}
                   </div>
                </div>
                {/* About Section */}
                {company.about && (<div className="mt-4 p-4 bg-muted/30 rounded-md"><h3 className="font-medium text-sm border-b pb-1 mb-3">About</h3><p className="text-sm whitespace-pre-wrap">{company.about}</p></div>)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
             <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-lg">Associated Employees</CardTitle>
                        <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
                            <DialogTrigger asChild><Button size="sm" className="h-8" onClick={handleAddEmployeeClick}><UserPlus className="h-4 w-4 mr-2" /> Add New Candidate</Button></DialogTrigger>
                            <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add New Candidate & Associate</DialogTitle><DialogDescription>Create/find candidate and link.</DialogDescription></DialogHeader><AddNewCandidateAndAssociationForm companyId={companyId} onClose={handleCloseAddEmployeeDialog} /></DialogContent>
                        </Dialog>
                    </div>
                    <div className="relative mt-4"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} /><Input placeholder="Search associated employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-8"/></div>
                </CardHeader>
                <CardContent>
                    {isLoadingEmployees ? (<div className="text-center py-10 text-muted-foreground">Loading employees...</div>)
                     : employeesError ? (<div className="text-center py-10 text-red-600">Error: {employeesError.message}</div>)
                     : (<EmployeeTable employees={filteredEmployees} onEdit={handleEditEmployeeClick} />)}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Employee Association Modal */}
        <Dialog open={isEditEmployeeDialogOpen} onOpenChange={setIsEditEmployeeDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                 <DialogHeader>
                     <DialogTitle>Edit Employee Association</DialogTitle>
                     <DialogDescription>Update details for {editingEmployee?.name ?? 'this employee'} at {company.name}. Only 'N/A' fields (except Job ID) are initially editable.</DialogDescription>
                 </DialogHeader>
                 {/* Conditionally render the correct edit form based on source */}
                 {editingEmployee && editingEmployee.source_table === 'employee_associations' && ( <EmployeeAssociationEditForm employee={editingEmployee} onClose={handleCloseEditEmployeeDialog} /> )}
                 {editingEmployee && editingEmployee.source_table === 'candidate_companies' && ( <CandidateCompanyEditForm employee={editingEmployee} onClose={handleCloseEditEmployeeDialog} /> )}
            </DialogContent>
        </Dialog>

        {/* Company Edit Modal is handled by trigger in header */}

      </div>
    </TooltipProvider>
  );
};

export default CompanyDetail;