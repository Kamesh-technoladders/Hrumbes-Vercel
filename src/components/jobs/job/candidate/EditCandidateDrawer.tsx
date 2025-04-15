import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { JobData, CandidateStatus, Candidate } from "@/lib/types";
import BasicInformationTab from "./BasicInformationTab";
import SkillInformationTab from "./SkillInformationTab";
import { createCandidate, updateCandidate, updateCandidateSkillRatings, editCandidate } from "@/services/candidateService";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { getJobById } from "@/services/jobService";
import { useQuery } from "@tanstack/react-query";
import ProofIdTab from "./ProofIdTab";


interface AddCandidateDrawerProps {
  job: JobData;
  onCandidateAdded: () => void;
  candidate?: Candidate;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export type CandidateFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentLocation: string;
  preferredLocations: string[];
  totalExperience?: number; // Made optional
  totalExperienceMonths?: number; // Added
  relevantExperience?: number; // Made optional
  relevantExperienceMonths?: number; // Added
  experience?: string;
  resume: string | null;
  skills: Array<{
    name: string;
    rating: number;
  }>;
  location?: string;
  expectedSalary?: number; // Made optional
  currentSalary?: number; // Made optional
  noticePeriod?: number; // Add Notice Period (in days)
  lastWorkingDay?: string; // Add Last Working Day (date string, e.g., "2025-05-30")
  uan?: string; // Add UAN (optional)
  pan?: string; // Add PAN (optional)
  pf?: string; // Add PF (optional)
  esicNumber?: string; // Add ESIC Number (optional)
  linkedInId?: string; // Added
  hasOffers?: "Yes" | "No"; // Added
  offerDetails?: string; // Added
};

