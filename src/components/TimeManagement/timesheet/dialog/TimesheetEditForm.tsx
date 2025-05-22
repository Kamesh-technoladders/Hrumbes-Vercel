
import React, { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeLog } from "@/types/time-tracker-types";

interface TimesheetEditFormProps {
  timesheet?: TimeLog; // Making this optional to maintain compatibility
  editedTimesheet?: TimeLog;
  setEditedTimesheet?: (timesheet: TimeLog) => void;
  formData: {
    workReport: string;
    projectAllocations: any[];
  };
  setFormData: (formData: {
    workReport: string;
    projectAllocations: any[];
  }) => void;
}

export const TimesheetEditForm: React.FC<TimesheetEditFormProps> = ({
  timesheet,
  editedTimesheet,
  setEditedTimesheet,
  formData,
  setFormData,
}) => {
  const [title, setTitle] = useState('');



useEffect(() => {
  const initialTitle = getNotesValue('title');
  setTitle(initialTitle);
}, [editedTimesheet, timesheet]);


  // Handling for new interface with formData
  const handleNotesChange = (workReport: string) => {
    if (setFormData) {
      setFormData({
        ...formData,
        workReport
      });
    }
    
    // For backward compatibility with the original implementation
    if (editedTimesheet && setEditedTimesheet) {
      let parsedNotes = {};
      
      if (typeof editedTimesheet.notes === 'string') {
        try {
          parsedNotes = JSON.parse(editedTimesheet.notes);
        } catch {
          // If parsing fails, create a new object
        }
      }
        
      setEditedTimesheet({
        ...editedTimesheet,
        notes: JSON.stringify({
          ...parsedNotes,
          workReport
        })
      });
    }
  };

 const handleTitleChange = (value: string) => {
  setTitle(value); // update local state

  if (editedTimesheet && setEditedTimesheet) {
    let parsedNotes = {};

    if (typeof editedTimesheet.notes === 'string') {
      try {
        parsedNotes = JSON.parse(editedTimesheet.notes);
      } catch {
        // fallback to empty object
      }
    }

    setEditedTimesheet({
      ...editedTimesheet,
      notes: JSON.stringify({
        ...parsedNotes,
        title: value,
      }),
    });
  }
};


  // Helper function to safely extract values from notes
  const getNotesValue = (key: string): string => {
    // First, check from the formData
    if (key === 'workReport' && formData?.workReport !== undefined) {
      return formData.workReport;
    }
    
    // For backward compatibility, also check from editedTimesheet
    const targetObject = editedTimesheet || timesheet;
    
    if (!targetObject) return '';
    
    if (typeof targetObject.notes === 'string') {
      try {
        const parsedNotes = JSON.parse(targetObject.notes);
        return parsedNotes[key] || '';
      } catch {
        return '';
      }
    }
    
    if (typeof targetObject.notes === 'object' && targetObject.notes !== null) {
      return (targetObject.notes as Record<string, any>)[key] || '';
    }
    
    return '';
  };

  // Calculate total working hours from duration_minutes
  const targetTimesheet = editedTimesheet || timesheet;
  const calculatedWorkingHours = targetTimesheet?.duration_minutes 
    ? (targetTimesheet.duration_minutes / 60).toFixed(2)
    : '0.00';

  return (
    <div>
      <Label htmlFor="title">Title</Label>
      <Input
  id="title"
  value={title}
  onChange={(e) => handleTitleChange(e.target.value)}
  placeholder="Timesheet Title"
  className="mb-3"
/>

      
      <Label htmlFor="totalWorkingHours">Total Working Hours</Label>
      <Input
        id="totalWorkingHours"
        type="number"
        value={calculatedWorkingHours}
        readOnly
        className="mb-3 bg-muted"
      />

      <Label>Notes</Label>
      <Textarea
        value={getNotesValue('workReport')}
        onChange={(e) => handleNotesChange(e.target.value)}
        placeholder="Add your notes here"
        className="mt-1"
      />
    </div>
  );
};
