
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeLog } from "@/types/time-tracker-types";
import { submitTimesheet } from "@/api/timeTracker";
import { toast } from "sonner";
import { TimeLogDetails } from "./dialog/TimeLogDetails";
import { TimesheetBasicInfo } from "./dialog/TimesheetBasicInfo";
import { TimesheetEditForm } from "./dialog/TimesheetEditForm";

interface ViewTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimeLog;
  onSubmitTimesheet: () => void;
}

export const ViewTimesheetDialog: React.FC<ViewTimesheetDialogProps> = ({
  open,
  onOpenChange,
  timesheet,
  onSubmitTimesheet
}) => {
  const [isEditing, setIsEditing] = useState(!timesheet?.is_submitted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    workReport: timesheet?.notes || '',
    projectAllocations: timesheet?.project_time_data?.projects || []
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Add the approval_id field for approval tracking
      const success = await submitTimesheet(timesheet.id, {
        ...formData,
        approval_id: timesheet.id // Use the timesheet id as the approval id
      });
      
      if (success) {
        toast.success("Timesheet submitted successfully");
        onSubmitTimesheet();
        onOpenChange(false);
      } else {
        toast.error("Failed to submit timesheet");
      }
    } catch (error) {
      console.error("Error submitting timesheet:", error);
      toast.error("An error occurred while submitting the timesheet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !timesheet?.is_submitted && !isSubmitting;
  const canEdit = !timesheet?.is_submitted && !timesheet?.is_approved;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{timesheet?.is_submitted ? "View Timesheet" : "Submit Timesheet"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <TimesheetBasicInfo timesheet={timesheet} />
          
          {isEditing ? (
            <TimesheetEditForm
              formData={formData}
              setFormData={setFormData}
              timesheet={timesheet}
            />
          ) : (
            <TimeLogDetails
              timeLog={timesheet}
            />
          )}
        </div>

        <DialogFooter>
          {canEdit && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          
          {isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              View Details
            </Button>
          )}
          
          {canSubmit && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Timesheet"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
