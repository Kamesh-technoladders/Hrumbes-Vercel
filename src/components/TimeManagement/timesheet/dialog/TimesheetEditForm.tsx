import React, { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeLog } from "@/types/time-tracker-types";

interface TimesheetEditFormProps {
  timesheet?: TimeLog;
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
  onValidationChange?: (isValid: boolean) => void;
}

export const TimesheetEditForm: React.FC<TimesheetEditFormProps> = ({
  timesheet,
  editedTimesheet,
  setEditedTimesheet,
  formData,
  setFormData,
  onValidationChange,
}) => {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [workReportError, setWorkReportError] = useState<string | null>(null);

  useEffect(() => {
    const initialTitle = getNotesValue('title');
    const initialWorkReport = getNotesValue('workReport');
    setTitle(initialTitle);
    validateTitle(initialTitle);
    validateWorkReport(initialWorkReport);
  }, [editedTimesheet, timesheet]);

  // Validate title
  const validateTitle = (title: string) => {
    const isValid = title.trim().length > 0;
    setTitleError(isValid ? null : 'Title is required');
    updateFormValidity(isValid, workReportError === null);
    return isValid;
  };

  // Validate workReport
  const validateWorkReport = (workReport: string) => {
    const isValid = workReport.trim().length > 0;
    setWorkReportError(isValid ? null : 'Work Summary is required');
    updateFormValidity(titleError === null, isValid);
    return isValid;
  };

  // Update parent component on validation change
  const updateFormValidity = (isTitleValid: boolean, isWorkReportValid: boolean) => {
    if (onValidationChange) {
      onValidationChange(isTitleValid && isWorkReportValid);
    }
  };

  // Handling for title change
  const handleTitleChange = (value: string) => {
    setTitle(value);
    validateTitle(value);

    if (editedTimesheet && setEditedTimesheet) {
      let parsedNotes = {};
      if (typeof editedTimesheet.notes === 'string') {
        try {
          parsedNotes = JSON.parse(editedTimesheet.notes);
        } catch {
          // Fallback to empty object
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

  // Handling for workReport change
  const handleNotesChange = (workReport: string) => {
    validateWorkReport(workReport);

    if (setFormData) {
      setFormData({
        ...formData,
        workReport,
      });
    }

    if (editedTimesheet && setEditedTimesheet) {
      let parsedNotes = {};
      if (typeof editedTimesheet.notes === 'string') {
        try {
          parsedNotes = JSON.parse(editedTimesheet.notes);
        } catch {
          // Fallback to empty object
        }
      }
      setEditedTimesheet({
        ...editedTimesheet,
        notes: JSON.stringify({
          ...parsedNotes,
          workReport,
        }),
      });
    }
  };

  // Helper function to safely extract values from notes
  const getNotesValue = (key: string): string => {
    if (key === 'workReport' && formData?.workReport !== undefined) {
      return formData.workReport;
    }
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
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Timesheet Title"
          className={`mb-3 ${titleError ? 'border-red-500' : ''}`}
        />
        {titleError && (
          <p className="text-red-500 text-sm mt-1">{titleError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="totalWorkingHours">Total Working Hours</Label>
        <Input
          id="totalWorkingHours"
          type="number"
          value={calculatedWorkingHours}
          readOnly
          className="mb-3 bg-muted"
        />
      </div>

      <div>
        <Label htmlFor="workReport">
          Work Summary <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="workReport"
          value={getNotesValue('workReport')}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add your Work Summary here"
          className={`mt-1 ${workReportError ? 'border-red-500' : ''}`}
        />
        {workReportError && (
          <p className="text-red-500 text-sm mt-1">{workReportError}</p>
        )}
      </div>
    </div>
  );
};

// React Quill Editor

// import React, { useEffect, useState } from 'react';
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css';
// import { TimeLog } from "@/types/time-tracker-types";

// interface TimesheetEditFormProps {
//   timesheet?: TimeLog;
//   editedTimesheet?: TimeLog;
//   setEditedTimesheet?: (timesheet: TimeLog) => void;
//   formData: {
//     workReport: string;
//     projectAllocations: any[];
//   };
//   setFormData: (formData: {
//     workReport: string;
//     projectAllocations: any[];
//   }) => void;
//   onValidationChange?: (isValid: boolean) => void;
// }

// export const TimesheetEditForm: React.FC<TimesheetEditFormProps> = ({
//   timesheet,
//   editedTimesheet,
//   setEditedTimesheet,
//   formData,
//   setFormData,
//   onValidationChange,
// }) => {
//   const [title, setTitle] = useState('');
//   const [titleError, setTitleError] = useState<string | null>(null);
//   const [workReportError, setWorkReportError] = useState<string | null>(null);

//   const quillModules = {
//     toolbar: [
//       [{ 'header': [1, 2, false] }],
//       ['bold', 'italic', 'underline'],
//       [{ 'list': 'ordered' }, { 'list': 'bullet' }],
//       ['clean'],
//     ],
//   };

//   const quillFormats = [
//     'header',
//     'bold',
//     'italic',
//     'underline',
//     'list',
//     'bullet',
//   ];

//   useEffect(() => {
//     const initialTitle = getNotesValue('title');
//     const initialWorkReport = getNotesValue('workReport');
//     setTitle(initialTitle);
//     validateTitle(initialTitle);
//     validateWorkReport(initialWorkReport);
//   }, [editedTimesheet, timesheet]);

//   const validateTitle = (title: string) => {
//     const isValid = title.trim().length > 0;
//     setTitleError(isValid ? null : 'Title is required');
//     updateFormValidity(isValid, workReportError === null);
//     return isValid;
//   };

//   const validateWorkReport = (workReport: string) => {
//     const plainText = workReport.replace(/<[^>]+>/g, '').trim();
//     const isValid = plainText.length > 0;
//     setWorkReportError(isValid ? null : 'Work Summary is required');
//     updateFormValidity(titleError === null, isValid);
//     return isValid;
//   };

//   const updateFormValidity = (isTitleValid: boolean, isWorkReportValid: boolean) => {
//     if (onValidationChange) {
//       onValidationChange(isTitleValid && isWorkReportValid);
//     }
//   };

//   const handleTitleChange = (value: string) => {
//     setTitle(value);
//     validateTitle(value);

//     if (editedTimesheet && setEditedTimesheet) {
//       let parsedNotes = {};
//       if (typeof editedTimesheet.notes === 'string') {
//         try {
//           parsedNotes = JSON.parse(editedTimesheet.notes);
//         } catch {
//           // Fallback to empty object
//         }
//       }
//       setEditedTimesheet({
//         ...editedTimesheet,
//         notes: JSON.stringify({
//           ...parsedNotes,
//           title: value,
//         }),
//       });
//     }
//   };

//   const handleNotesChange = (workReport: string) => {
//     validateWorkReport(workReport);

//     if (setFormData) {
//       setFormData({
//         ...formData,
//         workReport,
//       });
//     }

//     if (editedTimesheet && setEditedTimesheet) {
//       let parsedNotes = {};
//       if (typeof editedTimesheet.notes === 'string') {
//         try {
//           parsedNotes = JSON.parse(editedTimesheet.notes);
//         } catch {
//           // Fallback to empty object
//         }
//       }
//       setEditedTimesheet({
//         ...editedTimesheet,
//         notes: JSON.stringify({
//           ...parsedNotes,
//           workReport,
//         }),
//       });
//     }
//   };

//   const getNotesValue = (key: string): string => {
//     if (key === 'workReport' && formData?.workReport !== undefined) {
//       return formData.workReport;
//     }
//     const targetObject = editedTimesheet || timesheet;
//     if (!targetObject) return '';
//     if (typeof targetObject.notes === 'string') {
//       try {
//         const parsedNotes = JSON.parse(targetObject.notes);
//         return parsedNotes[key] || '';
//       } catch {
//         return '';
//       }
//     }
//     if (typeof targetObject.notes === 'object' && targetObject.notes !== null) {
//       return (targetObject.notes as Record<string, any>)[key] || '';
//     }
//     return '';
//   };
//   const targetTimesheet = editedTimesheet || timesheet;


//   const calculatedWorkingHours = targetTimesheet?.duration_minutes
//     ? (targetTimesheet.duration_minutes / 60).toFixed(2)
//     : '0.00';

//   return (
//     <div className="space-y-4">
//       <div>
//         <Label htmlFor="title">
//           Title <span className="text-red-500">*</span>
//         </Label>
//         <Input
//           id="title"
//           value={title}
//           onChange={(e) => handleTitleChange(e.target.value)}
//           placeholder="Timesheet Title"
//           className={`mb-3 ${titleError ? 'border-red-500' : ''}`}
//         />
//         {titleError && (
//           <p className="text-red-500 text-sm mt-1">{titleError}</p>
//         )}
//       </div>

//       <div>
//         <Label htmlFor="totalWorkingHours">Total Working Hours</Label>
//         <Input
//           id="totalWorkingHours"
//           type="number"
//           value={calculatedWorkingHours}
//           readOnly
//           className="mb-3 bg-muted"
//         />
//       </div>

//       <div>
//         <Label htmlFor="workReport">
//           Work Summary <span className="text-red-500">*</span>
//         </Label>
//         <div className={`mt-1 ${workReportError ? 'border border-red-500 rounded' : ''}`}>
//           <ReactQuill
//             value={getNotesValue('workReport')}
//             onChange={handleNotesChange}
//             modules={quillModules}
//             formats={quillFormats}
//             placeholder="Add your Work Summary here"
//             className="max-h-[200px] overflow-y-auto"
//           />
//         </div>
//         {workReportError && (
//           <p className="text-red-500 text-sm mt-1">{workReportError}</p>
//         )}
//       </div>
//     </div>
//   );
// };