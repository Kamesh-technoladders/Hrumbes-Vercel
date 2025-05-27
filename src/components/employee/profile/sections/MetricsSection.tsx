import React from "react";
import  TimeTracker  from "@/pages/TimeManagement/employee/TimeTracker";
import { CalendarCard } from "../cards/CalendarCard";
import { OnboardingTasksCard } from "../cards/OnboardingTasksCard";
import { UpcomingInterviewsCard } from "../cards/UpcomingInterviewsCard";
import { CandidateTimelineCard } from "../cards/CandidateTimelineCard";
import { SubmissionChartCard } from "../cards/SubmissionChartCard";
import { OnboardingChartCard } from "../cards/OnboardingChartCard";

interface MetricsSectionProps {
  employeeId: string;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ employeeId }) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-2 gap-4 h-[600px] md:h-[625px] lg:h-[600px]">
        {/* First Row: TimeTracker and CandidateTimelineCard */}
        <div className="h-full">
          <TimeTracker employeeId={employeeId} />
        </div>
        <div className="h-full">
          <CandidateTimelineCard employeeId={employeeId} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 h-[300px] md:h-[325px] lg:h-[300px]">
        {/* Second Row: OnboardingTasksCard and UpcomingInterviewsCard */}
        <div className="h-full">
          <OnboardingTasksCard employeeId={employeeId} />
        </div>
        <div className="h-full">
          <UpcomingInterviewsCard employeeId={employeeId} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 h-[300px] md:h-[325px] lg:h-[300px]">
        {/* Third Row: SubmissionChartCard and OnboardingChartCard */}
        <div className="h-full">
          <SubmissionChartCard employeeId={employeeId} />
        </div>
        <div className="h-full">
          <OnboardingChartCard employeeId={employeeId} />
        </div>
      </div>
      <div className="h-[300px] md:h-[325px] lg:h-[300px]">
        {/* Fourth Row: CalendarCard */}
        <CalendarCard employeeId={employeeId} />
      </div>
    </div>
  );
};