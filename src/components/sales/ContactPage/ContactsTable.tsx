// // src/components/ContactsTable.tsx
// import React, { useState } from 'react';
// import {
//   Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
// } from "@/components/ui/table";
// import { Button } from '@/components/ui/button';
// import { Edit, Mail, Phone, Copy, Check, ChevronDown, Linkedin, XCircle, CheckCircle2 } from 'lucide-react';
// import { Contact } from '@/types/contact'; // Use the Contact type
// import {
//   Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
// } from "@/components/ui/tooltip";
// import {
//   DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { useToast } from "@/hooks/use-toast";
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { supabase } from '@/integrations/supabase/client';
// import { Badge } from '@/components/ui/badge'; // For Access buttons

// interface ContactsTableProps {
//   contacts: Contact[];
//   onEditContact: (contact: Contact) => void; // Callback to open edit modal
// }

// // Define possible contact stages (ensure these match your application's needs)
// const CONTACT_STAGES = ['Cold', 'Approaching', 'Replied', 'Interested', 'Not Interested', 'Un Responsive', 'Do Not Contact', 'Bad Data', 'Changed Job', 'Prospect'];

// // Define colors for contact stages (Tailwind classes) - Customize as needed
// const contactStageColors: Record<string, string> = {
//     'Cold': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
//     'Approaching': 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
//     'Replied': 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
//     'Interested': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
//     'Not Interested': 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
//     'Un Responsive': 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300', // Adjusted for visibility
//     'Do Not Contact': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
//     'Bad Data': 'bg-red-200 text-red-800 border-red-300 hover:bg-red-300',
//     'Changed Job': 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
//     'Prospect': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
//     'default': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200', // Fallback
// };


// const NUM_COLUMNS = 7; // Name, Email, Mobile, Job Title, Owner, Stage, Action

// const ContactsTable: React.FC<ContactsTableProps> = ({ contacts, onEditContact }) => {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();
//   const [copiedInfo, setCopiedInfo] = useState<{ type: 'Email' | 'Mobile'; id: string } | null>(null);

//   const getDisplayValue = (value: string | null | undefined): string => value?.trim() && value.trim().toUpperCase() !== 'N/A' ? value : 'N/A';

//   // --- Contact Stage Update Mutation ---
//   const updateContactStageMutation = useMutation({
//     mutationFn: async ({ contactId, newStage }: { contactId: string; newStage: string }) => {
//       const { error } = await supabase
//         .from('contacts')
//         .update({ contact_stage: newStage })
//         .eq('id', contactId);
//       if (error) throw error;
//       return { contactId, newStage };
//     },
//     onSuccess: (_, variables) => {
//       toast({ title: "Contact Stage Updated", description: `Stage set to ${variables.newStage}.` });
//       queryClient.invalidateQueries({ queryKey: ['contacts'] });
//     },
//     onError: (error: any) => {
//       toast({ title: "Stage Update Failed", description: error.message, variant: "destructive" });
//     },
//   });

//   const handleContactStageChange = (contactId: string | undefined, newStage: string) => {
//     if (!contactId) { toast({title: "Error", description: "Contact ID missing.", variant: "destructive"}); return; };
//     updateContactStageMutation.mutate({ contactId, newStage });
//   };
//   // --- End Stage Update ---

//   const handleCopy = (textToCopy: string | null | undefined, type: 'Email' | 'Mobile', contactId: string | undefined) => {
//     const valueToCopy = getDisplayValue(textToCopy);
//     if (!valueToCopy || valueToCopy === 'N/A' || !contactId) return;

//     navigator.clipboard.writeText(valueToCopy).then(() => {
//       setCopiedInfo({ type, id: contactId });
//       toast({ title: `${type} Copied!`, description: valueToCopy });
//       setTimeout(() => setCopiedInfo(null), 1500);
//     }).catch(err => {
//       console.error(`Failed to copy ${type}: `, err);
//       toast({ title: "Copy Failed", variant: "destructive" });
//     });
//   };

//   // Access Button Component for Email/Mobile
//   const AccessButton = ({ type, value, contactId }: { type: 'Email' | 'Mobile', value: string | null | undefined, contactId: string | undefined }) => {
//       const hasValue = value && getDisplayValue(value) !== 'N/A';
//       const IconComponent = type === 'Email' ? Mail : Phone;
//       const isCopied = copiedInfo?.type === type && copiedInfo?.id === contactId;
//       const CopyIconComponent = isCopied ? Check : Copy;

