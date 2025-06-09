import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, MessageCircleQuestion, ChevronLeft, ChevronRight } from "lucide-react";
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate, formatTime } from "@/utils/timeFormatters";

interface TimesheetTableProps {
  timesheets: TimeLog[];
  loading: boolean;
  onViewTimesheet: (timesheet: TimeLog) => void;
  onRespondToClarification?: (timesheet: TimeLog) => void;
  type: 'pending' | 'clarification' | 'approved';
  employeeHasProjects: boolean;
}

export const TimesheetTable: React.FC<TimesheetTableProps> = ({
  timesheets,
  loading,
  onViewTimesheet,
  onRespondToClarification,
  type,
  employeeHasProjects,
}) => {
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

  // Pagination logic
  const totalPages = Math.ceil(timesheets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTimesheets = timesheets.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }


  if (timesheets.length === 0) {
    return (
      <div className="text-center p-12 text-gray-500">
        <p>No timesheets found.</p>
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
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Log In</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Log Out</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Duration</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTimesheets.map((timesheet) => (
                <tr key={timesheet.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 font-medium">{formatDate(timesheet.date)}</td>
                  <td className="px-4 py-2">
                    {timesheet.clock_in_time ? formatTime(timesheet.clock_in_time) : 'N/A'}
                  </td>
                  <td className="px-4 py-2">
                    {timesheet.clock_out_time ? formatTime(timesheet.clock_out_time) : 'N/A'}
                  </td>
                  <td className="px-4 py-2">
                    {timesheet.duration_minutes
                      ? `${Math.floor(timesheet.duration_minutes / 60)}h ${timesheet.duration_minutes % 60}m`
                      : 'N/A'}
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

      {/* Pagination */}
      {timesheets.length > 0 && (
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
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, timesheets.length)} of{" "}
            {timesheets.length} timesheets
          </span>
        </div>
      )}
    </div>
  );
};