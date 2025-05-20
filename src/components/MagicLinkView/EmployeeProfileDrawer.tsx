import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import EmployeeDataSelection, { DataSharingOptions } from "./EmployeeDataSelection";
import {
  Calendar,
  Briefcase,
  MapPin,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Share2,
  Copy,
  Mail,
  Phone,
  Award,
  MapPinPlus,
  FileBadge,
  Eye,
  Download,
  Banknote,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Candidate } from "@/lib/types";
import { FaLinkedin } from "react-icons/fa";
import { supabase } from "@/integrations/supabase/client";
import axios from 'axios';

interface EmployeeProfilePageProps {
  shareMode?: boolean;
  shareId?: string;
  sharedDataOptions?: DataSharingOptions;
}

interface DocumentState {
  value: string;
  isVerifying: boolean;
  isVerified: boolean;
  verificationDate: string | null;
  error: string | null;
  isEditing: boolean;
  isUANResultsOpen?: boolean;
  results?: Array<{
    DateOfExitEpf: string;
    Doj: string;
    EstablishmentName: string;
    MemberId: string;
    fatherOrHusbandName: string;
    name: string;
    uan: string;
    Overlapping: string;
  }>;
}

interface ResumeAnalysis {
  overall_score: number;
  matched_skills: Array<{
    requirement: string;
    matched: string;
    details: string;
  }>;
  summary: string;
  missing_or_weak_areas: string[];
  top_skills: string[];
  development_gaps: string[];
  additional_certifications: string[];
  section_wise_scoring: Array<{
    section: string;
    weightage: number;
    submenus: Array<{
      submenu: string;
      score: number;
      remarks: string;
      weightage: number;
      weighted_score: number;
    }>;
  }>;
}

interface WorkHistory {
  company_id: number;
  company_name: string;
  designation: string;
  years: string;
  overlapping?: string;
}

interface TimelineEvent {
  id: string;
  candidate_id: string;
  event_type: string;
  event_data: {
    action: string;
    timestamp: string;
    round?: string;
    interview_date?: string;
    interview_time?: string;
    interview_type?: string;
    interviewer_name?: string;
    interview_location?: string;
    interview_result?: string;
    interview_feedback?: string;
    ctc?: string;
    joining_date?: string;
  };
  previous_state: {
    subStatusId: string;
    mainStatusId: string;
    subStatusName: string;
    mainStatusName: string;
  };
  new_state: {
    subStatusId: string;
    mainStatusId: string;
    subStatusName: string;
    mainStatusName: string;
  };
  created_by: string;
  created_by_name: string;
  created_at: string;
}

interface TruthScreenResponse {
  requestData?: string;
  responseData?: string;
  error?: string;
  msg?: Array<{
    DateOfExitEpf: string;
    Doj: string;
    EstablishmentName: string;
    MemberId: string;
    fatherOrHusbandName: string;
    name: string;
    uan: string;
    Overlapping: string;
  }>;
  status?: number;
  transId?: string;
  tsTransId?: string;
}

const API_BASE_URL = "http://62.72.51.159:4001";

