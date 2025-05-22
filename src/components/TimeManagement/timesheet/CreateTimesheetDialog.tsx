import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Dialog } from "@/components/ui/dialog";
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useTimesheetSubmission } from './hooks/useTimesheetSubmission';
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { toast } from 'sonner';

interface CreateTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeHasProjects: boolean;
  onTimesheetCreated?: () => void;
}

export const CreateTimesheetDialog: React.FC<CreateTimesheetDialogProps> = ({
  open,
  onOpenChange,
  employeeHasProjects,
  onTimesheetCreated
}) => {
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id || "";
  
  const [date, setDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');
  const [totalWorkingHours, setTotalWorkingHours] = useState(8);
  const [workReport, setWorkReport] = useState('');
  const [detailedEntries, setDetailedEntries] = useState<DetailedTimesheetEntry[]>([]);
  const [projectEntries, setProjectEntries] = useState<
    {projectId: string; hours: number; report: string}[]
  >([]);

  // Log employeeId for debugging
  console.log('CreateTimesheetDialog employeeId:', { employeeId });

  const { validateForm } = useTimesheetValidation();
  const { isSubmitting, submitTimesheet } = useTimesheetSubmission();

  const resetForm = () => {
    setDate(new Date());
    setTitle('');
    setTotalWorkingHours(8);
    setWorkReport('');
    setDetailedEntries([]);
    setProjectEntries([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!employeeId) {
      toast.error('User not authenticated. Please log in to submit a timesheet.');
      console.log('Submission blocked: No employeeId');
      return;
    }

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

    const success = await submitTimesheet({
      employeeId,
      title,
      workReport,
      totalWorkingHours,
      employeeHasProjects,
      projectEntries,
      detailedEntries
    });

    if (success) {
      toast.success('Timesheet created successfully');
      if (onTimesheetCreated) {
        onTimesheetCreated();
      }
      handleClose();
    } else {
      toast.error('Failed to create timesheet');
      console.log('Submission failed:', { employeeId, title, workReport, totalWorkingHours });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
      />
    </Dialog>
  );
};