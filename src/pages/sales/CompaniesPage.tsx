
// import React, { useState, useEffect, useRef } from "react";
// import { Link } from "react-router-dom";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
// import { Company } from "@/types/company"; // Use updated Company type
// import { useCompanies, useCompanyCounts } from "@/hooks/use-companies";
// import {
//   Edit, Building2, Users, Search, Plus, ArrowUp, Globe, Linkedin, Twitter, Link as LinkIcon,
//   Facebook, // Assuming you have this icon (install react-feather or find SVG if needed)
//   Upload,   // Added Upload icon
//   Loader2,  // Added Loader icon for processing state
//   Trash2,   // Example icon
//   ChevronDown, Download,Briefcase, TrendingUp, UserX
// } from "lucide-react";
// import { useContactStageCounts } from "@/hooks/use-contact-stage-counts"; // <<<--- IMPORT Stage Counts Hook
// import { Input } from "@/components/ui/input";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { useToast } from "@/hooks/use-toast";
// import CompanyEditForm from "@/components/CompanyEditForm"; // For Edit modal
// import CompanyAddForm from "@/components/CompanyAddForm";   // For Add modal
// import EffectivePagination from "@/components/EffectivePagination"; // Custom pagination
// import Papa from 'papaparse'; // <<<--- IMPORT PAPAPARSE
// import { z } from 'zod'; // <<<--- IMPORT ZOD for validation

// // --- Zod Schema for CSV Row Validation ---
// // Adjust based on your REQUIRED CSV columns and expected data types
// // Map CSV header names (case-insensitive) to your database fields
// // Make fields optional if they might be missing in the CSV
// const companyCsvSchema = z.object({
//   name: z.string().min(1, { message: "Company Name is required" }),
//   website: z.string().url({ message: "Invalid website URL" }).optional().nullable(),
//   industry: z.string().optional().nullable(),
//   stage: z.string().optional().nullable(),
//   location: z.string().optional().nullable(),
//   employee_count: z.preprocess( // Handle potential string numbers or empty strings
//       (val) => (val === "" || val == null || isNaN(Number(val))) ? null : parseInt(String(val), 10),
//       z.number().int().positive().nullable().optional()
//   ).optional(),
//   linkedin: z.string().url({ message: "Invalid LinkedIn URL" }).optional().nullable(),
//   account_owner: z.string().optional().nullable(),
//   ceo: z.string().optional().nullable(),
//   address: z.string().optional().nullable(),
//   twitter: z.string().url({ message: "Invalid Twitter URL" }).optional().nullable(),
//   facebook: z.string().url({ message: "Invalid Facebook URL" }).optional().nullable(),
// }).transform(data => ({ // Map CSV headers to DB columns if they differ, ensure nulls
//     name: data.name.trim(), // Trim whitespace from name
//     website: data.website?.trim() || null,
//     industry: data.industry?.trim() || null,
//     stage: data.stage?.trim() || 'Cold', // Default stage if missing
//     location: data.location?.trim() || null,
//     employee_count: data.employee_count ?? null, // Already processed
//     linkedin: data.linkedin?.trim() || null,
//     account_owner: data.account_owner?.trim() || null,
//     ceo: data.ceo?.trim() || null,
//     address: data.address?.trim() || null,
//     twitter: data.twitter?.trim() || null,
//     facebook: data.facebook?.trim() || null,
// }));
// type CompanyCsvRow = z.infer<typeof companyCsvSchema>;


// // Define possible stages
// const STAGES = ['Current Client', 'Cold', 'Active Opportunity', 'Dead Opportunity', 'Do Not Prospect'];

// // Define colors for stages (Tailwind classes)
// const stageColors: Record<string, string> = {
//   'Current Client': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
//   'Cold': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
//   'Active Opportunity': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
//   'Dead Opportunity': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
//   'Do Not Prospect': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
//   'default': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
// };

// // --- CSV Template Header ---
// const CSV_TEMPLATE_HEADER = "Company Name,Website,Industry,Stage,Location,Employees,LinkedIn,Account Owner,CEO,Address,Twitter,Facebook";
// const CompaniesPage = () => {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();
//   const { data: companies = [], isLoading, isError, error } = useCompanies();
//   const { data: counts, isLoading: isCountsLoading } = useCompanyCounts();

//   // --- State ---
//   const [currentPage, setCurrentPage] = useState(1);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [editCompany, setEditCompany] = useState<Company | null>(null);
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
//   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
//   const [showBackToTop, setShowBackToTop] = useState(false);
//   const itemsPerPage = 10; // Adjust as needed
//   const [isImporting, setIsImporting] = useState(false); // State for CSV Import
//   const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input

//   // --- Effects ---

//   // Effect for Back to Top Button visibility
//   useEffect(() => {
//     const handleScroll = () => {
//       setShowBackToTop(window.scrollY > 300);
//     };
//     window.addEventListener('scroll', handleScroll);
//     return () => window.removeEventListener('scroll', handleScroll); // Cleanup listener
//   }, []);

//   // Effect for showing error toast on data loading failure
//   useEffect(() => {
//     if (isError && error) {
//       toast({
//         title: "Error Loading Companies",
//         description: error.message || "Could not fetch company data.",
//         variant: "destructive",
//       });
//       console.error("Error loading companies:", error);
//     }
//   }, [isError, error, toast]);

//   // Effect to reset pagination when search term changes
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchTerm]);

//   // --- Mutations ---

