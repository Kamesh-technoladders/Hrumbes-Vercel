
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate } from "@/utils/timeFormatters";

interface TimeEntrySectionProps {
  timeLog: TimeLog;
}

export const TimeEntrySection = ({ timeLog }: TimeEntrySectionProps) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-100">
      <h3 className="text-xs font-medium text-purple-800 mb-2">Time Entry Details</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/80 p-2 rounded shadow-sm">
          <span className="text-xs text-purple-600 block">Date</span>
          <span className="text-sm font-medium">{formatDate(timeLog.date)}</span>
        </div>
        <div className="bg-white/80 p-2 rounded shadow-sm">
          <span className="text-xs text-purple-600 block">Duration</span>
          <span className="text-sm font-medium">
            {timeLog.duration_minutes
              ? `${Math.floor(timeLog.duration_minutes / 60)}h ${
                  timeLog.duration_minutes % 60
                }m`
              : "N/A"}
          </span>
        </div>
        <div className="bg-white/80 p-2 rounded shadow-sm">
          <span className="text-xs text-purple-600 block">Clock In</span>
          <span className="text-sm font-medium">
            {timeLog.clock_in_time ? new Date(timeLog.clock_in_time).toLocaleTimeString() : 'N/A'}
          </span>
        </div>
        <div className="bg-white/80 p-2 rounded shadow-sm">
          <span className="text-xs text-purple-600 block">Clock Out</span>
          <span className="text-sm font-medium">
            {timeLog.clock_out_time
              ? new Date(timeLog.clock_out_time).toLocaleTimeString()
              : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};
