import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Project } from "@/types/project-types";
import { FormSectionHeader } from "./FormSectionHeader";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ProjectAllocationFormProps {
  date: Date;
  setDate: (date: Date) => void;
  projectEntries: { projectId: string; hours: number; report: string }[];
  setProjectEntries: React.Dispatch<React.SetStateAction<{ projectId: string; hours: number; report: string }[]>>;
  projects: Project[];
  updateProjectTimeAllocation?: (projectId: string, hours: number) => void;
  updateProjectReport?: (projectId: string, report: string) => void;
  employeeId: string;
  hrProjectEmployees: any[];
}

export const ProjectAllocationForm = ({
  date,
  setDate,
  projectEntries,
  setProjectEntries,
  projects,
  updateProjectTimeAllocation,
  updateProjectReport,
  employeeId,
  hrProjectEmployees,
}: ProjectAllocationFormProps) => {
  const [expandedReports, setExpandedReports] = useState<{ [key: string]: boolean }>({});

  const filteredProjects = useMemo(() => {
    const assignedProjectIds = hrProjectEmployees
      .filter((pe) => pe?.assign_employee === employeeId)
      .map((pe) => pe.project_id);
    return projects.filter((project) => assignedProjectIds.includes(project.id));
  }, [projects, hrProjectEmployees, employeeId]);

  // Initialize projectEntries with all filtered projects if empty
  React.useEffect(() => {
    if (projectEntries.length === 0 && filteredProjects.length > 0) {
      const initialEntries = filteredProjects.map((project) => ({
        projectId: project.id,
        hours: 0,
        report: "",
      }));
      setProjectEntries(initialEntries);
    }
  }, [filteredProjects, projectEntries.length, setProjectEntries]);

  const totalProjectHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);

  const handleHoursChange = (projectId: string, hours: string) => {
    const numericHours = hours === "" ? 0 : parseFloat(hours) || 0;
    const newEntries = projectEntries.map((entry) =>
      entry.projectId === projectId ? { ...entry, hours: numericHours } : entry
    );
    setProjectEntries(newEntries);

    if (updateProjectTimeAllocation) {
      updateProjectTimeAllocation(projectId, numericHours);
    }
  };

  const handleReportChange = (projectId: string, report: string) => {
    const newEntries = projectEntries.map((entry) =>
      entry.projectId === projectId ? { ...entry, report } : entry
    );
    setProjectEntries(newEntries);

    if (updateProjectReport) {
      updateProjectReport(projectId, report);
    }
  };

  const toggleReport = (projectId: string) => {
    setExpandedReports((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date.toISOString().split('T')[0]}
          onChange={(e) => setDate(new Date(e.target.value))}
        />
      </div>

      <div className="flex justify-between items-center">
        <FormSectionHeader title="Project Allocation" required={true} />
        <div className="text-sm">
          Total Hours:{" "}
          <span
            className={totalProjectHours > 8 ? "text-red-500 font-bold" : "font-medium"}
          >
            {totalProjectHours} / 8
          </span>
        </div>
      </div>

      {filteredProjects.map((project, index) => {
        const entry = projectEntries.find((e) => e.projectId === project.id) || {
          projectId: project.id,
          hours: 0,
          report: "",
        };
        const isReportExpanded = expandedReports[project.id] || false;

        return (
          <div key={project.id} className="border rounded-md p-4 space-y-3">
            <div className="flex items-center gap-4">
              <h4 className="font-medium flex-1">{project.name || `Project ${index + 1}`}</h4>
              <div className="w-32">
                <Input
                  id={`hours-${project.id}`}
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={entry.hours === 0 && !entry.hours.toString() ? "" : entry.hours}
                  onChange={(e) => handleHoursChange(project.id, e.target.value)}
                  placeholder="Hours"
                  className="h-8"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleReport(project.id)}
                className="h-8 px-2"
              >
                {isReportExpanded ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {isReportExpanded && (
              <div>
                <Label htmlFor={`project-report-${project.id}`}>Work Summary</Label>
                <Textarea
                  id={`project-report-${project.id}`}
                  value={entry.report}
                  onChange={(e) => handleReportChange(project.id, e.target.value)}
                  placeholder="Describe what you worked on for this project"
                  className="mt-1 min-h-[80px]"
                />
              </div>
            )}
          </div>
        );
      })}

      {totalProjectHours > 8 && (
        <p className="text-sm text-red-500">
          Total hours exceed 8 hours. Please adjust your allocations.
        </p>
      )}
    </div>
  );
};