const AddCandidateDrawer = ({ job, onCandidateAdded, candidate, open, onOpenChange }: AddCandidateDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [candidateId, setCandidateId] = useState<string | null>(candidate?.id || null);
  const user = useSelector((state: any) => state.auth.user);
  const isEditMode = !!candidate;

  // Fetch job data
  const { 
    data: jobs, 
    isLoading: jobLoading, 
    error: jobError,
    refetch: refetchJob
  } = useQuery({
    queryKey: ['job', job.id],
    queryFn: () => getJobById(job.id || ""),
    enabled: !!job.id,
  });

  const controlledOpen = open !== undefined ? open : isOpen;
  const controlledOnOpenChange = onOpenChange || setIsOpen;

  const basicInfoForm = useForm<CandidateFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      currentLocation: "",
      preferredLocations: [],
      totalExperience: undefined,
      totalExperienceMonths: undefined,
      relevantExperience: undefined,
      relevantExperienceMonths: undefined,
      currentSalary: undefined,
      expectedSalary: undefined,
      linkedInId: "",
      hasOffers: undefined,
      offerDetails: "",
      resume: null,
      skills: [],

    },
  });

  const skillsForm = useForm<CandidateFormData>({
    defaultValues: {
      skills: jobs?.skills?.map(skill => ({ name: skill, rating: 3 })) || []
    }
  });

    const proofIdForm = useForm<CandidateFormData>({
      defaultValues: {
        uan: candidate?.metadata?.uan || "",
        pan: candidate?.metadata?.pan || "",
        pf: candidate?.metadata?.pf || "",
        esicNumber: candidate?.metadata?.esicNumber || "",
      },
    });

  useEffect(() => {
    if (candidate && isEditMode) {
      setCandidateId(candidate.id);
      basicInfoForm.reset({
        firstName: candidate.name.split(" ")[0] || "",
        lastName: candidate.name.split(" ").slice(1).join(" ") || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        currentLocation: candidate.metadata?.currentLocation || candidate.location || "",
        preferredLocations: candidate.metadata?.preferredLocations || [],
        totalExperience: candidate.metadata?.totalExperience,
        totalExperienceMonths: candidate.metadata?.totalExperienceMonths,
        relevantExperience: candidate.metadata?.relevantExperience,
        relevantExperienceMonths: candidate.metadata?.relevantExperienceMonths,
        currentSalary: candidate.currentSalary ?? candidate.metadata?.currentSalary,
        expectedSalary: candidate.expectedSalary ?? candidate.metadata?.expectedSalary,
        resume: candidate.resume || null,
        skills: candidate.skillRatings || candidate.skills || [],
        noticePeriod: candidate?.metadata?.noticePeriod || "",
        lastWorkingDay: candidate?.metadata?.lastWorkingDay || "", 
        linkedInId: candidate.metadata?.linkedInId || "",
        hasOffers: candidate.metadata?.hasOffers,
        offerDetails: candidate.metadata?.offerDetails || "",
        
      });

      // Populate skills form with candidate skills or job skills as fallback
      const candidateSkills = candidate.skillRatings || candidate.skills || [];
      skillsForm.reset({
        skills: candidateSkills.length > 0 
          ? candidateSkills 
          : (jobs?.skills?.map(skill => ({ name: skill, rating: 0 })) || [])
      });
    }
  }, [candidate, isEditMode, basicInfoForm, skillsForm, jobs]);

  const handleClose = () => {
    basicInfoForm.reset();
    skillsForm.reset();
    setCandidateId(isEditMode ? candidate?.id : null);
    setActiveTab("basic-info");
    controlledOnOpenChange(false);
  };

  const formatExperience = (years?: number, months?: number): string => {
    const yearsStr = years !== undefined && years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
    const monthsStr = months !== undefined && months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
    return [yearsStr, monthsStr].filter(Boolean).join(" and ") || "0 years";
  };

  const handleSaveBasicInfo = async (data: CandidateFormData) => {
    try {
      if (!job.id) {
        toast.error("Job ID is missing");
        return;
      }

      const appliedFrom = user?.user_metadata
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
        : "Unknown";
      const createdBy = user?.id;

      const payload: CandidateData = {
        id: candidateId || "",
        name: `${data.firstName} ${data.lastName}`,
        status: isEditMode ? (candidate?.status || "Screening") : "Screening",
        experience: formatExperience(data.totalExperience, data.totalExperienceMonths),
        matchScore: isEditMode ? (candidate?.matchScore || 0) : 0,
        appliedDate: isEditMode ? (candidate?.appliedDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        skills: [],
        email: data.email,
        phone: data.phone,
        currentSalary: data.currentSalary ?? null,
        expectedSalary: data.expectedSalary ?? null,
        location: data.currentLocation || "",
        appliedFrom: isEditMode ? candidate?.appliedFrom : appliedFrom,
        resumeUrl: data.resume,
        createdBy: isEditMode ? candidate?.createdBy : createdBy,
        updatedBy: user?.id,
        metadata: {
          currentLocation: data.currentLocation,
          preferredLocations: data.preferredLocations,
          totalExperience: data.totalExperience,
          totalExperienceMonths: data.totalExperienceMonths,
          relevantExperience: data.relevantExperience,
          relevantExperienceMonths: data.relevantExperienceMonths,
          currentSalary: data.currentSalary,
          expectedSalary: data.expectedSalary,
          resume_url: data.resume,
          noticePeriod: data.noticePeriod, // Add Notice Period
        lastWorkingDay: data.lastWorkingDay,
        linkedInId: data.linkedInId,
          hasOffers: data.hasOffers,
          offerDetails: data.offerDetails,
        uan: data.uan || undefined, // Include UAN
          pan: data.pan || undefined, // Include PAN
          pf: data.pf || undefined, // Include PF
          esicNumber: data.esicNumber || undefined, // Include ESIC Number
        },
        skillRatings: skillsForm.getValues().skills || [],
        progress: candidate?.progress || {
          screening: false,
          interview: false,
          offer: false,
          hired: false,
          joined: false
        }
      };

      if (!candidateId || !isEditMode) {
        const newCandidate = await createCandidate(job.id, payload);
        setCandidateId(newCandidate.id);
        toast.success("Candidate created successfully");
      } else {
        await editCandidate(candidateId, payload);
        toast.success("Candidate updated successfully");
      }

      setActiveTab("skills-info");
    } catch (error) {
      console.error("Error saving candidate basic info:", error);
      toast.error("Failed to save basic information");
    }
  };

  const handleSaveSkills = async (data: CandidateFormData) => {
    try {
      if (!candidateId || !job.id) {
        toast.error("Candidate ID or Job ID is missing");
        return;
      }

      const basicInfoData = basicInfoForm.getValues();
      const updatedFrom = user?.id;

      const payload: CandidateData = {
        id: candidateId,
        name: `${basicInfoData.firstName} ${basicInfoData.lastName}`,
        status: candidate?.status || "Screening",
        experience: formatExperience(basicInfoData.totalExperience, basicInfoData.totalExperienceMonths),
        matchScore: candidate?.matchScore || 0,
        appliedDate: candidate?.appliedDate || new Date().toISOString().split('T')[0],
        skills: data.skills.map(skill => JSON.stringify(skill)),
        email: basicInfoData.email,
        phone: basicInfoData.phone,
        currentSalary: basicInfoData.currentSalary ?? null,
        expectedSalary: basicInfoData.expectedSalary ?? null,
        location: basicInfoData.currentLocation || "",
        appliedFrom: candidate?.appliedFrom || "",
        resumeUrl: basicInfoData.resume,
        createdBy: candidate?.createdBy || user?.id,
        updatedBy: updatedFrom,
        metadata: {
          currentLocation: basicInfoData.currentLocation,
          preferredLocations: basicInfoData.preferredLocations,
          totalExperience: basicInfoData.totalExperience,
          totalExperienceMonths: basicInfoData.totalExperienceMonths,
          relevantExperience: basicInfoData.relevantExperience,
          relevantExperienceMonths: basicInfoData.relevantExperienceMonths,
          currentSalary: basicInfoData.currentSalary,
          expectedSalary: basicInfoData.expectedSalary,
          resume_url: basicInfoData.resume,
          noticePeriod: basicInfoData.noticePeriod,
        lastWorkingDay: basicInfoData.lastWorkingDay,
        linkedInId: basicInfoData.linkedInId,
          hasOffers: basicInfoData.hasOffers,
          offerDetails: basicInfoData.offerDetails,

        },
        skillRatings: data.skills,
        progress: candidate?.progress || {
          screening: false,
          interview: false,
          offer: false,
          hired: false,
          joined: false
        }
      };

      if (isEditMode) {
        await editCandidate(candidateId, payload);
        toast.success("Candidate updated successfully");
      } else {
        const newCandidate = await createCandidate(job.id, payload);
        setCandidateId(newCandidate.id);
        toast.success("Candidate created successfully");
      }

      setActiveTab("proof-id");
    } catch (error) {
      console.error("Error saving candidate skills:", error);
      toast.error("Failed to save skills information");
    }
  };

  const handleSaveProofId = async (data: CandidateFormData) => {
    try {
      if (!candidateId || !job.id) {
        toast.error("Candidate ID or Job ID is missing");
        return;
      }
  
      // Update candidate with proof ID fields
      const candidateData = {
        metadata: {
          uan: data.uan || undefined, // Include UAN
          pan: data.pan || undefined, // Include PAN
          pf: data.pf || undefined, // Include PF
          esicNumber: data.esicNumber || undefined, // Include ESIC Number
        },
      };
  
      await updateCandidate(candidateId, candidateData);
      toast.success("Proof ID information saved successfully");
      onCandidateAdded();
      handleClose();
    } catch (error) {
      console.error("Error saving candidate proof ID:", error);
      toast.error("Failed to save proof ID information");
    }
  };

  return (
    <Sheet open={controlledOpen} onOpenChange={controlledOnOpenChange}>
      {/* <SheetTrigger asChild>
        <Button 
          id={isEditMode ? "edit-candidate-btn" : "add-candidate-btn"} 
          onClick={() => controlledOnOpenChange(true)}
        >
          {isEditMode ? "Edit Candidate" : "Add Candidate"}
        </Button>
      </SheetTrigger> */}
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditMode ? "Edit Candidate" : "Add New Candidate"}</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic-info">Basic Information</TabsTrigger>
            <TabsTrigger 
              value="skills-info" 
              disabled={!candidateId}
            >
              Skill Information
            </TabsTrigger>
            <TabsTrigger value="proof-id" disabled={!candidateId}>
              Proof ID
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic-info">
            <BasicInformationTab 
              form={basicInfoForm} 
              onSaveAndNext={(data) => handleSaveBasicInfo(data)}
              onCancel={handleClose}
            />
          </TabsContent>
          
          <TabsContent value="skills-info">
            <SkillInformationTab 
              form={skillsForm}
              jobSkills={job.skills || []}
              onSave={(data) => handleSaveSkills(data)}
              onCancel={handleClose}
            />
          </TabsContent>
          <TabsContent value="proof-id">
            <ProofIdTab
              form={proofIdForm}
              onSave={(data) => handleSaveProofId(data)}
              onCancel={handleClose}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default AddCandidateDrawer;

// 