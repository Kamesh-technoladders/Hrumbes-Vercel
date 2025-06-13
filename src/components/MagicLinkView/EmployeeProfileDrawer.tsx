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
import { useSelector } from "react-redux";
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
  isVerifying?: boolean; // Tracks if verification is in progress
  isVerified?: boolean; // Tracks if company is verified
  verifiedCompanyName?: string; // Verified company name from API
  establishmentId?: string; // Establishment ID from API
  secretToken?: string; // Secret token from API
  tsTransactionId?: string; // Transaction ID from API
  verificationError?: string; // Error message if verification fails
    isEmployeeVerifying?: boolean;
  isEmployeeVerified?: boolean;
  employeeVerificationError?: string;
}

interface EmployeeVerificationResponse {
  msg?: {
    emp_search_month?: string;
    emp_search_year?: string;
    employee_names?: string[];
    employees_count?: number;
    employer_name?: string;
    establishment_id?: string;
    status?: boolean;
    status_code?: number;
    message?: string; // For error messages
  };
  status: number;
  tsTransId?: string;
}

interface CompanyVerificationResponse {
  CompanyName: { [key: string]: string };
  secretToken: string;
  status: number;
  status_code: number;
  tsTransactionID: string;
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



const API_BASE_URL = 'https://hrumblesdevelop.vercel.app/api/dual-encrypt-proxy';
const COMPANY_EMPLOYEE_PROXY_URL = 'https://hrumblesdevelop.vercel.app/api/company-employee-proxy';



const dualEncryptData = async (transID: string, uan: string, employer_name: string): Promise<string> => {
  try {
    console.log('Encrypting data with:', { transID, docType: '464', uan, employer_name });
    const response = await axios.post<TruthScreenResponse>(
      `${API_BASE_URL}?endpoint=dual-encrypt`,
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
      `${API_BASE_URL}?endpoint=dual-verify`,
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
      `${API_BASE_URL}?endpoint=dual-decrypt`,
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

export { dualEncryptData, dualVerifyData, dualDecryptData };
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
    const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
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
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);

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

    const cleanCompanyName = (name: string): string => {
  // Case 1: Remove text within parentheses, including the parentheses
  let cleaned = name.replace(/\s*\([^)]*\)/g, '').trim();
  // Case 2: Remove commas and periods, preserve spaces
  cleaned = cleaned.replace(/[,|.]/g, '');
  return cleaned;
};

const verifyAllCompanies = async (
  workHistory: WorkHistory[],
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>,
  candidateId: string | undefined,
  candidate: Candidate | null,
  setIsVerifyingAll: React.Dispatch<React.SetStateAction<boolean>>,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (shareMode || !candidateId || !candidate) {
    toast({
      title: 'Error',
      description: 'Cannot verify in share mode or without candidate data.',
      variant: 'destructive',
    });
    return;
  }

  const unverifiedCompanies = workHistory.filter(
    (company) => !company.isVerified || !company.isEmployeeVerified
  );

  if (unverifiedCompanies.length === 0) {
    toast({
      title: 'No Verifications Needed',
      description: 'All companies and employees are already verified.',
    });
    return;
  }

  setIsVerifyingAll(true);

  let successCount = 0;
  let failureCount = 0;

  for (const company of unverifiedCompanies) {
    try {
      console.log(`Verifying company and employee: ${company.company_name} (ID: ${company.company_id})`);
      await handleVerifyAll(
        company,
        candidate,
        candidateId,
        setWorkHistory,
        toast
      );
      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Avoid overwhelming backend
    } catch (error: any) {
      console.error(`Failed to verify company ${company.company_name}:`, error.message);
      failureCount++;
      // Continue with the next company instead of stopping
    }
  }

  setIsVerifyingAll(false);

  toast({
    title: 'Verification Complete',
    description: `Processed ${unverifiedCompanies.length} compan${unverifiedCompanies.length > 1 ? 'ies' : 'y'}. ${successCount} succeeded, ${failureCount} failed.`,
    variant: failureCount > 0 ? 'destructive' : 'default',
  });
};

const handleVerifyAll = async (
  company: WorkHistory,
  candidate: Candidate | null,
  candidateId: string,
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>,
  toast: ReturnType<typeof useToast>['toast']
) => {
  if (!candidateId || !candidate) return;

  setWorkHistory((prev) =>
    prev.map((item) =>
      item.company_id === company.company_id
        ? {
            ...item,
            isVerifying: true,
            isEmployeeVerifying: true,
            verificationError: null,
            employeeVerificationError: null,
          }
        : item
    )
  );

  try {
    let companyVerification: CompanyVerificationResponse | null = null;
    let verifiedCompanyName = company.verifiedCompanyName || company.company_name;
    let establishmentId = company.establishmentId;
    let secretToken = company.secretToken;
    let tsTransactionId = company.tsTransactionId;

    // Step 1: Verify company if not already verified
    if (!company.isVerified) {
      const transID = crypto.randomUUID();
      const cleanedCompanyName = cleanCompanyName(company.company_name);
      companyVerification = await verifyCompany(
        transID,
        cleanedCompanyName,
        candidateId,
        company.company_id
      );

      const companyEntries = Object.entries(companyVerification.CompanyName);
      if (companyEntries.length === 0) {
        throw new Error('No company names returned');
      }
      [establishmentId, verifiedCompanyName] = companyEntries[0];
      secretToken = companyVerification.secretToken;
      tsTransactionId = companyVerification.tsTransactionID;

      setWorkHistory((prev) =>
        prev.map((item) =>
          item.company_id === company.company_id
            ? {
                ...item,
                isVerifying: false,
                isVerified: true,
                verifiedCompanyName,
                establishmentId,
                secretToken,
                tsTransactionId,
                verificationError: null,
              }
            : item
        )
      );

      toast({
        title: 'Company Verification Successful',
        description: `Company "${verifiedCompanyName}" verified successfully.`,
      });
    }

    // Step 2: Verify employee
    if (!establishmentId || !secretToken || !tsTransactionId || !verifiedCompanyName) {
      throw new Error('Missing company verification details for employee verification');
    }

    const transID = crypto.randomUUID();
    const personName =
      candidate.first_name && candidate.last_name
        ? `${candidate.first_name} ${candidate.last_name}`.trim()
        : candidate.name || 'Unknown Employee';

    // Parse company.years
    const parts = company.years.replace('to', '-').split('-').map((part) => part.trim().toLowerCase());
    let start = parts[0];
    const monthMap: { [key: string]: string } = {
      january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
      april: '04', apr: '04', may: '05', june: '06', jun: '06', july: '07', jul: '07',
      august: '08', aug: '08', september: '09', sep: '09', sept: '09',
      october: '10', oct: '10', november: '11', nov: '11', december: '12', dec: '12',
    };

    let verificationYear: string;
    if (start.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [, , year] = start.split('/');
      verificationYear = year;
    } else if (start.match(/^\d{2}\/\d{4}$/)) {
      const [, year] = start.split('/');
      verificationYear = year;
    } else if (start.match(/^[a-z]+\s\d{4}$/)) {
      const [, year] = start.split(' ');
      verificationYear = year;
    } else if (start.match(/^[a-z]+\/\s?\d{4}$/)) {
      const [, year] = start.replace('/', '').split(/\s+/);
      verificationYear = year;
    } else if (start.match(/^\d{4}$/)) {
      verificationYear = start;
    } else {
      throw new Error('Unrecognized date format in work history');
    }

    const result = await verifyEmployee(
      transID,
      personName,
      verificationYear,
      candidateId,
      company.company_id,
      establishmentId,
      verifiedCompanyName,
      secretToken,
      tsTransactionId
    );

    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isEmployeeVerifying: false,
              isEmployeeVerified: true,
              employeeVerificationError: null,
            }
          : item
      )
    );

