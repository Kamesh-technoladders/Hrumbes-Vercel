
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { toast } from "sonner";

export const useAttendanceMarking = (refetchData: () => void) => {
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);
  const [markAttendanceDate, setMarkAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markAttendanceTime, setMarkAttendanceTime] = useState(format(new Date(), 'HH:mm'));

  const handleMarkAttendance = async () => {
    try {
      const clockInTime = `${markAttendanceDate}T${markAttendanceTime}:00`;
      
      const { error } = await supabase
        .from('time_logs')
        .insert({
          employee_id: 'current-user-id', // This should be replaced with actual user ID
          date: markAttendanceDate,
          clock_in_time: clockInTime,
          clock_out_time: clockInTime,
          duration_minutes: 480,
          status: 'normal', // Using the proper enum value
          is_submitted: true
        });

      if (error) throw error;
      
      toast.success("Attendance marked successfully");
      setMarkAttendanceOpen(false);
      refetchData();
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance: " + error.message);
    }
  };

  return {
    markAttendanceOpen,
    setMarkAttendanceOpen,
    markAttendanceDate,
    setMarkAttendanceDate,
    markAttendanceTime,
    setMarkAttendanceTime,
    handleMarkAttendance
  };
};
