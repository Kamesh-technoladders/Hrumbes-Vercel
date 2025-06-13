import React, { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProjectAllocationForm } from './ProjectAllocationForm';
import { StandardTimesheetForm } from '../StandardTimesheetForm';
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { useProjectData } from '@/hooks/TimeManagement/useProjectData';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TimesheetDialogContentProps {
  date: Date;
  setDate: (date: Date) => void;
  detailedEntries: DetailedTimesheetEntry[];
  setDetailedEntries: React.Dispatch<React.SetStateAction<DetailedTimesheetEntry[]>>;
  projectEntries: { projectId: string; clockIn?: string; clockOut?: string; hours: number; report: string }[];
  setProjectEntries: React.Dispatch<React.SetStateAction<{ projectId: string; clockIn?: string; clockOut?: string; hours: number; report: string }[]>>;
  employeeHasProjects: boolean;
  isSubmitting: boolean;
  handleClose: () => void;
  handleSubmit: (title: string, workReport: string) => void;
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
  const [title, setTitle] = useState("");
  const [workReport, setWorkReport] = useState("");

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

  useEffect(() => {
    if (employeeHasProjects) {
      const updatedEntries = projectEntries.map((entry) => ({
        projectId: entry.projectId,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        hours: entry.hours,
        report: projectReports[entry.projectId] || entry.report || "",
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

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Timesheet Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter timesheet title"
            className="mt-1"
          />
        </div>
        {/* <div>
          <Label htmlFor="workReport">General Work Report</Label>
          <Textarea
            id="workReport"
            value={workReport}
            onChange={(e) => setWorkReport(e.target.value)}
            placeholder="Describe your overall work for the day"
            className="mt-1 min-h-[80px]"
          />
        </div> */}

        {employeeHasProjects ? (
          <ProjectAllocationForm
            date={date}
            setDate={setDate}
            projectEntries={projectEntries}
            setProjectEntries={setProjectEntries}
            projects={projects}
            updateProjectTimeAllocation={updateProjectTimeAllocation}
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
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>Cancel</Button>
        <Button
          onClick={() => handleSubmit(title, workReport)}
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? "Submitting..." : "Submit Timesheet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};