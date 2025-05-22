
import React from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { TimeEntrySection } from "./sections/TimeEntrySection";
import { ProjectAllocationSection } from "./sections/ProjectAllocationSection";
import { getWorkflowState, canRegularize } from "./utils/timeLogUtils";

interface TimeLogDetailsProps {
  timeLog?: TimeLog;
  timesheet?: TimeLog; // Added for compatibility
  getProjectName?: (projectId: string | null) => string;
  onRegularizationRequest?: () => void;
}

export const TimeLogDetails = ({ 
  timeLog, 
  timesheet, 
  getProjectName = (id) => id ? `Project ${id.substring(0, 8)}` : "Unassigned",
  onRegularizationRequest 
}: TimeLogDetailsProps) => {
  const log = timeLog || timesheet;
  
  if (!log) return null;

  // Parse notes to extract title and work report
  let parsedNotes = {
    title: "",
    workReport: ""
  };
  
  try {
    if (log.notes && typeof log.notes === 'string') {
      const parsed = JSON.parse(log.notes);
      if (parsed.title) parsedNotes.title = parsed.title;
      if (parsed.workReport) parsedNotes.workReport = parsed.workReport;
    }
  } catch (e) {
    if (log.notes) parsedNotes.workReport = log.notes;
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
      <BasicInfoSection timeLog={log} parsedNotes={parsedNotes} />
      <TimeEntrySection timeLog={log} />
      <ProjectAllocationSection timeLog={log} getProjectName={getProjectName} />
      
      {/* Work Summary Section */}
      {parsedNotes.workReport && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
          <h3 className="text-xs font-medium text-green-800 mb-2">Work Summary</h3>
          <div className="bg-white/80 p-2 rounded shadow-sm">
            <p className="text-xs text-green-700">{parsedNotes.workReport}</p>
          </div>
        </div>
      )}
      
      {/* Clarification Section */}
      {(log.rejection_reason || log.clarification_response) && (
        <div className={`bg-gradient-to-r ${getWorkflowState(log) === 'rejected' ? 
          'from-red-50 to-rose-50 border-red-100' : 
          'from-blue-50 to-sky-50 border-blue-100'} p-3 rounded-lg border`}>
          <h3 className="text-xs font-medium mb-2" 
            style={{ color: getWorkflowState(log) === 'rejected' ? '#991b1b' : '#1e40af' }}>
            {getWorkflowState(log) === 'rejected' ? 'Rejection Reason' : 'Clarification'}
          </h3>
          {log.rejection_reason && (
            <div className="bg-white/80 p-2 rounded shadow-sm mb-2">
              <p className="text-xs" 
                style={{ color: getWorkflowState(log) === 'rejected' ? '#ef4444' : '#3b82f6' }}>
                {log.rejection_reason}
              </p>
            </div>
          )}
          {log.clarification_response && (
            <div className="bg-white/80 p-2 rounded shadow-sm">
              <h4 className="text-xs font-medium mb-1" 
                style={{ color: getWorkflowState(log) === 'rejected' ? '#991b1b' : '#1e40af' }}>
                Response
              </h4>
              <p className="text-xs" 
                style={{ color: getWorkflowState(log) === 'rejected' ? '#ef4444' : '#3b82f6' }}>
                {log.clarification_response}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Regularization Button */}
      {canRegularize(log) && onRegularizationRequest && (
        <div className="pt-2">
          <Button 
            onClick={onRegularizationRequest}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
          >
            <FileText className="w-4 h-4" />
            Request Regularization
          </Button>
        </div>
      )}
    </div>
  );
};
