import React, { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProjectAllocationForm } from './ProjectAllocationForm';
import { StandardTimesheetForm } from '../StandardTimesheetForm';
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { useProjectData } from '@/hooks/TimeManagement/useProjectData';

interface TimesheetDialogContentProps {
  date: Date;
  setDate: (date: Date) => void;
  detailedEntries: DetailedTimesheetEntry[];
  setDetailedEntries: React.Dispatch<React.SetStateAction<DetailedTimesheetEntry[]>>;
  projectEntries: { projectId: string; hours: number; report: string }[];
  setProjectEntries: React.Dispatch<React.SetStateAction<{ projectId: string; hours: number; report: string }[]>>;
  employeeHasProjects: boolean;
  isSubmitting: boolean;
  handleClose: () => void;
  handleSubmit: () => void;
  employeeId: string;
  hrProjectEmployees: any[];
}

export const TimesheetDialogContent: React.FC<TimesheetDialogContentProps> = ({
  date,
  setDate,
  detailedEntries,
  setDetailedEntries,
  projectEntries,
  setProjectEntries,
  employeeHasProjects,
  isSubmitting,
  handleClose,
  handleSubmit,
  employeeId,
  hrProjectEmployees,
}) => {
  const { projects, loading } = useProjectData();
  const [projectTimeData, setProjectTimeData] = useState<{ [key: string]: number }>({});
  const [projectReports, setProjectReports] = useState<{ [key: string]: string }>({});

  const updateProjectTimeAllocation = (projectId: string, hours: number) => {
    setProjectTimeData((prev) => ({
      ...prev,
      [projectId]: hours,
    }));
  };

  const updateProjectReport = (projectId: string, report: string) => {
    setProjectReports((prev) => ({
      ...prev,
      [projectId]: report,
    }));
  };

  React.useEffect(() => {
    if (employeeHasProjects) {
      const updatedEntries = projectEntries.map((entry) => ({
        projectId: entry.projectId,
        hours: entry.hours,
        report: projectReports[entry.projectId] || "",
      }));
      setProjectEntries(updatedEntries);
    }
  }, [projectReports, employeeHasProjects, setProjectEntries]);

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Timesheet</DialogTitle>
        <DialogDescription>
          Fill in the details below to create a new timesheet.
        </DialogDescription>
      </DialogHeader>

      {employeeHasProjects ? (
        <ProjectAllocationForm
          date={date}
          setDate={setDate}
          projectEntries={projectEntries}
          setProjectEntries={setProjectEntries}
          projects={projects}
          updateProjectTimeAllocation={updateProjectTimeAllocation}
          projectReports={projectReports}
          updateProjectReport={updateProjectReport}
          employeeId={employeeId}
          hrProjectEmployees={hrProjectEmployees}
        />
      ) : (
        <StandardTimesheetForm
          detailedEntries={detailedEntries}
          setDetailedEntries={setDetailedEntries}
        />
      )}

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Timesheet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};