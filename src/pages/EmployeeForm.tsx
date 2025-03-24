import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import { useSelector } from "react-redux";
import { Country, State, City } from 'country-state-city'; 
import { ArrowLeft, Save, ArrowRight, Upload, Plus, X, ChevronRight, User, CalendarIcon, File, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { uploadDocument } from "@/utils/uploadDocument";
import { format } from "date-fns";
import { Experience } from "@/services/types/employee.types";
import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { FaRegFilePdf } from "react-icons/fa6";

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  position: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  employmentStatus: string;
  aadharNumber: string;
  panNumber: string;
  voterIdNumber: string;
  esicNumber: string;
  uanNumber: string;
  aadharUrl: string;
  panUrl: string;
  voterIdUrl: string;
  esicUrl: string;
  uanUrl: string;
  profilePictureUrl: string;
  presentAddress: {
    addressLine1: string;
    addressLine2?: string;
    country: string;
    state: string;
    city: string;
    zipCode: string;
  };
  permanentAddress: {
    addressLine1: string;
    addressLine2?: string;
    country: string;
    state: string;
    city: string;
    zipCode: string;
  };
  emergencyContacts: Array<{
    relationship: string;
    name: string;
    phone: string;
  }>;
  familyMembers: Array<{
    relationship: string;
    name: string;
    occupation: string;
    phone: string;
  }>;
  education: Array<{
    type: string;
    institute?: string;
    year_completed?: string;
    documentUrl?: string;
  }>;
  experiences: Array<{
    jobType: "Full Time" | "Part Time" | "Internship";
    company: string;
    position: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    offerLetterUrl?: string;
    separationLetterUrl?: string;
    payslip_1_url?: string; // New field
    payslip_2_url?: string; // New field
    payslip_3_url?: string; // New field
    hikeLetterUrl?: string;
    noSeparationLetterReason?: string;
    noPayslipReason?: string;
  }>;
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
    branchAddress?: string;
    accountType: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    documentUrl?: string;
  };
}

const initialFormData: EmployeeFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  employeeId: "",
  department: "",
  position: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  employmentStatus: "Active",
  aadharNumber: "",
  panNumber: "",
  voterIdNumber: "",
  esicNumber: "",
  uanNumber: "",
  aadharUrl: "",
  panUrl: "",
  voterIdUrl: "",
  esicUrl: "",
  uanUrl: "",
  profilePictureUrl: "",
  presentAddress: {
    addressLine1: "",
    country: "India",
    state: "",
    city: "",
    zipCode: ""
  },
  permanentAddress: {
    addressLine1: "",
    country: "India",
    state: "",
    city: "",
    zipCode: ""
  },
  emergencyContacts: [
    { relationship: "", name: "", phone: "" }
  ],
  familyMembers: [
    { relationship: "", name: "", occupation: "", phone: "" }
  ],
  education: [
    { type: "SSC", institute: "", year_completed: "",documentUrl: ""  },
    { type: "HSC/Diploma", institute: "", year_completed: "",documentUrl: ""  },
    { type: "Degree", institute: "", year_completed: "",documentUrl: ""  }
  ],
  experiences: [
    {
      jobType: "Full Time",
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      payslip_1_url: "", // New field
      payslip_2_url: "", // New field
      payslip_3_url: "", // New field
    }
  ],
  bankDetails: {
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    branchName: "",
    ifscCode: "",
    accountType: "Savings",
    branchAddress: "",
    country: "India",
    state: "",
    city: "",
    zipCode: ""
  }
};

const EmployeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!!id);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isSameAsPresent, setIsSameAsPresent] = useState(false);
  const countries = Country.getAllCountries();
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
    // Experience modal state
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [currentExperience, setCurrentExperience] = useState<Experience>({
      jobType: "Full Time",
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      offerLetterUrl: "",
      separationLetterUrl: "",
      payslip_1_url: "",
      payslip_2_url: "",
      payslip_3_url: "",
      hikeLetterUrl: "",
      noSeparationLetterReason: "",
      noPayslipReason: "",
    });
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);
    const [uploadingFile, setUploadingFile] = useState<string | null>(null);
    
    // States for missing documents
    const [noSeparationLetter, setNoSeparationLetter] = useState(false);
    const [noPayslip, setNoPayslip] = useState(false);
    const [departments, setDepartments] = useState([]);