//       return (
//           <Badge
//               variant="outline"
//               className={`cursor-pointer group flex items-center gap-1.5 text-xs font-normal h-7 px-2 border ${
//                   hasValue
//                   ? 'border-green-400 bg-green-100 text-green-700 hover:bg-green-200' // Brighter green
//                   : 'border-red-400 bg-red-100 text-red-700 hover:bg-red-200' // Brighter red
//               }`}
//               onClick={(e) => { e.stopPropagation(); if (hasValue) handleCopy(value, type, contactId); }}
//               title={hasValue ? `Click to copy ${type}: ${value}` : `${type} not available`}
//           >
//               {hasValue ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />}
//               <span className="hidden sm:inline">Access {type}</span>
//               {/* Show copy icon on hover/focus within the badge if value exists */}
//               {hasValue && (
//                   <CopyIconComponent className={`h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${isCopied ? 'text-green-600 opacity-100' : 'text-muted-foreground'}`} />
//               )}
//           </Badge>
//       );
//   };

//   return (
//     <TooltipProvider delayDuration={100}>
//       <div className="overflow-x-auto rounded-lg border">
//         <Table className="min-w-[900px]"> {/* Ensure table can scroll */}
//           <TableHeader>
//             <TableRow className="bg-muted/50 hover:bg-muted/50">
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Name</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[18%]">Email</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[18%]">Mobile</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Job Title</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[12%]">Contact Owner</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[12%]">Contact Stage</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[5%]">Action</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {contacts && contacts.length > 0 ? (
//               contacts.map((contact) => (
//                 <TableRow key={contact.id} className="border-b hover:bg-gray-50">
//                   {/* Name & LinkedIn */}
//                   <TableCell className="p-3 font-medium text-sm">
//                     <div>{getDisplayValue(contact.name)}</div>
//                     {contact.linkedin_url && getDisplayValue(contact.linkedin_url) !== 'N/A' && (
//                         <a href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`} target="_blank" rel="noreferrer" className="inline-block mt-1" title="View LinkedIn">
//                            <Badge variant="secondary" className="p-0 px-1.5 bg-blue-100 hover:bg-blue-200 border-blue-300">
//                                <Linkedin className="h-3 w-3 text-blue-700"/>
//                            </Badge>
//                         </a>
//                     )}
//                   </TableCell>
//                    {/* Email Access Button */}
//                   <TableCell className="p-3">
//                       <AccessButton type="Email" value={contact.email} contactId={contact.id}/>
//                   </TableCell>
//                    {/* Mobile Access Button */}
//                   <TableCell className="p-3">
//                      <AccessButton type="Mobile" value={contact.mobile} contactId={contact.id}/>
//                   </TableCell>
//                   {/* Job Title */}
//                   <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(contact.job_title)}</TableCell>
//                   {/* Contact Owner */}
//                   <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(contact.contact_owner)}</TableCell>
//                   {/* Contact Stage Dropdown */}
//                    <TableCell className="p-3 text-sm">
//                      <DropdownMenu>
//                        <DropdownMenuTrigger asChild>
//                          <Button
//                            variant="outline" size="sm"
//                            className={`h-7 px-2 text-xs w-full min-w-[120px] max-w-[150px] justify-between truncate border ${contactStageColors[contact.contact_stage || 'default'] ?? contactStageColors['default']}`}
//                            disabled={updateContactStageMutation.isPending && updateContactStageMutation.variables?.contactId === contact.id}
//                          >
//                            <span className="truncate">{contact.contact_stage || 'N/A'}</span>
//                            <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
//                          </Button>
//                        </DropdownMenuTrigger>
//                        <DropdownMenuContent align="start">
//                          <DropdownMenuLabel className="text-xs">Set Stage</DropdownMenuLabel>
//                          <DropdownMenuSeparator/>
//                          {CONTACT_STAGES.map(stage => (
//                            <DropdownMenuItem
//                              key={stage}
//                              onSelect={() => handleContactStageChange(contact.id, stage)}
//                              disabled={contact.contact_stage === stage}
//                              className="text-xs"
//                            > {stage} </DropdownMenuItem>
//                          ))}
//                        </DropdownMenuContent>
//                      </DropdownMenu>
//                   </TableCell>
//                   {/* Action Cell */}
//                   <TableCell className="p-3">
//                       <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => onEditContact(contact)} title="Edit Contact">
//                           <Edit className="h-3.5 w-3.5" /> <span className="sr-only">Edit</span>
//                       </Button>
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell colSpan={NUM_COLUMNS} className="h-24 text-center text-muted-foreground">
//                   No contacts found.
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>
//     </TooltipProvider>
//   );
// };

