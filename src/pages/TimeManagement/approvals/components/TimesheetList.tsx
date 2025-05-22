import { TimeLog } from "@/types/time-tracker-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Eye } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/utils/timeFormatters";
import { DialogProps } from "./TimesheetDialog";

type TimesheetListProps = {
  timesheets: TimeLog[];
  loading: boolean;
  searchTerm: string;
  badgeColor: string;
  badgeText: string;
  emptyMessage: string;
  showActions?: boolean;
  openDialog: (timesheet: TimeLog) => void;
};

export const getBadgeColor = (status: string) => {
  switch (status) {
    case 'pending':
      return "bg-amber-100 text-amber-800 border-amber-200";
    case 'clarification':
      return "bg-blue-100 text-blue-800 border-blue-200";
    case 'approved':
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const formatDuration = (minutes: number | null) => {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const calculatePeriod = (date: string) => {
  const inputDate = new Date(date);
  return format(inputDate, "MMM d, yyyy");
};

export const filterTimesheetsByEmployee = (timesheets: TimeLog[], searchTerm: string) => {
  return timesheets.filter(timesheet => {
    const employeeName = (timesheet as any).employees?.name?.toLowerCase() || '';
    return employeeName.includes(searchTerm.toLowerCase());
  });
};

const TimesheetList = ({
  timesheets,
  loading,
  searchTerm,
  badgeColor,
  badgeText,
  emptyMessage,
  showActions = true,
  openDialog
}: TimesheetListProps) => {
  const filteredTimesheets = filterTimesheetsByEmployee(timesheets, searchTerm);
  
  console.log("filteredTimesheets", filteredTimesheets);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Date</TableHead>
          {badgeText !== "Approved" && <TableHead>Time</TableHead>}
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>{badgeText === "Approved" ? "Approved Date" : badgeText === "Clarified" ? "Submitted At" : "Submitted Date"}</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <p>Loading...</p>
              </div>
            </TableCell>
          </TableRow>
        ) : filteredTimesheets.length > 0 ? (
          filteredTimesheets.map((timesheet) => (
            <TableRow 
              key={timesheet.id} 
              className="hover:bg-muted cursor-pointer"
              onClick={() => openDialog(timesheet)}
            >
              <TableCell>{(timesheet as any).employees?.name || 'Unknown Employee'}</TableCell>
              <TableCell>{calculatePeriod(timesheet.date)}</TableCell>
              {badgeText !== "Approved" && (
                <TableCell>
                  {formatTime(timesheet.clock_in_time)} - {timesheet.clock_out_time ? formatTime(timesheet.clock_out_time) : 'In Progress'}
                </TableCell>
              )}
              <TableCell>{formatDuration(timesheet.duration_minutes)}</TableCell>
              <TableCell>
                <Badge className={getBadgeColor(badgeColor)}>
                  {badgeText}
                </Badge>
              </TableCell>
              <TableCell>
                {badgeText === "Approved" 
                  ? (timesheet.approved_at ? formatDate(timesheet.approved_at) : 'N/A')
                  : badgeText === "Clarified" 
                    ? (timesheet.clarification_submitted_at ? formatDate(timesheet.clarification_submitted_at) : 'Unknown')
                    : formatDate(timesheet.created_at)
                }
              </TableCell>
              {showActions && (
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDialog(timesheet);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    {timesheet.is_approved || (timesheet as any).approval_status === 'approved' ? 'View' : 'Review'}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <CheckSquare className="w-8 h-8 mb-2 opacity-30" />
                <p>{emptyMessage}</p>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default TimesheetList;