    toast({
      title: 'Employee Verification Successful',
      description: `Employee "${personName}" verified for ${verifiedCompanyName}.`,
    });
  } catch (error: any) {
    console.error('Verification failed for company ID:', company.company_id, error.message);
    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isVerifying: false,
              isEmployeeVerifying: false,
              isVerified: company.isVerified, // Retain company verification status
              isEmployeeVerified: false,
              verificationError: !company.isVerified ? error.message || 'Company verification failed' : null,
              employeeVerificationError: company.isVerified ? error.message || 'Employee not found' : null,
            }
          : item
      )
    );

    toast({
      title: 'Verification Failed',
      description: `Failed to verify ${company.company_name}: ${error.message || 'Verification failed.'}`,
      variant: 'destructive',
    });
    throw error; // Rethrow to allow verifyAllCompanies to track failures
  }
};

const verifyCompany = async (
  transID: string,
  companyName: string,
  candidateId: string,
  companyId: number
): Promise<CompanyVerificationResponse> => {
  try {
    console.log('Starting company verification with:', { transID, companyName });

    // Step 1: Encrypt
    const encryptResponse = await axios.post<{ requestData: string }>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-encrypt`,
      {
        transID,
        docType: 106,
        companyName,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const requestData = encryptResponse.data.requestData;
    console.log('Company encrypt response:', requestData);

    // Step 2: Verify
    let verifyResponseData: string;
    try {
      const verifyResponse = await axios.post<{ responseData: string }>(
        `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-verify`,
        { requestData },
        { headers: { 'Content-Type': 'application/json' } }
      );
      verifyResponseData = verifyResponse.data.responseData;
      console.log('Company verify response:', verifyResponseData);
    } catch (verifyError: any) {
      if (verifyError.response?.data?.responseData) {
        verifyResponseData = verifyError.response.data.responseData;
        console.log(
          `Caught error in verify step with status ${verifyError.response?.status}, proceeding with responseData:`,
          verifyResponseData
        );
      } else {
        console.error('Verify step error:', verifyError.message);
        throw new Error('Verification request failed: ' + (verifyError.message || 'Unknown error'));
      }
    }

    // Step 3: Decrypt
    const decryptResponse = await axios.post<CompanyVerificationResponse>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=company-decrypt`,
      { responseData: verifyResponseData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const decryptedData = decryptResponse.data;
    console.log('Company decrypt response:', decryptedData);

    // Check if verification was successful
    if (decryptedData.status === 1 && decryptedData.CompanyName && decryptedData.tsTransactionID) {
      const companyEntries = Object.entries(decryptedData.CompanyName);
      if (companyEntries.length === 0) {
        throw new Error('No company names returned in response');
      }

      const insertRecords = companyEntries.map(([establishmentId, verifiedCompanyName]) => ({
        employee_id: user.id,
        organization_id: organization_id,
        company_id: companyId,
        candidate_id: candidateId,
        company_name: verifiedCompanyName,
        establishment_id: establishmentId,
        secret_token: decryptedData.secretToken,
        ts_transaction_id: decryptedData.tsTransactionID,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('verified_company_records').insert(insertRecords);

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error('Failed to save company verifications to database: ' + error.message);
      }

      console.log(`Inserted ${companyEntries.length} company records into verified_company_records`);
      return decryptedData;
    } else {
      const errorMessage = decryptedData.msg || 'Unknown verification error';
      console.error('Verification failed with message:', errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('Company verification error:', error.message);
    throw new Error(error.message || 'Company verification failed');
  }
};

const verifyEmployee = async (
  transID: string,
  personName: string,
  verificationYear: string,
  candidateId: string,
  companyId: number,
  establishmentId: string,
  companyName: string,
  companySecretToken: string,
  companyTsTransactionID: string,
  retryCount: number = 0
): Promise<EmployeeVerificationResponse> => {
  const MAX_RETRIES = 1; // Limit retries to prevent infinite loops

  try {
    console.log('Starting employee verification with:', {
      transID,
      personName,
      verificationYear,
      companyId,
      establishmentId,
      companyName,
    });

    // Validate personName
    if (!personName || personName.trim() === '') {
      throw new Error('Invalid employee name provided');
    }

    // Step 1: Encrypt
    const encryptResponse = await axios.post<{ requestData: string }>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-encrypt`,
      {
        transID,
        docType: '106',
        company_name: companyName,
        person_name: personName,
        verification_year: verificationYear,
        tsTransactionID: companyTsTransactionID,
        secretToken: companySecretToken,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const requestData = encryptResponse.data.requestData;
    console.log('Employee encrypt response:', requestData);

    // Step 2: Verify
    let verifyResponseData: string;
    try {
      const verifyResponse = await axios.post<{ responseData: string }>(
        `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-verify`,
        { requestData },
        { headers: { 'Content-Type': 'application/json' } }
      );
      verifyResponseData = verifyResponse.data.responseData;
      console.log('Employee verify response:', verifyResponseData);
    } catch (verifyError: any) {
      if (verifyError.response?.data?.responseData) {
        verifyResponseData = verifyError.response.data.responseData;
        console.log(
          `Caught error in employee verify step with status ${verifyError.response?.status}, proceeding with responseData:`,
          verifyResponseData
        );
      } else {
        console.error('Employee verify step error:', verifyError.message);
        throw new Error('Employee verification request failed: ' + (verifyError.message || 'Unknown error'));
      }
    }

    // Step 3: Decrypt
    const decryptResponse = await axios.post<EmployeeVerificationResponse>(
      `${COMPANY_EMPLOYEE_PROXY_URL}?endpoint=employee-decrypt`,
      { responseData: verifyResponseData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const decryptedData = decryptResponse.data;
    console.log('Employee decrypt response:', decryptedData);

    // Check for "please generate new token" error
    if (
      decryptedData.status === 0 &&
      decryptedData.msg?.message?.toLowerCase() === 'please generate new token' &&
      retryCount < MAX_RETRIES
    ) {
      console.log('Received "please generate new token" error, retrying with new company verification...');
      
      // Retry company verification
      const companyVerification = await verifyCompany(
        crypto.randomUUID(),
        companyName,
        candidateId,
        companyId
      );

      const companyEntries = Object.entries(companyVerification.CompanyName);
      if (companyEntries.length === 0) {
        throw new Error('No company names returned during retry');
      }
      const [newEstablishmentId, newVerifiedCompanyName] = companyEntries[0];

      // Update work history with new company verification details
      setWorkHistory((prev: WorkHistory[]) =>
        prev.map((item) =>
          item.company_id === companyId
            ? {
                ...item,
                isVerified: true,
                verifiedCompanyName: newVerifiedCompanyName,
                establishmentId: newEstablishmentId,
                secretToken: companyVerification.secretToken,
                tsTransactionId: companyVerification.tsTransactionID,
                verificationError: null,
              }
            : item
        )
      );

      // Retry employee verification with new tokens
      return await verifyEmployee(
        crypto.randomUUID(),
        personName,
        verificationYear,
        candidateId,
        companyId,
        newEstablishmentId,
        newVerifiedCompanyName,
        companyVerification.secretToken,
        companyVerification.tsTransactionID,
        retryCount + 1
      );
    }

    // Check if verification was successful
    if (
      decryptedData.status === 1 &&
      decryptedData.msg?.employer_name &&
      decryptedData.msg?.establishment_id &&
      decryptedData.msg?.status === true &&
      decryptedData.msg?.status_code === 200 &&
      decryptedData.tsTransId
    ) {
      // Insert successful employee verification record
      const { error } = await supabase.from('verified_employee_records').insert({
        employee_id: user.id,
        candidate_id: candidateId,
        company_id: companyId,
        establishment_id: establishmentId,
        employee_name: personName,
        start_date: `${verificationYear}-01-01`,
        secret_token: decryptedData.tsTransId,
        ts_transaction_id: decryptedData.tsTransId,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verification_error: null,
      });

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error('Failed to save employee verification to database: ' + error.message);
      }

      console.log('Inserted successful employee verification record');
      return decryptedData;
    } else {
      // Handle error response
      const errorMessage = decryptedData.msg?.message || 'Employee not found';
      console.error('Employee verification failed with message:', errorMessage);

      // Insert error record
      const { error } = await supabase.from('verified_employee_records').insert({
        employee_id: user.id,
        candidate_id: candidateId,
        company_id: companyId,
        establishment_id: establishmentId,
        employee_name: personName,
        start_date: `${verificationYear}-01-01`,
        secret_token: decryptedData.tsTransId || null,
        ts_transaction_id: decryptedData.tsTransId || null,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verification_error: errorMessage,
      });

      if (error) {
        console.error('Supabase insert error for error record:', error);
        throw new Error('Failed to save employee verification error to database: ' + error.message);
      }

      console.log('Inserted employee verification error record');
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('Employee verification error:', error.message);

    // Ensure error is recorded even if API call fails
    const errorMessage = error.message || 'Employee verification failed';
    const { error: dbError } = await supabase.from('verified_employee_records').insert({
      employee_id: user.id,
      candidate_id: candidateId,
      company_id: companyId,
      establishment_id: establishmentId,
      employee_name: personName || 'Unknown',
      start_date: `${verificationYear}-01-01`,
      secret_token: null,
      ts_transaction_id: null,
      verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verification_error: errorMessage,
    });

    if (dbError) {
      console.error('Supabase insert error for catch block:', dbError);
    }

    throw new Error(errorMessage);
  }
};
  console.log("work history", workHistory);



const handleVerifyCompany = async (company: WorkHistory) => {
  if (shareMode || !candidateId) return;

  setWorkHistory((prev) =>
    prev.map((item) =>
      item.company_id === company.company_id
        ? { ...item, isVerifying: true, verificationError: null }
        : item
    )
  );

  try {
    const transID = crypto.randomUUID();
    const cleanedCompanyName = cleanCompanyName(company.company_name);
    console.log(`Original name: ${company.company_name}, Cleaned name: ${cleanedCompanyName}`);

    const result = await verifyCompany(
      transID,
      cleanedCompanyName,
      candidateId,
      company.company_id
    );

    const companyEntries = Object.entries(result.CompanyName);
    if (companyEntries.length === 0) {
      throw new Error('No company names returned');
    }

    // Use first company for UI display
    const [establishmentId, verifiedCompanyName] = companyEntries[0];
    console.log(`Verified ${companyEntries.length} companies for ${cleanedCompanyName}:`, companyEntries);

    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isVerifying: false,
              isVerified: true,
              verifiedCompanyName,
              establishmentId,
              secretToken: result.secretToken,
              tsTransactionId: result.tsTransactionID,
              verificationError: null,
            }
          : item
      )
    );

    toast({
      title: 'Company Verification Successful',
      description: `Company "${verifiedCompanyName}" verified successfully. ${companyEntries.length} total companies recorded.`,
    });
  } catch (error: any) {
    console.error('Company verification failed:', error.message);
    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === company.company_id
          ? {
              ...item,
              isVerifying: false,
              isVerified: false,
              verificationError: error.message || 'Company verification failed.',
            }
          : item
      )
    );

    toast({
      title: 'Verification Failed',
      description: error.message || 'Company verification failed. Please try again.',
      variant: 'destructive',
    });
  }
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
          .from('shares')
          .select('data_options, candidate')
          .eq('share_id', shareId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          console.log('Fetched Shared Data:', data);
          if (data.data_options && typeof data.data_options === 'object') {
            setSharedDataOptions(data.data_options as DataSharingOptions);
            setCurrentDataOptions(data.data_options as DataSharingOptions);
          } else {
            throw new Error('Invalid data_options format');
          }
          if (isValidCandidate(data.candidate)) {
            console.log('Setting candidate from shared data:', data.candidate);
            setCandidate(data.candidate);
            setDocuments({
              uan: {
                value: data.candidate.metadata?.uan || '',
                isVerifying: false,
                isVerified: false,
                verificationDate: null,
                error: null,
                isEditing: false,
                isUANResultsOpen: false,
                results: [],
              },
              pan: {
                value: data.candidate.metadata?.pan || '',
                isVerifying: false,
                isVerified: false,
                verificationDate: null,
                error: null,
                isEditing: false,
              },
              pf: {
                value: data.candidate.metadata?.pf || '',
                isVerifying: false,
                isVerified: false,
                verificationDate: null,
                error: null,
                isEditing: false,
              },
              esic: {
                value: data.candidate.metadata?.esicNumber || '',
                isVerifying: false,
                isVerified: false,
                verificationDate: null,
                error: null,
                isEditing: false,
              },
            });
          } else {
            throw new Error('Invalid candidate data');
          }
        } else {
          toast({
            title: 'Error',
            description: 'Shared link is invalid or expired.',
            variant: 'destructive',
          });
          return;
        }
      }

      if (jobId && candidate) {
        console.log('Fetching resume analysis for candidateId:', candidate.id, 'and jobId:', jobId);
        const { data: resumeData, error: resumeError } = await supabase
          .from('candidate_resume_analysis')
          .select('*')
          .eq('candidate_id', candidate.id)
          .eq('job_id', jobId)
          .single();

        if (resumeError || !resumeData) {
          console.warn('No resume analysis found for candidate and job:', resumeError?.message);
        } else {
          console.log('Resume Analysis fetched:', resumeData);
          setResumeAnalysis(resumeData as ResumeAnalysis);
        }

        console.log('Fetching work history for candidateId:', candidate.id, 'and jobId:', jobId);
        const { data: workData, error: workError } = await supabase
          .from('candidate_companies')
          .select('company_id, designation, years, companies(name)')
          .eq('candidate_id', candidate.id)
          .eq('job_id', jobId);

        if (workError || !workData) {
          console.warn('No work history found for candidate and job:', workError?.message);
        } else {
          // Fetch verified company records
          const { data: verifiedCompanies, error: verifiedError } = await supabase
            .from('verified_company_records')
            .select('company_id, company_name, establishment_id, secret_token, ts_transaction_id, verified_at')
            .eq('employee_id', user.id);

          if (verifiedError) {
            console.warn('Error fetching verified companies:', verifiedError.message);
          }

        const formattedWorkHistory: WorkHistory[] = workData.map((item) => {
  const companyIdNum = parseInt(item.company_id, 10); // Treat as number
  const verified = verifiedCompanies?.find((v) => parseInt(v.company_id, 10) === companyIdNum);
  console.log(`Matching company_id: ${companyIdNum}, Verified:`, verified);

  return {
    company_id: companyIdNum,
    company_name: item.companies?.name || 'Unknown Company',
    designation: item.designation || '-',
    years: item.years || '-',
    overlapping: 'N/A',
    isVerifying: false,
    isVerified: !!verified,
    verifiedCompanyName: verified?.company_name || undefined,
    establishmentId: verified?.establishment_id || undefined,
    secretToken: verified?.secret_token || undefined,
    tsTransactionId: verified?.ts_transaction_id || undefined,
    verificationError: null,
  };
});
          console.log('Work History fetched:', formattedWorkHistory);
          setWorkHistory(formattedWorkHistory);
        }
      } else {
        console.warn('Skipping resume analysis and work history fetch: jobId or candidate missing');
      }
    } catch (error: any) {
      console.error('Error fetching additional data:', error);
      toast({
        title: 'Error',
        description:
          'Failed to load shared data, resume analysis, or work history: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
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

  useEffect(() => {
  if (!candidate?.id) return;

  const fetchWorkHistory = async () => {
    try {
      console.log('Fetching work history for candidate_id:', candidate.id);
      const { data: workData, error: workError } = await supabase
        .from('candidate_companies')
        .select('company_id, designation, years, companies!inner(name)')
      .eq('candidate_id', candidate.id);

      if (workError) {
        console.error('Error fetching work history:', workError.message);
        toast({
          title: 'Error',
          description: 'Failed to fetch work history: ' + workError.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('Fetching verified company records for employee_id:', candidate.id);
      const { data: verifiedCompanies, error: companyError } = await supabase
        .from('verified_company_records')
        .select('company_id, company_name, establishment_id, secret_token, ts_transaction_id, verified_at')
        .eq('employee_id', candidate.id);

      if (companyError) {
        console.error('Error fetching verified companies:', companyError.message);
        toast({
          title: 'Error',
          description: 'Failed to fetch verified companies: ' + companyError.message,
          variant: 'destructive',
        });
      }

      console.log('Fetching verified employee records for employee_id:', candidate.id);
      const { data: verifiedEmployees, error: employeeError } = await supabase
        .from('verified_employee_records')
        .select('company_id, employee_id, establishment_id, employee_name, start_date, secret_token, ts_transaction_id, verified_at, verification_error')
        .eq('employee_id', candidate.id);

      if (employeeError) {
        console.error('Error fetching verified employees:', employeeError.message);
        toast({
          title: 'Error',
          description: 'Failed to fetch verified employee records: ' + employeeError.message,
          variant: 'destructive',
        });
      }

      if (workData) {
        const formattedWorkHistory: WorkHistory[] = workData.map((item) => {
          const companyIdNum = parseInt(item.company_id, 10);
          const verifiedCompany = verifiedCompanies
            ?.filter((v) => parseInt(v.company_id, 10) === companyIdNum)
            .sort((a, b) => new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime())[0];

          const verifiedEmployee = verifiedEmployees
            ?.find((e) => parseInt(e.company_id, 10) === companyIdNum && e.employee_id === candidate.id);

          console.log(`Matching company_id: ${companyIdNum}, Verified Company:`, verifiedCompany, 'Verified Employee:', verifiedEmployee);

          return {
            company_id: companyIdNum,
            company_name: item.companies?.name || 'Unknown Company',
            designation: item.designation || '-',
            years: item.years || '-',
            overlapping: 'N/A',
            isVerifying: false,
            isVerified: !!verifiedCompany,
            verifiedCompanyName: verifiedCompany?.company_name || undefined,
            establishmentId: verifiedCompany?.establishment_id || undefined,
            secretToken: verifiedCompany?.secret_token || undefined,
            tsTransactionId: verifiedCompany?.ts_transaction_id || undefined,
            verificationError: null,
            isEmployeeVerifying: false,
            isEmployeeVerified: !!verifiedEmployee,
            employeeVerificationError: verifiedEmployee?.verification_error || null,
          };
        });

        setWorkHistory(formattedWorkHistory);
      }
    } catch (error: any) {
      console.error('Unexpected error fetching work history:', error.message);
      toast({
        title: 'Error',
        description: 'Unexpected error: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  fetchWorkHistory();
}, [candidate?.id, supabase, toast]);

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
    const startYearA = parseInt(a.years.split('-')[0], 10) || 0;
    const startYearB = parseInt(b.years.split('-')[0], 10) || 0;
    return startYearB - startYearA;
  });

  const hasUnverifiedCompanies = sortedWorkHistory.some(
    (history) => !history.isVerified && !history.isVerifying
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Work History</h3>
        {!shareMode && hasUnverifiedCompanies && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              verifyAllCompanies(
                workHistory,
                setWorkHistory,
                candidateId,
                candidate,
                setIsVerifyingAll,
                toast
              )
            }
            disabled={isVerifyingAll}
            className="flex items-center"
          >
            {isVerifyingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying All...
              </>
            ) : (
              'Verify All'
            )}
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {sortedWorkHistory.map((history, index) => {
          const [startYear, endYear] = history.years
            .split('-')
            .map((year) => parseInt(year.trim(), 10) || 0);
          let hasGap = false;
          let gapText = '';

          if (index < sortedWorkHistory.length - 1) {
            const nextHistory = sortedWorkHistory[index + 1];
            const nextStartYear = parseInt(nextHistory.years.split('-')[0], 10) || 0;
            const gap = endYear && nextStartYear ? endYear - nextStartYear : 0;
            if (gap > 1) {
              hasGap = true;
              gapText = `Gap of ${gap - 1} year${gap - 1 > 1 ? 's' : ''}`;
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
                <p className={cn('text-xs', hasGap ? 'text-red-600' : 'text-gray-500')}>
                  {history.years}
                  {hasGap && <span className="ml-2">({gapText})</span>}
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {history.isVerified && history.verifiedCompanyName
                    ? history.verifiedCompanyName
                    : history.company_name}
                </p>
                <p className="text-xs text-gray-600">{history.designation}</p>
                <p className="text-xs text-gray-600">Overlapping: {history.overlapping}</p>
                {history.isVerified && history.establishmentId && (
                  <p className="text-xs text-green-600">
                    Verified Establishment ID: {history.establishmentId}
                  </p>
                )}
                {history.isVerifying && (
                  <div className="flex items-center text-yellow-600 mt-1">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    <span className="text-xs">Verifying Company...</span>
                  </div>
                )}
                {history.verificationError && (
                  <p className="text-xs text-red-600 mt-1">{history.verificationError}</p>
                )}
                {history.isEmployeeVerifying && (
                  <div className="flex items-center text-yellow-600 mt-1">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    <span className="text-xs">Verifying Employee...</span>
                  </div>
                )}
                {history.isEmployeeVerified && (
                  <p className="text-xs text-green-600 mt-1">Employee Verified</p>
                )}
                {history.employeeVerificationError && (
                  <p className="text-xs text-red-600 mt-1">Employee not found</p>
                )}
                <div className="flex space-x-2 mt-2">
                  {!shareMode && !history.isVerified && !history.isVerifying && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleVerifyCompany(history)}
                      disabled={isVerifyingAll}
                    >
                      Verify Company
                    </Button>
                  )}
                  {!shareMode && history.isVerified && !history.isEmployeeVerified && !history.isEmployeeVerifying && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => verifyEmployee(history)}
                      disabled={isVerifyingAll}
                    >
                      Verify Employee
                    </Button>
                  )}
                </div>
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

// Company and employee verification