//   // Mutation for updating company stage
//   const updateStageMutation = useMutation({
//     mutationFn: async ({ companyId, stage }: { companyId: number; stage: string }) => {
//       const { error: updateError } = await supabase
//         .from('companies')
//         .update({ stage: stage })
//         .eq('id', companyId);
//       if (updateError) throw updateError;
//       return { companyId, stage };
//     },
//     onSuccess: (_, variables) => {
//       toast({ title: "Stage Updated", description: `Company stage set to ${variables.stage}.` });
//       queryClient.invalidateQueries({ queryKey: ['companies'] });
//       queryClient.invalidateQueries({ queryKey: ['company', variables.companyId] });
//     },
//     onError: (updateError: any) => {
//       toast({ title: "Update Failed", description: updateError.message, variant: "destructive" });
//     },
//   });

//   // --- Handlers ---

//   const scrollToTop = () => {
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleStageChange = (companyId: number, newStage: string) => {
//     updateStageMutation.mutate({ companyId, stage: newStage });
//   };

//   // Recalculate total pages inside handler or where filteredCompanies is defined
//   const handlePageChange = (page: number) => {
//     const totalFilteredPagesNow = Math.ceil(filteredCompanies.length / itemsPerPage); // Recalculate here
//     if (page >= 1 && page <= totalFilteredPagesNow) {
//         setCurrentPage(page);
//         document.getElementById('company-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
//     }
//   };

//   const handleEditClick = (company: Company) => {
//     setEditCompany(company);
//     setIsEditDialogOpen(true);
//   };
//   const handleCloseEditDialog = () => {
//     setIsEditDialogOpen(false);
//   };

//   const handleAddClick = () => {
//     setIsAddDialogOpen(true);
//   };
//   const handleCloseAddDialog = () => {
//     setIsAddDialogOpen(false);
//   };

//   // --- CSV Import Handler ---
//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) {
//       toast({ title: "No file selected", variant: "default" });
//       return;
//     }

//     if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) { // More robust check
//         toast({ title: "Invalid File Type", description: "Please upload a CSV file.", variant: "destructive" });
//         if (fileInputRef.current) fileInputRef.current.value = "";
//         return;
//     }

//     setIsImporting(true);
//     toast({ title: "Import Started", description: "Parsing CSV file..." });

//     Papa.parse<Record<string, any>>(file, {
//       header: true,
//       skipEmptyLines: true,
//       transformHeader: header => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'), // Clean headers
//       complete: (results) => {
//         console.log("Papaparse results:", results);
//         if (results.errors.length > 0) {
//              console.error("CSV Parsing Errors (Papaparse):", results.errors);
//              toast({ title: "CSV Parsing Issue", description: `Could not parse some rows: ${results.errors[0]?.message || 'Unknown error'}`, variant: "destructive"});
//              // Decide if you want to continue with partial data or stop
//         }
//         processCsvData(results.data as Record<string, any>[]);
//          if (fileInputRef.current) fileInputRef.current.value = "";
//       },
//       error: (err: any) => {
//         console.error("CSV Parsing Error:", err);
//         toast({ title: "CSV Parsing Failed", description: err.message, variant: "destructive" });
//         setIsImporting(false);
//          if (fileInputRef.current) fileInputRef.current.value = "";
//       }
//     });
//   };

//   // --- Process and Insert CSV Data ---
//   const processCsvData = async (data: Record<string, any>[]) => {
//     const validCompanies: CompanyCsvRow[] = [];
//     const validationErrors: { row: number, errors: string[] }[] = [];

//     data.forEach((rawRow, index) => {
//       if (Object.values(rawRow).every(val => val === "" || val === null || val === undefined)) return;

//       // Map cleaned headers (already lowercased and underscored by Papaparse)
//       const mappedRow = {
//           name: rawRow["company_name"] || rawRow["name"], // Prioritize specific headers if known
//           website: rawRow["website"] || rawRow["url"],
//           industry: rawRow["industry"],
//           stage: rawRow["stage"],
//           location: rawRow["location"] || rawRow["city"] || rawRow["country"], // Combine if needed
//           employee_count: rawRow["employees"] || rawRow["employee_count"] || rawRow["no_employees"] || rawRow["_employees"], // Handle variations
//           linkedin: rawRow["linkedin"] || rawRow["linkedin_url"],
//           account_owner: rawRow["account_owner"] || rawRow["owner"],
//           ceo: rawRow["ceo"],
//           address: rawRow["address"],
//           twitter: rawRow["twitter"] || rawRow["twitter_url"],
//           facebook: rawRow["facebook"] || rawRow["facebook_url"],
//       };

//       const validationResult = companyCsvSchema.safeParse(mappedRow);

//       if (validationResult.success) {
//         // Additional check: Ensure name isn't just whitespace after transform
//         if(validationResult.data.name && validationResult.data.name.trim()){
//              validCompanies.push(validationResult.data);
//         } else {
//              validationErrors.push({ row: index + 2, errors: ["Company Name cannot be empty."] });
//         }
//       } else {
//         validationErrors.push({ row: index + 2, errors: validationResult.error.errors.map(e => `${e.path.join('.') || 'Row'}: ${e.message}`) });
//       }
//     });

//     console.log("Validation Complete:", { validCount: validCompanies.length, errorCount: validationErrors.length });

//     if (validationErrors.length > 0) {
//        const errorSummary = validationErrors.slice(0, 5).map(e => `Row ${e.row}: ${e.errors.join(', ')}`).join('\n');
//        toast({
//          title: `Validation Failed for ${validationErrors.length} row(s)`,
//          description: `Check CSV format.\nErrors:\n${errorSummary}${validationErrors.length > 5 ? '\n...and more.' : ''}`,
//          variant: "destructive", duration: 10000
//        });
//        if (validCompanies.length === 0) { // Stop if only errors, no valid data
//             setIsImporting(false);
//             return;
//        }
//     }

//     if (validCompanies.length > 0) {
//       toast({ title: "Importing Data", description: `Attempting to import ${validCompanies.length} valid companies...` });
//       let insertedCount = 0;
//       let skippedCount = 0;

//       try {
//         // Use upsert with ignoreDuplicates based on the unique 'name' constraint
//         const { error: upsertError, count } = await supabase
//           .from('companies')
//           .upsert(validCompanies as any, {
//               onConflict: 'name', // Assumes 'name' has a UNIQUE constraint (companies_name_key)
//               ignoreDuplicates: true,
//           });

//         if (upsertError) {
//           console.error("Supabase Upsert Error:", upsertError);
//           throw upsertError;
//         }

//         // Estimate counts (count might be null or unreliable with ignoreDuplicates)
//         // A more reliable count requires checking against existing data first.
//         insertedCount = count ?? validCompanies.length; // Best guess
//         skippedCount = validCompanies.length - insertedCount;
//         if (skippedCount < 0) skippedCount = 0; // Correction if count is weird

//         console.log("Upsert operation completed. Estimated inserted:", insertedCount, "Estimated skipped:", skippedCount);

//         let description = `${insertedCount} companies processed.`;
//         if (skippedCount > 0) { description += ` ${skippedCount} duplicates skipped.`; }
//          if (validationErrors.length > 0) { description += ` ${validationErrors.length} rows had validation errors.`; }

//         toast({ title: "Import Complete", description: description });

//         queryClient.invalidateQueries({ queryKey: ['companies'] });
//         queryClient.invalidateQueries({ queryKey: ['company-counts'] });

//       } catch (err: any) {
//         console.error("Import Process Failed:", err);
//         toast({ title: "Import Failed", description: err.message || "Database operation error.", variant: "destructive" });
//       } finally {
//         setIsImporting(false);
//       }
//     } else {
//       if (validationErrors.length === 0) {
//           toast({ title: "Import Info", description: "No new company data found in the CSV to import.", variant: "default" });
//       }
//       setIsImporting(false); // Reset if only validation errors occurred
//     }
//   };
//   // --- End CSV Import Logic ---


//    // --- ADDED: Handler for Downloading CSV Template ---
//    const downloadCsvTemplate = () => {
//     const csvContent = `${CSV_TEMPLATE_HEADER}\n"Sample Company","https://sample.com","Tech","Prospect","City, Country","100","https://linkedin.com/company/sample","Owner Name","CEO Name","123 Sample St","https://twitter.com/sample","https://facebook.com/sample"`; // Add one sample row
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement("a");
//     if (link.download !== undefined) { // Feature detection
//       const url = URL.createObjectURL(blob);
//       link.setAttribute("href", url);
//       link.setAttribute("download", "companies_template.csv");
//       link.style.visibility = 'hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url); // Clean up blob URL
//     } else {
//         toast({ title: "Download Failed", description: "Browser does not support automatic download.", variant: "destructive"});
//     }
//   };
//   // --- END Download Handler ---


//   // --- Helper Functions ---
//   const renderSocialIcons = (company: Company) => {
//     const hasWebsite = !!company.website;
//     const hasLinkedin = !!company.linkedin;
//     const hasTwitter = !!company.twitter;
//     const hasFacebook = !!company.facebook;

//     const linkBaseClass = "inline-block p-0.5";
//     const activeClass = "text-primary hover:text-primary/80";
//     const inactiveClass = "text-muted-foreground/30 cursor-not-allowed";

//     // Helper to render individual icon link or disabled icon
//     const renderIcon = (hasLink: boolean, url: string | null | undefined, title: string, IconComponent: React.ElementType) => (
//         <span title={hasLink ? url : `${title} not available`} className={`${linkBaseClass} ${hasLink ? '' : inactiveClass}`}>
//             {hasLink ? (
//                 <a href={url!.startsWith('http') ? url! : `https://${url!}`} target="_blank" rel="noreferrer" className={activeClass}>
//                     <IconComponent className="h-3.5 w-3.5" />
//                 </a>
//             ) : (
//                 <IconComponent className="h-3.5 w-3.5" />
//             )}
//         </span>
//     );

//     return (
//         <div className="flex items-center gap-1 mt-1">
//             {renderIcon(hasWebsite, company.website, "Website", LinkIcon)}
//             {renderIcon(hasLinkedin, company.linkedin, "LinkedIn", Linkedin)}
//             {renderIcon(hasTwitter, company.twitter, "Twitter", Twitter)}
//             {renderIcon(hasFacebook, company.facebook, "Facebook", Facebook)}
//         </div>
//     );
// };


//    const renderUrlIcons = (company: Company) => (
//     <div className="flex items-center justify-end gap-2 text-muted-foreground">
//       <a href={`https://www.google.com/search?q=${encodeURIComponent(company.name)}`} target="_blank" rel="noreferrer" title={`Google Search for ${company.name}`} className="hover:text-primary">
//          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.18,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.18,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.18,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
//       </a>
//       {company.linkedin && (
//          <a href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`} target="_blank" rel="noreferrer" title="LinkedIn Profile" className="hover:text-primary">
//             <Linkedin className="h-4 w-4" />
//          </a>
//       )}
//     </div>
//    );

//    // --- Filtering & Pagination Data ---
//    const filteredCompanies = companies?.filter(company =>
//         (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//         (company.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//         (company.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
//         (company.account_owner?.toLowerCase() || '').includes(searchTerm.toLowerCase())
//     ) || [];

//    const totalFilteredPages = Math.ceil(filteredCompanies.length / itemsPerPage);

//    const paginatedCompanies = filteredCompanies.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//    );


//   // --- Render ---
//   return (
//     <div className="container mx-auto px-4 py-6 max-w-full">

//       {/* Header Section */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
//         <h1 className="text-2xl font-bold">Companies</h1>
//         {/* Action Buttons Group */}
//         <div className="flex gap-2 flex-wrap">
//              {/* Add New Company Button */}
//              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
//                 <DialogTrigger asChild>
//                     <Button className="h-9" onClick={handleAddClick}>
//                         <Plus className="h-4 w-4 mr-2" /> Add Company
//                     </Button>
//                 </DialogTrigger>
//                 <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
//                     <DialogHeader>
//                         <DialogTitle>Add New Company</DialogTitle>
//                         <DialogDescription>Enter details and click Add Company.</DialogDescription>
//                     </DialogHeader>
//                     <CompanyAddForm onClose={handleCloseAddDialog} />
//                 </DialogContent>
//              </Dialog>
//               {/* --- Download Template Button --- */}
//             <Button
//                 variant="outline"
//                 className="h-9"
//                 onClick={downloadCsvTemplate}
//             >
//                 <Download className="h-4 w-4 mr-2" />
//                 Download Template
//             </Button>
//             {/* --- End Download Template Button --- */}
//             {/* Import CSV Button */}
//             <Button
//                 variant="outline"
//                 className="h-9"
//                 onClick={() => fileInputRef.current?.click()}
//                 disabled={isImporting}
//             >
//                 {isImporting ? (<Loader2 className="h-4 w-4 mr-2 animate-spin" />) : (<Upload className="h-4 w-4 mr-2" />)}
//                 {isImporting ? 'Importing...' : 'Import CSV'}
//             </Button>
//             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, text/csv" style={{ display: 'none' }} /> {/* Added text/csv */}
//         </div>
//       </div>

//       {/* Summary Cards Section */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
//          <Card className="shadow-sm border-l-4 border-l-primary">
//             <CardContent className="flex items-center justify-between p-4">
//                 <div><p className="text-sm text-muted-foreground">Total Companies</p><h2 className="text-2xl font-bold">{isCountsLoading ? '...' : counts?.companies ?? 0}</h2></div>
//                 <div className="bg-primary/10 p-3 rounded-full"><Building2 className="h-6 w-6 text-primary" /></div>
//             </CardContent>
//          </Card>
//          <Card className="shadow-sm border-l-4 border-l-purple-500">
//              <CardContent className="flex items-center justify-between p-4">
//                 <div><p className="text-sm text-muted-foreground">Total Employees</p><h2 className="text-2xl font-bold">{isCountsLoading ? '...' : counts?.employees ?? 0}</h2></div>
//                 <div className="bg-purple-500/10 p-3 rounded-full"><Users className="h-6 w-6 text-purple-500" /></div>
//             </CardContent>
//          </Card>
//       </div>

//       {/* Search Section */}
//       <div className="mb-4">
//         <div className="relative">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
//           <Input
//              placeholder="Search by name, industry, location, owner..."
//              value={searchTerm}
//              onChange={(e) => setSearchTerm(e.target.value)}
//              className="pl-9 h-9"
//           />
//         </div>
//       </div>

//       {/* Companies List Section */}
//       {isLoading ? (
//         <div className="text-center py-10 text-muted-foreground">Loading companies...</div>
//       ) : isError ? (
//         <div className="text-center py-10 text-red-600">Error loading companies: {error?.message}</div>
//       ) : (
//         <div id="company-list-top" className="border rounded-lg overflow-hidden shadow-sm min-w-[800px]">
//           {/* Custom Header Row */}
//           <div className="flex items-center bg-muted/50 px-4 py-2 border-b text-xs font-medium text-muted-foreground sticky top-0 z-10">
//             <div className="w-[30%] xl:w-[25%] pr-4 flex-shrink-0">Company</div>
//             <div className="w-[12%] xl:w-[10%] text-right pr-4 flex-shrink-0"># Employees</div>
//             <div className="w-[18%] xl:w-[15%] pr-4 flex-shrink-0">Industry</div>
//             <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Stage</div>
//             <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Account Owner</div>
//             <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Location</div>
//             <div className="w-[5%] text-right flex-shrink-0">Links</div>
//             <div className="w-[5%] pl-2 text-right flex-shrink-0">Action</div>
//           </div>

//           {/* Company List Body */}
//           <div className="divide-y">
//             {paginatedCompanies.length > 0 ? (
//               paginatedCompanies.map((company) => (
//                 <div key={company.id} className="flex items-center px-4 py-3 hover:bg-muted/30 text-sm">
//                   {/* Company Column */}
//                   <div className="w-[30%] xl:w-[25%] pr-4 flex items-center gap-3 min-w-0 flex-shrink-0">
//                     <Avatar className="h-8 w-8 border flex-shrink-0">
//                       <AvatarImage src={company.logo_url} alt={company.name} />
//                       <AvatarFallback className="text-xs">{company.name?.charAt(0) || '?'}</AvatarFallback>
//                     </Avatar>
//                     <div className="min-w-0">
//                       <Link to={`/companies/${company.id}`} className="font-medium text-primary hover:underline truncate block" title={company.name}>
//                         {company.name}
//                       </Link>
//                       {renderSocialIcons(company)} {/* Social icons with conditional styling */}
//                     </div>
//                   </div>

//                   {/* Other Columns */}
//                   <div className="w-[12%] xl:w-[10%] text-right pr-4 text-muted-foreground flex-shrink-0">{company.employee_count ?? '-'}</div>
//                   <div className="w-[18%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={company.industry || ''}>{company.industry || '-'}</div>
//                   {/* Stage Dropdown */}
//                   <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">
//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button
//                           variant="outline" size="sm"
//                           className={`h-7 px-2 text-xs w-full justify-between truncate border ${stageColors[company.stage || 'default'] ?? stageColors['default']}`}
//                           disabled={updateStageMutation.isPending && updateStageMutation.variables?.companyId === company.id}>
//                           <span className="truncate">{company.stage || 'Select Stage'}</span>
//                           <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
//                         </Button>
//                       </DropdownMenuTrigger>
//                       <DropdownMenuContent align="start">
//                         <DropdownMenuLabel>Set Stage</DropdownMenuLabel>
//                         <DropdownMenuSeparator />
//                         {STAGES.map(stage => (
//                           <DropdownMenuItem key={stage} onSelect={() => handleStageChange(company.id, stage)} disabled={company.stage === stage}>
//                             {stage}
//                           </DropdownMenuItem>
//                         ))}
//                       </DropdownMenuContent>
//                     </DropdownMenu>
//                   </div>
//                   <div className="w-[15%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={company.account_owner || ''}>{company.account_owner || '-'}</div>
//                   <div className="w-[15%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={company.location || ''}>{company.location || '-'}</div>
//                   <div className="w-[5%] text-right flex-shrink-0">{renderUrlIcons(company)}</div>
//                   {/* Action Column */}
//                    <div className="w-[5%] pl-2 text-right flex-shrink-0">
//                         <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => handleEditClick(company)} title="Edit Company">
//                             <Edit className="h-3.5 w-3.5" />
//                             <span className="sr-only">Edit</span>
//                         </Button>
//                    </div>
//                 </div>
//               ))
//             ) : (
//               <div className="text-center py-10 text-muted-foreground">
//                 {searchTerm ? "No matching companies found." : "No companies available."}
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Pagination Section */}
//       {totalFilteredPages > 1 && !isLoading && (
//         <EffectivePagination
//           className="mt-6"
//           currentPage={currentPage}
//           totalCount={filteredCompanies.length}
//           pageSize={itemsPerPage}
//           onPageChange={handlePageChange}
//           siblingCount={1}
//         />
//       )}

