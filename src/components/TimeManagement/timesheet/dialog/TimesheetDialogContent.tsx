
import React, { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimesheetFormFields } from "./TimesheetFormFields";
import { ProjectTimesheetForm } from '../ProjectTimesheetForm';
import { StandardTimesheetForm } from '../StandardTimesheetForm';
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { ProjectAllocationForm } from './ProjectAllocationForm';
import { useProjectData } from '@/hooks/TimeManagement/useProjectData';

interface TimesheetDialogContentProps {
  date: Date;
  setDate: (date: Date) => void;
  title: string;
  setTitle: (title: string) => void;
  totalWorkingHours: number;
  setTotalWorkingHours: (hours: number) => void;
  workReport: string;
  setWorkReport: (report: string) => void;
  detailedEntries: DetailedTimesheetEntry[];
  setDetailedEntries: React.Dispatch<React.SetStateAction<DetailedTimesheetEntry[]>>;
  projectEntries: {projectId: string; hours: number; report: string}[];
  setProjectEntries: React.Dispatch<React.SetStateAction<{projectId: string; hours: number; report: string}[]>>;
  employeeHasProjects: boolean;
  isSubmitting: boolean;
  handleClose: () => void;
  handleSubmit: () => void;
}

export const TimesheetDialogContent: React.FC<TimesheetDialogContentProps> = ({
  date,
  setDate,
  title,
  setTitle,
  totalWorkingHours,
  setTotalWorkingHours,
  workReport,
  setWorkReport,
  detailedEntries,
  setDetailedEntries,
  projectEntries,
  setProjectEntries,
  employeeHasProjects,
  isSubmitting,
  handleClose,
  handleSubmit
}) => {
  const { projects, loading } = useProjectData();
  const [projectTimeData, setProjectTimeData] = useState<{[key: string]: number}>({});
  const [projectReports, setProjectReports] = useState<{[key: string]: string}>({});
  
  // Initialize project allocation state from projectEntries
  const [multipleProjects, setMultipleProjects] = useState(
    projectEntries.map(entry => ({
      projectId: entry.projectId,
      hours: entry.hours
    }))
  );
  
  // Calculate total allocated hours
  const totalAllocatedHours = multipleProjects.reduce((sum, project) => {
    return sum + (project.hours || 0);
  }, 0);

  // Update project time allocation
  const updateProjectTimeAllocation = (projectId: string, hours: number) => {
    setProjectTimeData(prev => ({
      ...prev,
      [projectId]: hours
    }));
  };

  // Update project report
  const updateProjectReport = (projectId: string, report: string) => {
    setProjectReports(prev => ({
      ...prev,
      [projectId]: report
    }));
  };

  // Sync project entries when form is submitted
  React.useEffect(() => {
    if (employeeHasProjects) {
      const updatedEntries = multipleProjects
        .filter(project => project.projectId)
        .map(project => ({
          projectId: project.projectId,
          hours: project.hours,
          report: projectReports[project.projectId] || ''
        }));
      
      setProjectEntries(updatedEntries);
    }
  }, [multipleProjects, projectReports, employeeHasProjects]);

  // Sync initial project reports from projectEntries
  React.useEffect(() => {
    if (employeeHasProjects && projectEntries.length > 0) {
      const initialReports: {[key: string]: string} = {};
      projectEntries.forEach(entry => {
        if (entry.projectId) {
          initialReports[entry.projectId] = entry.report;
        }
      });
      setProjectReports(initialReports);
    }
  }, []);

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Timesheet</DialogTitle>
        <DialogDescription>
          Fill in the details below to create a new timesheet.
        </DialogDescription>
      </DialogHeader>

      <TimesheetFormFields
        date={date}
        setDate={setDate}
        title={title}
        setTitle={setTitle}
        totalWorkingHours={totalWorkingHours}
        setTotalWorkingHours={setTotalWorkingHours}
        workReport={workReport}
        setWorkReport={setWorkReport}
      />
      
      {employeeHasProjects ? (
        <ProjectAllocationForm
          multipleProjects={multipleProjects}
          setMultipleProjects={setMultipleProjects}
          projects={projects}
          totalAllocatedHours={totalAllocatedHours}
          actualWorkingHours={totalWorkingHours}
          updateProjectTimeAllocation={updateProjectTimeAllocation}
          projectReports={projectReports}
          updateProjectReport={updateProjectReport}
        />
      ) : (
        <StandardTimesheetForm
          detailedEntries={detailedEntries}
          setDetailedEntries={setDetailedEntries}
          totalWorkingHours={totalWorkingHours}
        />
      )}

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || 
            (employeeHasProjects && (
              totalAllocatedHours > totalWorkingHours ||
              multipleProjects.some(p => p.projectId && !projectReports[p.projectId])
            ))
          }
        >
          {isSubmitting ? 'Submitting...' : 'Submit Timesheet'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