// export default ContactsTable;

// src/components/ContactsTable.tsx
import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Mail, Phone, Copy, Check, ChevronDown, Linkedin, XCircle, CheckCircle2 } from 'lucide-react';
import { Contact } from '@/types/contact'; // Use the Contact type
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge'; // For Access buttons

interface ContactsTableProps {
  contacts: Contact[];
  onEditContact: (contact: Contact) => void; // Callback to open edit modal
}

// Define possible contact stages (ensure these match your application's needs)
const CONTACT_STAGES = ['Cold', 'Approaching', 'Replied', 'Interested', 'Not Interested', 'Un Responsive', 'Do Not Contact', 'Bad Data', 'Changed Job', 'Prospect'];

// Define colors for contact stages (Tailwind classes) - Customize as needed
const contactStageColors: Record<string, string> = {
    'Cold': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
    'Approaching': 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
    'Replied': 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
    'Interested': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
    'Not Interested': 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
    'Un Responsive': 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300',
    'Do Not Contact': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    'Bad Data': 'bg-red-200 text-red-800 border-red-300 hover:bg-red-300',
    'Changed Job': 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
    'Prospect': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
    'default': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
};


const NUM_COLUMNS = 7; // Name, Email, Mobile, Job Title, Owner, Stage, Action

const ContactsTable: React.FC<ContactsTableProps> = ({ contacts, onEditContact }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // State for copy feedback (icon change)
  const [copiedStatus, setCopiedStatus] = useState<{ type: 'Email' | 'Mobile'; id: string; value: string } | null>(null);
  // State to control individual tooltip visibility (key: contactId-type)
  const [openTooltips, setOpenTooltips] = useState<Record<string, boolean>>({});

  const getDisplayValue = (value: string | null | undefined): string => value?.trim() && value.trim().toUpperCase() !== 'N/A' ? value : 'N/A';

  // --- Contact Stage Update Mutation ---
  const updateContactStageMutation = useMutation({
    mutationFn: async ({ contactId, newStage }: { contactId: string; newStage: string }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ contact_stage: newStage })
        .eq('id', contactId);
      if (error) throw error;
      return { contactId, newStage };
    },
    onSuccess: (_, variables) => {
      toast({ title: "Contact Stage Updated", description: `Stage set to ${variables.newStage}.` });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: any) => {
      toast({ title: "Stage Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleContactStageChange = (contactId: string | undefined, newStage: string) => {
    if (!contactId) { toast({title: "Error", description: "Contact ID missing.", variant: "destructive"}); return; };
    updateContactStageMutation.mutate({ contactId, newStage });
  };
  // --- End Stage Update ---

// --- UPDATED Copy Handler ---
const handleCopy = (textToCopy: string | null | undefined, type: 'Email' | 'Mobile', contactId: string | undefined) => {
    const valueToCopy = getDisplayValue(textToCopy);
    if (!valueToCopy || valueToCopy === 'N/A' || !contactId) return;

    navigator.clipboard.writeText(valueToCopy).then(() => {
      setCopiedStatus({ type, id: contactId, value: valueToCopy }); // For checkmark on copy icon
      toast({ title: `${type} Copied!`, description: valueToCopy });
      // Close the specific tooltip after successful copy
      setOpenTooltips(prev => ({ ...prev, [`${contactId}-${type}`]: false }));
      setTimeout(() => setCopiedStatus(null), 2000); // Reset checkmark after 2s
    }).catch(err => {
      console.error(`Failed to copy ${type}: `, err);
      toast({ title: "Copy Failed", variant: "destructive" });
    });
  };
  // --- End Copy Handler ---
  const ContactInfoWithCopy = ({ type, value, contactId }: { type: 'Email' | 'Mobile', value: string | null | undefined, contactId: string | undefined }) => {
    const displayValue = getDisplayValue(value);
    const hasValue = displayValue !== 'N/A';
    const IconComponent = type === 'Email' ? Mail : Phone;
    const tooltipKey = `${contactId}-${type}`;

    if (!contactId) return <span className="text-muted-foreground/50"><IconComponent className="h-4 w-4" /></span>;

    return (
        <Tooltip open={openTooltips[tooltipKey]} onOpenChange={(isOpen) => setOpenTooltips(prev => ({ ...prev, [tooltipKey]: isOpen }))}>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 p-1 ${!hasValue ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:text-primary'}`}
                    disabled={!hasValue}
                    aria-label={hasValue ? `View ${type}` : `${type} not available`}
                >
                    <IconComponent className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            {hasValue && ( // Only show content if there's a value
                <TooltipContent
                    side="top"
                    align="center"
                    className="bg-background border shadow-lg rounded-md p-0 max-w-xs" // Override default tooltip padding
                    onPointerDownOutside={(e) => { // Prevent tooltip closing when clicking copy button inside
                        if ((e.target as HTMLElement)?.closest('[data-copy-button]')) {
                            e.preventDefault();
                        }
                    }}
                >
                    <div className="p-2 flex items-center justify-between gap-2">
                        <span className="text-sm text-foreground truncate" title={displayValue}>{displayValue}</span>
                        <Button
                            data-copy-button // Custom attribute to identify the copy button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-1 text-muted-foreground hover:text-primary flex-shrink-0"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent tooltip from closing immediately due to trigger click
                                handleCopy(value, type, contactId);
                            }}
                            title={`Copy ${type}`}
                        >
                            {copiedStatus?.type === type && copiedStatus?.id === contactId ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>
                </TooltipContent>
            )}
        </Tooltip>
    );
  };
  // --- End Contact Info Component ---

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[900px]">
          {/* NO WHITESPACE OR COMMENTS DIRECTLY HERE */}
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Name</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[18%]">Contacts</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Job Title</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[12%]">Contact Owner</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[12%]">Contact Stage</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[5%]">Action</TableHead>
            </TableRow>
          </TableHeader>
          {/* NO WHITESPACE OR COMMENTS DIRECTLY HERE */}
          <TableBody>
            {contacts && contacts.length > 0 ? (
              contacts.map((contact) => (
                <TableRow key={contact.id} className="border-b hover:bg-gray-50">
                  {/* Name & LinkedIn */}
                  <TableCell className="p-3 font-medium text-sm">
                    <div>{getDisplayValue(contact.name)}</div>
                    {contact.linkedin_url && getDisplayValue(contact.linkedin_url) !== 'N/A' && (
                        <a href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`} target="_blank" rel="noreferrer" className="inline-block mt-1" title="View LinkedIn">
                           <Badge variant="secondary" className="p-0 px-1.5 bg-blue-100 hover:bg-blue-200 border-blue-300">
                               <Linkedin className="h-3 w-3 text-blue-700"/>
                           </Badge>
                        </a>
                    )}
                  </TableCell>
                  {/* --- NEW Combined Contact Column --- */}
                  <TableCell className="p-3">
                    <div className="flex items-center gap-2">
                        <ContactInfoWithCopy type="Email" value={contact.email} contactId={contact.id} />
                        <ContactInfoWithCopy type="Mobile" value={contact.mobile} contactId={contact.id} />
                    </div>
                  </TableCell>
                  {/* --- End Combined Contact Column --- */}

                  {/* REMOVED separate Email and Mobile cells */}
                  {/* Job Title */}
                  <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(contact.job_title)}</TableCell>
                  {/* Contact Owner */}
                  <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(contact.contact_owner)}</TableCell>
                  {/* Contact Stage Dropdown */}
                   <TableCell className="p-3 text-sm">
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button
                           variant="outline" size="sm"
                           className={`h-7 px-2 text-xs w-full min-w-[120px] max-w-[150px] justify-between truncate border ${contactStageColors[contact.contact_stage || 'default'] ?? contactStageColors['default']}`}
                           disabled={updateContactStageMutation.isPending && updateContactStageMutation.variables?.contactId === contact.id}
                         >
                           <span className="truncate">{contact.contact_stage || 'N/A'}</span>
                           <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="start">
                         <DropdownMenuLabel className="text-xs">Set Stage</DropdownMenuLabel>
                         <DropdownMenuSeparator/>
                         {CONTACT_STAGES.map(stage => (
                           <DropdownMenuItem
                             key={stage}
                             onSelect={() => handleContactStageChange(contact.id, stage)}
                             disabled={contact.contact_stage === stage}
                             className="text-xs"
                           > {stage} </DropdownMenuItem>
                         ))}
                       </DropdownMenuContent>
                     </DropdownMenu>
                  </TableCell>
                  {/* Action Cell */}
                  <TableCell className="p-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => onEditContact(contact)} title="Edit Contact">
                          <Edit className="h-3.5 w-3.5" /> <span className="sr-only">Edit</span>
                      </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={NUM_COLUMNS} className="h-24 text-center text-muted-foreground">
                  No contacts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {/* NO WHITESPACE OR COMMENTS DIRECTLY HERE */}
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default ContactsTable;