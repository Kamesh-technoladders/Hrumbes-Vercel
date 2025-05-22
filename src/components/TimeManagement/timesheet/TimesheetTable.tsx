
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, MessageCircleQuestion } from "lucide-react";
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate, formatTime } from "@/utils/timeFormatters";

interface TimesheetTableProps {
  timesheets: TimeLog[];
  loading: boolean;
  onViewTimesheet: (timesheet: TimeLog) => void;
  onRespondToClarification?: (timesheet: TimeLog) => void;
  type: 'pending' | 'clarification' | 'approved';
}

export const TimesheetTable: React.FC<TimesheetTableProps> = ({
  timesheets,
  loading,
  onViewTimesheet,
  onRespondToClarification,
  type
}) => {
  // Function to format status for display
  const formatStatus = (timesheet: TimeLog) => {
    if (type === 'pending') {
      return timesheet.is_submitted ? 'Pending Approval' : 'Not Submitted';
    } else if (type === 'clarification') {
      return 'Clarification Needed';
    } else {
      return 'Approved';
    }
  };

  // Function to get the right status color
  const getStatusColor = (timesheet: TimeLog) => {
    if (type === 'pending') {
      return timesheet.is_submitted ? 'text-amber-500' : 'text-red-500';
    } else if (type === 'clarification') {
      return 'text-amber-500';
    } else {
      return 'text-green-500';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading timesheets...</div>;
  }

  if (timesheets.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No timesheets found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Clock In</th>
            <th className="text-left p-2">Clock Out</th>
            <th className="text-left p-2">Duration</th>
            <th className="text-left p-2">Status</th>
            <th className="text-right p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {timesheets.map((timesheet) => (
            <tr key={timesheet.id} className="border-b hover:bg-muted/50">
              <td className="p-2">{formatDate(timesheet.date)}</td>
              <td className="p-2">{timesheet.clock_in_time ? formatTime(timesheet.clock_in_time) : 'N/A'}</td>
              <td className="p-2">{timesheet.clock_out_time ? formatTime(timesheet.clock_out_time) : 'N/A'}</td>
              <td className="p-2">
                {timesheet.duration_minutes 
                  ? `${Math.floor(timesheet.duration_minutes / 60)}h ${timesheet.duration_minutes % 60}m` 
                  : 'N/A'}
              </td>
              <td className="p-2">
                <span className={getStatusColor(timesheet)}>
                  {formatStatus(timesheet)}
                </span>
              </td>
              <td className="p-2 text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewTimesheet(timesheet)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {type === 'clarification' && onRespondToClarification && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onRespondToClarification(timesheet)}
                    >
                      <MessageCircleQuestion className="h-4 w-4 mr-1" />
                      Respond
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