//       {/* Back to Top Button */}
//       {showBackToTop && (
//          <Button variant="outline" size="icon" className="fixed bottom-6 right-6 h-10 w-10 rounded-full shadow-lg z-50 border-border bg-background/80 backdrop-blur-sm" onClick={scrollToTop} title="Scroll back to top">
//            <ArrowUp className="h-5 w-5" />
//            <span className="sr-only">Scroll to top</span>
//          </Button>
//       )}

//       {/* Edit Company Modal */}
//       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
//         <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
//            <DialogHeader>
//               <DialogTitle>Edit Company</DialogTitle>
//               <DialogDescription>Update details for {editCompany?.name ?? 'the selected company'}.</DialogDescription>
//            </DialogHeader>
//            {editCompany && <CompanyEditForm company={editCompany} onClose={handleCloseEditDialog} />}
//         </DialogContent>
//       </Dialog>
//       {/* Add Company Modal is handled by its own DialogTrigger/Dialog structure above */}

//     </div> // End main container
//   );
// };

// export default CompaniesPage;

// src/pages/CompaniesPage.tsx


import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/company"; // Use updated Company type
import { useCompanies, useCompanyCounts } from "@/hooks/use-companies";
import {
  Edit, Building2, Users, Search, Plus, ArrowUp, Globe, Linkedin, Twitter, Link as LinkIcon,
  Facebook, // Assuming you have this icon (install react-feather or find SVG if needed)
  Upload,   // Added Upload icon
  Loader2,  // Added Loader icon for processing state
  Trash2,   // Example icon
  Download, // Added Download icon
  ChevronDown,
} from "lucide-react"; // Ensure all used icons are imported
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CompanyEditForm from "@/components/sales/CompanyEditForm"; // For Edit modal
import CompanyAddForm from "@/components/sales/CompanyAddForm";   // For Add modal
import EffectivePagination from "@/components/sales/EffectivePagination"; // Custom pagination
import Papa from 'papaparse'; // Import Papaparse
import { z } from 'zod'; // Import Zod

