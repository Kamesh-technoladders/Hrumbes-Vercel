// hooks/useWorkHistoryVerification.ts
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { verifyCompany, verifyEmployee } from "@/components/MagicLinkView/services/VerificationServices";
import { supabase } from "@/integrations/supabase/client";
import { Candidate, WorkHistory, CompanyOption } from "@/components/MagicLinkView/types";

interface UseWorkHistoryVerificationReturn {
  workHistory: WorkHistory[];
  setWorkHistory: React.Dispatch<React.SetStateAction<WorkHistory[]>>;
  isVerifyingAll: boolean;
  verifyAllCompanies: (
    candidateId: string,
    candidate: Candidate | null,
    userId: string,
    organizationId: string
  ) => Promise<void>;
  handleVerifySingleWorkHistory: (
    company: WorkHistory,
    candidate: Candidate | null, // Pass candidate directly
    userId: string,
    organizationId: string,
    manualCompanyOption?: CompanyOption,
    manualVerificationYear?: number,
    isRetryAttempt?: boolean // Flag for retry
  ) => Promise<void>;
  updateWorkHistoryItem: (
    companyId: number,
    updates: Partial<WorkHistory>
  ) => void;
}

const cleanCompanyName = (name: string): string => {
  let cleaned = name.replace(/\s*\([^)]*\)/g, "").trim();
  cleaned = cleaned.replace(/[,|.]/g, "");
  return cleaned;
};

const parseYearsToRange = (yearsString: string): number[] => {
  const parts = yearsString.split(/[\s-]+/).map(s => s.toLowerCase().trim());
  let startYear: number | undefined;
  let endYear: number | undefined;

  const monthMap: { [key: string]: string } = {
    january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
    april: '04', apr: '04', may: '05', june: '06', jun: '06', july: '07', jul: '07',
    august: '08', aug: '08', september: '09', sep: '09', sept: '09',
    october: '10', oct: '10', november: '11', nov: '11', december: '12', dec: '12',
  };

  const extractYear = (part: string): number | undefined => {
    const dateMatch = part.match(/\d{4}$/);
    if (dateMatch) return parseInt(dateMatch[0], 10);

    const monthYearMatch = part.match(/([a-z]+)\s*(\d{4})/i);
    if (monthYearMatch && monthMap[monthYearMatch[1]]) return parseInt(monthYearMatch[2], 10);

    if (/^\d{4}$/.test(part)) return parseInt(part, 10);

    return undefined;
  };

  if (parts.length >= 1) {
    startYear = extractYear(parts[0]);
    if (parts.includes("present") || parts.includes("current")) {
      endYear = new Date().getFullYear();
    } else if (parts.length >= 2) {
      endYear = extractYear(parts[parts.length - 1]);
    }
  }

  if (!startYear) return [];

  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  for (let y = startYear; y <= (endYear || currentYear); y++) {
    years.push(y);
  }
  return years.sort((a,b) => b - a); // Sort descending for latest year first in UI
};


