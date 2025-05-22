import { useState, useEffect } from "react";
import { useTimeTracker } from "@/hooks/TimeManagement/useTimeTracker";
import { TimeTrackerCard } from "@/components/TimeManagement/timetracker/TimeTrackerCard";
import { Timer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/TimeManagement/ui/alert";
import { hasUnsubmittedTimesheets, filterUnsubmittedTimesheets, isPreviousDayTimesheet } from "@/utils/timeTrackerUtils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEmployeeLeaves } from "@/hooks/TimeManagement/useEmployeeLeaves";

interface TimeTrackerProps {
  employeeId: string;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ employeeId }) => {
  const navigate = useNavigate();
  const [hasUnsubmitted, setHasUnsubmitted] = useState(false);
  const [hasPreviousDayUnsubmitted, setHasPreviousDayUnsubmitted] = useState(false);

  // Add leave check
  const { isLeaveDay } = useEmployeeLeaves(employeeId);
  const isOnApprovedLeave = isLeaveDay(new Date());

  const {
    isTracking,
    time,
    notes,
    setNotes,
    timeLogs,
    inGracePeriod,
    handleClockIn,
    handleClockOut,
    loadTimeLogs
  } = useTimeTracker(employeeId);

  // Check for unsubmitted timesheets
  useEffect(() => {
    if (timeLogs.length > 0) {
      const unsubmitted = filterUnsubmittedTimesheets(timeLogs);
      setHasUnsubmitted(unsubmitted.length > 0);
      setHasPreviousDayUnsubmitted(unsubmitted.some(isPreviousDayTimesheet));
    }
  }, [timeLogs]);

  // Reload time logs periodically to check for unsubmitted timesheets
  useEffect(() => {
    if (employeeId) {
      const interval = setInterval(() => {
        loadTimeLogs();
      }, 300000); // Check every 5 minutes
      return () => clearInterval(interval);
    }
  }, [employeeId, loadTimeLogs]);

  const goToTimesheet = () => {
    navigate("/employee/timesheet");
  };

  return (
    <div className="content-area">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-primary">
          <Timer className="h-6 w-6" />
          Time Tracker
        </h1>
        <p className="text-muted-foreground">
          Track your daily work hours and attendance
        </p>
      </div>

      {hasPreviousDayUnsubmitted && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Unsubmitted Timesheets</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <div>You have unsubmitted timesheets from previous days. Please submit them before clocking in today.</div>
            <Button onClick={goToTimesheet} variant="outline">Go to Timesheets</Button>
          </AlertDescription>
        </Alert>
      )}

      {hasUnsubmitted && !hasPreviousDayUnsubmitted && (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>Pending Timesheets</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <div>You have timesheets that need to be submitted.</div>
            <Button onClick={goToTimesheet} variant="outline">Go to Timesheets</Button>
          </AlertDescription>
        </Alert>
      )}

      <TimeTrackerCard
        employeeId={employeeId}
        isTracking={isTracking}
        time={time}
        notes={notes}
        setNotes={setNotes}
        handleClockIn={isOnApprovedLeave ? undefined : (hasPreviousDayUnsubmitted ? undefined : handleClockIn)}
        handleClockOut={handleClockOut}
        inGracePeriod={inGracePeriod}
        timeLogs={timeLogs}
        isOnApprovedLeave={isOnApprovedLeave}
      />
    </div>
  );
};

export default TimeTracker;