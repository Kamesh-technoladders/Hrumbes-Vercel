
import { useEffect, useState } from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { useTimesheetApprovalState } from "./timesheetApproval/timesheetApprovalState";
import { 
  fetchPendingTimesheets, 
  fetchClarificationTimesheets, 
  fetchApprovedTimesheets,
  approveTimesheet,
  requestClarification
} from "./timesheetApproval/api";
import { toast } from "sonner";

export const useTimesheetApproval = () => {
  const {
    pendingTimesheets,
    clarificationTimesheets,
    approvedTimesheets,
    loading,
    dialogTimesheet,
    dialogOpen,
    rejectionReason,
    
    setPendingTimesheets,
    setClarificationTimesheets,
    setApprovedTimesheets,
    setLoading,
    setDialogTimesheet,
    setDialogOpen,
    setRejectionReason
  } = useTimesheetApprovalState();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Function to fetch all timesheets
  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      // Get pending timesheets
      const pendingData = await fetchPendingTimesheets();
      console.log("Fetched pending timesheets:", pendingData.length);
      
      // Get timesheets with clarification submitted
      const clarificationData = await fetchClarificationTimesheets();
      
      // Get approved timesheets
      const approvedData = await fetchApprovedTimesheets();

      // Update state with fetched data
      setPendingTimesheets(pendingData);
      setClarificationTimesheets(clarificationData);
      setApprovedTimesheets(approvedData);

      // Debug log
      if (pendingData.length === 0 && refreshTrigger > 0) {
        toast("No pending timesheets found. Please make sure timesheets are submitted correctly.");
      }
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      toast.error("Failed to fetch timesheet data");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle approving a timesheet
  const handleApprove = async (timesheetId: string) => {
    if (!dialogTimesheet) {
      console.error("No timesheet found for approval");
      toast.error("Invalid timesheet data");
      return;
    }
    
    const success = await approveTimesheet(timesheetId);
    if (success) {
      fetchTimesheets();
      setDialogOpen(false);
      toast.success("Timesheet approved successfully");
    }
  };

  // Function to request clarification for a timesheet
  const handleRequestClarification = async (timesheetId: string, reason: string) => {
    if (!dialogTimesheet) {
      console.error("No timesheet found for clarification request");
      toast.error("Invalid timesheet data");
      return;
    }
    
    const success = await requestClarification(timesheetId, reason);
    if (success) {
      setRejectionReason("");
      fetchTimesheets();
      setDialogOpen(false);
      toast.success("Clarification request sent");
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [refreshTrigger]);

  // Set up an interval to periodically check for new submissions
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const openDialog = (timesheet: TimeLog) => {
    setDialogTimesheet(timesheet);
    setDialogOpen(true);
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getPendingCount = () => {
    return pendingTimesheets.length + clarificationTimesheets.length;
  };

  return {
    pendingTimesheets,
    clarificationTimesheets,
    approvedTimesheets,
    loading,
    dialogTimesheet,
    dialogOpen,
    setDialogOpen,
    rejectionReason,
    setRejectionReason,
    fetchTimesheets,
    handleApprove,
    handleRequestClarification,
    getPendingCount,
    openDialog,
    refreshData
  };
};