// Zod Schema for CSV Row Validation
const companyCsvSchema = z.object({
  name: z.string().min(1, { message: "Company Name is required" }),
  website: z.string().url({ message: "Invalid website URL" }).optional().nullable(),
  industry: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employee_count: z.preprocess(
      (val) => (val === "" || val == null || isNaN(Number(val))) ? null : parseInt(String(val), 10),
      z.number().int().positive().nullable().optional()
  ).optional(),
  linkedin: z.string().url({ message: "Invalid LinkedIn URL" }).optional().nullable(),
  account_owner: z.string().optional().nullable(),
  ceo: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  twitter: z.string().url({ message: "Invalid Twitter URL" }).optional().nullable(),
  facebook: z.string().url({ message: "Invalid Facebook URL" }).optional().nullable(),
}).transform(data => ({
    name: data.name.trim(),
    website: data.website?.trim() || null,
    industry: data.industry?.trim() || null,
    stage: data.stage?.trim() || 'Cold', // Default stage
    location: data.location?.trim() || null,
    employee_count: data.employee_count ?? null,
    linkedin: data.linkedin?.trim() || null,
    account_owner: data.account_owner?.trim() || null,
    ceo: data.ceo?.trim() || null,
    address: data.address?.trim() || null,
    twitter: data.twitter?.trim() || null,
    facebook: data.facebook?.trim() || null,
}));
type CompanyCsvRow = z.infer<typeof companyCsvSchema>;

