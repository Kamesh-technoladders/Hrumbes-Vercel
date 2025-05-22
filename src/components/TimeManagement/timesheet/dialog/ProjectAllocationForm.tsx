
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Project } from "@/types/project-types";
import { ProjectAllocationItem } from "./ProjectAllocationItem";
import { FormSectionHeader } from "./FormSectionHeader";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProjectAllocationFormProps {
  multipleProjects: { projectId: string; hours: number }[];
  setMultipleProjects: React.Dispatch<React.SetStateAction<{ projectId: string; hours: number }[]>>;
  projects: Project[];
  totalAllocatedHours: number;
  actualWorkingHours: number;
  updateProjectTimeAllocation?: (projectId: string, hours: number) => void;
  projectReports?: {[key: string]: string};
  updateProjectReport?: (projectId: string, report: string) => void;
}

export const ProjectAllocationForm = ({
  multipleProjects,
  setMultipleProjects,
  projects,
  totalAllocatedHours,
  actualWorkingHours,
  updateProjectTimeAllocation,
  projectReports = {},
  updateProjectReport
}: ProjectAllocationFormProps) => {
  const handleAddProject = () => {
    // Only add if there are no empty project slots
    if (!multipleProjects.some(p => !p.projectId)) {
      setMultipleProjects([...multipleProjects, { projectId: "", hours: 0 }]);
    }
  };

  const handleRemoveProject = (index: number) => {
    const newProjects = [...multipleProjects];
    const removedProject = newProjects[index];
    
    // Update project time allocation to remove the project
    if (updateProjectTimeAllocation && removedProject.projectId) {
      updateProjectTimeAllocation(removedProject.projectId, 0);
    }
    
    newProjects.splice(index, 1);
    setMultipleProjects(newProjects);

    // Always ensure there's at least one project allocation slot
    if (newProjects.length === 0) {
      setMultipleProjects([{ projectId: "", hours: 0 }]);
    }
  };

  const handleProjectChange = (index: number, projectId: string) => {
    const newProjects = [...multipleProjects];
    
    // If we're changing project, update time allocation
    if (updateProjectTimeAllocation && newProjects[index].projectId) {
      updateProjectTimeAllocation(newProjects[index].projectId, 0);
    }
    
    newProjects[index].projectId = projectId;
    setMultipleProjects(newProjects);
  };

  const handleHoursChange = (index: number, hours: string) => {
    const numericHours = parseFloat(hours) || 0;
    const newProjects = [...multipleProjects];
    newProjects[index].hours = numericHours;
    setMultipleProjects(newProjects);
    
    if (updateProjectTimeAllocation && newProjects[index].projectId) {
      updateProjectTimeAllocation(newProjects[index].projectId, numericHours);
    }
  };

  // Get already selected projects to filter them out
  const selectedProjectIds = multipleProjects
    .filter(p => p.projectId)
    .map(p => p.projectId);

  // Initialize with at least one project if empty
  React.useEffect(() => {
    if (multipleProjects.length === 0) {
      setMultipleProjects([{ projectId: "", hours: 0 }]);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <FormSectionHeader title="Project Allocation" required={true} />
        <div className="text-sm">
          Total Hours: <span className={totalAllocatedHours > actualWorkingHours ? "text-red-500 font-bold" : "font-medium"}>
            {totalAllocatedHours} / {actualWorkingHours}
          </span>
        </div>
      </div>

      {multipleProjects.map((project, index) => (
        <div key={index} className="border rounded-md p-4 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Project {index + 1}</h4>
            {multipleProjects.length > 1 && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleRemoveProject(index)}
                className="h-8 px-2 text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ProjectAllocationItem
            index={index}
            project={project}
            allProjects={projects}
            selectedProjectIds={selectedProjectIds}
            onRemove={() => handleRemoveProject(index)}
            onProjectChange={(projectId) => handleProjectChange(index, projectId)}
            onHoursChange={(hours) => handleHoursChange(index, hours)}
          />
          
          {project.projectId && updateProjectReport && (
            <div className="mt-3">
              <Label htmlFor={`project-report-${index}`}>Project Work Report</Label>
              <Textarea
                id={`project-report-${index}`}
                value={projectReports[project.projectId] || ''}
                onChange={(e) => updateProjectReport(project.projectId, e.target.value)}
                placeholder="Describe what you worked on for this project"
                className="mt-1 min-h-[80px]"
              />
            </div>
          )}
        </div>
      ))}

      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleAddProject}
        disabled={multipleProjects.some(p => !p.projectId) || 
                 selectedProjectIds.length >= projects.length}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Project
      </Button>
      
      {totalAllocatedHours > actualWorkingHours && (
        <p className="text-sm text-red-500">Total allocated time exceeds the actual working hours. Please adjust your allocations.</p>
      )}
    </div>
  );
};
