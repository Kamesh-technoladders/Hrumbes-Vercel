
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate } from "@/utils/timeFormatters";
import { formatDuration } from "../TimesheetList";

interface TimesheetInfoProps {
  dialogTimesheet: TimeLog;
  type: 'normal' | 'clarification';
}

export const TimesheetInfo = ({ dialogTimesheet, type }: TimesheetInfoProps) => {

  console.log("dialogTimesheet", dialogTimesheet)
  return (
    <div className="space-y-4" >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold">Employee</h4>
          <p>{dialogTimesheet.employee?.first_name && dialogTimesheet.employee?.last_name
    ? `${dialogTimesheet.employee.first_name} ${dialogTimesheet.employee.last_name}`
    : 'Unknown Employee'}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Department</h4>
          <p>{dialogTimesheet?.employee?.department?.name || dialogTimesheet?.employee?.hr_departments?.name || 'Unknown'}</p>
        </div>
      </div>
      
      {type === 'normal' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold">Date</h4>
              <p>{formatDate(dialogTimesheet.date)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Duration</h4>
              <p>{formatDuration(dialogTimesheet.duration_minutes)}</p>
            </div>
          {/* <div>
            <h4 className="text-sm font-semibold">Notes</h4>
            <p className="text-sm text-muted-foreground">{dialogTimesheet.notes || 'No notes provided'}</p>
          </div> */}
          <div>
            <h4 className="text-sm font-semibold">Status</h4>
            <p className="text-sm text-muted-foreground">{dialogTimesheet.status || 'No notes provided'}</p>
          </div>
          </div>

        </>
      ) : (
        <>
          <div>
            <h4 className="text-sm font-semibold">Date</h4>
            <p>{formatDate(dialogTimesheet.date)}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Original Issue</h4>
            <p className="text-sm text-muted-foreground">{dialogTimesheet.rejection_reason || 'No reason provided'}</p>
          </div>
          <div className="bg-slate-200 p-3 rounded-md">
            <h4 className="text-sm font-semibold">Employee's Clarification</h4>
            <p className="text-sm mt-1">{dialogTimesheet.clarification_response || 'No clarification provided'}</p>
          </div>
        </>
      )}
    </div>
  );
};