const [selectedDepartment, setSelectedDepartment] = useState(formData.department || "");


  console.log("Formdataaa:", formData)



  useEffect(() => {
    if (id) {
      fetchEmployeeData(id);
    }
  }, [id]);

  useEffect(() => {
    if (formData.presentAddress.country) {
      const countryCode = formData.presentAddress.country;
      const statesForCountry = State.getStatesOfCountry(countryCode);
      setStates(statesForCountry);
    }
  }, [formData.presentAddress.country]);

  // Update cities when state changes
  useEffect(() => {
    if (formData.presentAddress.state) {
      const stateCode = formData.presentAddress.state;
      const citiesForState = City.getCitiesOfState(formData.presentAddress.country, stateCode);
      setCities(citiesForState);
    }
  }, [formData.presentAddress.state]);

  // Handle checkbox change
  const handleCheckboxChange = (checked) => {
    setIsSameAsPresent(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        permanentAddress: { ...prev.presentAddress },
      }));
    }
  };

  useEffect(() => {
    if (isSameAsPresent) {
      setFormData(prev => ({
        ...prev,
        permanentAddress: { ...prev.presentAddress }
      }));
    }
  }, [formData.presentAddress, isSameAsPresent]);

  // Handle nested input change
  const handleNestedInputChange = (parentField, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [field]: value,
      },
    }));
  };

  const fetchEmployeeData = async (employeeId: string) => {
    try {
      setLoading(true);
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('hr_employees')
        .select('*, hr_departments(name)')
        .eq('id', employeeId)
        .single();
      
      if (employeeError) throw employeeError;
      
      const { data: presentAddressData } = await supabase
        .from('hr_employee_addresses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('type', 'present')
        .maybeSingle();
        
      const { data: permanentAddressData } = await supabase
        .from('hr_employee_addresses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('type', 'permanent')
        .maybeSingle();
      
      const { data: emergencyContactsData } = await supabase
        .from('hr_employee_emergency_contacts')
        .select('*')
        .eq('employee_id', employeeId);
      
      const { data: familyMembersData } = await supabase
        .from('hr_employee_family_details')
        .select('*')
        .eq('employee_id', employeeId);
      
      const { data: educationData } = await supabase
        .from('hr_employee_education')
        .select('*')
        .eq('employee_id', employeeId);
      
      const { data: experiencesData } = await supabase
        .from('hr_employee_experiences')
        .select('*')
        .eq('employee_id', employeeId);
      
      const { data: bankDetailsData } = await supabase
        .from('hr_employee_bank_details')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      
      const formattedData: EmployeeFormData = {
        firstName: employeeData.first_name || "",
        lastName: employeeData.last_name || "",
        email: employeeData.email || "",
        phone: employeeData.phone || "",
        employeeId: employeeData.employee_id || "",
        department: employeeData.hr_departments?.name || "",
        position: employeeData.position || "",
        dateOfBirth: employeeData.date_of_birth ? new Date(employeeData.date_of_birth).toISOString().split('T')[0] : "",
        gender: employeeData.gender || "",
        maritalStatus: employeeData.marital_status || "",
        bloodGroup: employeeData.blood_group || "",
        employmentStatus: employeeData.employment_status || "Active",
        aadharNumber: employeeData.aadhar_number || "",
        panNumber: employeeData.pan_number || "",
        voterIdNumber: employeeData.voter_id_number || "",
        esicNumber: employeeData.esic_number || "",
        uanNumber: employeeData.uan_number || "",
        aadharUrl: employeeData.aadhar_url || "",
        panUrl: employeeData.pan_url || "",
        voterIdUrl: employeeData.voter_id_url || "",
        esicUrl: employeeData.esic_url || "",
        uanUrl: employeeData.uan_url || "",
        profilePictureUrl: employeeData.profile_picture_url || "",
        
        presentAddress: presentAddressData ? {
          addressLine1: presentAddressData.address_line1 || "",
          addressLine2: presentAddressData.address_line2 || "",
          country: presentAddressData.country || "India",
          state: presentAddressData.state || "",
          city: presentAddressData.city || "",
          zipCode: presentAddressData.zip_code || ""
        } : initialFormData.presentAddress,
        
        permanentAddress: permanentAddressData ? {
          addressLine1: permanentAddressData.address_line1 || "",
          addressLine2: permanentAddressData.address_line2 || "",
          country: permanentAddressData.country || "India",
          state: permanentAddressData.state || "",
          city: permanentAddressData.city || "",
          zipCode: permanentAddressData.zip_code || ""
        } : initialFormData.permanentAddress,
        
        emergencyContacts: emergencyContactsData && emergencyContactsData.length > 0 
          ? emergencyContactsData.map(contact => ({
              relationship: contact.relationship || "",
              name: contact.name || "",
              phone: contact.phone || ""
            }))
          : initialFormData.emergencyContacts,
        
        familyMembers: familyMembersData && familyMembersData.length > 0
          ? familyMembersData.map(member => ({
              relationship: member.relationship || "",
              name: member.name || "",
              occupation: member.occupation || "",
              phone: member.phone || ""
            }))
          : initialFormData.familyMembers,
        
        education: educationData && educationData.length > 0
          ? educationData.map(edu => ({
              type: edu.type || "",
              institute: edu.institute || "",
              year_completed: edu.year_completed ? new Date(edu.year_completed).getFullYear().toString() : "",
              documentUrl: edu.document_url || ""
            }))
          : initialFormData.education,
        
          experiences:
          experiencesData && experiencesData.length > 0
            ? experiencesData.map((exp) => ({
                jobType: (exp.employment_type as "Full Time" | "Part Time" | "Internship") || "Full Time",
                company: exp.company || "",
                position: exp.job_title || "",
                location: exp.location || "",
                startDate: exp.start_date ? new Date(exp.start_date).toISOString().split('T')[0] : "",
                endDate: exp.end_date ? new Date(exp.end_date).toISOString().split('T')[0] : "",
                offerLetterUrl: exp.offer_letter_url || "",
                separationLetterUrl: exp.separation_letter_url || "",
                payslip_1_url: exp.payslip_1_url || "", // Map individual payslip URLs
                payslip_2_url: exp.payslip_2_url || "",
                payslip_3_url: exp.payslip_3_url || "",
                hikeLetterUrl: exp.hike_letter_url || "",
                noSeparationLetterReason: exp.no_separation_letter_reason || "",
                noPayslipReason: exp.no_payslip_reason || "",
              }))
            : initialFormData.experiences,
        bankDetails: bankDetailsData ? {
          accountHolderName: bankDetailsData.account_holder_name || "",
          accountNumber: bankDetailsData.account_number || "",
          bankName: bankDetailsData.bank_name || "",
          branchName: bankDetailsData.branch_name || "",
          ifscCode: bankDetailsData.ifsc_code || "",
          accountType: bankDetailsData.account_type || "Savings",
          branchAddress: bankDetailsData.branch_address || "",
          country: bankDetailsData.country,
          state: bankDetailsData.state,
          city: bankDetailsData.city,
          zipCode: bankDetailsData.zip_code,
        } : initialFormData.bankDetails
      };
      
      setFormData(formattedData);
      setInitialDataLoaded(true);
      
    } catch (error: any) {
      console.error("Error fetching employee data:", error);
      toast.error(`Failed to load employee data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("hr_departments").select("id, name");
      if (error) {
        console.error("Error fetching departments:", error);
      } else {
        setDepartments(data || []);
  
        // Ensure the saved department ID is set as the default
        if (formData.department) {
          const defaultDept = data.find((dept) => dept.id === formData.department);
          if (defaultDept) {
            setSelectedDepartment(defaultDept.id);
          }
        }
      }
    };
  
    fetchDepartments();
  }, [formData.department]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // const handleNestedInputChange = (parentField: string, field: string, value: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     [parentField]: {
  //       ...prev[parentField as keyof typeof prev],
  //       [field]: value
  //     }
  //   }));
  // };

  const handleArrayInputChange = (field: string, index: number, key: string, value: string) => {
    setFormData(prev => {
      const array = [...prev[field as keyof typeof prev] as any[]];
      array[index] = { ...array[index], [key]: value };
      return { ...prev, [field]: array };
    });
  };

  const handleAddArrayItem = (field: string, template: any) => {
    setFormData(prev => {
      const array = [...prev[field as keyof typeof prev] as any[]];
      array.push(template);
      return { ...prev, [field]: array };
    });
  };

  const handleRemoveArrayItem = (field: string, index: number) => {
    setFormData(prev => {
      const array = [...prev[field as keyof typeof prev] as any[]];
      if (array.length > 1) {
        array.splice(index, 1);
      }
      return { ...prev, [field]: array };
    });
  };

  const handleProfilePictureChange = (url: string) => {
    setFormData(prev => ({
      ...prev,
      profilePictureUrl: url
    }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      
      const employeeData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        employee_id: formData.employeeId,
        department_id: formData.department || null,
        position: formData.position,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        marital_status: formData.maritalStatus,
        blood_group: formData.bloodGroup,
        employment_status: formData.employmentStatus,
        aadhar_number: formData.aadharNumber,
        pan_number: formData.panNumber,
        esic_number: formData.esicNumber,
        uan_number: formData.uanNumber,
        aadhar_url: formData.aadharUrl,
        pan_url: formData.panUrl,
        esic_url: formData.esicUrl,
        uan_url: formData.uanUrl,
        organization_id: organizationId,
        profile_picture_url: formData.profilePictureUrl
      };
      
      let employeeId = id;
      
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('hr_employees')
          .update(employeeData)
          .eq('id', id);
          
        if (updateError) throw updateError;
      } else {
        const { data: newEmployee, error: insertError } = await supabase
          .from('hr_employees')
          .insert(employeeData)
          .select();
          
        if (insertError) throw insertError;
        
        employeeId = newEmployee[0].id;
      }
      
      if (employeeId) {
        const presentAddressData = {
          employee_id: employeeId,
          type: 'present',
          address_line1: formData.presentAddress.addressLine1,
          country: formData.presentAddress.country,
          state: formData.presentAddress.state,
          city: formData.presentAddress.city,
          zip_code: formData.presentAddress.zipCode,
          organization_id: organizationId
        };
        
        const { data: existingPresentAddress } = await supabase
          .from('hr_employee_addresses')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('type', 'present')
          .maybeSingle();
        
        if (existingPresentAddress) {
          await supabase
            .from('hr_employee_addresses')
            .update(presentAddressData)
            .eq('id', existingPresentAddress.id);
        } else {
          await supabase
            .from('hr_employee_addresses')
            .insert(presentAddressData);
        }
        
        const permanentAddressData = {
          employee_id: employeeId,
          type: 'permanent',
          address_line1: formData.permanentAddress.addressLine1,
          country: formData.permanentAddress.country,
          state: formData.permanentAddress.state,
          city: formData.permanentAddress.city,
          zip_code: formData.permanentAddress.zipCode,
          organization_id: organizationId
        };
        
        const { data: existingPermanentAddress } = await supabase
          .from('hr_employee_addresses')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('type', 'permanent')
          .maybeSingle();
        
        if (existingPermanentAddress) {
          await supabase
            .from('hr_employee_addresses')
            .update(permanentAddressData)
            .eq('id', existingPermanentAddress.id);
        } else {
          await supabase
            .from('hr_employee_addresses')
            .insert(permanentAddressData);
        }
        
        if (isEditing) {
          await supabase
            .from('hr_employee_emergency_contacts')
            .delete()
            .eq('employee_id', employeeId);
        }
        
        const emergencyContactsData = formData.emergencyContacts.map(contact => ({
          employee_id: employeeId,
          relationship: contact.relationship,
          name: contact.name,
          phone: contact.phone,
          organization_id: organizationId
        }));
        
        if (emergencyContactsData.length > 0) {
          await supabase
            .from('hr_employee_emergency_contacts')
            .insert(emergencyContactsData);
        }
        
        if (isEditing) {
          await supabase
            .from('hr_employee_family_details')
            .delete()
            .eq('employee_id', employeeId);
        }
        
        const familyMembersData = formData.familyMembers.map(member => ({
          employee_id: employeeId,
          relationship: member.relationship,
          name: member.name,
          occupation: member.occupation,
          phone: member.phone,
          organization_id: organizationId
        }));
        
        if (familyMembersData.length > 0) {
          await supabase
            .from('hr_employee_family_details')
            .insert(familyMembersData);
        }
        
        if (isEditing) {
          await supabase
            .from('hr_employee_education')
            .delete()
            .eq('employee_id', employeeId);
        }
        
        const educationData = formData.education.map(edu => ({
          employee_id: employeeId,
          type: edu.type,
          institute: edu.institute,
          year_completed: edu.year_completed ? `${edu.year_completed}-01-01` : null,
          document_url: edu.documentUrl,
          organization_id: organizationId
        }));
        
        if (educationData.length > 0) {
          await supabase
            .from('hr_employee_education')
            .insert(educationData);
        }
        
        if (isEditing) {
          await supabase
            .from('hr_employee_experiences')
            .delete()
            .eq('employee_id', employeeId);
        }
        
        const experiencesData = formData.experiences.map((exp) => ({
          employee_id: employeeId,
          company: exp.company,
          job_title: exp.position,
          location: exp.location,
          start_date: exp.startDate,
          end_date: exp.endDate,
          employment_type: exp.jobType,
          offer_letter_url: exp.offerLetterUrl,
          separation_letter_url: exp.separationLetterUrl,
          payslip_1_url: exp.payslip_1_url || "", // Map individual payslip URLs
          payslip_2_url: exp.payslip_2_url || "",
          payslip_3_url: exp.payslip_3_url || "",
          hike_letter_url: exp.hikeLetterUrl,
          no_separation_letter_reason: exp.noSeparationLetterReason,
          no_payslip_reason: exp.noPayslipReason,
          organization_id: organizationId,
        }));
        
        
        if (experiencesData.length > 0) {
          await supabase
            .from('hr_employee_experiences')
            .insert(experiencesData);
        }
        
        const bankDetailsData = {
          employee_id: employeeId,
          account_holder_name: formData.bankDetails.accountHolderName,
          account_number: formData.bankDetails.accountNumber,
          bank_name: formData.bankDetails.bankName,
          branch_name: formData.bankDetails.branchName,
          country: formData.bankDetails.country,
          state: formData.bankDetails.state,
          city: formData.bankDetails.city,
          branch_address: formData.bankDetails.branchAddress,
          ifsc_code: formData.bankDetails.ifscCode,
          account_type: formData.bankDetails.accountType,
          document_url: formData.bankDetails.documentUrl,
          organization_id: organizationId,
          zip_code: formData.bankDetails.zipCode,
        };
        
        const { data: existingBankDetails } = await supabase
          .from('hr_employee_bank_details')
          .select('id')
          .eq('employee_id', employeeId)
          .maybeSingle();
        
        if (existingBankDetails) {
          await supabase
            .from('hr_employee_bank_details')
            .update(bankDetailsData)
            .eq('id', existingBankDetails.id);
        } else {
          await supabase
            .from('hr_employee_bank_details')
            .insert(bankDetailsData);
        }
        
        toast.success(`Employee ${isEditing ? 'updated' : 'added'} successfully`);
        if (activeTab === "documents") {
          navigate('/employee'); // Navigate to /employee
        } else {
          // Move to the next tab
          const nextTab = getNextTab(activeTab);
          setActiveTab(nextTab);
        }
      }
      
    } catch (error: any) {
      console.error("Error saving employee data:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} employee: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getNextTab = (currentTab: string) => {
    const tabs = ["personal", "address", "contact", "education", "bank", "documents"];
    const currentIndex = tabs.indexOf(currentTab);
    return currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : currentTab; // Return the next tab or the current tab if it's the last one
  };

  // Education handling
  const handleEducationChange = (index: number, field: string, value: string) => {
    setFormData((prevData) => {
      const updatedEducation = [...prevData.education];
      updatedEducation[index] = { ...updatedEducation[index], [field]: value };
      return { ...prevData, education: updatedEducation };
    });
  };
  
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...(prev.education || []), { type: "", institute: "", year_completed: "", documentUrl: "" }]
    }));
  };

  // Experience handling
  const openExperienceModal = (experience?: Experience, index?: number) => {
    if (experience) {
      setCurrentExperience(experience);
      if (experience.startDate) setStartDate(new Date(experience.startDate));
      if (experience.endDate) setEndDate(new Date(experience.endDate));
      setEditingExperienceIndex(index !== undefined ? index : null);
    } else {
      setCurrentExperience({
        jobType: "Full Time",
        company: "",
        position: "",
        location: ""
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setEditingExperienceIndex(null);
    }
    setShowExperienceModal(true);
  };

  const handleExperienceChange = (field: string, value: any) => {
    setCurrentExperience(prev => ({ ...prev, [field]: value }));
  };

  const handleExperienceStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      setCurrentExperience(prev => ({ ...prev, startDate: format(date, "yyyy-MM-dd") }));
    }
  };

  const handleExperienceEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      setCurrentExperience(prev => ({ ...prev, endDate: format(date, "yyyy-MM-dd") }));
    }
  };

  const saveExperience = async () => {
    const updatedExperiences = [...(formData.experiences || [])];
  
    if (editingExperienceIndex !== null) {
      updatedExperiences[editingExperienceIndex] = currentExperience;
    } else {
      updatedExperiences.push(currentExperience);
    }
  
    // Update formData with the updated experiences
    setFormData((prev) => ({ ...prev, experiences: updatedExperiences }));
    setShowExperienceModal(false);
  
    try {
      if (!id) {
        toast.error("Employee ID is missing!");
        return;
      }
  
      const experienceData = {
        employee_id: id,
        company: currentExperience.company,
        job_title: currentExperience.position,
        location: currentExperience.location,
        start_date: currentExperience.startDate,
        end_date: currentExperience.endDate,
        employment_type: currentExperience.jobType,
        offer_letter_url: currentExperience.offerLetterUrl,
        separation_letter_url: currentExperience.separationLetterUrl,
        payslip_1_url: currentExperience.payslip_1_url,
        payslip_2_url: currentExperience.payslip_2_url,
        payslip_3_url: currentExperience.payslip_3_url,
        hike_letter_url: currentExperience.hikeLetterUrl,
        no_separation_letter_reason: currentExperience.noSeparationLetterReason,
        no_payslip_reason: currentExperience.noPayslipReason,
        organization_id: organizationId,
      };
  
      let supabaseResponse;
  
      if (editingExperienceIndex !== null) {
        if (!id) {
          toast.error("Experience ID is missing for update!");
          console.error("Experience ID is undefined:", currentExperience);
          return;
        }
  
        console.log("Updating Experience with ID:", id);
        supabaseResponse = await supabase
          .from("hr_employee_experiences")
          .update(experienceData)
          .eq("id", id);
      } else {
        supabaseResponse = await supabase
          .from("hr_employee_experiences")
          .insert(experienceData);
      }
  
      if (supabaseResponse.error) {
        throw supabaseResponse.error;
      }
  
      toast.success("Experience saved successfully!");
    } catch (error) {
      console.error("Error saving experience:", error);
      toast.error("Failed to save experience!");
    }
  };

  const removeExperience = (index: number) => {
    const updatedExperiences = [...(formData.experiences || [])];
    updatedExperiences.splice(index, 1);
    setFormData(prev => ({ ...prev, experiences: updatedExperiences }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, section: string, type: string, index: number) => {
    try {
      const file = event.target.files?.[0];
      if (!file) {
        console.error("No file selected.");
        return;
      }
  
      const bucketName = "employee-documents"; // Ensure this is correct
  
      // Debugging logs
      console.log("Uploading file:", file.name);
      console.log("Section:", section);
      console.log("Type:", type);
      console.log("Index:", index);
      
      // Ensure type is valid before calling uploadDocument
      if (!type) {
        console.error("Invalid type provided:", type);
        return;
      }
  
      const fileUrl = await uploadDocument(file, bucketName, type);
      console.log("File uploaded successfully:", fileUrl);
  
      if (section === "education") {
        setFormData((prevFormData) => {
          const updatedEducation = [...prevFormData.education];
          updatedEducation[index] = {
            ...updatedEducation[index],
            documentUrl: fileUrl, // Store document URL
          };
          return { ...prevFormData, education: updatedEducation };
        });
      }
    } catch (error) {
      console.error("File upload failed:", error);
    }
  };

  const handleBankUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    category: 'bankDetails' // Add other categories if needed
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    try {
      const bucketName = 'employee-documents';
      const type = 'bank-document';
      const fileUrl = await uploadDocument(file, bucketName, type);
  
      if (category === 'bankDetails') {
        setFormData({
          ...formData,
          bankDetails: {
            ...formData.bankDetails,
            documentUrl: fileUrl, // Store the file URL
          },
        });
      }
  
      console.log('Bank document uploaded successfully:', fileUrl);
    } catch (error) {
      console.error('Bank document upload failed:', error);
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentType: 'aadhar' | 'pan' | 'uan' | 'esic'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    try {
      const bucketName = 'employee-documents';
      const fileUrl = await uploadDocument(file, bucketName, documentType);
  
      // Update local form state
      setFormData((prevData) => ({
        ...prevData,
        [`${documentType}Url`]: fileUrl, // Store URL in respective field
      }));
  
      console.log(`${documentType} document uploaded successfully:`, fileUrl);
  
      // Update document URL in Supabase `hr_employees` table
      const { error } = await supabase
        .from('hr_employees')
        .update({ [`${documentType}_url`]: fileUrl }) // Ensure column names match DB
        .eq('employee_id', formData.employeeId); // Match employee
  
      if (error) {
        throw error;
      }
  
      console.log(`Updated ${documentType}_url in database:`, fileUrl);
    } catch (error) {
      console.error(`${documentType} document upload failed:`, error);
    }
  };
  
  const handleExpUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    category: 'offerLetter' | 'separationLetter' | 'hikeLetter' | 'payslip1' | 'payslip2' | 'payslip3',
    experienceId: string
  ) => {
    const file = event.target.files?.[0];
    setUploadingFile(category);
    if (!file) return;
  
    try {
      const bucketName = 'employee-documents';
      const type = category;
      const fileUrl = await uploadDocument(file, bucketName, type);
  
      // Update currentExperience state
      setCurrentExperience((prev) => ({
        ...prev,
        ...(category === 'payslip1' && { payslip_1_url: fileUrl }),
        ...(category === 'payslip2' && { payslip_2_url: fileUrl }),
        ...(category === 'payslip3' && { payslip_3_url: fileUrl }),
        ...(category === 'offerLetter' && { offerLetterUrl: fileUrl }),
        ...(category === 'separationLetter' && { separationLetterUrl: fileUrl }),
        ...(category === 'hikeLetter' && { hikeLetterUrl: fileUrl }),
      }));
  
      console.log(`${category} uploaded successfully:`, fileUrl);
    } catch (error) {
      console.error(`${category} upload failed:`, error);
    } finally {
      setUploadingFile(null); // Hide loader
    }
  };
  

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        &larr; Back
      </Button>
      <Card>
        <CardContent>
          <h1 className="text-2xl font-bold mb-4">{isEditing ? "Edit Employee" : "Add Employee"}</h1>
          {loading && !initialDataLoaded ? (
            <div className="text-center py-4">Loading employee data...</div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                {/* <TabsTrigger value="experience">Experience</TabsTrigger> */}
                <TabsTrigger value="bank">Bank Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
              <TabsContent value="personal" className="space-y-4">
  <div className="flex flex-col md:flex-row gap-6 items-start">
    {/* Profile Upload on the Left */}
    <div className="flex-shrink-0">
      <ProfileImageUpload
        value={formData.profilePictureUrl}
        onChange={handleProfilePictureChange}
        initialLetter={formData.firstName?.[0] || "U"}
      />
    </div>

    {/* Compact Form Fields */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-5 w-full">
      <div className="max-w-xs">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          type="text"
          id="firstName"
          value={formData.firstName}
          onChange={(e) => handleInputChange("firstName", e.target.value)}
          required
        />
      </div>
      <div className="max-w-xs">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          type="text"
          id="lastName"
          value={formData.lastName}
          onChange={(e) => handleInputChange("lastName", e.target.value)}
          required
        />
      </div>
      <div className="max-w-xs">
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          required
        />
      </div>
      <div className="max-w-xs">
        <Label htmlFor="phone">Phone</Label>
        <Input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          required
        />
      </div>
      <div className="max-w-xs">
        <Label htmlFor="employeeId">Employee ID</Label>
        <Input
          type="text"
          id="employeeId"
          value={formData.employeeId}
          onChange={(e) => handleInputChange("employeeId", e.target.value)}
        />
      </div>
      <div className="max-w-xs">
    <Label htmlFor="department">Department</Label>
    <Select
      value={selectedDepartment}
      onValueChange={(value) => {
        setSelectedDepartment(value);
        handleInputChange("department", value); // Send ID to backend
      }}
    >
      <SelectTrigger>
        <SelectValue>
          {departments.find((dept) => dept.id === selectedDepartment)?.name || "Select Department"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
      <div className="max-w-xs">
        <Label htmlFor="position">Position</Label>
        <Input
          type="text"
          id="position"
          value={formData.position}
          onChange={(e) => handleInputChange("position", e.target.value)}
        />
      </div>
      <div className="max-w-xs">
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input
          type="date"
          id="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
        />
      </div>

      {/* Gender Selection */}
      <div className="max-w-xs">
  <Label>Gender</Label>
  <RadioGroup
    defaultValue={formData.gender}
    onValueChange={(value) => handleInputChange("gender", value)}
    className="flex items-center space-x-4" // Added flex container
  >
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="Male" id="male" />
      <Label htmlFor="male">Male</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="Female" id="female" />
      <Label htmlFor="female">Female</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="Other" id="other" />
      <Label htmlFor="other">Other</Label>
    </div>
  </RadioGroup>
</div>


      {/* Marital Status */}
      <div className="max-w-xs">
        <Label htmlFor="maritalStatus">Marital Status</Label>
        <Select 
          defaultValue={formData.maritalStatus} 
          onValueChange={(value) => handleInputChange("maritalStatus", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Single">Single</SelectItem>
            <SelectItem value="Married">Married</SelectItem>
            <SelectItem value="Divorced">Divorced</SelectItem>
            <SelectItem value="Widowed">Widowed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Blood Group */}
      <div className="max-w-xs">
        <Label htmlFor="bloodGroup">Blood Group</Label>
        <Select 
          defaultValue={formData.bloodGroup} 
          onValueChange={(value) => handleInputChange("bloodGroup", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A+">A+</SelectItem>
            <SelectItem value="A-">A-</SelectItem>
            <SelectItem value="B+">B+</SelectItem>
            <SelectItem value="B-">B-</SelectItem>
            <SelectItem value="O+">O+</SelectItem>
            <SelectItem value="O-">O-</SelectItem>
            <SelectItem value="AB+">AB+</SelectItem>
            <SelectItem value="AB-">AB-</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employment Status */}
      <div className="max-w-xs">
        <Label htmlFor="employmentStatus">Employment Status</Label>
        <Select 
          defaultValue={formData.employmentStatus} 
          onValueChange={(value) => handleInputChange("employmentStatus", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</TabsContent>


                <TabsContent value="address" className="space-y-4">
  <div className="flex flex-col md:flex-row gap-6">
    {/* Present Address - Left Column */}
    <div className="flex-1 space-y-4">
      <h2 className="text-lg font-medium">Present Address</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="presentAddressLine1">Address Line 1</Label>
          <Input
            type="text"
            id="presentAddressLine1"
            value={formData.presentAddress.addressLine1}
            onChange={(e) => handleNestedInputChange("presentAddress", "addressLine1", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="presentAddressLine2">Address Line 2</Label>
          <Input
            type="text"
            id="presentAddressLine2"
            value={formData.presentAddress.addressLine2}
            onChange={(e) => handleNestedInputChange("presentAddress", "addressLine2", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="presentCountry">Country</Label>
          <Select
            value={formData.presentAddress.country}
            onValueChange={(value) => handleNestedInputChange("presentAddress", "country", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {Country.getAllCountries().map((country) => (
                <SelectItem key={country.isoCode} value={country.isoCode}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="presentState">State</Label>
          <Select
            value={formData.presentAddress.state}
            onValueChange={(value) => handleNestedInputChange("presentAddress", "state", value)}
            disabled={!formData.presentAddress.country}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {State.getStatesOfCountry(formData.presentAddress.country).map((state) => (
                <SelectItem key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="presentCity">City</Label>
          <Select
            value={formData.presentAddress.city}
            onValueChange={(value) => handleNestedInputChange("presentAddress", "city", value)}
            disabled={!formData.presentAddress.state}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              {City.getCitiesOfState(formData.presentAddress.country, formData.presentAddress.state).map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="presentZipCode">Zip Code</Label>
          <Input
            type="text"
            id="presentZipCode"
            value={formData.presentAddress.zipCode}
            onChange={(e) => handleNestedInputChange("presentAddress", "zipCode", e.target.value)}
          />
        </div>
      </div>
    </div>

    {/* Permanent Address - Right Column */}
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Permanent Address</h2>
        <div className="flex items-center gap-2">
          <Checkbox
            id="sameAsPresent"
            checked={isSameAsPresent}
            onCheckedChange={handleCheckboxChange}
          />
          <Label htmlFor="sameAsPresent" className="text-sm">
            Same as Present Address
          </Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="permanentAddressLine1">Address Line 1</Label>
          <Input
            type="text"
            id="permanentAddressLine1"
            value={formData.permanentAddress.addressLine1}
            onChange={(e) => handleNestedInputChange("permanentAddress", "addressLine1", e.target.value)}
            disabled={isSameAsPresent}
          />
        </div>
        <div>
          <Label htmlFor="permanentAddressLine2">Address Line 2</Label>
          <Input
            type="text"
            id="permanentAddressLine2"
            value={formData.permanentAddress.addressLine2}
            onChange={(e) => handleNestedInputChange("permanentAddress", "addressLine2", e.target.value)}
            disabled={isSameAsPresent}
          />
        </div>
        <div>
          <Label htmlFor="permanentCountry">Country</Label>
          <Select
            value={formData.permanentAddress.country}
            onValueChange={(value) => handleNestedInputChange("permanentAddress", "country", value)}
            disabled={isSameAsPresent}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {Country.getAllCountries().map((country) => (
                <SelectItem key={country.isoCode} value={country.isoCode}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="permanentState">State</Label>
          <Select
            value={formData.permanentAddress.state}
            onValueChange={(value) => handleNestedInputChange("permanentAddress", "state", value)}
            disabled={isSameAsPresent || !formData.permanentAddress.country}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {State.getStatesOfCountry(formData.permanentAddress.country).map((state) => (
                <SelectItem key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="permanentCity">City</Label>
          <Select
            value={formData.permanentAddress.city}
            onValueChange={(value) => handleNestedInputChange("permanentAddress", "city", value)}
            disabled={isSameAsPresent || !formData.permanentAddress.state}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              {City.getCitiesOfState(
                formData.permanentAddress.country,
                formData.permanentAddress.state
              ).map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="permanentZipCode">Zip Code</Label>
          <Input
            type="text"
            id="permanentZipCode"
            value={formData.permanentAddress.zipCode}
            onChange={(e) => handleNestedInputChange("permanentAddress", "zipCode", e.target.value)}
            disabled={isSameAsPresent}
          />
        </div>
      </div>
    </div>
  </div>
</TabsContent>

<TabsContent value="contact" className="space-y-4">
  <h2 className="text-lg font-medium">Emergency Contacts</h2>
  {formData.emergencyContacts.map((contact, index) => (
    <div key={index} className="border p-3 rounded-lg mb-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label htmlFor={`relationship-${index}`} className="text-sm">Relationship</Label>
          <Input
            type="text"
            id={`relationship-${index}`}
            value={contact.relationship}
            onChange={(e) => handleArrayInputChange("emergencyContacts", index, "relationship", e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`name-${index}`} className="text-sm">Name</Label>
          <Input
            type="text"
            id={`name-${index}`}
            value={contact.name}
            onChange={(e) => handleArrayInputChange("emergencyContacts", index, "name", e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`phone-${index}`} className="text-sm">Phone</Label>
          <Input
            type="tel"
            id={`phone-${index}`}
            value={contact.phone}
            onChange={(e) => handleArrayInputChange("emergencyContacts", index, "phone", e.target.value)}
            className="h-10 text-sm"
          />
        </div>
      </div>
      {formData.emergencyContacts.length > 1 && (
        <Button type="button" variant="outline" className="mt-2 h-8 text-sm" onClick={() => handleRemoveArrayItem("emergencyContacts", index)}>
          Remove
        </Button>
      )}
    </div>
  ))}
  <Button type="button" variant="outline" onClick={() => handleAddArrayItem("emergencyContacts", { relationship: "", name: "", phone: "" })} className="h-8 text-sm">
    Add Emergency Contact
  </Button>

  <Separator className="my-4" />

  <h2 className="text-lg font-medium">Family Members</h2>
  {formData.familyMembers.map((member, index) => (
    <div key={index} className="border p-3 rounded-lg mb-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label htmlFor={`family-relationship-${index}`} className="text-sm">Relationship</Label>
          <Input
            type="text"
            id={`family-relationship-${index}`}
            value={member.relationship}
            onChange={(e) => handleArrayInputChange("familyMembers", index, "relationship", e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`family-name-${index}`} className="text-sm">Name</Label>
          <Input
            type="text"
            id={`family-name-${index}`}
            value={member.name}
            onChange={(e) => handleArrayInputChange("familyMembers", index, "name", e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`occupation-${index}`} className="text-sm">Occupation</Label>
          <Input
            type="text"
            id={`occupation-${index}`}
            value={member.occupation}
            onChange={(e) => handleArrayInputChange("familyMembers", index, "occupation", e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div>
          <Label htmlFor={`family-phone-${index}`} className="text-sm">Phone</Label>
          <Input
            type="tel"
            id={`family-phone-${index}`}
            value={member.phone}
            onChange={(e) => handleArrayInputChange("familyMembers", index, "phone", e.target.value)}
            className="h-10 text-sm"
          />
        </div>
      </div>
      {formData.familyMembers.length > 1 && (
        <Button type="button" variant="outline" className="mt-2 h-8 text-sm" onClick={() => handleRemoveArrayItem("familyMembers", index)}>
          Remove
        </Button>
      )}
    </div>
  ))}
  <Button type="button" variant="outline" onClick={() => handleAddArrayItem("familyMembers", { relationship: "", name: "", occupation: "", phone: "" })} className="h-8 text-sm">
    Add Family Member
  </Button>
</TabsContent>


                <TabsContent value="education">
              <div className="space-y-8">
              <div>
      <h3 className="text-lg font-medium mb-4">Education</h3>
      <p className="text-sm text-gray-500 mb-4">Add your course and certificate here.</p>

      <div className="space-y-4">
        {formData.education?.map((edu, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            {/* Course Name */}
            <div className="space-y-1">
              <Label className="text-xs">Exam/Course*</Label>
              <Input
                value={edu.type}
                readOnly={index < 3}
                onChange={(e) => handleEducationChange(index, "type", e.target.value)}
                placeholder="Course name"
                className="h-8 text-sm"
              />
            </div>

            {/* Institute Name */}
            <div className="space-y-1">
              <Label className="text-xs">Institute*</Label>
              <Input
                value={edu.institute || ""}
                onChange={(e) => handleEducationChange(index, "institute", e.target.value)}
                placeholder="Institute"
                className="h-8 text-sm"
              />
            </div>

            {/* Completed Year */}
            <div className="space-y-1">
              <Label className="text-xs">Year*</Label>
              <Input
                type="number"
                value={edu.year_completed || ""}
                onChange={(e) => handleEducationChange(index, "year_completed", Number(e.target.value))}
                placeholder="Year"
                className="h-8 text-sm"
              />
            </div>

            {/* File Upload */}
            <div className="flex items-center gap-2">
              <label htmlFor={`edu-upload-${index}`} className="cursor-pointer text-primary text-xs hover:underline">
                + Upload <span className="text-gray-500">(PDF, PNG, JPG)</span>
              </label>
              <input
                type="file"
                id={`edu-upload-${index}`}
                className="sr-only"
                onChange={(e) => handleFileUpload(e, "education", "education_document", index)}
                accept=".pdf,.png,.jpg,.jpeg"
              />

              {edu.documentUrl && (
                <a href={edu.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  View
                </a>
              )}
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addEducation} className="mt-2">
          <Plus className="h-4 w-4 mr-1" /> Add Course
        </Button>
      </div>
    </div>

    <div> 

<div className="flex items-center justify-between mb-4"> 

  <div> 

    <h3 className="text-lg font-medium">Experience</h3> 

    <p className="text-sm text-gray-500"> 

      Add your previous work experience and internship details. 

    </p> 

  </div> 

  <Button 

    type="button" 

    variant="outline" 

    size="sm" 

    onClick={() => openExperienceModal()} 

  > 

    <Plus className="h-4 w-4 mr-1" /> Add 

  </Button> 

</div> 



<div className="space-y-3"> 

  {formData.experiences && formData.experiences.length > 0 ? ( 

    formData.experiences.map((exp, index) => ( 

      <div 

        key={index} 

        className="border rounded-lg p-3 bg-gray-50 shadow-sm relative" 

      > 

        {/* Header - Position & Job Type */} 

        <div className="flex justify-between items-start"> 

          <div className="grid grid-cols-[auto_auto] gap-x-2 items-center"> 

            <h4 className="font-medium">{exp.position}</h4> 

            <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-md"> 

              {exp.jobType} 

            </span> 

          </div> 

          {/* Edit & Delete Buttons */} 

          <div className="flex gap-2"> 

            <Button 

              type="button" 

              variant="ghost" 

              size="icon" 

              onClick={() => openExperienceModal(exp, index)} 

            > 

              ✏️ 

            </Button> 

            <Button 

              type="button" 

              variant="ghost" 

              size="icon" 

              onClick={() => removeExperience(index)} 

            > 

              🗑️ 

            </Button> 

          </div> 

        </div> 



        {/* Company & Date */} 

        <p className="text-sm text-gray-700"> 

          {exp.company} - {exp.location} 

        </p> 

        {exp.startDate && ( 

          <p className="text-xs text-gray-500"> 

            {new Date(exp.startDate).toLocaleDateString("en-US", { 

              month: "short", 

              year: "numeric", 

            })}{" "} 

            {exp.endDate && 

              ` - ${new Date(exp.endDate).toLocaleDateString("en-US", { 

                month: "short", 

                year: "numeric", 

              })}`} 

          </p> 

        )} 



        {/* Documents Section */} 

        <div className="mt-3 grid grid-cols-6 gap-2 text-xs text-center"> 

          {[ 

            { label: "Offer Letter", url: exp.offerLetterUrl }, 

            { label: "Separation Letter", url: exp.separationLetterUrl }, 

            { label: "Payslip 1", url: exp.payslip_1_url }, 

            { label: "Payslip 2", url: exp.payslip_2_url }, 

            { label: "Payslip 3", url: exp.payslip_3_url }, 

            { label: "Hike Letter", url: exp.hikeLetterUrl }, 

          ].map((doc, i) => ( 

            <div key={i} className="border rounded-md p-2 bg-white"> 

              <p className="text-gray-500">{doc.label}</p> 

              {doc.url ? ( 

                <a 

                  href={doc.url} 

                  target="_blank" 

                  rel="noopener noreferrer" 

                  className="text-red-600 inline-block mt-1" 

                > 

                  <FaRegFilePdf size={16}/> 

                </a> 

              ) : ( 

                <p className="text-gray-400 italic">N/A</p> 

              )} 

            </div> 

          ))} 

        </div> 

      </div> 

    )) 

  ) : ( 

    <div className="text-center p-4 border border-dashed rounded-md"> 

      <p className="text-gray-500">No work experience added yet.</p> 

      <Button 

        type="button" 

        variant="outline" 

        size="sm" 

        className="mt-2" 

        onClick={() => openExperienceModal()} 

      > 

        <Plus className="h-4 w-4 mr-1" /> Add Experience 

      </Button> 

    </div> 

  )} 

</div> 

</div> 


              </div>

              
            </TabsContent>

             

<TabsContent value="bank">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Bank Account Details</h3>
                  <p className="text-sm text-gray-500 mt-1">Add your bank account details here.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Name as in Bank</Label>
                    <Input
                        type="text"
                        id="accountHolderName"
                        value={formData.bankDetails.accountHolderName}
                        onChange={(e) => handleNestedInputChange("bankDetails", "accountHolderName", e.target.value)}
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                        type="text"
                        id="accountNumber"
                        value={formData.bankDetails.accountNumber}
                        onChange={(e) => handleNestedInputChange("bankDetails", "accountNumber", e.target.value)}
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                        type="text"
                        id="bankName"
                        value={formData.bankDetails.bankName}
                        onChange={(e) => handleNestedInputChange("bankDetails", "bankName", e.target.value)}
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                        type="text"
                        id="branchName"
                        value={formData.bankDetails.branchName}
                        onChange={(e) => handleNestedInputChange("bankDetails", "branchName", e.target.value)}
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                        type="text"
                        id="ifscCode"
                        value={formData.bankDetails.ifscCode}
                        onChange={(e) => handleNestedInputChange("bankDetails", "ifscCode", e.target.value)}
                      />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="branchAddress">Branch Address</Label>
                    <Textarea
                        id="branchAddress"
                        value={formData.bankDetails.branchAddress || ""}
                        onChange={(e) => handleNestedInputChange("bankDetails", "branchAddress", e.target.value)}
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select 
                      value={formData.bankDetails?.country || ""} 
                      onValueChange={(value) => handleNestedInputChange("bankDetails", "country", value)}
                    >
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
              {Country.getAllCountries().map((country) => (
                <SelectItem key={country.isoCode} value={country.isoCode}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Select 
                      value={formData.bankDetails?.state || ""} 
                      onValueChange={(value) => handleNestedInputChange("bankDetails", "state", value)}

                    >
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
              {State.getStatesOfCountry(formData.bankDetails.country).map((state) => (
                <SelectItem key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Select 
                      value={formData.bankDetails?.city || ""} 
                      onValueChange={(value) => handleNestedInputChange("bankDetails", "city", value)}

                    >
                      <SelectTrigger id="city">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
              {City.getCitiesOfState(formData.presentAddress.country, formData.presentAddress.state).map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                    <Input
                        type="text"
                        id="zipCode"
                        value={formData.bankDetails.zipCode}
                        onChange={(e) => handleNestedInputChange("bankDetails", "zipCode", e.target.value)}
                      />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Supporting Document (optional)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="py-3 px-4 bg-gray-50 rounded-md text-sm text-gray-500">
                      Cancel Cheque / Passbook First Page
                    </div>
                    <div className="relative">
                    <input
  type="file"
  id="bank-document-upload"
  className="sr-only"
  onChange={(e) => handleBankUpload(e, 'bankDetails')}
  accept=".pdf,.png,.jpg,.jpeg"
/>
                      <Label
                        htmlFor="bank-document-upload"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        + Upload File <span className="text-xs text-gray-500">(Supported format: PDF, PNG, JPG)</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

             
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
  <div>
    <h3 className="text-lg font-medium mb-4">Documentation</h3>
    <p className="text-sm text-gray-500 mb-4">
      Upload and view your identity documents here.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {['aadhar', 'pan', 'uan', 'esic'].map((docType) => (
        <div key={docType} className="space-y-2">
          <Label htmlFor={`${docType}Number`}>
            {docType.toUpperCase()} Number
          </Label>
          <div className="flex gap-3">
            <Input
              type="text"
              id={`${docType}Number`}
              value={formData[`${docType}Number`] || ''}
              onChange={(e) =>
                handleInputChange(`${docType}Number`, e.target.value)
              }
            />
            <div className="relative">
              <input
                type="file"
                id={`${docType}Upload`}
                className="sr-only"
                onChange={(e) => handleDocumentUpload(e, docType)}
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <Label
                htmlFor={`${docType}Upload`}
                className="cursor-pointer inline-flex items-center h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Label>
            </div>
          </div>

          {/* View Document Link */}
          {formData[`${docType}Url`] && (
            <div className="mt-2">
              <a
                href={formData[`${docType}Url`]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                <File className="h-4 w-4" />
                View {docType.toUpperCase()} Document
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
</TabsContent>


                 {/* Experience Modal */}
      {showExperienceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingExperienceIndex !== null ? "Edit Experience" : "Add Experience"}
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Job Type</Label>
                <RadioGroup 
                  value={currentExperience.jobType} 
                  onValueChange={(value) => handleExperienceChange('jobType', value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Full Time" id="fullTime" />
                    <Label htmlFor="fullTime">Full Time</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Part Time" id="partTime" />
                    <Label htmlFor="partTime">Part Time</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Internship" id="internship" />
                    <Label htmlFor="internship">Internship</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    value={currentExperience.company}
                    onChange={(e) => handleExperienceChange('company', e.target.value)}
                    placeholder="Enter Company Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Designation</Label>
                  <Input
                    id="position"
                    value={currentExperience.position}
                    onChange={(e) => handleExperienceChange('position', e.target.value)}
                    placeholder="Enter Designation"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={currentExperience.location}
                    onChange={(e) => handleExperienceChange('location', e.target.value)}
                    placeholder="Enter Location"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Date of Joining</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Select Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={handleExperienceStartDateChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">Date of Separation</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Select Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={handleExperienceEndDateChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Label htmlFor="offerLetter">Offer Letter*</Label>
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                      <input
              type="file"
              id="offerLetter"
              className="sr-only"
              accept=".pdf,.png,.jpg,.jpeg"
              disabled={uploadingFile !== null}
              onChange={(event) => handleExpUpload(event, "offerLetter", currentExperience.id)}
            />
            <Label htmlFor="offerLetter" className={`cursor-pointer text-primary hover:underline ${uploadingFile ? "opacity-50 cursor-not-allowed" : ""}`}>
              {uploadingFile === "offerLetter" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="animate-spin w-4 h-4" /> Uploading...
                </span>
              ) : (
                "+ Upload File"
              )}
            </Label>
          </div>
          {currentExperience.offerLetterUrl && (
            <a
              href={currentExperience.offerLetterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              View Document
            </a>
          )}
        </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Label htmlFor="separationLetter">Separation Letter*</Label>
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <input
                          type="file"
                          id="separationLetter"
                          className="sr-only"
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={noSeparationLetter}
                          onChange={(event) => handleExpUpload(event, 'separationLetter', currentExperience.id)}
                        />
                        <Label
                          htmlFor="separationLetter"
                          className={cn(
                            "cursor-pointer text-primary hover:underline",
                            noSeparationLetter && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          + Upload File <span className="text-xs text-gray-500">(Supported format: PDF, PNG, JPG)</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="noSeparationLetter" 
                      checked={noSeparationLetter}
                      onCheckedChange={(checked) => {
                        setNoSeparationLetter(checked === true);
                        if (checked) {
                          handleExperienceChange('separationLetterUrl', null);
                        }
                      }}
                    />
                    <Label htmlFor="noSeparationLetter" className="text-sm">Separation Letter</Label>
                  </div>
                </div>
                
                {noSeparationLetter && (
                  <div className="space-y-2">
                    <Label htmlFor="noSeparationLetterReason">Reason if separation letter is not available</Label>
                    <Input
                      id="noSeparationLetterReason"
                      value={currentExperience.noSeparationLetterReason || ""}
                      onChange={(e) => handleExperienceChange('noSeparationLetterReason', e.target.value)}
                      placeholder="Enter reason here"
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Label htmlFor="payslip1">Payslip 1*</Label>
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                      <input
        type="file"
        id="payslip1"
        className="sr-only"
        accept=".pdf,.png,.jpg,.jpeg"
        disabled={noPayslip}
        onChange={(event) => handleExpUpload(event, 'payslip1', currentExperience.id)}
      />
                        <Label
                          htmlFor="payslip1"
                          className={cn(
                            "cursor-pointer text-primary hover:underline",
                            noPayslip && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          + Upload File <span className="text-xs text-gray-500">(Supported format: PDF, PNG, JPG)</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="noPayslip" 
                      checked={noPayslip}
                      onCheckedChange={(checked) => {
                        setNoPayslip(checked === true);
                        if (checked) {
                          handleExperienceChange('payslips', []);
                        }
                      }}
                    />
                    <Label htmlFor="noPayslip" className="text-sm">Payslip</Label>
                  </div>
                </div>
                
                {noPayslip && (
                  <div className="space-y-2">
                    <Label htmlFor="noPayslipReason">Reason if payslip is not available</Label>
                    <Input
                      id="noPayslipReason"
                      value={currentExperience.noPayslipReason || ""}
                      onChange={(e) => handleExperienceChange('noPayslipReason', e.target.value)}
                      placeholder="Enter reason here"
                    />
                  </div>
                )}
                
                {!noPayslip && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="payslip2">Payslip 2*</Label>
                      <div className="flex gap-3 items-center">
                        <div className="relative">
                        <input
        type="file"
        id="payslip2"
        className="sr-only"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(event) => handleExpUpload(event, 'payslip2', currentExperience.id)}
      />
                          <Label
                            htmlFor="payslip2"
                            className="cursor-pointer text-primary hover:underline"
                          >
                            + Upload File <span className="text-xs text-gray-500">(Supported format: PDF, PNG, JPG)</span>
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="payslip3">Payslip 3*</Label>
                      <div className="flex gap-3 items-center">
                        <div className="relative">
                        <input
        type="file"
        id="payslip3"
        className="sr-only"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(event) => handleExpUpload(event, 'payslip3', currentExperience.id)}
      />
                          <Label
                            htmlFor="payslip3"
                            className="cursor-pointer text-primary hover:underline"
                          >
                            + Upload File <span className="text-xs text-gray-500">(Supported format: PDF, PNG, JPG)</span>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="hikeLetter">Hike Letter</Label>
                  <div className="flex gap-3 items-center">
                    <div className="relative">
                      <input
                        type="file"
                        id="hikeLetter"
                        className="sr-only"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(event) => handleExpUpload(event, 'hikeLetter', currentExperience.id)}
                      />
                      <Label
                        htmlFor="hikeLetter"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        + Upload File <span className="text-xs text-gray-500">(Supported format: PDF, PNG, JPG)</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowExperienceModal(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={saveExperience}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : (isEditing ? "Update Employee" : "Add Employee")}
                  </Button>
                </div>
              </form>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeForm;
