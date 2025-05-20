import React from "react";
import { WorkTimeCard } from "../cards/WorkTimeCard";
import { TimeTrackerCard } from "../cards/TimeTrackerCard";
import { CalendarCard } from "../cards/CalendarCard";
import { OnboardingTasksCard } from "../cards/OnboardingTasksCard";
import { UpcomingInterviewsCard } from "../cards/UpcomingInterviewsCard";

interface MetricsSectionProps {
  employeeId: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ employeeId }) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Row 1: TimeTrackerCard, WorkTimeCard, OnboardingTasksCard, and UpcomingInterviewsCard */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 h-[350px] md:h-[400px] lg:h-[350px]">
          <TimeTrackerCard employeeId={employeeId} />
        </div>
        <div className="flex-1 h-[350px] md:h-[400px] lg:h-[350px]">
          <WorkTimeCard employeeId={employeeId} />
        </div>
        <div className="flex-1 h-[350px] md:h-[400px] lg:h-[350px]">
          <OnboardingTasksCard employeeId={employeeId} />
        </div>
        <div className="flex-1 h-[350px] md:h-[400px] lg:h-[350px]">
          <UpcomingInterviewsCard employeeId={employeeId} />
        </div>
      </div>
      {/* Row 2: CalendarCard with 1/4 width */}
      <div className="flex flex-row gap-4">
        <div className="w-1/2 h-[300px] md:h-[350px] lg:h-[300px]">
          <CalendarCard employeeId={employeeId} />
        </div>
        <div className="flex-1 h-[300px] md:h-[350px] lg:h-[300px]">
          {/* Placeholder for future content */}
        </div>
      </div>
    </div>
  );
};