// Define possible stages for dropdown
const STAGES = ['Current Client', 'Cold', 'Active Opportunity', 'Dead Opportunity', 'Do Not Prospect'];

// Define colors for stages badges/triggers
const stageColors: Record<string, string> = {
  'Current Client': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  'Cold': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  'Active Opportunity': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  'Dead Opportunity': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  'Do Not Prospect': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  'default': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
};

// CSV Template Header Row
const CSV_TEMPLATE_HEADER = "Company Name,Website,Industry,Stage,Location,Employees,LinkedIn,Account Owner,CEO,Address,Twitter,Facebook";

const CompaniesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: companies = [], isLoading, isError, error } = useCompanies();
  const { data: counts, isLoading: isCountsLoading } = useCompanyCounts();

  // --- State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const itemsPerPage = 10;
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isError && error) {
      toast({ title: "Error Loading Companies", description: error.message || "Could not fetch data.", variant: "destructive" });
      console.error("Error loading companies:", error);
    }
  }, [isError, error, toast]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  // --- Mutations ---
  const updateStageMutation = useMutation({
    mutationFn: async ({ companyId, stage }: { companyId: number; stage: string }) => {
      const { error: updateError } = await supabase.from('companies').update({ stage }).eq('id', companyId);
      if (updateError) throw updateError;
      return { companyId, stage };
    },
    onSuccess: (_, variables) => {
      toast({ title: "Stage Updated", description: `Company stage set to ${variables.stage}.` });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId] }); // Also invalidate detail view if needed
    },
    onError: (updateError: any) => {
      toast({ title: "Update Failed", description: updateError.message, variant: "destructive" });
    },
  });

  // --- Handlers ---
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleStageChange = (companyId: number, newStage: string) => updateStageMutation.mutate({ companyId, stage: newStage });
  const handleEditClick = (company: Company) => { setEditCompany(company); setIsEditDialogOpen(true); };
  const handleCloseEditDialog = () => setIsEditDialogOpen(false);
  const handleAddClick = () => setIsAddDialogOpen(true);
  const handleCloseAddDialog = () => setIsAddDialogOpen(false);

  const handlePageChange = (page: number) => {
    const totalFilteredPagesNow = Math.ceil(filteredCompanies.length / itemsPerPage);
    if (page >= 1 && page <= totalFilteredPagesNow) {
        setCurrentPage(page);
        document.getElementById('company-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = `${CSV_TEMPLATE_HEADER}\n"Sample Inc.","https://sample.com","Technology","Prospect","San Francisco, USA","50","https://linkedin.com/company/sample","John Doe","Jane Smith","1 Main St","https://twitter.com/sample",""`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "companies_template.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
        toast({ title: "Download Failed", description: "Browser doesn't support automatic download.", variant: "destructive"});
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { toast({ title: "No file selected" }); return; }
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
        toast({ title: "Invalid File Type", description: "Please upload a CSV file.", variant: "destructive" });
        if (fileInputRef.current) fileInputRef.current.value = ""; return;
    }
    setIsImporting(true);
    toast({ title: "Import Started", description: "Parsing CSV..." });
    Papa.parse<Record<string, any>>(file, {
      header: true, skipEmptyLines: true, transformHeader: header => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      complete: (results) => {
        console.log("Papaparse results:", results);
        if (results.errors.length > 0) {
             console.error("CSV Parsing Errors:", results.errors);
             toast({ title: "CSV Parsing Issue", description: `Could not parse some rows: ${results.errors[0]?.message || 'Unknown error'}`, variant: "destructive"});
        }
        processCsvData(results.data as Record<string, any>[]);
         if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (err: any) => {
        console.error("CSV Parsing Error:", err);
        toast({ title: "CSV Parsing Failed", description: err.message, variant: "destructive" });
        setIsImporting(false);
         if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const processCsvData = async (data: Record<string, any>[]) => {
    const validCompanies: CompanyCsvRow[] = [];
    const validationErrors: { row: number, errors: string[] }[] = [];
    data.forEach((rawRow, index) => {
      if (Object.values(rawRow).every(val => val === "" || val === null || val === undefined)) return;
      const mappedRow = { // Map expected variations
          name: rawRow["company_name"] || rawRow["name"],
          website: rawRow["website"] || rawRow["url"],
          industry: rawRow["industry"], stage: rawRow["stage"],
          location: rawRow["location"] || rawRow["city"] || rawRow["country"],
          employee_count: rawRow["employees"] || rawRow["employee_count"] || rawRow["no_employees"] || rawRow["_employees"],
          linkedin: rawRow["linkedin"] || rawRow["linkedin_url"],
          account_owner: rawRow["account_owner"] || rawRow["owner"],
          ceo: rawRow["ceo"], address: rawRow["address"],
          twitter: rawRow["twitter"] || rawRow["twitter_url"],
          facebook: rawRow["facebook"] || rawRow["facebook_url"],
      };
      const validationResult = companyCsvSchema.safeParse(mappedRow);
      if (validationResult.success) {
        if(validationResult.data.name && validationResult.data.name.trim()){ validCompanies.push(validationResult.data); }
        else { validationErrors.push({ row: index + 2, errors: ["Company Name is required."] }); }
      } else { validationErrors.push({ row: index + 2, errors: validationResult.error.errors.map(e => `${e.path.join('.') || 'Row'}: ${e.message}`) }); }
    });

    console.log("Validation Complete:", { validCount: validCompanies.length, errorCount: validationErrors.length });

    if (validationErrors.length > 0) {
       const errorSummary = validationErrors.slice(0, 5).map(e => `Row ${e.row}: ${e.errors.join(', ')}`).join('\n');
       toast({ title: `Validation Failed (${validationErrors.length} row(s))`, description: `Check CSV.\nErrors:\n${errorSummary}${validationErrors.length > 5 ? '\n...' : ''}`, variant: "destructive", duration: 10000 });
       if (validCompanies.length === 0) { setIsImporting(false); return; }
    }

    if (validCompanies.length > 0) {
      toast({ title: "Importing Data", description: `Attempting import for ${validCompanies.length} valid companies...` });
      let insertedCount = 0; let skippedCount = 0;
      try {
        const { error: upsertError, count } = await supabase.from('companies').upsert(validCompanies as any, { onConflict: 'name', ignoreDuplicates: true });
        if (upsertError) throw upsertError;
        insertedCount = count ?? validCompanies.length; // Estimate
        skippedCount = validCompanies.length - insertedCount;
        if (skippedCount < 0) skippedCount = 0;
        console.log("Upsert done. Estimated inserted:", insertedCount, "Skipped:", skippedCount);
        let description = `${insertedCount} companies processed.`;
        if (skippedCount > 0) { description += ` ${skippedCount} duplicates skipped.`; }
        if (validationErrors.length > 0) { description += ` ${validationErrors.length} rows had errors.`; }
        toast({ title: "Import Complete", description: description });
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        queryClient.invalidateQueries({ queryKey: ['company-counts'] });
      } catch (err: any) {
        console.error("Import Failed:", err);
        toast({ title: "Import Failed", description: err.message || "DB operation error.", variant: "destructive" });
      } finally { setIsImporting(false); }
    } else {
      if (validationErrors.length === 0) { toast({ title: "Import Info", description: "No new data found.", variant: "default" }); }
      setIsImporting(false);
    }
  };

  // --- Helper Functions ---
  const renderSocialIcons = (company: Company) => {
    const hasWebsite = !!company.website; const hasLinkedin = !!company.linkedin;
    const hasTwitter = !!company.twitter; const hasFacebook = !!company.facebook;
    const linkBaseClass = "inline-block p-0.5";
    const activeClass = "text-primary hover:text-primary/80";
    const inactiveClass = "text-muted-foreground/30 cursor-not-allowed";
    const renderIcon = (hasLink: boolean, url: string | null | undefined, title: string, IconComponent: React.ElementType) => (
        <span title={hasLink ? url ?? title : `${title} not available`} className={`${linkBaseClass} ${hasLink ? '' : inactiveClass}`}>
            {hasLink ? (<a href={url!.startsWith('http') ? url! : `https://${url!}`} target="_blank" rel="noreferrer" className={activeClass}><IconComponent className="h-3.5 w-3.5" /></a>) : (<IconComponent className="h-3.5 w-3.5" />)}
        </span>
    );
    return (<div className="flex items-center gap-1 mt-1">{renderIcon(hasWebsite, company.website, "Website", LinkIcon)}{renderIcon(hasLinkedin, company.linkedin, "LinkedIn", Linkedin)}{renderIcon(hasTwitter, company.twitter, "Twitter", Twitter)}{renderIcon(hasFacebook, company.facebook, "Facebook", Facebook)}</div>);
};

   const renderUrlIcons = (company: Company) => (
    <div className="flex items-center justify-end gap-2 text-muted-foreground">
      <a href={`https://www.google.com/search?q=${encodeURIComponent(company.name)}`} target="_blank" rel="noreferrer" title={`Google Search for ${company.name}`} className="hover:text-primary">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.18,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.18,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.18,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
      </a>
      {company.linkedin && (<a href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`} target="_blank" rel="noreferrer" title="LinkedIn Profile" className="hover:text-primary"><Linkedin className="h-4 w-4" /></a>)}
    </div>
   );

   // --- Filtering & Pagination Data ---
   const filteredCompanies = companies?.filter(company =>
        (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (company.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (company.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (company.account_owner?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ) || [];
   const totalFilteredPages = Math.ceil(filteredCompanies.length / itemsPerPage);
   const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  // --- Render ---
  return (
    <div className="container mx-auto px-4 py-6 max-w-full">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="flex gap-2 flex-wrap">
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild><Button className="h-9" onClick={handleAddClick}><Plus className="h-4 w-4 mr-2" /> Add Company</Button></DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add New Company</DialogTitle><DialogDescription>Enter details and click Add Company.</DialogDescription></DialogHeader><CompanyAddForm onClose={handleCloseAddDialog} /></DialogContent>
             </Dialog>
            <Button variant="outline" className="h-9" onClick={downloadCsvTemplate}><Download className="h-4 w-4 mr-2" />Download Template</Button>
            <Button variant="outline" className="h-9" onClick={() => fileInputRef.current?.click()} disabled={isImporting}> {isImporting ? (<Loader2 className="h-4 w-4 mr-2 animate-spin" />) : (<Upload className="h-4 w-4 mr-2" />)} {isImporting ? 'Importing...' : 'Import CSV'} </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, text/csv" style={{ display: 'none' }} />
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
         <Card className="shadow-sm border-l-4 border-l-primary">
            <CardContent className="flex items-center justify-between p-4">
                <div><p className="text-sm text-muted-foreground">Total Companies</p><h2 className="text-2xl font-bold">{isCountsLoading ? '...' : counts?.companies ?? 0}</h2></div>
                <div className="bg-primary/10 p-3 rounded-full"><Building2 className="h-6 w-6 text-primary" /></div>
            </CardContent>
         </Card>
         <Card className="shadow-sm border-l-4 border-l-purple-500">
             <CardContent className="flex items-center justify-between p-4">
                <div><p className="text-sm text-muted-foreground">Total Employees</p><h2 className="text-2xl font-bold">{isCountsLoading ? '...' : counts?.employees ?? 0}</h2></div>
                <div className="bg-purple-500/10 p-3 rounded-full"><Users className="h-6 w-6 text-purple-500" /></div>
            </CardContent>
         </Card>
      </div>

      {/* Search Section */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search by name, industry, location, owner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {/* Companies List Section */}
      {isLoading ? ( <div className="text-center py-10 text-muted-foreground">Loading companies...</div>
      ) : isError ? ( <div className="text-center py-10 text-red-600">Error loading companies: {error?.message}</div>
      ) : (
        <div id="company-list-top" className="border rounded-lg overflow-hidden shadow-sm min-w-[800px]">
          {/* Custom Header Row */}
          <div className="flex items-center bg-muted/50 px-4 py-2 border-b text-xs font-medium text-muted-foreground sticky top-0 z-10">
            <div className="w-[30%] xl:w-[25%] pr-4 flex-shrink-0">Company</div>
            <div className="w-[12%] xl:w-[10%] text-right pr-4 flex-shrink-0"># Employees</div>
            <div className="w-[18%] xl:w-[15%] pr-4 flex-shrink-0">Industry</div>
            <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Stage</div>
            <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Account Owner</div>
            <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Location</div>
            <div className="w-[5%] text-right flex-shrink-0">Links</div>
            <div className="w-[5%] pl-2 text-right flex-shrink-0">Action</div>
          </div>
          {/* Company List Body */}
          <div className="divide-y">
            {paginatedCompanies.length > 0 ? (
              paginatedCompanies.map((company) => (
                <div key={company.id} className="flex items-center px-4 py-3 hover:bg-muted/30 text-sm">
                  {/* Company Column */}
                  <div className="w-[30%] xl:w-[25%] pr-4 flex items-center gap-3 min-w-0 flex-shrink-0">
                    <Avatar className="h-8 w-8 border flex-shrink-0"><AvatarImage src={company.logo_url} alt={company.name} /><AvatarFallback className="text-xs">{company.name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                    <div className="min-w-0"><Link to={`/companies/${company.id}`} className="font-medium text-primary hover:underline truncate block" title={company.name}>{company.name}</Link>{renderSocialIcons(company)}</div>
                  </div>
                  {/* Other Columns */}
                  <div className="w-[12%] xl:w-[10%] text-right pr-4 text-muted-foreground flex-shrink-0">{company.employee_count ?? '-'}</div>
                  <div className="w-[18%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={company.industry || ''}>{company.industry || '-'}</div>
                  {/* Stage Dropdown */}
                  <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">
                    <DropdownMenu><DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className={`h-7 px-2 text-xs w-full justify-between truncate border ${stageColors[company.stage || 'default'] ?? stageColors['default']}`} disabled={updateStageMutation.isPending && updateStageMutation.variables?.companyId === company.id}>
                          <span className="truncate">{company.stage || 'Select Stage'}</span><ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" /></Button>
                      </DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuLabel>Set Stage</DropdownMenuLabel><DropdownMenuSeparator />
                        {STAGES.map(stage => (<DropdownMenuItem key={stage} onSelect={() => handleStageChange(company.id, stage)} disabled={company.stage === stage}>{stage}</DropdownMenuItem>))}
                      </DropdownMenuContent></DropdownMenu>
                  </div>
                  <div className="w-[15%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={company.account_owner || ''}>{company.account_owner || '-'}</div>
                  <div className="w-[15%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={company.location || ''}>{company.location || '-'}</div>
                  <div className="w-[5%] text-right flex-shrink-0">{renderUrlIcons(company)}</div>
                  {/* Action Column */}
                   <div className="w-[5%] pl-2 text-right flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => handleEditClick(company)} title="Edit Company"><Edit className="h-3.5 w-3.5" /><span className="sr-only">Edit</span></Button>
                   </div>
                </div>
              ))
            ) : ( <div className="text-center py-10 text-muted-foreground">{searchTerm ? "No matching companies found." : "No companies available."}</div> )}
          </div>
        </div>
      )}

      {/* Pagination Section */}
      {totalFilteredPages > 1 && !isLoading && ( <EffectivePagination className="mt-6" currentPage={currentPage} totalCount={filteredCompanies.length} pageSize={itemsPerPage} onPageChange={handlePageChange} siblingCount={1} /> )}

      {/* Back to Top Button */}
      {showBackToTop && ( <Button variant="outline" size="icon" className="fixed bottom-6 right-6 h-10 w-10 rounded-full shadow-lg z-50 border-border bg-background/80 backdrop-blur-sm" onClick={scrollToTop} title="Scroll back to top"><ArrowUp className="h-5 w-5" /><span className="sr-only">Scroll to top</span></Button> )}

      {/* Edit Company Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
           <DialogHeader><DialogTitle>Edit Company</DialogTitle><DialogDescription>Update details for {editCompany?.name ?? 'the selected company'}.</DialogDescription></DialogHeader>
           {editCompany && <CompanyEditForm company={editCompany} onClose={handleCloseEditDialog} />}
        </DialogContent>
      </Dialog>
      {/* Add Company Modal is handled above */}

    </div> // End main container
  );
};

export default CompaniesPage;