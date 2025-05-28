import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeLog, DetailedTimesheetEntry } from "@/types/time-tracker-types";
import { toast } from "sonner";
import { TimeLogDetails } from "./dialog/TimeLogDetails";
import { TimesheetBasicInfo } from "./dialog/TimesheetBasicInfo";
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { TimesheetEditForm } from "./dialog/TimesheetEditForm"; // Import TimesheetEditForm
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useTimesheetSubmission } from './hooks/useTimesheetSubmission';
import { useSelector } from 'react-redux';
import { fetchHrProjectEmployees, submitTimesheet } from '@/api/timeTracker';


interface ViewTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimeLog;
  onSubmitTimesheet: () => void;
  employeeHasProjects: boolean;
}

export const ViewTimesheetDialog: React.FC<ViewTimesheetDialogProps> = ({
  open,
  onOpenChange,
  timesheet,
  onSubmitTimesheet,
  employeeHasProjects,
}) => {
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id || "";
  const [isEditing, setIsEditing] = useState(!timesheet?.is_submitted);
  const [date, setDate] = useState<Date>(new Date(timesheet?.date || Date.now()));
  const [title, setTitle] = useState(timesheet?.notes || '');
  const [totalWorkingHours, setTotalWorkingHours] = useState(timesheet?.total_working_hours || 8);
  const [workReport, setWorkReport] = useState(timesheet?.notes || '');
  const [detailedEntries, setDetailedEntries] = useState<DetailedTimesheetEntry[]>(timesheet?.project_time_data?.projects || []);
  const [projectEntries, setProjectEntries] = useState<
    { projectId: string; hours: number; report: string; clientId?: string }[]
  >(timesheet?.project_time_data?.projects || []);
  const [hrProjectEmployees, setHrProjectEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for old component's formData when employeeHasProjects is false
  const [formData, setFormData] = useState({
    workReport: timesheet?.notes || '',
    projectAllocations: timesheet?.project_time_data?.projects || [],
    totalHours: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (employeeId && employeeHasProjects) {
        setIsLoading(true);
        const data = await fetchHrProjectEmployees(employeeId);
        setHrProjectEmployees(data);
        setIsLoading(false);
      }
    };
    fetchData();
  }, [employeeId, employeeHasProjects]);

  useEffect(() => {
    if (timesheet?.clock_in_time && timesheet?.clock_out_time) {
      const clockIn = new Date(timesheet.clock_in_time);
      const clockOut = new Date(timesheet.clock_out_time);
      const diffMs = clockOut.getTime() - clockIn.getTime();
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      setTotalWorkingHours(totalHours);
      setFormData((prev) => ({ ...prev, totalHours })); // Update formData for old component logic
      console.log('Calculated login hours:', { totalHours, clockIn, clockOut });
    }
  }, [timesheet]);

  const handleClose = () => {
    setDate(new Date(timesheet?.date || Date.now()));
    setTitle(timesheet?.notes || '');
    setTotalWorkingHours(timesheet?.total_working_hours || 8);
    setWorkReport(timesheet?.notes || '');
    setDetailedEntries(timesheet?.project_time_data?.projects || []);
    setProjectEntries(timesheet?.project_time_data?.projects || []);
    setFormData({
      workReport: timesheet?.notes || '',
      projectAllocations: timesheet?.project_time_data?.projects || [],
      totalHours: timesheet?.total_working_hours || 0,
    });
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!timesheet?.employee_id) {
      toast.error('User not authenticated. Please log in to submit a timesheet.');
      console.log('Submission blocked: No employeeId');
      return;
    }

    if (employeeHasProjects) {
      if (!validateForm({
        title,
        employeeHasProjects,
        projectEntries,
        detailedEntries,
        totalWorkingHours
      })) {
        console.log('Validation failed:', { title, employeeHasProjects, projectEntries, detailedEntries, totalWorkingHours });
        return;
      }

      const success = await submitTimesheetHook({
        employeeId: timesheet.employee_id,
        title,
        workReport,
        totalWorkingHours,
        employeeHasProjects,
        projectEntries,
        detailedEntries,
        timeLogId: timesheet.id,
      });

      if (success) {
        toast.success('Timesheet submitted successfully');
        onSubmitTimesheet();
        handleClose();
      } else {
        toast.error('Failed to submit timesheet');
        console.log('Submission failed:', { employeeId: timesheet.employee_id, title, workReport, totalWorkingHours });
      }
    } else {
      // Old component's submission logic
      setIsLoading(true);
      try {
        const success = await submitTimesheet(timesheet.id, {
          ...formData,
          approval_id: timesheet.id,
          employeeId: timesheet.employee_id,
        });

        if (success) {
          toast.success("Timesheet submitted successfully");
          onSubmitTimesheet();
          handleClose();
        } else {
          toast.error("Failed to submit timesheet");
        }
      } catch (error) {
        console.error("Error submitting timesheet:", error);
        toast.error("An error occurred while submitting the timesheet");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const { validateForm } = useTimesheetValidation();
  const { isSubmitting, submitTimesheet: submitTimesheetHook } = useTimesheetSubmission();

  const canSubmit = !timesheet?.is_submitted && !isSubmitting;
  const canEdit = !timesheet?.is_submitted && !timesheet?.is_approved;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {timesheet?.is_submitted && !employeeHasProjects ? "View Timesheet" : "Submit Timesheet"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div>Loading project assignments...</div>
          ) : (
            <>
              <TimesheetBasicInfo timesheet={timesheet} />
              
              {isEditing && employeeHasProjects ? (
                <TimesheetDialogContent
                  date={date}
                  setDate={setDate}
                  title={title}
                  setTitle={setTitle}
                  totalWorkingHours={totalWorkingHours}
                  setTotalWorkingHours={setTotalWorkingHours}
                  workReport={workReport}
                  setWorkReport={setWorkReport}
                  detailedEntries={detailedEntries}
                  setDetailedEntries={setDetailedEntries}
                  projectEntries={projectEntries}
                  setProjectEntries={setProjectEntries}
                  employeeHasProjects={employeeHasProjects}
                  isSubmitting={isSubmitting}
                  handleClose={handleClose}
                  handleSubmit={handleSubmit}
                  employeeId={employeeId}
                  hrProjectEmployees={hrProjectEmployees}
                />
              ) : isEditing && !employeeHasProjects ? (
                <TimesheetEditForm
                  formData={formData}
                  setFormData={setFormData}
                  timesheet={timesheet}
                  employeeHasProjects={employeeHasProjects}
                  totalHours={formData.totalHours}
                />
              ) : (
                <TimeLogDetails timeLog={timesheet} />
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {canEdit && !isEditing && !employeeHasProjects && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          
          {(isEditing || employeeHasProjects) && !timesheet?.is_submitted && (
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              View Details
            </Button>
          )}
          
          {canSubmit && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? "Submitting..." : "Submit Timesheet"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};