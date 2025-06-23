// components/WorkHistorySection.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkHistory, Candidate, CompanyOption } from "@/components/MagicLinkView/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkHistorySectionProps {
  workHistory: WorkHistory[];
  shareMode: boolean;
  isVerifyingAll: boolean;
  onVerifyAllCompanies: () => void;
  onVerifySingleWorkHistory: (
    company: WorkHistory,
    candidate: Candidate | null,
    userId: string,
    organizationId: string,
    manualCompanyOption?: CompanyOption,
    manualVerificationYear?: number
  ) => void;
  updateWorkHistoryItem: (
    companyId: number,
    updates: Partial<WorkHistory>
  ) => void;
  candidateId: string | undefined;
  candidate: Candidate | null;
  userId: string;
  organizationId: string;
}

export const WorkHistorySection: React.FC<WorkHistorySectionProps> = ({
  workHistory,
  shareMode,
  isVerifyingAll,
  onVerifyAllCompanies,
  onVerifySingleWorkHistory,
  updateWorkHistoryItem,
  candidateId,
  candidate,
  userId,
  organizationId,
}) => {
  if (workHistory.length === 0) return null;

  const sortedWorkHistory = [...workHistory].sort((a, b) => {
    const parseYear = (dateStr: string) => {
      const yearMatch = dateStr.match(/\d{4}/);
      return yearMatch ? parseInt(yearMatch[0], 10) : 0;
    };
    const startYearA = parseYear(a.years.split('-')[0] || '');
    const startYearB = parseYear(b.years.split('-')[0] || '');
    return startYearB - startYearA;
  });

  const hasUnverifiedCompanies = sortedWorkHistory.some(
    (history) => !(history.isVerified && history.isEmployeeVerified) // Check if either company or employee is not verified
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Work History</h3>
        {!shareMode && hasUnverifiedCompanies && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onVerifyAllCompanies}
            disabled={isVerifyingAll}
            className="flex items-center"
          >
            {isVerifyingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying All...
              </>
            ) : (
              "Verify All"
            )}
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {sortedWorkHistory.map((history) => {
          const parseYearStr = (s: string) => {
            const num = parseInt(s, 10);
            if (!isNaN(num) && num >= 1900 && num <= new Date().getFullYear()) {
                return num;
            }
            const dateParts = s.split(/[\s/.]/);
            if (dateParts.length > 1) {
                const yearPart = dateParts[dateParts.length - 1];
                const yearNum = parseInt(yearPart, 10);
                if (!isNaN(yearNum)) return yearNum;
            }
            return new Date().getFullYear();
          };

          const [startYearStr, endYearStr] = history.years.split(/[\s-]+/).map((s) => s.trim().toLowerCase());
          const startYear = parseYearStr(startYearStr);
          const endYear = endYearStr === 'present' || endYearStr === 'current' ? new Date().getFullYear() : parseYearStr(endYearStr);

          let hasGap = false;
          let gapText = '';
          // To calculate gaps, you'd need the next history item in the sorted list.
          // This requires looping with index and checking index + 1, as already implemented in useWorkHistoryVerification.

          return (
            <div key={history.company_id} className="relative pl-8 pb-6">
              <div className="absolute left-0 top-0 h-full">
                <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                {/* No line connecting last item */}
                {history.company_id !== sortedWorkHistory[sortedWorkHistory.length - 1].company_id && (
                    <div className="absolute top-4 left-[7px] w-[2px] h-full bg-indigo-200"></div>
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "text-xs",
                    hasGap ? "text-red-600" : "text-gray-500"
                  )}
                >
                  {history.years}
                  {hasGap && <span className="ml-2">({gapText})</span>}
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {history.isVerified && history.verifiedCompanyName
                    ? history.verifiedCompanyName
                    : history.company_name}
                  {history.isVerified && (
                    <CheckCircle2 className="ml-2 inline-block h-4 w-4 text-green-600" />
                  )}
                </p>
                <p className="text-xs text-gray-600">{history.designation}</p>
                <p className="text-xs text-gray-600">
                  Overlapping: {history.overlapping}
                </p>
                {history.establishmentId && (
                  <p className="text-xs text-green-600">
                    Est. ID: {history.establishmentId}
                  </p>
                )}
                {/* Company verification status */}
                {history.isVerifying && (
                  <div className="flex items-center text-yellow-600 mt-1">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    <span className="text-xs">Verifying Company...</span>
                  </div>
                )}
                {history.verificationError && (
                  <p className="text-xs text-red-600 mt-1">
                    Company Error: {history.verificationError}
                  </p>
                )}

                {/* Employee verification status */}
                {history.isEmployeeVerifying && (
                  <div className="flex items-center text-yellow-600 mt-1">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    <span className="text-xs">Verifying Employee...</span>
                  </div>
                )}
                {history.isEmployeeVerified && (
                  <p className="text-xs text-green-600 mt-1">
                    Employee Verified <CheckCircle2 className="ml-1 inline-block h-3 w-3" />
                  </p>
                )}
                {history.employeeVerificationError && (
                  <p className="text-xs text-red-600 mt-1">
                    Employee Error: {history.employeeVerificationError}
                  </p>
                )}

                {!shareMode && (
                  <div className="flex flex-wrap items-center space-x-2 mt-2">
                    {/* "Verify Company" button */}
                    {!history.isVerified && !history.isVerifying && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          onVerifySingleWorkHistory(
                            history,
                            candidate, // Pass candidate object
                            userId,
                            organizationId
                          )
                        }
                        disabled={isVerifyingAll}
                      >
                        Verify Company
                      </Button>
                    )}

                    {/* Employee verification controls (only if company is verified or in options) */}
                    {history.isVerified && !history.isEmployeeVerified && !history.isEmployeeVerifying && (
                      <>
                        {/* Company Selection Dropdown if multiple options */}
                        {history.companyVerificationOptions && history.companyVerificationOptions.length > 1 && (
                          <Select
                            value={history.selectedCompanyOption?.establishmentId || ""}
                            onValueChange={(value) => {
                              const selected = history.companyVerificationOptions?.find(
                                (opt) => opt.establishmentId === value
                              );
                              if (selected) {
                                updateWorkHistoryItem(history.company_id, {
                                  selectedCompanyOption: selected,
                                  verifiedCompanyName: selected.verifiedCompanyName,
                                  establishmentId: selected.establishmentId,
                                  secretToken: selected.secretToken,
                                  tsTransactionId: selected.tsTransactionId,
                                });
                              }
                            }}
                            disabled={isVerifyingAll}
                          >
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                              <SelectValue placeholder="Select Company Match" />
                            </SelectTrigger>
                            <SelectContent>
                              {history.companyVerificationOptions.map((option) => (
                                <SelectItem
                                  key={option.establishmentId}
                                  value={option.establishmentId}
                                >
                                  {option.verifiedCompanyName} ({option.establishmentId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Year Selection Dropdown */}
                        {history.availableVerificationYears && history.availableVerificationYears.length > 0 && (
                            <Select
                                value={history.selectedVerificationYear?.toString() || ''}
                                onValueChange={(value) => updateWorkHistoryItem(history.company_id, { selectedVerificationYear: parseInt(value, 10) })}
                                disabled={isVerifyingAll}
                            >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {history.availableVerificationYears.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            onVerifySingleWorkHistory(
                              history,
                              candidate,
                              userId,
                              organizationId,
                              history.selectedCompanyOption, // Pass currently selected option
                              history.selectedVerificationYear // Pass currently selected year
                            )
                          }
                          disabled={
                            isVerifyingAll ||
                            !history.selectedCompanyOption || // Must have a selected company
                            !history.selectedVerificationYear // Must have a selected year
                          }
                        >
                          Verify Employee
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};