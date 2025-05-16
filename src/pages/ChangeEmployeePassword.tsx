import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Box, Flex, Heading, Text, Button, Input, VStack, Select, useColorModeValue, Spinner } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MotionBox = motion(Box);

// Initialize Supabase Admin client (INSECURE: Do not use service role key client-side)
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY, // WARNING: Exposes service role key
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export default function ChangeEmployeePassword() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useSelector((state: any) => state.auth);

  const bg = useColorModeValue("base.bglight", "base.bgdark");
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "white");
  const buttonBg = useColorModeValue("base.primary1", "base.primary2");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check admin privileges
  useEffect(() => {
    if (!authLoading && (!user || role !== "global_superadmin")) {
      toast.error("Unauthorized: Please log in as a Global Superadmin");
      navigate("/login");
    }
  }, [user, role, authLoading, navigate]);

  // Fetch employees
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const { data, error } = await supabase
          .from("hr_employees")
          .select("id, first_name, last_name")
          .order("first_name", { ascending: true });

        if (error) throw error;
        setEmployees(data || []);
      } catch (error) {
        toast.error("Failed to fetch employees: " + (error as Error).message);
        setError((error as Error).message);
      } finally {
        setFetching(false);
      }
    }
    if (user && role === "global_superadmin") {
      fetchEmployees();
    }
  }, [user, role]);

  // Handle password update
  const handleChangePassword = async () => {
    if (!selectedEmployee || !newPassword) {
      toast.error("Please select an employee and enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Verify user session
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session.session) {
        throw new Error("No active session. Please log in.");
      }

      // Update password using Admin API (INSECURE)
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        selectedEmployee,
        { password: newPassword }
      );

      if (error) throw error;

      toast.success("Password updated successfully");
      setNewPassword("");
      setSelectedEmployee("");
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex height="100vh" bg={bg} align="center" justify="center" px={{ base: 4, md: 8, lg: 16 }}>
      <MotionBox
        maxW={{ base: "100%", sm: "400px" }}
        mx="auto"
        p={8}
        bg={cardBg}
        borderRadius="lg"
        boxShadow="lg"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
      >
        <Heading size="lg" color={textColor} mb={4}>
          Change Employee Password
        </Heading>
        <VStack spacing={4}>
          {fetching || authLoading ? (
            <Spinner color={buttonBg} />
          ) : employees.length === 0 ? (
            <Text color={textColor}>No employees found</Text>
          ) : (
            <>
              <Box w="full">
                <Text color={textColor} mb={2}>Select Employee</Text>
                <Select
                  placeholder="Select an employee"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  bg={cardBg}
                  color={textColor}
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name || ""}
                    </option>
                  ))}
                </Select>
              </Box>
              <Box w="full">
                <Text color={textColor} mb={2}>New Password</Text>
                <Input
                  placeholder="Enter new password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  bg={cardBg}
                  color={textColor}
                />
              </Box>
              {error && <Text color="red.500" fontSize="sm">{error}</Text>}
              <Button
                bg={buttonBg}
                color="white"
                width="full"
                borderRadius="md"
                _hover={{ opacity: 0.9 }}
                isLoading={isLoading}
                onClick={handleChangePassword}
              >
                Change Password
              </Button>
            </>
          )}
        </VStack>
      </MotionBox>
    </Flex>
  );
}