import { useState } from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, MessageCircleQuestion, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, formatTime } from "@/utils/timeFormatters";
import { Badge } from "@/components/ui/badge";

interface TimesheetListProps {
  timesheets: TimeLog[];
  loading: boolean;
  searchTerm: string;
  type: 'pending' | 'clarification' | 'approved';
  onViewTimesheet: (timesheet: TimeLog) => void;
  onRespondToClarification?: (timesheet: TimeLog) => void;
  emptyMessage: string;
}

export const formatDuration = (minutes: number | null) => {
  if (!minutes) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const filterTimesheetsByEmployee = (timesheets: TimeLog[], searchTerm: string) => {
  return timesheets.filter(timesheet => {
    const employeeName = timesheet.employee?.first_name && timesheet.employee?.last_name
      ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`.toLowerCase()
      : '';
    return employeeName.includes(searchTerm.toLowerCase());
  });
};

const getLogoutTypeColor = (status: string) => {
  switch (status) {
    case 'normal':
      return "bg-green-100 text-green-800 border-green-200";
    case 'auto_terminated':
      return "bg-red-100 text-red-800 border-red-200";
      case 'grace_period':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatLogoutType = (status: string) => {
  switch (status) {
    case 'normal':
      return 'Normal';
    case 'auto_terminated':
      return 'Auto Terminated';
      case 'grace_period':
        return 'Overtime';
    default:
      return 'Unknown';
  }
};

const TimesheetList = ({
  timesheets,
  loading,
  searchTerm,
  type,
  onViewTimesheet,
  onRespondToClarification,
  emptyMessage,
}: TimesheetListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const formatStatus = (timesheet: TimeLog) => {
    if (type === 'pending') {
      return timesheet.is_submitted ? 'Pending Approval' : 'Not Submitted';
    } else if (type === 'clarification') {
      return 'Clarification Needed';
    } else {
      return 'Approved';
    }
  };

  const getStatusColor = (timesheet: TimeLog) => {
    if (type === 'pending') {
      return timesheet.is_submitted ? 'text-amber-500' : 'text-red-500';
    } else if (type === 'clarification') {
      return 'text-amber-500';
    } else {
      return 'text-green-500';
    }
  };

  const filteredTimesheets = filterTimesheetsByEmployee(timesheets, searchTerm);
  const totalPages = Math.ceil(filteredTimesheets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTimesheets = filteredTimesheets.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (filteredTimesheets.length === 0) {
    return (
      <div className="text-center p-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Employee</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Timesheet Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Submitted on</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Log In</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Log Out</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Duration</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Logout Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTimesheets.map((timesheet) => (
                <tr key={timesheet.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 font-medium">
                    {timesheet.employee?.first_name && timesheet.employee?.last_name
                      ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`
                      : 'Unknown Employee'}
                  </td>
                  <td className="px-4 py-2">{formatDate(timesheet.date)}</td>
                  <td className="px-4 py-2">{formatDate(timesheet.submitted_at)}</td>
                  <td className="px-4 py-2">
                    {timesheet.clock_in_time ? formatTime(timesheet.clock_in_time) : 'N/A'}
                  </td>
                  <td className="px-4 py-2">
                    {timesheet.clock_out_time ? formatTime(timesheet.clock_out_time) : 'N/A'}
                  </td>
                  <td className="px-4 py-2">{formatDuration(timesheet.duration_minutes)}</td>
                  <td className="px-4 py-2">
                    <Badge className={getLogoutTypeColor(timesheet.status)}>
                      {formatLogoutType(timesheet.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <span className={getStatusColor(timesheet)}>{formatStatus(timesheet)}</span>
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    {type === 'pending' && !timesheet.is_submitted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onViewTimesheet(timesheet)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Submit
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onViewTimesheet(timesheet)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    {type === 'clarification' && onRespondToClarification && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onRespondToClarification(timesheet)}
                      >
                        <MessageCircleQuestion className="h-4 w-4 mr-1" />
                        Respond
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTimesheets.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTimesheets.length)} of{" "}
            {filteredTimesheets.length} timesheets
          </span>
        </div>
      )}
    </div>
  );
};

export default TimesheetList;