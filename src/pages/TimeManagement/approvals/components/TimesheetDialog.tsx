
import { TimeLog } from "@/types/time-tracker-types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useState } from "react";
import { TimeLogDetailsDialog } from "@/components/TimeManagement/timesheet/TimeLogDetailsDialog";
import { TimesheetInfo } from "./dialog/TimesheetInfo";
import { TimesheetActions } from "./dialog/TimesheetActions";

export interface DialogProps {
  dialogTimesheet: TimeLog | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  handleApprove: (timesheetId: string) => Promise<void>;
  handleRequestClarification: (timesheetId: string, reason: string) => Promise<void>;
  type: 'normal' | 'clarification';
}

const TimesheetDialog = ({
  dialogTimesheet,
  dialogOpen,
  setDialogOpen,
  handleApprove,
  handleRequestClarification,
  type
}: DialogProps) => {
  const [clarificationDialogOpen, setClarificationDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  if (!dialogTimesheet) return null;

  const handleSendRequest = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    handleRequestClarification(dialogTimesheet.id, rejectionReason);
    setClarificationDialogOpen(false);
  };

  const getProjectName = (projectId: string | null) => {
    return projectId ? `Project ${projectId.substring(0, 8)}` : "Unassigned";
  };

  const isApproved = dialogTimesheet.is_approved || dialogTimesheet.approval_status === 'approved';

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isApproved 
                ? "Approved Timesheet" 
                : type === 'normal' 
                  ? "Review Timesheet" 
                  : "Review Clarification"
              }
            </DialogTitle>
            <DialogDescription>
              {isApproved 
                ? "This timesheet has been approved" 
                : type === 'normal' 
                  ? "Review the timesheet details before approving or requesting clarification"
                  : "Review the employee's clarification response"
              }
            </DialogDescription>
          </DialogHeader>
          
          <TimesheetInfo dialogTimesheet={dialogTimesheet} type={type} />
          
          <div className="text-center pt-2">
            <Button 
              variant="outline" 
              onClick={() => setViewDetailsOpen(true)}
              className="w-full flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Full Timesheet Details
            </Button>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <TimesheetActions
              isApproved={isApproved}
              type={type}
              dialogTimesheet={dialogTimesheet}
              clarificationDialogOpen={clarificationDialogOpen}
              setClarificationDialogOpen={setClarificationDialogOpen}
              rejectionReason={rejectionReason}
              setRejectionReason={setRejectionReason}
              handleSendRequest={handleSendRequest}
              handleApprove={handleApprove}
              setDialogOpen={setDialogOpen}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto bg-gradient-to-b from-white to-slate-50">
          <SheetHeader>
            <SheetTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Timesheet Details
            </SheetTitle>
            <SheetDescription>
              Full details of the submitted timesheet
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <TimeLogDetailsDialog
              timeLog={dialogTimesheet}
              open={viewDetailsOpen}
              onOpenChange={setViewDetailsOpen}
              getProjectName={getProjectName}
            />
          </div>
          <SheetFooter>
            <Button 
              variant="outline" 
              onClick={() => setViewDetailsOpen(false)}
              className="w-full"
            >
              Close Details
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TimesheetDialog;
