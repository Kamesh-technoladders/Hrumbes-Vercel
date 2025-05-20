import React from "react";
import { WorkTimeCard } from "../cards/WorkTimeCard";
import { TimeTrackerCard } from "../cards/TimeTrackerCard";

import { CalendarCard } from "../cards/CalendarCard";
import { OnboardingTasksCard } from "../cards/OnboardingTasksCard";

interface MetricsSectionProps {
  employeeId: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ employeeId }) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Row 1: TimeTrackerCard, WorkTimeCard, and GoalsCard */}
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
      </div>
      {/* Row 2: CalendarCard */}
      <div className="h-[300px] md:h-[350px] lg:h-[300px]">
        <CalendarCard />
      </div>
      <div className="h-[300px] md:h-[350px] lg:h-[300px]">
        </div>

    </div>
  );
};