const dualEncryptData = async (transID: string, uan: string, employer_name: string): Promise<string> => {
  try {
    console.log('Encrypting data with:', { transID, docType: '464', uan, employer_name });
    const response = await axios.post<TruthScreenResponse>(
      `${API_BASE_URL}/api/dual/dual-encrypt`,
      {
        transID,
        docType: '464',
        uan,
        employer_name,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      console.error('Non-JSON response received:', response.data);
      throw new Error(`Invalid response format: Expected JSON, received ${contentType}`);
    }

    console.log('Dual Encryption response:', response.data);

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response format from dual encryption service');
    }
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    if (!response.data.requestData) {
      throw new Error('Missing requestData in response');
    }

    return response.data.requestData;
  } catch (error: any) {
    console.error('Dual Encryption error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    let errorMessage = 'Failed to encrypt dual employment data';
    if (error.message.includes('Network Error')) {
      errorMessage = 'Network error: Unable to reach encryption service.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

const dualVerifyData = async (requestData: string): Promise<string> => {
  try {
    console.log('Verifying data with:', { requestData });
    const response = await axios.post<TruthScreenResponse>(
      `${API_BASE_URL}/api/dual/dual-verify`,
      {
        requestData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      console.error('Non-JSON response received:', response.data);
      throw new Error(`Invalid response format: Expected JSON, received ${contentType}`);
    }

    console.log('Dual Verification response:', response.data);

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response format from verification service');
    }
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    if (!response.data.responseData) {
      throw new Error('Missing responseData in response');
    }

    return response.data.responseData;
  } catch (error: any) {
    console.error('Dual Verification error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    let errorMessage = 'Failed to verify dual employment data';
    if (error.message.includes('Network Error')) {
      errorMessage = 'Network error: Unable to reach verification service.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

const dualDecryptData = async (responseData: string): Promise<TruthScreenResponse> => {
  try {
    console.log('Decrypting data with:', { responseData });
    const response = await axios.post<TruthScreenResponse>(
      `${API_BASE_URL}/api/dual/dual-decrypt`,
      {
        responseData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      console.error('Non-JSON response received:', response.data);
      throw new Error(`Invalid response format: Expected JSON, received ${contentType}`);
    }

    console.log('Dual Decryption response:', response.data);

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response format from decryption service');
    }
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    if (!response.data.msg || response.data.status === undefined || !response.data.tsTransId) {
      throw new Error('Missing required fields (msg, status, tsTransId) in response');
    }

    // Normalize the keys in the msg array to match TruthScreenResponse interface
    const normalizedMsg = response.data.msg.map((entry: any) => ({
      DateOfExitEpf: entry.DateOfExitEpf,
      Doj: entry.Doj,
      EstablishmentName: entry['Establishment Name'] || entry.EstablishmentName,
      MemberId: entry.MemberId,
      fatherOrHusbandName: entry['father or Husband Name'] || entry.fatherOrHusbandName,
      name: entry.name,
      uan: entry.uan,
      Overlapping: entry.Overlapping,
    }));

    return {
      ...response.data,
      msg: normalizedMsg,
    };
  } catch (error: any) {
    console.error('Dual Decryption error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    let errorMessage = 'Failed to decrypt dual employment data';
    if (error.message.includes('Network Error')) {
      errorMessage = 'Network error: Unable to reach decryption service.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

const verifyDualUAN = async (transID: string, uan: string, employer_name: string, candidateId: string): Promise<TruthScreenResponse> => {
  try {
    if (!/^\d{12}$/.test(uan)) {
      throw new Error('UAN must be a 12-digit number');
    }
    if (!employer_name) {
      throw new Error('Employer name is required for dual employment check');
    }

    const requestData = await dualEncryptData(transID, uan, employer_name);
    console.log('Encrypted requestData:', requestData);
    const responseData = await dualVerifyData(requestData);
    console.log('Verified responseData:', responseData);
    const decryptedData = await dualDecryptData(responseData);
    console.log('Decrypted data:', decryptedData);

    const { error } = await supabase.from('hr_dual_uan_verifications').insert({
      candidate_id: candidateId,
      uan,
      trans_id: decryptedData.transId || transID,
      ts_trans_id: decryptedData.tsTransId,
      status: decryptedData.status,
      msg: decryptedData.msg,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error('Failed to save dual UAN verification to database: ' + error.message);
    }

    return decryptedData;
  } catch (error: any) {
    console.error('Dual UAN verification error:', error);

    await supabase.from('hr_dual_uan_verifications').insert({
      candidate_id: candidateId,
      uan,
      trans_id: transID,
      ts_trans_id: null,
      status: 0,
      msg: [],
      created_at: new Date().toISOString(),
    });

    throw new Error(error.message || 'Dual UAN verification failed');
  }
};

const EmployeeProfilePage: React.FC<EmployeeProfilePageProps> = ({
  shareMode = false,
  shareId,
  sharedDataOptions: initialSharedDataOptions,
}) => {
  const { candidateId, jobId } = useParams<{ candidateId: string; jobId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [showDataSelection, setShowDataSelection] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("resume-analysis");
  const [currentDataOptions, setCurrentDataOptions] = useState<DataSharingOptions>(
    initialSharedDataOptions || {
      personalInfo: true,
      contactInfo: true,
      documentsInfo: true,
      workInfo: true,
      skillinfo: true,
    }
  );
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sharedDataOptions, setSharedDataOptions] = useState<DataSharingOptions | undefined>(
    initialSharedDataOptions
  );
  const [documents, setDocuments] = useState<{
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  }>({
    uan: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
      isUANResultsOpen: false,
      results: [],
    },
    pan: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    pf: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    esic: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
  });
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isValidCandidate = (data: any): data is Candidate => {
    return (
      data &&
      typeof data === "object" &&
      typeof data.id === "string" &&
      typeof data.name === "string" &&
      (typeof data.experience === "string" || data.experience === undefined) &&
      (typeof data.matchScore === "number" || data.matchScore === undefined) &&
      (typeof data.appliedDate === "string" || data.appliedDate === undefined)
    );
  };

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("URL candidateId:", candidateId);
        console.log("URL jobId:", jobId);
        console.log("Location state:", location.state);

        let candidateData: Candidate | null = null;
        let uanVerificationData: any = null;

        // Fetch candidate data
        const state = location.state as { candidate?: Candidate; jobId?: string };
        if (state?.candidate && isValidCandidate(state.candidate)) {
          console.log("Setting candidate from location state:", state.candidate);
          candidateData = state.candidate;
        } else if (candidateId) {
          console.log("Fetching candidate from Supabase with ID:", candidateId);
          const { data, error } = await supabase
            .from("hr_job_candidates")
            .select("*")
            .eq("id", candidateId)
            .single();

          if (error || !data) {
            console.error("Supabase fetch error:", error);
            throw new Error("Failed to fetch candidate data: " + (error?.message || "No data found"));
          }

          if (isValidCandidate(data)) {
            console.log("Setting candidate from Supabase:", data);
            candidateData = data;
          } else {
            throw new Error("Invalid candidate data received from Supabase");
          }
        } else {
          throw new Error("No candidate data provided and no candidateId in URL");
        }

        // Fetch Dual UAN verification data for the candidate
        if (candidateData?.id) {
          console.log("Fetching Dual UAN verification data for candidateId:", candidateData.id);
          const { data: verificationData, error: verificationError } = await supabase
            .from("hr_dual_uan_verifications")
            .select("uan, created_at, msg")
            .eq("candidate_id", candidateData.id)
            .eq("status", 1)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
console.log("verificationError",verificationData)
          if (verificationError) {
            if (verificationError.code === 'PGRST116') {
              console.log("No Dual UAN verification data found for candidateId:", candidateData.id);
            } else {
              console.error("Supabase Dual UAN verification fetch error:", verificationError);
              throw new Error("Failed to fetch Dual UAN verification data: " + verificationError.message);
            }
          } else {
            console.log("Dual UAN verification data fetched:", verificationData);
            uanVerificationData = verificationData;
          }
        } else {
          console.warn("Skipping Dual UAN verification fetch: No candidate ID available");
        }

        // Set candidate and documents state
        setCandidate(candidateData);
        const uanState: DocumentState = {
          value: candidateData?.metadata?.uan || uanVerificationData?.uan || "",
          isVerifying: false,
          isVerified: !!uanVerificationData,
          verificationDate: uanVerificationData ? new Date(uanVerificationData.created_at).toLocaleString() : null,
          error: null,
          isEditing: false,
          isUANResultsOpen: !!uanVerificationData,
          results: uanVerificationData?.msg || [],
        };
        console.log("Setting documents.uan state:", uanState);

        setDocuments({
          uan: uanState,
          pan: {
            value: candidateData?.metadata?.pan || "",
            isVerifying: false,
            isVerified: false,
            verificationDate: null,
            error: null,
            isEditing: false,
          },
          pf: {
            value: candidateData?.metadata?.pf || "",
            isVerifying: false,
            isVerified: false,
            verificationDate: null,
            error: null,
            isEditing: false,
          },
          esic: {
            value: candidateData?.metadata?.esicNumber || "",
            isVerifying: false,
            isVerified: false,
            verificationDate: null,
            error: null,
            isEditing: false,
          },
        });
      } catch (err: any) {
        console.error("Error fetching candidate:", err);
        setError(err.message || "Failed to load candidate data.");
        toast({
          title: "Error",
          description: err.message || "Failed to load candidate data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [candidateId, location.state, toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (shareMode && shareId) {
          const { data, error } = await supabase
            .from("shares")
            .select("data_options, candidate")
            .eq("share_id", shareId)
            .single();

          if (error) {
            throw error;
          }

          if (data) {
            console.log("Fetched Shared Data:", data);
            if (data.data_options && typeof data.data_options === "object") {
              setSharedDataOptions(data.data_options as DataSharingOptions);
              setCurrentDataOptions(data.data_options as DataSharingOptions);
            } else {
              throw new Error("Invalid data_options format");
            }
            if (isValidCandidate(data.candidate)) {
              console.log("Setting candidate from shared data:", data.candidate);
              setCandidate(data.candidate);
              setDocuments({
                uan: {
                  value: data.candidate.metadata?.uan || "",
                  isVerifying: false,
                  isVerified: false,
                  verificationDate: null,
                  error: null,
                  isEditing: false,
                  isUANResultsOpen: false,
                  results: [],
                },
                pan: {
                  value: data.candidate.metadata?.pan || "",
                  isVerifying: false,
                  isVerified: false,
                  verificationDate: null,
                  error: null,
                  isEditing: false,
                },
                pf: {
                  value: data.candidate.metadata?.pf || "",
                  isVerifying: false,
                  isVerified: false,
                  verificationDate: null,
                  error: null,
                  isEditing: false,
                },
                esic: {
                  value: data.candidate.metadata?.esicNumber || "",
                  isVerifying: false,
                  isVerified: false,
                  verificationDate: null,
                  error: null,
                  isEditing: false,
                },
              });
            } else {
              throw new Error("Invalid candidate data");
            }
          } else {
            toast({
              title: "Error",
              description: "Shared link is invalid or expired.",
              variant: "destructive",
            });
            return;
          }
        }

        if (jobId && candidate) {
          console.log("Fetching resume analysis for candidateId:", candidate.id, "and jobId:", jobId);
          const { data: resumeData, error: resumeError } = await supabase
            .from("candidate_resume_analysis")
            .select("*")
            .eq("candidate_id", candidate.id)
            .eq("job_id", jobId)
            .single();

          if (resumeError || !resumeData) {
            console.warn("No resume analysis found for candidate and job:", resumeError?.message);
          } else {
            console.log("Resume Analysis fetched:", resumeData);
            setResumeAnalysis(resumeData as ResumeAnalysis);
          }

          console.log("Fetching work history for candidateId:", candidate.id, "and jobId:", jobId);
          const { data: workData, error: workError } = await supabase
            .from("candidate_companies")
            .select("company_id, designation, years, companies(name)")
            .eq("candidate_id", candidate.id)
            .eq("job_id", jobId);

          if (workError || !workData) {
            console.warn("No work history found for candidate and job:", workError?.message);
          } else {
            const formattedWorkHistory: WorkHistory[] = workData.map((item) => ({
              company_id: item.company_id,
              company_name: item.companies?.name || "Unknown Company",
              designation: item.designation || "-",
              years: item.years || "-",
              overlapping: "N/A",
            }));
            console.log("Work History fetched:", formattedWorkHistory);
            setWorkHistory(formattedWorkHistory);
          }
        } else {
          console.warn("Skipping resume analysis and work history fetch: jobId or candidate missing");
        }
      } catch (error: any) {
        console.error("Error fetching additional data:", error);
        toast({
          title: "Error",
          description: "Failed to load shared data, resume analysis, or work history: " + (error.message || "Unknown error"),
          variant: "destructive",
        });
      }
    };

    if (candidate && !shareMode) {
      fetchData();
    }
  }, [shareMode, shareId, jobId, candidate, sharedDataOptions, toast]);

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!candidateId || shareMode) return;

      try {
        setTimelineLoading(true);
        setTimelineError(null);

        console.log("Fetching timeline for candidateId:", candidateId);
        const { data, error } = await supabase
          .from("hr_candidate_timeline")
          .select(`
            *,
            hr_employees!fk_created_by (
              first_name,
              last_name
            )
          `)
          .eq("candidate_id", candidateId)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error("Failed to fetch timeline data: " + error.message);
        }

        if (data) {
          console.log("Timeline fetched:", data);
          const formattedTimeline: TimelineEvent[] = data.map((event: any) => ({
            ...event,
            created_by_name: event.hr_employees
              ? `${event.hr_employees.first_name} ${event.hr_employees.last_name}`
              : "Unknown",
          }));
          setTimeline(formattedTimeline);
        } else {
          setTimeline([]);
        }
      } catch (err: any) {
        console.error("Error fetching timeline:", err);
        setTimelineError(err.message || "Failed to load timeline data.");
        toast({
          title: "Error",
          description: err.message || "Failed to load timeline data.",
          variant: "destructive",
        });
      } finally {
        setTimelineLoading(false);
      }
    };

    fetchTimeline();
  }, [candidateId, shareMode, toast]);

  const normalizeSkills = (skills: any[] | undefined): string[] => {
    if (!skills || !skills.length) return ["N/A"];
    return skills.map((skill) => (typeof skill === "string" ? skill : skill?.name || "Unknown"));
  };

  const formatINR = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return isNaN(num)
      ? "N/A"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(num);
  };

  const formatTimelineDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  const getLatestEmployer = (workHistory: WorkHistory[]): string => {
    if (!workHistory.length) return "";
    const sortedHistory = [...workHistory].sort((a, b) => {
      const startYearA = parseInt(a.years.split("-")[0], 10) || 0;
      const startYearB = parseInt(b.years.split("-")[0], 10) || 0;
      return startYearB - startYearA;
    });
    return sortedHistory[0].company_name;
  };

  const employeeNormal = candidate
    ? {
        id: candidate.id || "emp001",
        name: candidate.name || "Unknown Candidate",
        role: candidate.metadata?.role || "N/A",
        department: candidate.metadata?.department || "N/A",
        joinDate: candidate.appliedDate || "N/A",
        status: candidate.status || "Applied",
        tags: candidate.metadata?.tags || ["N/A"],
        profileImage: candidate.metadata?.profileImage || "/lovable-Uploads/placeholder.png",
        email: candidate.email || "N/A",
        phone: candidate.phone || "N/A",
        location: candidate.metadata?.currentLocation || "N/A",
        skills: normalizeSkills(candidate.skills || candidate.skill_ratings),
        skillRatings: candidate.skill_ratings || [],
        experience: candidate.experience || "N/A",
        relvantExpyears: candidate.metadata?.relevantExperience || "N/A",
        relvantExpmonths: candidate.metadata?.relevantExperienceMonths || "N/A",
        preferedLocation: Array.isArray(candidate.metadata?.preferredLocations)
          ? candidate.metadata.preferredLocations.join(", ")
          : "N/A",
        resume: candidate.resume || candidate.metadata?.resume_url || "#",
        currentSalary: candidate.currentSalary || "N/A",
        expectedSalary: candidate.expectedSalary || "N/A",
        linkedInId: candidate.metadata?.linkedInId || "N/A",
        noticePeriod: candidate.metadata?.noticePeriod || "N/A",
        hasOffers: candidate.metadata?.hasOffers || "N/A",
        offerDetails: candidate.metadata?.offerDetails || "N/A",
      }
    : {
        id: "emp001",
        name: "Unknown Candidate",
        role: "N/A",
        department: "N/A",
        joinDate: "N/A",
        status: "N/A",
        tags: ["N/A"],
        profileImage: "/lovable-Uploads/placeholder.png",
        email: "N/A",
        phone: "N/A",
        location: "N/A",
        skills: ["N/A"],
        experience: "N/A",
        skillRatings: [],
        resume: "#",
        currentSalary: "N/A",
        expectedSalary: "N/A",
        linkedInId: "N/A",
        noticePeriod: "N/A",
        hasOffers: "N/A",
        offerDetails: "N/A",
      };

  const employeeShared = {
    id: shareId || "unknown",
    name: sharedDataOptions?.personalInfo && candidate?.name ? candidate.name : "Shared Employee Profile",
    role: sharedDataOptions?.personalInfo && candidate?.metadata?.role ? candidate.metadata.role : "N/A",
    department: sharedDataOptions?.personalInfo && candidate?.metadata?.department ? candidate.metadata.department : "N/A",
    joinDate: sharedDataOptions?.personalInfo && candidate?.appliedDate ? candidate.appliedDate : "N/A",
    status: "Shared",
    tags: sharedDataOptions?.personalInfo && candidate?.metadata?.tags ? candidate.metadata.tags : [],
    profileImage: sharedDataOptions?.personalInfo && candidate?.metadata?.profileImage ? candidate.metadata.profileImage : "/lovable-Uploads/placeholder.png",
    email: sharedDataOptions?.contactInfo && candidate?.email ? candidate.email : "N/A",
    phone: sharedDataOptions?.contactInfo && candidate?.phone ? candidate.phone : "N/A",
    location: sharedDataOptions?.contactInfo && candidate.metadata?.currentLocation ? candidate.metadata.currentLocation : "N/A",
    skills: sharedDataOptions?.personalInfo && candidate?.skills ? normalizeSkills(candidate.skills) : ["N/A"],
    experience: sharedDataOptions?.personalInfo && candidate?.experience ? candidate.experience : "N/A",
    relvantExpyears: sharedDataOptions?.personalInfo && candidate.metadata?.relevantExperience ? candidate.metadata.relevantExperience : "N/A",
    relvantExpmonths: sharedDataOptions?.personalInfo && candidate.metadata?.relevantExperienceMonths ? candidate.metadata.relevantExperienceMonths : "N/A",
    preferedLocation: sharedDataOptions?.personalInfo && Array.isArray(candidate.metadata?.preferredLocations)
      ? candidate.metadata.preferredLocations.join(", ")
      : "N/A",
    skillRatings: sharedDataOptions?.personalInfo && candidate?.skill_ratings ? candidate.skill_ratings : [],
    resume: sharedDataOptions?.personalInfo && (candidate?.resume || candidate?.metadata?.resume_url) ? candidate.resume || candidate.metadata.resume_url : "#",
    currentSalary: sharedDataOptions?.personalInfo && (candidate?.currentSalary ? candidate.currentSalary : "N/A"),
    expectedSalary: sharedDataOptions?.personalInfo && (candidate?.expectedSalary ? candidate.expectedSalary : "N/A"),
    linkedInId: sharedDataOptions?.contactInfo && candidate.metadata?.linkedInId ? candidate.metadata.linkedInId : "N/A",
    noticePeriod: sharedDataOptions?.personalInfo && candidate.metadata?.noticePeriod ? candidate.metadata.noticePeriod : "N/A",
    hasOffers: sharedDataOptions?.personalInfo && candidate.metadata?.hasOffers ? candidate.metadata.hasOffers : "N/A",
    offerDetails: sharedDataOptions?.personalInfo && candidate.metadata?.offerDetails ? candidate.metadata.offerDetails : "N/A",
  };

  const employee = shareMode ? employeeShared : employeeNormal;

  const documentsShared = {
    uan: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.uan ? candidate.metadata.uan : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
      isUANResultsOpen: false,
      results: [],
    },
    pan: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.pan ? candidate.metadata.pan : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    pf: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.pf ? candidate.metadata.pf : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    esic: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.esicNumber ? candidate.metadata.esicNumber : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
  };

  const handleDocumentChange = (type: keyof typeof documents, value: string) => {
    if (shareMode) return;
    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        value,
      },
    }));
  };

  const toggleEditing = (type: keyof typeof documents) => {
    if (shareMode) return;
    if (documents[type].isVerified) {
      toast({
        title: "Cannot edit verified document",
        description: "Please contact HR to update verified documents.",
        variant: "destructive",
      });
      return;
    }

    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        isEditing: !prev[type].isEditing,
      },
    }));
  };

  const toggleUANResults = () => {
    setDocuments((prev) => ({
      ...prev,
      uan: {
        ...prev.uan,
        isUANResultsOpen: !prev.uan.isUANResultsOpen,
      },
    }));
  };

  const verifyDocument = async (type: keyof typeof documents) => {
    if (shareMode) return;
    if (!documents[type].value.trim()) {
      toast({
        title: "Validation Error",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} number cannot be empty.`,
        variant: "destructive",
      });
      return;
    }

    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        isVerifying: true,
        error: null,
      },
    }));

    if (type === 'uan') {
      try {
        const transID = crypto.randomUUID ? crypto.randomUUID() : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === "x" ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        const employer_name = getLatestEmployer(workHistory);
        if (!employer_name) {
          throw new Error('No employer name available from work history');
        }
        const result = await verifyDualUAN(transID, documents.uan.value, employer_name, candidateId || '');
        console.log('Dual UAN Verification Result:', result);

        if (result.msg && result.status === 1) {
          const updatedWorkHistory = result.msg.map((entry, index) => ({
            company_id: index + 1,
            company_name: entry.EstablishmentName,
            designation: "N/A",
            years: entry.Doj + (entry.DateOfExitEpf !== "NA" ? ` - ${entry.DateOfExitEpf}` : ""),
            overlapping: entry.Overlapping,
          }));
          setWorkHistory(updatedWorkHistory);

          setDocuments((prev) => ({
            ...prev,
            uan: {
              ...prev.uan,
              isVerifying: false,
              isVerified: true,
              verificationDate: new Date().toLocaleString(),
              error: null,
              isEditing: false,
              isUANResultsOpen: true,
              results: result.msg,
            },
          }));

          toast({
            title: "Dual Employment Verification Successful",
            description: `UAN number verified successfully. Work history updated.`,
          });
        } else {
          throw new Error('Invalid Dual UAN verification response');
        }
      } catch (error: any) {
        console.error('Dual UAN Verification Failed:', error.message);
        setDocuments((prev) => ({
          ...prev,
          uan: {
            ...prev.uan,
            isVerifying: false,
            isVerified: false,
            error: error.message || 'Dual UAN verification failed. Please check the number and try again.',
            isUANResultsOpen: false,
            results: [],
          },
        }));

        toast({
          title: "Verification Failed",
          description: error.message || 'Dual UAN verification failed. Please check the number and try again.',
          variant: "destructive",
        });
      }
    } else {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.3;

        if (isSuccess) {
          setDocuments((prev) => ({
            ...prev,
            [type]: {
              ...prev[type],
              isVerifying: false,
              isVerified: true,
              verificationDate: new Date().toLocaleString(),
              error: null,
              isEditing: false,
            },
          }));

          toast({
            title: "Verification Successful",
            description: `${type.charAt(0).toUpperCase() + type.slice(1)} number has been verified successfully.`,
          });
        } else {
          setDocuments((prev) => ({
            ...prev,
            [type]: {
              ...prev[type],
              isVerifying: false,
              isVerified: false,
              error: "Verification failed. Please check the document number.",
            },
          }));

          toast({
            title: "Verification Failed",
            description: "Unable to verify document. Please check the number and try again.",
            variant: "destructive",
          });
        }
      }, 1500);
    }
  };

  const saveDocuments = async () => {
    if (shareMode || !candidateId) return;

    setIsSaving(true);

    try {
      const updatedMetadata = {
        ...candidate?.metadata,
        uan: documents.uan.value || null,
        pan: documents.pan.value || null,
        pf: documents.pf.value || null,
        esicNumber: documents.esic.value || null,
      };

      const { error } = await supabase
        .from("hr_job_candidates")
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

      if (error) {
        throw new Error("Failed to update document data: " + error.message);
      }

      setCandidate((prev) => prev ? { ...prev, metadata: updatedMetadata } : prev);

      toast({
        title: "Documents Updated",
        description: "Document numbers have been successfully updated.",
      });

      setDocuments((prev) => ({
        uan: { ...prev.uan, isEditing: false },
        pan: { ...prev.pan, isEditing: false },
        pf: { ...prev.pf, isEditing: false },
        esic: { ...prev.esic, isEditing: false },
      }));
    } catch (err: any) {
      console.error("Error saving documents:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save document data.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareClick = () => {
    if (!candidate) {
      toast({
        title: "Error",
        description: "No candidate data available to share.",
        variant: "destructive",
      });
      return;
    }
    setShowDataSelection(true);
  };

  const generateMagicLink = async (dataOptions: DataSharingOptions) => {
    if (!candidate) {
      toast({
        title: "Error",
        description: "No candidate data available to share.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    setCurrentDataOptions(dataOptions);

    try {
      const uuid = crypto.randomUUID ? crypto.randomUUID() : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      const shareId = `${uuid}-${Date.now()}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 2);

      const { error } = await supabase.from("shares").insert({
        share_id: shareId,
        expiry_date: expiryDate.getTime(),
        data_options: dataOptions,
        candidate,
      });

      if (error) {
        throw error;
      }

      const shortLink = `${window.location.origin}/share/${shareId}?expires=${expiryDate.getTime()}${jobId ? `&jobId=${jobId}` : ""}`;

      console.log("Generated Share ID:", shareId);
      console.log("Shortened Link:", shortLink);
      console.log("Data Options:", dataOptions);
      console.log("Candidate Data:", candidate);

      setMagicLink(shortLink);
      setIsSharing(false);

      toast({
        title: "Magic Link Created",
        description: "A shareable link with your selected data has been created. It will expire in 2 days.",
      });
    } catch (error) {
      console.error("Error generating magic link:", error);
      setIsSharing(false);
      toast({
        title: "Error",
        description: "Failed to create magic link.",
        variant: "destructive",
      });
    }
  };

  const copyMagicLink = () => {
    if (magicLink) {
      navigator.clipboard.writeText(magicLink);
      setIsCopied(true);

      toast({
        title: "Link Copied",
        description: "Magic link copied to clipboard.",
      });

      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const renderVerificationStatus = (doc: DocumentState) => {
    if (shareMode) return null;
    if (doc.isVerifying) {
      return (
        <div className="flex items-center text-yellow-600">
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          <span className="text-xs">Verifying...</span>
        </div>
      );
    }

    if (doc.isVerified) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircle2 className="mr-1 h-4 w-4" />
          <span className="text-xs">Verified on {doc.verificationDate}</span>
        </div>
      );
    }

    if (doc.error) {
      return (
        <div className="flex items-center text-red-600">
          <XCircle className="mr-1 h-4 w-4" />
          <span className="text-xs">{doc.error}</span>
        </div>
      );
    }

    return null;
  };

  const renderDocumentRow = (type: keyof typeof documents, label: string) => {
    const doc = documents[type];

    return (
      <div className="border rounded-lg mb-4 bg-white shadow-sm hover:shadow-md transition-shadow w-full">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center">
                <p className="text-sm font-medium">{label}</p>
                {doc.isVerified && !shareMode && (
                  <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              {doc.isEditing && !shareMode ? (
                <Input
                  value={doc.value}
                  onChange={(e) => handleDocumentChange(type, e.target.value)}
                  className="mt-1 h-8 text-sm w-full sm:w-1/2"
                />
              ) : (
                <p className="text-xs text-muted-foreground">{doc.value || "Not Provided"}</p>
              )}
              {renderVerificationStatus(doc)}
              {type === 'uan' && doc.results && doc.results.length > 0 && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleUANResults}
                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    {doc.isUANResultsOpen ? (
                      <ChevronUp className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    )}
                    {doc.isUANResultsOpen ? 'Hide Verification Details' : 'Show Verification Details'}
                  </Button>
                  {doc.isUANResultsOpen && (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Dual Employment Verification Results</h4>
                      <div className="space-y-4">
                        {doc.results.map((entry, index) => (
                          <div key={index} className="border-b pb-2">
                            <p className="text-xs font-medium">{entry.EstablishmentName}</p>
                            <p className="text-xs text-gray-600">Join Date: {entry.Doj}</p>
                            <p className="text-xs text-gray-600">Exit Date: {entry.DateOfExitEpf === 'NA' ? 'Currently Employed' : entry.DateOfExitEpf}</p>
                            <p className="text-xs text-gray-600">Overlapping: {entry.Overlapping}</p>
                            <p className="text-xs text-gray-600">Member ID: {entry.MemberId}</p>
                            <p className="text-xs text-gray-600">Name: {entry.name}</p>
                            <p className="text-xs text-gray-600">Father/Husband: {entry.fatherOrHusbandName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!shareMode && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => toggleEditing(type)}
                  variant="outline"
                  size="sm"
                  disabled={doc.isVerifying || doc.isVerified}
                  className={cn(doc.isEditing && "bg-indigo-100 text-indigo-800 hover:bg-indigo-200")}
                >
                  {doc.isEditing ? "Cancel" : "Edit"}
                </Button>
                <Button
                  onClick={() => verifyDocument(type)}
                  variant="secondary"
                  size="sm"
                  disabled={doc.isVerifying}
                  className={cn(doc.isVerified && "bg-green-100 text-green-800 hover:bg-green-200")}
                >
                  {doc.isVerifying ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : doc.isVerified && type === 'uan' ? (
                    <>
                      Reverify <CheckCircle2 className="ml-1 h-3 w-3" />
                    </>
                  ) : doc.isVerified ? (
                    <>
                      Verified <CheckCircle2 className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    <>Verify 🔍</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSkills = () => {
    if (shareMode && !sharedDataOptions?.personalInfo) return null;
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {employee.skillRatings.map((skill, index) => (
            <Badge
              key={index}
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200"
            >
              {skill.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderResumeAnalysis = () => {
    if (!resumeAnalysis) return null;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Resume Analysis</h3>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Overall Score: {resumeAnalysis.overall_score}%</p>
            <p className="text-sm text-muted-foreground mt-2">{resumeAnalysis.summary}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Top Skills</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {resumeAnalysis.top_skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Missing or Weak Areas</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {resumeAnalysis.missing_or_weak_areas.map((area, index) => (
                <Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Development Gaps</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
              {resumeAnalysis.development_gaps.map((gap, index) => (
                <li key={index}>{gap}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Certifications</p>
            {resumeAnalysis.additional_certifications.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                {resumeAnalysis.additional_certifications.map((cert, index) => (
                  <li key={index}>{cert}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No certifications listed.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Matched Skills</p>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3">Requirement</th>
                    <th scope="col" className="px-4 py-3">Matched</th>
                    <th scope="col" className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {resumeAnalysis.matched_skills.map((skill, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3">{skill.requirement}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            skill.matched === "yes" && "bg-green-50 text-green-700 border-green-200",
                            skill.matched === "partial" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                            skill.matched === "no" && "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {skill.matched}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{skill.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white shadow-sm w-full">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Section-Wise Scoring</p>
            <div className="space-y-4 mt-2">
              {resumeAnalysis.section_wise_scoring.map((section, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium">{section.section} (Weightage: {section.weightage}%)</p>
                  <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-3">Submenu</th>
                          <th scope="col" className="px-4 py-3">Score</th>
                          <th scope="col" className="px-4 py-3">Weightage</th>
                          <th scope="col" className="px-4 py-3">Weighted Score</th>
                          <th scope="col" className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.submenus.map((submenu, subIndex) => (
                          <tr key={subIndex} className="border-b">
                            <td className="px-4 py-3">{submenu.submenu}</td>
                            <td className="px-4 py-3">{submenu.score}/10</td>
                            <td className="px-4 py-3">{submenu.weightage}%</td>
                            <td className="px-4 py-3">{submenu.weighted_score.toFixed(1)}</td>
                            <td className="px-4 py-3">{submenu.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWorkHistory = () => {
    if (workHistory.length === 0) return null;

    const sortedWorkHistory = [...workHistory].sort((a, b) => {
      const startYearA = parseInt(a.years.split("-")[0], 10) || 0;
      const startYearB = parseInt(b.years.split("-")[0], 10) || 0;
      return startYearB - startYearA;
    });

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Work History</h3>
        <div className="space-y-6">
          {sortedWorkHistory.map((history, index) => {
            const [startYear, endYear] = history.years.split("-").map((year) => parseInt(year.trim(), 10) || 0);
            let hasGap = false;
            let gapText = "";

            if (index < sortedWorkHistory.length - 1) {
              const nextHistory = sortedWorkHistory[index + 1];
              const nextStartYear = parseInt(nextHistory.years.split("-")[0], 10) || 0;
              const gap = endYear && nextStartYear ? endYear - nextStartYear : 0;
              if (gap > 1) {
                hasGap = true;
                gapText = `Gap of ${gap - 1} year${gap - 1 > 1 ? "s" : ""}`;
              }
            }

            return (
              <div key={index} className="relative pl-8 pb-6">
                <div className="absolute left-0 top-0 h-full">
                  <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                  {index < sortedWorkHistory.length - 1 && (
                    <div className="absolute top-4 left-[7px] w-[2px] h-full bg-indigo-200"></div>
                  )}
                </div>
                <div>
                  <p className={cn("text-xs", hasGap ? "text-red-600" : "text-gray-500")}>
                    {history.years}
                    {hasGap && <span className="ml-2">({gapText})</span>}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{history.company_name}</p>
                  <p className="text-xs text-gray-600">{history.designation}</p>
                  <p className="text-xs text-gray-600">Overlapping: {history.overlapping}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (shareMode) return null;

    if (timelineLoading) {
      return (
        <div className="p-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
          <p className="text-sm text-gray-600 mt-2">Loading timeline...</p>
        </div>
      );
    }

    if (timelineError) {
      return (
        <div className="p-4 text-center">
          <p className="text-sm text-red-600">{timelineError}</p>
        </div>
      );
    }

    if (timeline.length === 0) {
      return (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-600">No timeline events available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {timeline.map((event, index) => (
          <div key={event.id} className="relative pl-8 pb-6">
            <div className="absolute left-0 top-0 h-full">
              <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
              {index < timeline.length - 1 && (
                <div className="absolute top-4 left-[7px] w-[2px] h-full bg-indigo-200"></div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">{formatTimelineDate(event.created_at)}</p>
              <p className="text-sm text-gray-600">
                <span className="font-bold">Main Status:</span> {event.new_state.mainStatusName}
              </p>
              <p className="text-xs font-medium text-gray-900 mt-1">
                {event.event_data.action}: {event.previous_state?.subStatusName} → {event.new_state?.subStatusName}
              </p>
              <p className="text-xs text-gray-600">
                Created by: {event.created_by_name}
              </p>
              {event.event_data.round && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Round: {event.event_data.round}</p>
                  {event.event_data.interview_date && (
                    <p>Interview Date: {event.event_data.interview_date} at {event.event_data.interview_time}</p>
                  )}
                  {event.event_data.interview_type && (
                    <p>Type: {event.event_data.interview_type}</p>
                  )}
                  {event.event_data.interviewer_name && (
                    <p>Interviewer: {event.event_data.interviewer_name}</p>
                  )}
                  {event.event_data.interview_location && (
                    <p>Location: {event.event_data.interview_location}</p>
                  )}
                  {event.event_data.interview_result && (
                    <p>
                      Result: 
                      <span className={cn(
                        event.event_data.interview_result === "selected" ? "text-green-600" : "text-red-600"
                      )}>
                        {event.event_data.interview_result}
                      </span>
                    </p>
                  )}
                  {event.event_data.interview_feedback && (
                    <p>Feedback: {event.event_data.interview_feedback}</p>
                  )}
                </div>
              )}
              {event.event_data.ctc && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>CTC: {formatINR(event.event_data.ctc)}</p>
                </div>
              )}
              {event.event_data.joining_date && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Joining Date: {event.event_data.joining_date}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResumePreview = () => {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Resume Preview</h3>
        {employee.resume !== "#" ? (
          <iframe
            src={employee.resume}
            title="Resume Preview"
            className="w-full h-[800px] border border-gray-200 rounded-lg"
          />
        ) : (
          <p className="text-sm text-gray-600">No resume available for preview.</p>
        )}
      </div>
    );
  };

  const availableTabs = [
    resumeAnalysis && "resume-analysis",
    (!shareMode || sharedDataOptions?.skillinfo) && "skill-matrix",
    workHistory.length > 0 && "work-history",
    (!shareMode || sharedDataOptions?.documentsInfo) && "documents",
    "resume",
  ].filter(Boolean) as string[];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Loading...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6 text-sm">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (shareMode && !availableTabs.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">No Data Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6 text-sm">
              No data has been selected for sharing.
            </p>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-8xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content (3/4th on lg screens) */}
            <div className="lg:w-3/4 w-full">
              <Card className="bg-white w-full">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">{employee.name}</h2>
                        <Button onClick={() => navigate(-1)} variant="outline" size="sm">
                          Back
                        </Button>
                      </div>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Applied: {employee.joinDate}</span>
                      </div>
                      {!shareMode && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            className="flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                            onClick={handleShareClick}
                            disabled={isSharing || !candidate}
                          >
                            {isSharing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Link...
                              </>
                            ) : (
                              <>
                                <Share2 className="mr-2 h-4 w-4" /> Create Shareable Magic Link
                              </>
                            )}
                          </Button>
                          {magicLink && (
                            <div className="mt-2 p-3 bg-indigo-50 rounded-md border border-indigo-100 relative">
                              <p className="text-xs text-indigo-700 mb-1 font-medium">
                                Magic Link (expires in 2 days):
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                  value={magicLink}
                                  readOnly
                                  className="text-xs bg-white border-indigo-200 w-full"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={copyMagicLink}
                                >
                                  {isCopied ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-indigo-500" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="resume"
                      size="sm"
                      className="flex items-center space-x-2 px-3 py-1"
                    >
                      <span className="text-sm font-medium">Resume</span>
                      <Separator orientation="vertical" className="h-4 bg-gray-300" />
                      <span
                        onClick={() => window.open(employee.resume, "_blank")}
                        className="cursor-pointer hover:text-gray-800"
                        title="View Resume"
                      >
                        <Eye className="w-4 h-4" />
                      </span>
                      <span
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = employee.resume;
                          link.download = `${employee.name}_Resume.pdf`;
                          link.click();
                          toast({
                            title: "Resume Download Started",
                            description: "The resume is being downloaded.",
                          });
                        }}
                        className="cursor-pointer hover:text-gray-800"
                        title="Download Resume"
                      >
                        <Download className="w-4 h-4" />
                      </span>
                    </Button>
                  </div>

                  {(!shareMode || sharedDataOptions?.personalInfo || sharedDataOptions?.contactInfo) && (
                    <div className="mt-6">
                      <Card className="border border-gray-200 bg-white shadow-sm w-full">
                        <CardContent className="p-4">
                          <div className="flex flex-col space-y-4">
                            {(!shareMode || sharedDataOptions?.contactInfo) && (
                              <div className="flex flex-col sm:flex-row items-start sm:items-center text-sm space-y-2 sm:space-y-0 sm:space-x-4">
                                <div className="flex items-center">
                                  <Mail className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="text-gray-600">{employee.email}</span>
                                  <Button
                                    variant="copyicon"
                                    size="xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(employee.email);
                                      toast({
                                        title: "Email Copied",
                                        description: "Email address copied to clipboard.",
                                      });
                                    }}
                                    className="ml-2 text-indigo-500 hover:text-indigo-700"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="flex items-center">
                                  <Phone className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="text-gray-600">{employee.phone}</span>
                                  <Button
                                    variant="copyicon"
                                    size="xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(employee.phone);
                                      toast({
                                        title: "Phone Copied",
                                        description: "Phone number copied to clipboard.",
                                      });
                                    }}
                                    className="ml-2 text-indigo-500 hover:text-indigo-700"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="flex items-center">
                                  {employee.linkedInId !== "N/A" ? (
                                    <a
                                      href={employee.linkedInId}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-500 hover:text-indigo-700"
                                    >
                                      <FaLinkedin className="w-6 h-6" />
                                    </a>
                                  ) : (
                                    <FaLinkedin className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            )}
                            {(!shareMode || sharedDataOptions?.personalInfo) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
                                <div className="flex items-center">
                                  <FileBadge className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Total Experience</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">{employee.experience}</span>
                                </div>
                                <div className="flex items-center">
                                  <Award className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Relevant Experience</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">
                                    {employee.relvantExpyears} years and {employee.relvantExpmonths} months
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Current Location</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">{employee.location}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPinPlus className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Preferred Location</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">{employee.preferedLocation}</span>
                                </div>
                                <div className="flex items-center">
                                  <Banknote className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Current Salary</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">{formatINR(employee.currentSalary)} LPA</span>
                                </div>
                                <div className="flex items-center">
                                  <Banknote className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Expected Salary</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">{formatINR(employee.expectedSalary)} LPA</span>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Notice Period</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">{employee.noticePeriod} days</span>
                                </div>
                                <div className="flex items-center">
                                  <Briefcase className="w-4 h-4 mr-2 text-indigo-500" />
                                  <span className="font-medium text-gray-700">Has Offers</span>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <span className="text-gray-600">{employee.hasOffers}</span>
                                </div>
                                {employee.hasOffers === "Yes" && (
                                  <div className="flex items-center col-span-1 sm:col-span-2">
                                    <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                                    <span className="font-medium text-gray-700">Offer Details</span>
                                    <span className="mx-2 text-gray-300">•</span>
                                    <span className="text-gray-600">{employee.offerDetails}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      {(!shareMode || sharedDataOptions?.personalInfo) && renderSkills()}
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="resume-analysis" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
                      {availableTabs.map((tab) => (
                        <TabsTrigger key={tab} value={tab} className="flex-1 min-w-[100px] text-xs sm:text-sm sm:min-w-[120px]">
                          {tab === "resume-analysis" && "Resume Analysis"}
                          {tab === "skill-matrix" && "Skill Matrix"}
                          {tab === "work-history" && "Work History"}
                          {tab === "documents" && "Documents"}
                          {tab === "resume" && "Resume"}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {resumeAnalysis && (
                      <TabsContent value="resume-analysis">
                        {renderResumeAnalysis()}
                      </TabsContent>
                    )}

                    {(!shareMode || sharedDataOptions?.skillinfo) && (
                      <TabsContent value="skill-matrix">
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium mb-4">Skill Matrix</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {employee.skillRatings.map((skill, index) => (
                              <div
                                key={index}
                                className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                  <p className="text-sm font-medium">{skill.name}</p>
                                  {skill.experienceYears !== undefined && skill.experienceMonths !== undefined && (
                                    <span className="text-xs text-gray-500 mt-1 sm:mt-0">
                                      {`${skill.experienceYears}.${skill.experienceMonths} years`}
                                    </span>
                                  )}
                                  <div className="flex mt-2 sm:mt-0">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <svg
                                        key={star}
                                        className={cn(
                                          "w-5 h-5",
                                          star <= skill.rating ? "text-yellow-400" : "text-gray-300"
                                        )}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    )}

                    {workHistory.length > 0 && (
                      <TabsContent value="work-history">
                        {renderWorkHistory()}
                      </TabsContent>
                    )}

                    {(!shareMode || sharedDataOptions?.documentsInfo) && (
                      <TabsContent value="documents">
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Verification Documents</h3>
                            {!shareMode && (
                              <Button
                                onClick={saveDocuments}
                                variant="secondary"
                                size="sm"
                                disabled={isSaving || !Object.values(documents).some(doc => doc.isEditing)}
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save Changes"
                                )}
                              </Button>
                            )}
                          </div>
                          {renderDocumentRow("uan", "UAN Number")}
                          {renderDocumentRow("pan", "PAN Number")}
                          {renderDocumentRow("pf", "PF Number")}
                          {renderDocumentRow("esic", "ESIC Number")}
                        </div>
                      </TabsContent>
                    )}

                    <TabsContent value="resume">
                      {renderResumePreview()}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Timeline (1/4th on lg screens) */}
            <div className="lg:w-1/4 w-full">
              <Card className="bg-white sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Candidate Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderTimeline()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {!shareMode && (
        <EmployeeDataSelection
          open={showDataSelection}
          onClose={() => setShowDataSelection(false)}
          onConfirm={generateMagicLink}
          defaultOptions={currentDataOptions}
        />
      )}
    </>
  );
};

export default EmployeeProfilePage;

// 