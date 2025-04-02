import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { getCandidatesByJobId } from "@/services/candidateService";
import { Candidate, CandidateStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/jobs/ui/table";
import { StatusSelector } from "./StatusSelector";
import ValidateResumeButton from "./candidate/ValidateResumeButton";
import ActionButtons from "./candidate/ActionButtons";
import StageProgress from "./candidate/StageProgress";
import EmptyState from "./candidate/EmptyState";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditCandidateDrawer from "@/components/jobs/job/candidate/EditCandidateDrawer";
import { getJobById } from "@/services/jobService";
import { ProgressColumn } from "./ProgressColumn";
import { Candidates } from "./types/candidate.types";
import { getCandidatesForJob, createDummyCandidate } from "@/services/candidatesService";
import { updateCandidateStatus } from "@/services/statusService";
import SummaryModal from "./SummaryModal";
import { supabase } from "@/integrations/supabase/client";

interface CandidatesListProps {
  jobId: string;
  jobdescription: string;
  statusFilter?: string;
  statusFilters?: string[];
  onAddCandidate?: () => void;
  onRefresh: () => Promise<void>;
}

const CandidatesList = ({
  jobId,
  statusFilter,
  statusFilters = [],
  onAddCandidate,
  jobdescription,
  onRefresh,
}: CandidatesListProps) => {
  // Get user info from Redux state
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Fetch candidates
  const { data: candidatesData = [], isLoading, refetch } = useQuery({
    queryKey: ["job-candidates", jobId],
    queryFn: () => getCandidatesByJobId(jobId),
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [analysisDataAvailable, setAnalysisDataAvailable] = useState<{
    [key: number]: boolean;
  }>({});

  console.log("filtered resumes", filteredCandidates);

  // Fetch job data
  const {
    data: job,
    isLoading: jobLoading,
    refetch: refetchJob,
  } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobById(jobId || ""),
    enabled: !!jobId,
  });

  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const recruitmentStages = ["New", "InReview", "Engaged", "Available", "Offered", "Hired"];

  // Check for existing analysis data on mount
  useEffect(() => {
    const checkAnalysisData = async () => {
      const { data, error } = await supabase
        .from("hr_job_candidates")
        .select("candidate_id, overall_summary")
        .eq("job_id", jobId)
        .not("overall_summary", "is", null);

      if (error) {
        console.error("Error checking analysis data:", error);
        return;
      }

      const availableData: { [key: number]: boolean } = {};
      data.forEach((item) => {
        availableData[item.candidate_id] = true;
      });

      setAnalysisDataAvailable(availableData);
    };

    checkAnalysisData();
  }, [jobId]);

  // Fetch Summary Resume
  const fetchAnalysisData = async (candidateId: number) => {
    try {
      const { data, error } = await supabase
        .from("hr_job_candidates")
        .select(`
          overall_score,
          skills_score,
          skills_summary,
          skills_enhancement_tips,
          work_experience_score,
          work_experience_summary,
          work_experience_enhancement_tips,
          projects_score,
          projects_summary,
          projects_enhancement_tips,
          education_score,
          education_summary,
          education_enhancement_tips,
          overall_summary,
          report_url
        `)
        .eq("job_id", jobId)
        .eq("candidate_id", candidateId)
        .single();

      if (error) throw error;

      setAnalysisData(data);
      setAnalysisDataAvailable((prev) => ({
        ...prev,
        [candidateId]: true,
      }));
      setIsSummaryModalOpen(true);
    } catch (error) {
      console.error("Error fetching analysis data:", error);
      toast.error("Failed to fetch candidate analysis.");
      setAnalysisDataAvailable((prev) => ({
        ...prev,
        [candidateId]: false,
      }));
    }
  };

  // Transform candidates data
  useEffect(() => {
    if (candidatesData.length > 0) {
      const transformedCandidates: Candidate[] = candidatesData.map((candidate) => {
        let statusValue: CandidateStatus = candidate.status as CandidateStatus || "New";

        // Handle legacy status mappings
        if (candidate.status === "Screening") statusValue = "New";
        else if (candidate.status === "Interviewing") statusValue = "InReview";
        else if (candidate.status === "Selected") statusValue = "Hired";

        const stageIndex = recruitmentStages.indexOf(statusValue);
        const currentStage = statusValue === "Rejected" ? "Rejected" : recruitmentStages[stageIndex >= 0 ? stageIndex : 0];

        return {
          id: candidate.id,
          name: candidate.name,
          status: statusValue,
          experience: candidate.experience || "",
          matchScore: candidate.matchScore || 0,
          appliedDate: candidate.appliedDate,
          skills: candidate.skillRatings || candidate.skills || [],
          email: candidate.email,
          phone: candidate.phone,
          resume: candidate.resumeUrl,
          appliedFrom: candidate.appliedFrom,
          currentSalary: candidate.currentSalary,
          expectedSalary: candidate.expectedSalary,
          location: candidate.location,
          metadata: candidate.metadata,
          skill_ratings: candidate.skillRatings,
          currentStage,
          completedStages: recruitmentStages.slice(0, stageIndex),
          hasValidatedResume: candidate.hasValidatedResume || false,
          progress: {
            screening: stageIndex >= 0,
            interview: stageIndex >= 1,
            offer: stageIndex >= 2,
            hired: stageIndex >= 3,
            joined: stageIndex >= 4,
          },
          main_status: candidate.main_status,
          sub_status: candidate.sub_status,
          main_status_id: candidate.main_status_id,
          sub_status_id: candidate.sub_status_id,
        };
      });

      setCandidates(transformedCandidates);
    }
  }, [candidatesData]);

  // Apply all filters
  useEffect(() => {
    let filtered = [...candidates];

    // Apply status filter if specified (tab filter)
    if (statusFilter) {
      filtered = filtered.filter((c) => {
        if (c.main_status && c.main_status.name === statusFilter) {
          return true;
        }
        if (c.status === statusFilter) {
          return true;
        }
        return false;
      });
    }

    // Apply additional status filters from the filter dialog
    if (statusFilters && statusFilters.length > 0) {
      filtered = filtered.filter((candidate) => {
        if (statusFilters.length === 0) return true;
        if (candidate.main_status_id && statusFilters.includes(candidate.main_status_id)) {
          return true;
        }
        if (candidate.sub_status_id && statusFilters.includes(candidate.sub_status_id)) {
          return true;
        }
        return false;
      });
    }

    setFilteredCandidates(filtered);
  }, [candidates, statusFilter, statusFilters]);

  const handleStatusChange = async (value: string, candidate: Candidate) => {
    try {
      if (!candidate || !candidate.id) {
        toast.error("Invalid candidate data");
        return;
      }

      const success = await updateCandidateStatus(candidate.id, value, user?.id);

      if (success) {
        toast.success("Status updated successfully");
        await onRefresh();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleValidateResume = async (candidateId: number) => {
    try {
      setValidatingId(candidateId);
      const candidate = filteredCandidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      // Extract the part of resume_url after "candidate_resumes"
      const resumeUrlParts = candidate.resume.split("candidate_resumes/");
      const extractedResumeUrl = resumeUrlParts.length > 1 ? resumeUrlParts[1] : candidate.resume;

      const payload = {
        job_id: jobId,
        candidate_id: candidateId.toString(),
        resume_url: extractedResumeUrl,
        job_description: jobdescription,
      };

      console.log("Backend data", payload);

      const response = await fetch("http://localhost:5005/api/validate-candidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      // Update candidate's validation status
      const candidateIndex = filteredCandidates.findIndex((c) => c.id === candidateId);
      if (candidateIndex !== -1) {
        filteredCandidates[candidateIndex].hasValidatedResume = true;
        setFilteredCandidates([...filteredCandidates]);
        setAnalysisDataAvailable((prev) => ({
          ...prev,
          [candidateId]: true,
        }));
        toast.success("Resume validated successfully!");
        await fetchAnalysisData(candidateId); // Fetch analysis data to confirm
      }
    } catch (error) {
      toast.error("Failed to validate resume");
      console.error("Validation error:", error);
    } finally {
      setValidatingId(null);
    }
  };

  const handleViewResume = (candidateId: number) => {
    const candidate = filteredCandidates.find((c) => c.id === candidateId);
    if (candidate?.resume) {
      window.open(candidate.resume, "_blank");
    } else {
      toast.error("Resume not available");
    }
  };

  const handleScheduleInterview = (candidateId: number) => {
    toast.info("Schedule interview clicked");
  };

  const handleViewProfile = (candidateId: number) => {
    toast.info("View profile clicked");
  };

  const handleCall = (candidateId: number) => {
    toast.info("Call candidate clicked");
  };

  const handleEditCandidate = (candidate: Candidate) => {
    console.log("Editing candidate:", candidate);
    setSelectedCandidate(candidate);
    setIsEditDrawerOpen(true);
  };

  const handleCandidateUpdated = () => {
    setIsEditDrawerOpen(false);
    setSelectedCandidate(null);
    refetch();
    toast.success("Candidate updated successfully");
  };

  if (isLoading || jobLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filteredCandidates.length === 0) {
    return <EmptyState onAddCandidate={onAddCandidate || (() => {})} />;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[300px]">Candidate Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Stage Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-center">Validate</TableHead>
              <TableHead>Resume</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{candidate.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Applied on {candidate.appliedDate}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{candidate.appliedFrom}</TableCell>
                <TableCell>{candidate.profit || "N/A"}</TableCell>
                <TableCell>
                  <div className="truncate">
                    <ProgressColumn
                      progress={candidate.progress}
                      mainStatus={candidate.main_status}
                      subStatus={candidate.sub_status}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="truncate max-w-[120px]">
                    <StatusSelector
                      value={candidate.sub_status_id || ""}
                      onChange={(value: string) => handleStatusChange(value, candidate)}
                      className="h-7 text-xs w-full"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <ValidateResumeButton
                    isValidated={candidate.hasValidatedResume || false}
                    candidateId={candidate.id}
                    onValidate={handleValidateResume}
                    isLoading={validatingId === candidate.id}
                  />
                  {analysisDataAvailable[candidate.id] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAnalysisData(candidate.id)}
                      className="mt-2"
                    >
                      View Summary Report
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <ActionButtons
                    candidateId={candidate.id}
                    onViewResume={handleViewResume}
                    onScheduleInterview={handleScheduleInterview}
                    onViewProfile={handleViewProfile}
                    onCall={handleCall}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCandidate(candidate)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedCandidate && (
        <EditCandidateDrawer
          job={{
            id: jobId,
            skills: selectedCandidate.skills.map((s) => (typeof s === "string" ? s : s.name)),
            organization_id: organizationId,
          } as any}
          onCandidateAdded={handleCandidateUpdated}
          candidate={selectedCandidate}
          open={isEditDrawerOpen}
          onOpenChange={setIsEditDrawerOpen}
        />
      )}

      {isSummaryModalOpen && analysisData && (
        <SummaryModal
          analysisData={analysisData}
          onClose={() => setIsSummaryModalOpen(false)}
        />
      )}
    </>
  );
};

export default CandidatesList;