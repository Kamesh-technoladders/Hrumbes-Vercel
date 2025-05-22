import React from "react";
import { WorkTimeCard } from "../cards/WorkTimeCard";
import { TimeTrackerCard } from "../cards/TimeTrackerCard";
import { CalendarCard } from "../cards/CalendarCard";
import { OnboardingTasksCard } from "../cards/OnboardingTasksCard";
import { UpcomingInterviewsCard } from "../cards/UpcomingInterviewsCard";
import TimeTracker from "@/pages/TimeManagement/employee/TimeTracker";

interface MetricsSectionProps {
  employeeId: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ employeeId }) => {
return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px] md:h-[650px] lg:h-[600px]">
        {/* Left: TimeTracker spanning two rows */}
        <div className="row-span-2 h-full">
          <TimeTracker employeeId={employeeId} />
        </div>
        {/* Right: First row with OnboardingTasksCard and UpcomingInterviewsCard */}
        <div className="flex flex-col sm:flex-row gap-4 h-[300px] md:h-[325px] lg:h-[300px] mt-10">
          <div className="flex-1">
            <OnboardingTasksCard employeeId={employeeId} />
          </div>
          <div className="flex-1">
            <UpcomingInterviewsCard employeeId={employeeId} />
          </div>
        </div>
        {/* Right: Second row with CalendarCard */}
        <div className="h-[300px] md:h-[325px] lg:h-[300px]">
          <CalendarCard employeeId={employeeId} />
        </div>
      </div>

      {/* Commented out cards */}
      {/*
        <div className="flex-1 h-[350px] md:h-[400px] lg:h-[350px]">
          <TimeTrackerCard employeeId={employeeId} />
        </div>
        <div className="flex-1 h-[350px] md:h-[400px] lg:h-[350px]">
          <WorkTimeCard employeeId={employeeId} />
        </div>
      */}
    </div>
  );
};