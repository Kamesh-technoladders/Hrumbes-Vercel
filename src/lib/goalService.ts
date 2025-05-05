
import { supabase } from "@/integrations/supabase/client";
import { GoalInstance, GoalWithDetails, Employee, GoalStatistics, AssignedGoal } from "@/types/goal";

/**
 * Fetches all goals with their details, including assignments, instances, and assigned employees
 */
export const getGoalsWithDetails = async (): Promise<GoalWithDetails[]> => {
  try {
    const { data: goals, error } = await supabase
      .from('hr_goals')
      .select(`
        *,
        assignments: hr_assigned_goals(
          *,
          employee: hr_employees(id, first_name, last_name, email, position),
          instances: hr_goal_instances(
            *,
            period_start,
            period_end
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log("Raw goals from Supabase:", goals);

    const processed = await Promise.all(goals.map(async (goal) => {
      const now = new Date();

      const assignmentsWithPeriods = goal.assignments.map(assignment => {
        const activeInstance = assignment.instances?.find(instance => {
          const periodEnd = new Date(instance.period_end);
          return isAfter(periodEnd, now) || isBefore(periodEnd, now);
        });

        return {
          ...assignment,
          period_start: activeInstance?.period_start || assignment.created_at,
          period_end: activeInstance?.period_end || goal.endDate,
        };
      });

      const totalTargetValue = assignmentsWithPeriods.reduce((sum, a) => sum + a.target_value, 0);
      const totalCurrentValue = assignmentsWithPeriods.reduce((sum, a) => sum + (a.current_value || 0), 0);
      const overallProgress = totalTargetValue > 0 
        ? Math.min(Math.round((totalCurrentValue / totalTargetValue) * 100), 100)
        : 0;

      return {
        ...goal,
        assignments: assignmentsWithPeriods,
        assignedTo: assignmentsWithPeriods
          .map(a => a.employee)
          .filter((e): e is Employee => Boolean(e)),
        totalTargetValue,
        totalCurrentValue,
        overallProgress,
      };
    }));

    console.log("Processed goals with details:", processed);

    return processed;
  } catch (error) {
    console.error("Error getting goals with details:", error);
    throw error;
  }
};


/**
 * Fetches goal details for a specific goal ID
 */
export const getGoalDetails = async (goalId: string): Promise<GoalWithDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('hr_goals')
      .select(`
        *,
        instances: hr_goal_instances(
          *,
          assigned_goal: hr_assigned_goals(
            *,
            employee: hr_employees(id, first_name, last_name, email)
          )
        )
      `)
      .eq('id', goalId)
      .single();

    if (error) throw error;

    const { data: assignments, error: assignmentsError } = await supabase
      .from('hr_assigned_goals')
      .select(`
        *,
        employee:hr_employees(id, first_name, last_name, email, position)
      `)
      .eq('goal_id', goalId);

    if (assignmentsError) throw assignmentsError;

    // Get all unique employees assigned to this goal
    const assignedEmployees = assignments
      .map(assignment => assignment.employee)
      .filter((employee): employee is Employee => Boolean(employee));

    // Calculate overall goal progress
    const totalTargetValue = assignments.reduce((sum, a) => sum + a.target_value, 0);
    const totalCurrentValue = assignments.reduce((sum, a) => sum + (a.current_value || 0), 0);
    const overallProgress = totalTargetValue > 0 
      ? Math.min(Math.round((totalCurrentValue / totalTargetValue) * 100), 100)
      : 0;

    return {
      ...data,
      assignments,
      assignedTo: assignedEmployees,
      totalTargetValue,
      totalCurrentValue,
      overallProgress,
    };
  } catch (error) {
    console.error("Error getting goal details:", error);
    return null;
  }
};

/**
 * Updates the target value for a specific employee's goal
 */
import { AssignedGoal } from "@/types/goal";

export const updateEmployeeGoalTarget = async (
  assignedGoalId: string,
  newTargetValue: number,
  specificDate?: string // Optional: Target a specific date
): Promise<AssignedGoal | null> => {
  try {
    // Fetch the assigned goal to get goal_type
    const { data: assignedGoal, error: fetchError } = await supabase
      .from("hr_assigned_goals")
      .select("*, employee:hr_employees(id, first_name, last_name, email)")
      .eq("id", assignedGoalId)
      .single();

    if (fetchError) throw fetchError;

    const goalType = assignedGoal.goal_type; // Daily or Monthly
    const targetDate = specificDate ? new Date(specificDate) : new Date();
    const targetDateISO = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Determine the period for the active instance
    let periodStart: string;
    let periodEnd: string;

    if (goalType === "Daily") {
      periodStart = targetDateISO;
      periodEnd = targetDateISO;
    } else if (goalType === "Monthly") {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // 1-based
      periodStart = `${year}-${month.toString().padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      periodEnd = `${year}-${month.toString().padStart(2, "0")}-${lastDay}`;
    } else {
      throw new Error(`Unsupported goal_type: ${goalType}`);
    }

    // Fetch the active instance for the period
    let { data: instance, error: instanceFetchError } = await supabase
      .from("hr_goal_instances")
      .select("*")
      .eq("assigned_goal_id", assignedGoalId)
      .gte("period_start", periodStart)
      .lte("period_end", periodEnd)
      .single();

    if (instanceFetchError && instanceFetchError.code !== "PGRST116") {
      throw instanceFetchError; // PGRST116 = no rows found
    }

    // If no instance exists, create a new one
    if (!instance) {
      const { data: newInstance, error: insertError } = await supabase
        .from("hr_goal_instances")
        .insert({
          assigned_goal_id: assignedGoalId,
          period_start: periodStart,
          period_end: periodEnd,
          target_value: assignedGoal.target_value, // Start with assigned goal's target
          current_value: 0,
          progress: 0,
          status: "pending",
          created_at: new Date(),
          updated_at: new Date(),
          notes: null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      instance = newInstance;
    }

    // Update the instance with new target value
    const { data: updatedInstance, error: instanceUpdateError } = await supabase
      .from("hr_goal_instances")
      .update({
        target_value: newTargetValue,
        status: "in-progress",
        updated_at: new Date(),
      })
      .eq("id", instance.id)
      .select()
      .single();

    if (instanceUpdateError) throw instanceUpdateError;

    // Optionally update hr_assigned_goals if cumulative target is needed
    // For now, skip updating hr_assigned_goals unless required
    /*
    const { error: assignedGoalUpdateError } = await supabase
      .from("hr_assigned_goals")
      .update({
        target_value: newTargetValue,
        status: "in-progress",
        updated_at: new Date(),
      })
      .eq("id", assignedGoalId);

    if (assignedGoalUpdateError) throw assignedGoalUpdateError;
    */

    return assignedGoal; // Return the assigned goal for consistency
  } catch (error) {
    console.error("Error updating employee goal target:", error);
    return null;
  }
};

/**
 * Extends the target value for a specific employee's goal
 */
export const extendEmployeeGoalTarget = async (
  assignedGoalId: string,
  additionalTargetValue: number
): Promise<AssignedGoal | null> => {
  try {
    // Get current target value
    const { data: currentAssignedGoal, error: fetchError } = await supabase
      .from('hr_assigned_goals')
      .select('*')
      .eq('id', assignedGoalId)
      .single();

    if (fetchError) throw fetchError;

    const newTargetValue = (currentAssignedGoal.target_value || 0) + additionalTargetValue;

    // Update the assigned goal with new target value
    const { data, error } = await supabase
      .from('hr_assigned_goals')
      .update({
        target_value: newTargetValue,
        status: 'in-progress', // Reset to in-progress when extending
        updated_at: new Date(),
      })
      .eq('id', assignedGoalId)
      .select('*, employee:hr_employees(id, first_name, last_name, email)')
      .single();

    if (error) throw error;

    // Get current instance
    const { data: currentInstance, error: instanceFetchError } = await supabase
      .from('hr_goal_instances')
      .select('*')
      .eq('assigned_goal_id', assignedGoalId)
      .order('period_end', { ascending: false })
      .limit(1)
      .single();

    if (instanceFetchError) throw instanceFetchError;

    // Update the current instance with new target value
    const { error: instanceUpdateError } = await supabase
      .from('hr_goal_instances')
      .update({
        target_value: newTargetValue,
        status: 'in-progress', // Reset to in-progress
        updated_at: new Date(),
      })
      .eq('id', currentInstance.id);

    if (instanceUpdateError) throw instanceUpdateError;

    return data;
  } catch (error) {
    console.error("Error extending employee goal target:", error);
    return null;
  }
};

/**
 * Removes an employee from a goal
 */
export const removeEmployeeFromGoal = async (
  assignedGoalId: string
): Promise<boolean> => {
  try {
    // First, delete all goal instances
    const { error: instancesError } = await supabase
      .from('hr_goal_instances')
      .delete()
      .eq('assigned_goal_id', assignedGoalId);

    if (instancesError) throw instancesError;

    // Then delete the assigned goal
    const { error } = await supabase
      .from('hr_assigned_goals')
      .delete()
      .eq('id', assignedGoalId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error removing employee from goal:", error);
    return false;
  }
};

/**
 * Adds employees to an existing goal
 */
export const addEmployeesToGoal = async (
  goalId: string,
  employees: { employeeId: string; targetValue: number }[],
  goalType: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'
): Promise<boolean> => {
  try {
    // Insert assigned goals for each employee
    for (const employee of employees) {
      const { error } = await supabase
        .from('hr_assigned_goals')
        .insert({
          goal_id: goalId,
          employee_id: employee.employeeId,
          target_value: employee.targetValue,
          current_value: 0,
          progress: 0,
          status: 'pending',
          goal_type: goalType,
        });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error("Error adding employees to goal:", error);
    return false;
  }
};

/**
 * Calculates goal statistics
 */
export const calculateGoalStatistics = (goals: GoalWithDetails[]): GoalStatistics => {
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => 
    goal.assignments?.every(a => a.status === "completed")
  ).length;
  
  const inProgressGoals = goals.filter(goal => 
    goal.assignments?.some(a => a.status === "in-progress")
  ).length;
  
  const overdueGoals = goals.filter(goal => 
    goal.assignments?.some(a => a.status === "overdue")
  ).length;
  
  const pendingGoals = goals.filter(goal => 
    goal.assignments?.every(a => a.status === "pending")
  ).length;
  
  const completionRate = totalGoals > 0 
    ? Math.round((completedGoals / totalGoals) * 100) 
    : 0;

  return {
    totalGoals,
    completedGoals,
    inProgressGoals,
    overdueGoals,
    pendingGoals,
    completionRate
  };
};

/**
 * Fetches available employees that can be assigned to goals
 */
export const getAvailableEmployees = async (): Promise<Employee[]> => {
  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id, first_name, last_name, email, position, department:hr_departments(name)')
      .eq('employment_status', 'active')
      .order('first_name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching available employees:", error);
    return [];
  }
};
// 