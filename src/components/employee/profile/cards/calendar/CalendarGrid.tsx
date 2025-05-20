import React from "react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarDay } from "./types";

interface CalendarGridProps {
  days: CalendarDay[];
  selectedDate: Date;
  onSelectDate: (date: Date, hasInterview: boolean) => void;
}

const weekDays = [
  { label: 'S', name: 'Sunday' },
  { label: 'M', name: 'Monday' },
  { label: 'T', name: 'Tuesday' },
  { label: 'W', name: 'Wednesday' },
  { label: 'T', name: 'Thursday' },
  { label: 'F', name: 'Friday' },
  { label: 'S', name: 'Saturday' },
];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day.name}
            className="h-5 flex items-center justify-center text-xs font-medium text-gray-400"
          >
            {day.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => (
          <div
            key={index}
            className={cn(
              "h-6 w-6 flex items-center justify-center text-xs relative",
              "rounded-full transition-colors cursor-pointer mx-auto",
              !day.isCurrentMonth && "text-gray-300",
              day.isToday && !day.hasInterview && !isSameDay(day.date, selectedDate) && "bg-blue-50 text-blue-600 font-medium",
              day.hasInterview && !isSameDay(day.date, selectedDate) && "bg-orange-100 text-orange-600 font-medium",
              day.isToday && day.hasInterview && !isSameDay(day.date, selectedDate) && "bg-orange-100 text-orange-600 font-medium border border-blue-200",
              day.isSunday && !day.hasInterview && !isSameDay(day.date, selectedDate) && "text-[#F59E0B]",
              !day.isSunday && day.isCurrentMonth && !day.isToday && !day.hasInterview && !isSameDay(day.date, selectedDate) && "text-gray-900 hover:bg-gray-100",
              isSameDay(day.date, selectedDate) && "bg-[#1A73E8] text-white hover:bg-[#1A73E8]/90"
            )}
            onClick={() => onSelectDate(day.date, day.hasInterview)}
          >
            {format(day.date, 'd')}
            {day.hasInterview && (
              <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-orange-500 rounded-full" />
            )}
          </div>
        ))}
      </div>
    </>
  );
};