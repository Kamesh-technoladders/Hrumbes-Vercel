import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, ListTodo, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
         isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, format } from "date-fns";
import { CalendarHeader } from "./calendar/CalendarHeader";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { EventsList } from "./calendar/EventsList";
import { TasksList } from "./calendar/TasksList";
import { InterviewsList } from "./calendar/InterviewsList";
import { CalendarDay } from "./calendar/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalendarCardProps {
  employeeId: string;
}

export const CalendarCard: React.FC<CalendarCardProps> = ({ employeeId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [interviewDates, setInterviewDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("interviews");

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setIsLoading(true);
        // Fetch employee data to get first_name and last_name
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("first_name, last_name")
          .eq("id", employeeId)
          .single();

        if (employeeError || !employeeData) {
          throw new Error(`Employee fetch failed: ${employeeError?.message || "No employee found"}`);
        }

        const fullName = `${employeeData.first_name} ${employeeData.last_name}`;

        // Fetch interview dates
        const { data: candidatesData, error: candidatesError } = await supabase
          .from("hr_job_candidates")
          .select("interview_date")
          .eq("main_status_id", "f72e13f8-7825-4793-85e0-e31d669f8097")
          .eq("applied_from", fullName)
          .not("interview_date", "is", null);

        if (candidatesError) {
          throw new Error(`Candidates fetch failed: ${candidatesError.message}`);
        }

        const dates = candidatesData.map(candidate => candidate.interview_date);
        setInterviewDates(dates);
      } catch (error) {
        console.error("Failed to fetch data:", error.message, error.stack);
        toast.error(`Failed to load calendar data: ${error.message}`);
        setInterviewDates([]); // Fallback to empty array
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviews();
  }, [employeeId]);

  const generateMonth = (date: Date): CalendarDay[] => {
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    const days = eachDayOfInterval({ start, end });

    return days.map(day => ({
      date: day,
      isCurrentMonth: isSameMonth(day, date),
      isToday: isSameDay(day, new Date()),
      isSunday: day.getDay() === 0,
      hasInterview: isInterviewDay(day),
    }));
  };

  const isInterviewDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return interviewDates.includes(dateString);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDateSelect = (date: Date, hasInterview: boolean) => {
    setSelectedDate(date);
    if (hasInterview) {
      setActiveTab("interviews");
    }
  };

  const days = generateMonth(currentDate);

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading calendar data...</div>;
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm h-[300px] overflow-hidden">
      <div className="grid grid-cols-[2fr_3fr] gap-4 h-full">
        <div className="flex flex-col space-y-2 min-w-0">
          <CalendarHeader 
            currentDate={currentDate}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />
          <CalendarGrid 
            days={days}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
          />
        </div>
        
        <div className="flex flex-col h-full min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid grid-cols-3 mb-1.5">
              {/* <TabsTrigger value="events" className="flex items-center gap-1 text-xs">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Events</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1 text-xs">
                <ListTodo className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Tasks</span>
              </TabsTrigger> */}
              <TabsTrigger value="interviews" className="flex items-center gap-1 text-xs">
                <Users className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Interviews</span>
              </TabsTrigger>
            </TabsList>
            
            {/* <TabsContent value="events" className="flex-1 overflow-hidden">
              <EventsList />
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 overflow-hidden">
              <TasksList />
            </TabsContent> */}

            <TabsContent value="interviews" className="flex-1 overflow-hidden">
              <InterviewsList employeeId={employeeId} selectedDate={selectedDate} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  );
};