export const useWorkHistoryVerification = (
  candidateId: string | undefined,
  jobId: string | undefined,
  shareMode: boolean,
  candidate: Candidate | null,
  userId: string,
  organizationId: string
): UseWorkHistoryVerificationReturn => {
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const { toast } = useToast();

  // Ref to store ongoing retry timers
  const retryTimers = useRef<{ [companyId: number]: NodeJS.Timeout }>({});
  // Ref to store retry counts
  const retryCounts = useRef<{ [companyId: number]: number }>({});
  const MAX_RETRY_ATTEMPTS = 5; // Max retries for transient errors
  const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  const updateWorkHistoryItem = (
    companyId: number,
    updates: Partial<WorkHistory>
  ) => {
    setWorkHistory((prev) =>
      prev.map((item) =>
        item.company_id === companyId ? { ...item, ...updates } : item
      )
    );
  };

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      Object.values(retryTimers.current).forEach(clearTimeout);
      retryTimers.current = {};
    };
  }, []);

  useEffect(() => {
    const fetchWorkHistoryAndVerificationStatus = async () => {
      if (!candidate?.id) return;

      try {
        const { data: workData, error: workError } = await supabase
          .from("candidate_companies")
          .select("company_id, designation, years, companies!inner(name)")
          .eq("candidate_id", candidate.id);

        if (workError) {
          console.error("Supabase fetch work history error:", workError);
          throw new Error("Failed to fetch work history: " + workError.message);
        }

        const { data: verifiedCompanyRecords, error: companyRecordError } = await supabase
          .from("verified_company_records")
          .select(
            "company_id, company_name, establishment_id, secret_token, ts_transaction_id, verified_at"
          )
          .eq("candidate_id", candidate.id)
          .eq("organization_id", organizationId)
          .order('created_at', { ascending: false }); // Get latest record for each company_id

        if (companyRecordError) {
          console.warn("Error fetching verified companies:", companyRecordError.message);
        }

        const { data: employeeVerificationLogs, error: employeeLogError } = await supabase
          .from("employee_verification_logs")
          .select(
            "company_id, establishment_id, is_employee_found, error_message, consumed_api_credit, retry_count, created_at"
          )
          .eq("candidate_id", candidate.id)
          .eq("organization_id", organizationId)
          .order('created_at', { ascending: false }); // Get latest log for each company/est ID

        if (employeeLogError) {
          console.warn("Error fetching employee verification logs:", employeeLogError.message);
        }

        if (workData) {
          const formattedWorkHistory: WorkHistory[] = workData.map((item) => {
            const companyIdNum = parseInt(item.company_id, 10);
            const associatedCompanyRecords = verifiedCompanyRecords?.filter(v => parseInt(v.company_id, 10) === companyIdNum) || [];
            
            // Get the most recent *successful* company verification for initial display
            const latestSuccessfulCompanyRecord = associatedCompanyRecords.find(rec => rec.verified_at);

            const companyOptions: CompanyOption[] = associatedCompanyRecords.map(rec => ({
              establishmentId: rec.establishment_id,
              verifiedCompanyName: rec.company_name,
              secretToken: rec.secret_token,
              tsTransactionId: rec.ts_transaction_id
            }));

            // Find the latest employee verification attempt for this company (any status)
            const latestEmployeeLog = employeeVerificationLogs?.find(
                log => parseInt(log.company_id, 10) === companyIdNum
            );

            const availableYears = parseYearsToRange(item.years || '');

            return {
              company_id: companyIdNum,
              company_name: item.companies?.name || "Unknown Company",
              designation: item.designation || "-",
              years: item.years || "-",
              overlapping: "N/A", // From UAN data if available
              isVerifying: false,
              isVerified: !!latestSuccessfulCompanyRecord,
              verifiedCompanyName: latestSuccessfulCompanyRecord?.company_name || undefined,
              establishmentId: latestSuccessfulCompanyRecord?.establishment_id || undefined,
              secretToken: latestSuccessfulCompanyRecord?.secret_token || undefined,
              tsTransactionId: latestSuccessfulCompanyRecord?.ts_transaction_id || undefined,
              verificationError: latestSuccessfulCompanyRecord ? null : (companyRecordError?.message || null), // Only show if fetch failed or no record
              companyVerificationOptions: companyOptions.length > 0 ? companyOptions : undefined, // Only set if options exist
              selectedCompanyOption: latestSuccessfulCompanyRecord ? { // Pre-select latest successful
                establishmentId: latestSuccessfulCompanyRecord.establishment_id,
                verifiedCompanyName: latestSuccessfulCompanyRecord.company_name,
                secretToken: latestSuccessfulCompanyRecord.secret_token,
                tsTransactionId: latestSuccessfulCompanyRecord.ts_transaction_id
              } : undefined,

              isEmployeeVerifying: false,
              isEmployeeVerified: latestEmployeeLog?.is_employee_found === true,
              employeeVerificationError: latestEmployeeLog?.error_message || null,
              availableVerificationYears: availableYears,
              selectedVerificationYear: availableYears.length > 0 ? availableYears[0] : undefined, // Default to latest year
            };
          });
          setWorkHistory(formattedWorkHistory);

          // Initialize retry counts
          formattedWorkHistory.forEach(item => {
            if (item.company_id) {
              const latestLog = employeeVerificationLogs?.find(log => parseInt(log.company_id, 10) === item.company_id);
              retryCounts.current[item.company_id] = latestLog?.retry_count || 0;
            }
          });
        }
      } catch (error: any) {
        console.error("Error in fetchWorkHistoryAndVerificationStatus:", error.message);
        toast({
          title: "Error",
          description: "Failed to load work history verification status: " + error.message,
          variant: "destructive",
        });
      }
    };

    if (candidate?.id && !shareMode) {
      fetchWorkHistoryAndVerificationStatus();
    }
  }, [candidate?.id, shareMode, userId, organizationId, toast]);


  const handleVerifySingleWorkHistory = async (
    company: WorkHistory,
    currentCandidate: Candidate | null,
    currentUserId: string,
    currentOrganizationId: string,
    manualCompanyOption?: CompanyOption,
    manualVerificationYear?: number,
    isRetryAttempt: boolean = false // Flag indicating if this is a retry
  ) => {
    if (shareMode || !candidateId || !currentCandidate) {
      toast({
        title: "Error",
        description: "Cannot verify in share mode or without candidate data.",
        variant: "destructive",
      });
      return;
    }

    const currentRetryCount = retryCounts.current[company.company_id] || 0;
    if (isRetryAttempt && currentRetryCount >= MAX_RETRY_ATTEMPTS) {
        toast({
            title: "Verification Failed",
            description: `Max retries (${MAX_RETRY_ATTEMPTS}) reached for ${company.company_name}.`,
            variant: "destructive",
        });
        updateWorkHistoryItem(company.company_id, {
            isVerifying: false,
            isEmployeeVerifying: false,
            verificationError: `Max retries reached.`,
            employeeVerificationError: `Max retries reached.`,
        });
        return;
    }

    // Clear any existing retry timer for this company
    if (retryTimers.current[company.company_id]) {
      clearTimeout(retryTimers.current[company.company_id]);
      delete retryTimers.current[company.company_id];
    }

    updateWorkHistoryItem(company.company_id, {
      isVerifying: true,
      verificationError: null,
      isEmployeeVerifying: true, // Assume both start in progress
      employeeVerificationError: null,
      // Increment retry count only if it's an actual retry
      // This is handled by a separate function
    });

    let companyVerificationDetails: CompanyOption | undefined = manualCompanyOption || company.selectedCompanyOption;
    let newSecretTokenNeeded = false;

    // Determine if company needs re-verification to get a new secret token
    // This happens if:
    // 1. It's not yet verified.
    // 2. We're explicitly given a new manualCompanyOption.
    // 3. Or, if it was previously verified but we need a new token (e.g., RETRY_COMPANY_VERIFICATION was thrown).
    //    We signal this by setting newSecretTokenNeeded to true before the first company verify call.
    if (!company.isVerified || !companyVerificationDetails || isRetryAttempt && !manualCompanyOption) { // If retry and no manual option, try re-verifying company
        newSecretTokenNeeded = true;
    }


    try {
        if (newSecretTokenNeeded) {
            updateWorkHistoryItem(company.company_id, { isVerifying: true, isEmployeeVerifying: false, verificationError: null });
            const transID = crypto.randomUUID();
            const cleanedCompanyName = cleanCompanyName(company.company_name);
            const companyResult = await verifyCompany(
                transID,
                cleanedCompanyName,
                candidateId,
                company.company_id,
                currentUserId,
                currentOrganizationId
            );

            const newCompanyOptions: CompanyOption[] = Object.entries(companyResult.CompanyName).map(([estId, compName]) => ({
                establishmentId: estId,
                verifiedCompanyName: compName,
                secretToken: companyResult.secretToken,
                tsTransactionId: companyResult.tsTransactionID
            }));

            // Auto-select the first option for re-verification, or based on prior selection if possible
            companyVerificationDetails = newCompanyOptions[0] || (companyOptions && companyOptions[0]);


            if (!companyVerificationDetails) {
                 throw new Error('No valid company option found after re-verification.');
            }

            updateWorkHistoryItem(company.company_id, {
                isVerifying: false,
                isVerified: true,
                companyVerificationOptions: newCompanyOptions,
                selectedCompanyOption: companyVerificationDetails,
                verifiedCompanyName: companyVerificationDetails.verifiedCompanyName,
                establishmentId: companyVerificationDetails.establishmentId,
                secretToken: companyVerificationDetails.secretToken,
                tsTransactionId: companyVerificationDetails.tsTransactionId,
                verificationError: null,
            });

            if (!isRetryAttempt) { // Don't show success toast for internal retries
                toast({ title: "Company Re-Verification Successful", description: `New token obtained for ${companyVerificationDetails.verifiedCompanyName}.` });
            }
        }

        // Proceed to employee verification only if company details are available
        if (!companyVerificationDetails || !companyVerificationDetails.establishmentId || !companyVerificationDetails.secretToken) {
            throw new Error("Missing complete company verification details for employee verification.");
        }

        updateWorkHistoryItem(company.company_id, { isVerifying: false, isEmployeeVerifying: true, employeeVerificationError: null });

        const transID = crypto.randomUUID();
        const personName =
            currentCandidate.first_name && currentCandidate.last_name
            ? `${currentCandidate.first_name} ${currentCandidate.last_name}`.trim()
            : currentCandidate.name || "Unknown Employee";

        const verificationYear = (manualVerificationYear || company.selectedVerificationYear || new Date().getFullYear()).toString();

        const employeeResult = await verifyEmployee(
            transID,
            personName,
            verificationYear,
            candidateId,
            company.company_id, // Pass our internal company_id
            companyVerificationDetails.establishmentId,
            companyVerificationDetails.verifiedCompanyName,
            companyVerificationDetails.secretToken,
            companyVerificationDetails.tsTransactionId,
            currentUserId,
            currentOrganizationId,
            currentRetryCount + (isRetryAttempt ? 1 : 0) // Increment retry count for this attempt
        );

        updateWorkHistoryItem(company.company_id, {
            isEmployeeVerifying: false,
            isEmployeeVerified: employeeResult.status === 1,
            employeeVerificationError: null, // Clear error on success
        });

        toast({
            title: "Employee Verification Successful",
            description: `Employee "${personName}" verified for ${companyVerificationDetails.verifiedCompanyName}.`,
        });

        // Reset retry count on successful verification
        retryCounts.current[company.company_id] = 0;


    } catch (error: any) {
        let displayMessage = error.message || 'Verification failed.';
        let isTransientError = false;

        if (error.message === 'RETRY_COMPANY_VERIFICATION') {
            displayMessage = 'Token expired, re-acquiring company token and retrying employee verification...';
            isTransientError = true; // Treat as transient to trigger retry mechanism
        } else if (displayMessage.includes('Source not responding') || displayMessage.includes('timed out') || displayMessage.includes('Network error')) {
            isTransientError = true;
            displayMessage = `Verification failed: ${displayMessage}. Retrying...`;
        } else if (displayMessage.includes('Employee not found') || displayMessage.includes('No details found')) {
            // These are definitive non-transient errors, no retry
            displayMessage = `Verification failed: ${displayMessage}`;
            retryCounts.current[company.company_id] = 0; // Reset as this is a conclusive failure
        } else {
            // Other unexpected errors
            displayMessage = `An unexpected error occurred: ${displayMessage}`;
            retryCounts.current[company.company_id] = 0; // Reset
        }

        updateWorkHistoryItem(company.company_id, {
            isVerifying: false,
            isEmployeeVerifying: false,
            isEmployeeVerified: false,
            verificationError: isTransientError ? null : displayMessage, // Only show specific error if not transient
            employeeVerificationError: displayMessage,
        });

        if (isTransientError && currentRetryCount < MAX_RETRY_ATTEMPTS) {
            const nextRetryCount = currentRetryCount + 1;
            retryCounts.current[company.company_id] = nextRetryCount;
            toast({
                title: "Retrying Verification",
                description: `Attempt ${nextRetryCount}/${MAX_RETRY_ATTEMPTS} for ${company.company_name}. Retrying in ${RETRY_INTERVAL_MS / 1000 / 60} minutes.`,
                variant: "warning",
            });
            // Schedule the retry
            retryTimers.current[company.company_id] = setTimeout(() => {
                console.log(`Retrying company ${company.company_id}, attempt ${nextRetryCount}`);
                handleVerifySingleWorkHistory(
                    company,
                    currentCandidate,
                    currentUserId,
                    currentOrganizationId,
                    companyVerificationDetails, // Pass the last known valid company details
                    manualVerificationYear,
                    true // Set as retry attempt
                );
            }, RETRY_INTERVAL_MS);
        } else {
             // If not transient or max retries reached, show final failure toast
            toast({
                title: "Verification Failed",
                description: displayMessage,
                variant: "destructive",
            });
            retryCounts.current[company.company_id] = 0; // Reset retries on final failure
        }
    }
  };

  const verifyAllCompanies = async (
    currentCandidateId: string,
    currentCandidate: Candidate | null,
    currentUserId: string,
    currentOrganizationId: string
  ) => {
    if (shareMode || !currentCandidateId || !currentCandidate) {
      toast({ title: "Error", description: "Cannot verify in share mode or without candidate data.", variant: "destructive" });
      return;
    }

    const companiesToVerify = workHistory.filter(
        (company) => !(company.isVerified && company.isEmployeeVerified) // Verify if company or employee isn't verified
    );

    if (companiesToVerify.length === 0) {
      toast({ title: "No Verifications Needed", description: "All companies and employees are already verified." });
      return;
    }

    setIsVerifyingAll(true);
    let successCount = 0;
    let failureCount = 0;

    for (const company of companiesToVerify) {
      try {
        await handleVerifySingleWorkHistory(
          company,
          currentCandidate,
          currentUserId,
          currentOrganizationId,
          company.selectedCompanyOption, // Use currently selected company option for employee
          company.selectedVerificationYear, // Use currently selected year
          false // Not a retry for initial bulk run
        );
        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Small delay between calls
      } catch (error) {
        failureCount++;
        // The individual `handleVerifySingleWorkHistory` handles its own toasts and retries
        // We just count the ultimate success/failure for the bulk summary
      }
    }

    setIsVerifyingAll(false);
    toast({
      title: "Bulk Verification Complete",
      description: `Processed ${companiesToVerify.length} compan${companiesToVerify.length > 1 ? 'ies' : 'y'}. ${successCount} succeeded, ${failureCount} failed.`,
      variant: failureCount > 0 ? 'destructive' : 'default',
    });
  };

  return {
    workHistory,
    setWorkHistory,
    isVerifyingAll,
    verifyAllCompanies,
    handleVerifySingleWorkHistory,
    updateWorkHistoryItem,
  };
};