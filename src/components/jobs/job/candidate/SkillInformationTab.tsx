import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateFormData } from "./AddCandidateDrawer";
import SkillRatingItem from "./SkillRatingItem";

interface SkillInformationTabProps {
  form: UseFormReturn<CandidateFormData>;
  jobSkills: string[];
  onSave: (data: CandidateFormData) => void;
  onCancel: () => void;
}

const SkillInformationTab = ({ 
  form, 
  jobSkills,
  onSave, 
  onCancel 
}: SkillInformationTabProps) => {
  const [newSkill, setNewSkill] = useState("");
  
  const skills = form.watch("skills");
  
  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    
    if (!trimmedSkill) {
      toast.error("Skill name cannot be empty.");
      return;
    }
    
    // Check if skill already exists
    if (skills.some(s => s.name.toLowerCase() === trimmedSkill.toLowerCase())) {
      toast.error("Skill already exists.");
      return;
    }
    
    // Add new skill with default rating of 3 and empty experience fields
    const updatedSkills = [...skills, { 
      name: trimmedSkill, 
      rating: 0, 
      experienceYears: undefined, 
      experienceMonths: undefined 
    }];
    form.setValue("skills", updatedSkills);
    setNewSkill("");
  };
  
  const handleRatingChange = (skillName: string, newRating: number) => {
    const updatedSkills = skills.map(skill => 
      skill.name === skillName 
        ? { ...skill, rating: newRating } 
        : skill
    );
    
    form.setValue("skills", updatedSkills);
  };

  const handleExperienceYearsChange = (skillName: string, newExperienceYears: number) => {
    const updatedSkills = skills.map(skill => 
      skill.name === skillName 
        ? { ...skill, experienceYears: newExperienceYears } 
        : skill
    );
    
    form.setValue("skills", updatedSkills);
  };

  const handleExperienceMonthsChange = (skillName: string, newExperienceMonths: number) => {
    const updatedSkills = skills.map(skill => 
      skill.name === skillName 
        ? { ...skill, experienceMonths: newExperienceMonths } 
        : skill
    );
    
    form.setValue("skills", updatedSkills);
  };
  
  const handleRemoveSkill = (skillName: string) => {
    const updatedSkills = skills.filter(skill => skill.name !== skillName);
    form.setValue("skills", updatedSkills);
  };

  // Validation function for skills
  const validateSkills = (skills: CandidateFormData["skills"]) => {
    if (skills.length === 0) {
      toast.error("At least one skill is required.");
      return false;
    }

    for (const skill of skills) {
      if (skill.rating < 1 || skill.rating > 5) {
        toast.error(`Rating for ${skill.name} must be between 1 and 5.`);
        return false;
      }
      if (skill.experienceYears === undefined) {
        toast.error(`Experience years for ${skill.name} is required.`);
        return false;
      }
      if (skill.experienceYears < 0) {
        toast.error(`Experience years for ${skill.name} cannot be negative.`);
        return false;
      }
      if (skill.experienceMonths === undefined) {
        toast.error(`Experience months for ${skill.name} is required.`);
        return false;
      }
      if (skill.experienceMonths < 0 || skill.experienceMonths > 11) {
        toast.error(`Experience months for ${skill.name} must be between 0 and 11.`);
        return false;
      }
    }
    return true;
  };

  // Handle form submission with validation
  const handleSubmit = (data: CandidateFormData) => {
    if (validateSkills(data.skills)) {
      onSave(data);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        <div>
          <h3 className="text-lg font-medium mb-4">Candidate Skills</h3>
          
          {/* Add new skill input */}
          <div className="flex items-center space-x-2 mb-6">
            <Input
              placeholder="Add a new skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={handleAddSkill} 
              size="sm"
              variant="outline"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          
          {/* Skills list with ratings */}
          <div className="space-y-4">
            {skills.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No skills added yet. Add skills to rate the candidate.
              </p>
            ) : (
              skills.map(skill => (
                <SkillRatingItem
                  key={skill.name}
                  skill={skill.name}
                  rating={skill.rating}
                  experienceYears={skill.experienceYears}
                  experienceMonths={skill.experienceMonths}
                  isJobSkill={jobSkills.includes(skill.name)}
                  onRatingChange={(newRating) => handleRatingChange(skill.name, newRating)}
                  onExperienceYearsChange={(newExperienceYears) => handleExperienceYearsChange(skill.name, newExperienceYears)}
                  onExperienceMonthsChange={(newExperienceMonths) => handleExperienceMonthsChange(skill.name, newExperienceMonths)}
                  onRemove={() => handleRemoveSkill(skill.name)}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save & Next
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SkillInformationTab;