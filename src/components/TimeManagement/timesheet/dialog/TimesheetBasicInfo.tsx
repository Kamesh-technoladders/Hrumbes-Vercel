
import React from 'react';
import { formatDate } from "@/utils/timeFormatters";
import { TimeLog } from "@/types/time-tracker-types";

interface TimesheetBasicInfoProps {
  timesheet: TimeLog;
}

export const TimesheetBasicInfo: React.FC<TimesheetBasicInfoProps> = ({ timesheet }) => {
  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  console.log("Timesheet data:", timesheet);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Date</h3>
        <p>{formatDate(timesheet.date)}</p>
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Duration</h3>
        <p>{formatDuration(timesheet.duration_minutes)}</p>
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Status</h3>
        <p className="capitalize">{timesheet.status || 'Normal'}</p>
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Submission Status</h3>
        <p>{timesheet.is_submitted ? 'Submitted' : 'Not submitted'}</p>
      </div>
    </div>
  );
};
