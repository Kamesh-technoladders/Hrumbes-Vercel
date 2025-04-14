import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import EmployeeDataSelection, { DataSharingOptions } from "./EmployeeDataSelection";
import {
  Calendar,
  Briefcase,
  MapPin,
  FileCheck,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Share2,
  Copy,
  Mail,
  Phone,
  Building,
  Award,
  MapPinPlus,
  FileBadge
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Candidate } from "@/lib/types";

interface EmployeeProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
  shareMode?: boolean;
  shareId?: string;
  sharedDataOptions?: DataSharingOptions;
}

interface DocumentState {
  value: string;
  isVerifying: boolean;
  isVerified: boolean;
  verificationDate: string | null;
  error: string | null;
  isEditing: boolean;
}

const EmployeeProfileDrawer: React.FC<EmployeeProfileDrawerProps> = ({
  open,
  onClose,
  candidate,
  shareMode = false,
  shareId,
  sharedDataOptions,
}) => {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [showDataSelection, setShowDataSelection] = useState(false);
  const [currentDataOptions, setCurrentDataOptions] = useState<DataSharingOptions>(
    sharedDataOptions || {
      personalInfo: true,
      contactInfo: true,
      documentsInfo: true,
      workInfo: true,
      // activityInfo: false,
      // assignedInfo: false,
      skillinfo: true,
    }
  );

  const [activeTab, setActiveTab] = useState("documents");

  // Normalize skills to an array of strings
  const normalizeSkills = (skills: any[] | undefined): string[] => {
    if (!skills || !skills.length) return ["N/A"];
    return skills.map((skill) => (typeof skill === "string" ? skill : skill?.name || "Unknown"));
  };

  console.log("Candidateshared", candidate)

  // Employee data for normal mode
  const employeeNormal = candidate
    ? {
        id: candidate.id || "emp001",
        name: candidate.name || "Unknown Candidate",
        role: candidate.metadata?.role || "N/A",
        department: candidate.metadata?.department || "N/A",
        joinDate: candidate.appliedDate || "N/A",
        status: candidate.status || "Applied",
        tags: candidate.metadata?.tags || ["N/A"],
        profileImage: candidate.metadata?.profileImage || "/lovable-uploads/placeholder.png",
        email: candidate.email || "N/A",
        phone: candidate.phone || "N/A",
        location: candidate.metadata?.currentLocation || "N/A",
        skills: normalizeSkills(candidate.skills || candidate.skill_ratings),
        skillRatings: candidate.skill_ratings || [],
        experience: candidate.experience || "N/A",
        relvantExpyears:candidate.metadata?.relevantExperience || "N/A",
        relvantExpmonths:candidate.metadata?.relevantExperienceMonths || "N/A",
        preferedLocation: Array.isArray(candidate.metadata?.preferredLocations)
        ? candidate.metadata.preferredLocations.join(", ")
        : "N/A",
        resume: candidate.resume || candidate.metadata?.resume_url || "#",

      }
    : {
        id: "emp001",
        name: "Unknown Candidate",
        role: "N/A",
        department: "N/A",
        joinDate: "N/A",
        status: "N/A",
        tags: ["N/A"],
        profileImage: "/lovable-uploads/placeholder.png",
        email: "N/A",
        phone: "N/A",
        location: "N/A",
        skills: ["N/A"],
        experience: "N/A",
        skillRatings: [], // Added for skill matrix
      resume: "#"
      };

  // Employee data for shared mode, using candidate data by default
  const employeeShared = {
    id: shareId || "unknown",
    name: sharedDataOptions?.personalInfo && candidate?.name ? candidate.name : "Shared Employee Profile",
    role: sharedDataOptions?.personalInfo && candidate?.metadata?.role ? candidate.metadata.role : "N/A",
    department: sharedDataOptions?.personalInfo && candidate?.metadata?.department ? candidate.metadata.department : "N/A",
    joinDate: sharedDataOptions?.personalInfo && candidate?.appliedDate ? candidate.appliedDate : "N/A",
    status: "Shared",
    tags: sharedDataOptions?.personalInfo && candidate?.metadata?.tags ? candidate.metadata.tags : [],
    profileImage: sharedDataOptions?.personalInfo && candidate?.metadata?.profileImage ? candidate.metadata.profileImage : "/lovable-uploads/placeholder.png",
    email: sharedDataOptions?.contactInfo && candidate?.email ? candidate.email : "N/A",
    phone: sharedDataOptions?.contactInfo && candidate?.phone ? candidate.phone : "N/A",
    location: sharedDataOptions?.contactInfo && candidate.metadata?.currentLocation ? candidate.metadata?.currentLocation : "N/A",
    skills: sharedDataOptions?.personalInfo && candidate?.skills ? normalizeSkills(candidate.skills) : ["N/A"],
    experience: sharedDataOptions?.personalInfo && candidate?.experience ? candidate.experience : "N/A",
    relvantExpyears: sharedDataOptions?.personalInfo && candidate.metadata?.relevantExperience ? candidate.metadata?.relevantExperience : "N/A",
    relvantExpmonths: sharedDataOptions?.personalInfo && candidate.metadata?.relevantExperienceMonths ? candidate.metadata?.relevantExperienceMonths : "N/A",
    preferedLocation:
    sharedDataOptions?.personalInfo &&
    Array.isArray(candidate.metadata?.preferredLocations)
      ? candidate.metadata.preferredLocations.join(", ")
      : "N/A",
      skillRatings: sharedDataOptions?.personalInfo && candidate?.skill_ratings ? candidate.skill_ratings : [], // Added for skill matrix
      resume: sharedDataOptions?.personalInfo && (candidate?.resume || candidate?.metadata?.resume_url) ? candidate.resume || candidate.metadata.resume_url : "#", // Added for resume buttons
  };

  const employee = shareMode ? employeeShared : employeeNormal;

  // Document verification states for normal mode
  const documentsNormal = {
    aadhar: {
      value: candidate?.metadata?.aadhar || "1234-5678-9012",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    pan: {
      value: candidate?.metadata?.pan || "ABCDE1234F",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    uan: {
      value: candidate?.metadata?.uan || "100123456789",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    esic: {
      value: candidate?.metadata?.esic || "3214567890",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
  };

  // Documents for shared mode, using candidate data by default
  const documentsShared = {
    aadhar: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.aadhar ? candidate.metadata.aadhar : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    pan: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.pan ? candidate.metadata.pan : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    uan: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.uan ? candidate.metadata.uan : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    esic: {
      value: sharedDataOptions?.documentsInfo && candidate?.metadata?.esic ? candidate.metadata.esic : "Restricted",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
  };

  const documents = shareMode ? documentsShared : documentsNormal;

  // Mock activity data (can be adjusted to use candidate data if needed)
  const activities = shareMode
    ? sharedDataOptions?.activityInfo && candidate?.name
      ? [
          {
            id: 1,
            user: "System",
            action: `Created ${candidate.name}'s profile`,
            timestamp: "Today, 10:30 AM",
            icon: <Users className="text-blue-500" size={16} />,
          },
        ]
      : []
    : [
        {
          id: 1,
          user: "System",
          action: "Created employee profile",
          timestamp: "Today, 10:30 AM",
          icon: <Users className="text-blue-500" size={16} />,
        },
        {
          id: 2,
          user: "HR Manager",
          action: "Approved employment contract",
          timestamp: "Today, 09:45 AM",
          icon: <FileCheck className="text-green-500" size={16} />,
        },
        {
          id: 3,
          user: candidate?.name || "Unknown Candidate",
          action: "Uploaded Aadhar card document",
          timestamp: "Yesterday, 03:15 PM",
          icon: <FileCheck className="text-indigo-500" size={16} />,
        },
      ];

  // Mock work data (can be adjusted to use candidate data if needed)
  const workItems = shareMode
    ? sharedDataOptions?.workInfo
      ? [
          {
            id: 1,
            title: `Sample Task for ${candidate?.name || "Employee"}`,
            dueDate: "2025-04-15",
            priority: "Medium",
            status: "In Progress",
          },
        ]
      : []
    : [
        {
          id: 1,
          title: "Homepage Redesign",
          dueDate: "October 15, 2023",
          priority: "High",
          status: "In Progress",
        },
        {
          id: 2,
          title: "User Flow Documentation",
          dueDate: "October 20, 2023",
          priority: "Medium",
          status: "Not Started",
        },
      ];

  // Assigned data
  const assigned = shareMode
    ? {
        manager: sharedDataOptions?.assignedInfo && candidate?.metadata?.manager ? candidate.metadata.manager : "Restricted",
        hr: sharedDataOptions?.assignedInfo && candidate?.metadata?.hr ? candidate.metadata.hr : "Restricted",
        team: sharedDataOptions?.assignedInfo && candidate?.metadata?.team ? candidate.metadata.team : "Restricted",
        office: sharedDataOptions?.assignedInfo && candidate?.location ? candidate.location : "Restricted",
      }
    : {
        manager: candidate?.metadata?.manager || "Sarah Johnson",
        hr: candidate?.metadata?.hr || "Michael Brown",
        team: candidate?.metadata?.team || "N/A",
        office: candidate?.location || "N/A",
      };

  // Handle document value change
  const handleDocumentChange = (type: keyof typeof documents, value: string) => {
    if (shareMode) return; // Disable editing in share mode
    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        value,
      },
    }));
  };

  // Toggle editing state
  const toggleEditing = (type: keyof typeof documents) => {
    if (shareMode) return; // Disable editing in share mode
    if (documents[type].isVerified) {
      toast({
        title: "Cannot edit verified document",
        description: "Please contact HR to update verified documents.",
        variant: "destructive",
      });
      return;
    }

    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        isEditing: !prev[type].isEditing,
      },
    }));
  };

  // Handle document verification
  const verifyDocument = (type: keyof typeof documents) => {
    if (shareMode) return; // Disable verification in share mode
    if (!documents[type].value.trim()) {
      toast({
        title: "Validation Error",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} number cannot be empty.`,
        variant: "destructive",
      });
      return;
    }

    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        isVerifying: true,
        error: null,
      },
    }));

    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;

      if (isSuccess) {
        setDocuments((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            isVerifying: false,
            isVerified: true,
            verificationDate: new Date().toLocaleString(),
            error: null,
            isEditing: false,
          },
        }));

        toast({
          title: "Verification Successful",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} number has been verified successfully.`,
        });
      } else {
        setDocuments((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            isVerifying: false,
            isVerified: false,
            error: "Verification failed. Please check the document number.",
          },
        }));

        toast({
          title: "Verification Failed",
          description: "Unable to verify document. Please check the number and try again.",
          variant: "destructive",
        });
      }
    }, 1500);
  };

  // Handle opening the data selection dialog
  const handleShareClick = () => {
    setShowDataSelection(true);
  };

  // Create and share magic link with selected data options
  const generateMagicLink = (dataOptions: DataSharingOptions) => {
    setIsSharing(true);
    setCurrentDataOptions(dataOptions);

    setTimeout(() => {
      const uuid = crypto.randomUUID ? crypto.randomUUID() : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      const shareId = `${uuid}-${Date.now()}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 2);

      const encodedOptions = encodeURIComponent(JSON.stringify(dataOptions));
      const link = `${window.location.origin}/share/${shareId}?expires=${expiryDate.getTime()}&options=${encodedOptions}&candidate=${encodeURIComponent(JSON.stringify(candidate))}`;

      console.log("Generated Share ID:", shareId);
      console.log("Generated Link:", link);
      console.log("Data Options:", dataOptions);
      console.log("Candidate Data:", candidate);

      setMagicLink(link);
      setIsSharing(false);

      toast({
        title: "Magic Link Created",
        description: "A shareable link with your selected data has been created. It will expire in 2 days.",
      });
    }, 1000);
  };

  // Copy magic link to clipboard
  const copyMagicLink = () => {
    if (magicLink) {
      navigator.clipboard.writeText(magicLink);
      setIsCopied(true);

      toast({
        title: "Link Copied",
        description: "Magic link copied to clipboard.",
      });

      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Render verification status
  const renderVerificationStatus = (doc: DocumentState) => {
    if (shareMode) return null; // No verification status in share mode
    if (doc.isVerifying) {
      return (
        <div className="flex items-center text-yellow-600">
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          <span className="text-xs">Verifying...</span>
        </div>
      );
    }

    if (doc.isVerified) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircle2 className="mr-1 h-4 w-4" />
          <span className="text-xs">Verified on {doc.verificationDate}</span>
        </div>
      );
    }

    if (doc.error) {
      return (
        <div className="flex items-center text-red-600">
          <XCircle className="mr-1 h-4 w-4" />
          <span className="text-xs">{doc.error}</span>
        </div>
      );
    }

    return null;
  };

  // Render document verification row
  const renderDocumentRow = (type: keyof typeof documents, label: string) => {
    const doc = documents[type];

    return (
      <div className="border rounded-lg mb-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center">
                <p className="text-sm font-medium">{label}</p>
                {doc.isVerified && !shareMode && (
                  <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              {doc.isEditing && !shareMode ? (
                <Input
                  value={doc.value}
                  onChange={(e) => handleDocumentChange(type, e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground">{doc.value}</p>
              )}
              {renderVerificationStatus(doc)}
            </div>
            {!shareMode && (
              <div className="flex space-x-2">
                {(!doc.isVerified || doc.error) && (
                  <Button
                    onClick={() => toggleEditing(type)}
                    variant="outline"
                    size="sm"
                    disabled={doc.isVerifying}
                  >
                    {doc.isEditing ? "Save" : "Edit"}
                  </Button>
                )}
                <Button
                  onClick={() => verifyDocument(type)}
                  variant="secondary"
                  size="sm"
                  disabled={doc.isVerifying || (doc.isVerified && !doc.error)}
                  className={cn(doc.isVerified && "bg-green-100 text-green-800 hover:bg-green-200")}
                >
                  {doc.isVerifying ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : doc.isVerified ? (
                    <>
                      Verified <CheckCircle2 className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    <>Verify 🔍</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render employee skills section
const renderSkills = () => {
  if (shareMode && !sharedDataOptions?.personalInfo) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Skills & Expertise</h3>
      <div className="flex flex-wrap gap-2">
        {employee.skillRatings.map((skill, index) => (
          <Badge
            key={index}
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            {skill.name} 
            {/* (<span className="text-black ml-1">{skill.rating}★</span>) */}
          </Badge>
        ))}
      </div>
    </div>
  );
};

  // Available tabs based on sharedDataOptions
  const availableTabs = shareMode
    ? [
        sharedDataOptions?.documentsInfo && "documents",
        sharedDataOptions?.skillinfo && "skill-matrix",
        // sharedDataOptions?.workInfo && "my-work",
        // sharedDataOptions?.activityInfo && "activity",
      ].filter(Boolean)
    : ["documents", "skill-matrix"];

  if (shareMode && !availableTabs.length) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto bg-gray-50">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-2xl text-gray-900">No Data Available</SheetTitle>
          </SheetHeader>
          <div className="text-center text-gray-600">
            No data has been selected for sharing.
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto bg-gray-50">
          <SheetHeader className="mb-5 mt-3">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-2xl text-gray-900">{employee.name}</SheetTitle>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Applied: {employee.joinDate}</span>
                </div>
              </div>
              <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(employee.resume, "_blank")} // View resume in new tab
        className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
      >
        View Resume
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => {
          const link = document.createElement("a");
          link.href = employee.resume;
          link.download = `${employee.name}_Resume.pdf`; // Suggest filename
          link.click();
          toast({
            title: "Resume Download Started",
            description: "The resume is being downloaded.",
          });
        }}
        className="bg-indigo-600 text-white hover:bg-indigo-700"
      >
        Download Resume
      </Button>
    </div>
  </div>
        

            {(!shareMode || sharedDataOptions?.personalInfo || sharedDataOptions?.contactInfo) && (
              <div className="mt-6">
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col space-y-4">
                    {(!shareMode || sharedDataOptions?.contactInfo) && (
  <>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center">
        <Mail className="w-4 h-4 mr-2 text-indigo-500" />
        <span className="text-gray-600">{employee.email}</span>
      </div>
      <Button
        variant="copyicon"
        size="xs"
        onClick={() => {
          navigator.clipboard.writeText(employee.email);
          toast({
            title: "Email Copied",
            description: "Email address copied to clipboard.",
          });
        }}
        className="text-indigo-500 hover:text-indigo-700"
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center">
        <Phone className="w-4 h-4 mr-2 text-indigo-500" />
        <span className="text-gray-600">{employee.phone}</span>
      </div>
      <Button
        variant="copyicon"
        size="xs"
        onClick={() => {
          navigator.clipboard.writeText(employee.phone);
          toast({
            title: "Phone Copied",
            description: "Phone number copied to clipboard.",
          });
        }}
        className="text-indigo-500 hover:text-indigo-700"
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  </>
)}
                      {(!shareMode || sharedDataOptions?.personalInfo) && (
                        <>
                          <div className="flex items-center text-sm">
                            <FileBadge className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Total Experience</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.experience}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Award className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Relevant Experience</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.relvantExpyears} years and {employee.relvantExpmonths} months</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Current Location</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.location}</span>
              
                          </div>
                          <div className="flex items-center text-sm">
                            <MapPinPlus className="w-4 h-4 mr-2 text-indigo-500" />
                            <span className="font-medium text-gray-700">Prefered Location</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-600">{employee.preferedLocation}</span>
                          </div>
                        </>
                      )}
                      
                    </div>
                  </CardContent>
                </Card>

                {(!shareMode || sharedDataOptions?.personalInfo) && (
                  <>
                    {/* <div className="flex mt-4 flex-wrap gap-2">
                      {employee.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-gray-50">
                          {tag.includes("Team:") ? (
                            <>
                              <Users className="w-3 h-3 mr-1" />
                              {tag}
                            </>
                          ) : tag.includes("Location:") ? (
                            <>
                              <MapPin className="w-3 h-3 mr-1" />
                              {tag}
                            </>
                          ) : (
                            tag
                          )}
                        </Badge>
                      ))}
                    </div> */}
                    {renderSkills()}
                  </>
                )}
              </div>
            )}
          </SheetHeader>

          {!shareMode && (
            <div className="mb-6">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                onClick={handleShareClick}
                disabled={isSharing}
              >
                {isSharing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" /> Create Shareable Magic Link
                  </>
                )}
              </Button>

              {magicLink && (
                <div className="mt-2 p-3 bg-indigo-50 rounded-md border border-indigo-100 relative">
                  <p className="text-xs text-indigo-700 mb-1 font-medium">
                    Magic Link (expires in 2 days):
                  </p>
                  <div className="flex">
                    <Input
                      value={magicLink}
                      readOnly
                      className="text-xs pr-10 bg-white border-indigo-200"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-6"
                      onClick={copyMagicLink}
                    >
                      {isCopied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-indigo-500" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator className="my-6" />

          <Tabs defaultValue={availableTabs[0]} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid grid-cols-${availableTabs.length} mb-6`}>
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab === "documents" && "Documents"}
                  {tab === "skill-matrix" && "Skill Matrix"}
                  {/* {tab === "my-work" && "My Work"}
                  {tab === "activity" && "Activity"} */}
                </TabsTrigger>
              ))}
            </TabsList>

            {(!shareMode || sharedDataOptions?.documentsInfo) && (
              <TabsContent value="documents">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium mb-4">Verification Documents</h3>
                  {renderDocumentRow("aadhar", "Aadhar Number")}
                  {renderDocumentRow("pan", "PAN Number")}
                  {renderDocumentRow("uan", "UAN Number")}
                  {renderDocumentRow("esic", "ESIC Number")}
                </div>
              </TabsContent>
            )}

{(!shareMode || sharedDataOptions?.personalInfo) && (
  <TabsContent value="skill-matrix">
    <div className="space-y-4">
      <h3 className="text-sm font-medium mb-4">Skill Matrix</h3>
      <div className="grid grid-cols-1 gap-4">
        {employee.skillRatings.map((skill, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">{skill.name}</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= skill.rating ? "text-yellow-400" : "text-gray-300"
                    )}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </TabsContent>
)}

            {/* {(!shareMode || sharedDataOptions?.workInfo) && (
              <TabsContent value="my-work">
                <div className="space-y-4">
                  {workItems.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge
                          className={cn(
                            "text-xs",
                            item.status === "In Progress"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              : item.status === "Not Started"
                              ? "bg-gray-100 text-gray-800 hover:bg-gray-100"
                              : "bg-green-100 text-green-800 hover:bg-green-100"
                          )}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          Due: {item.dueDate}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Priority: {item.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )} */}

            {/* {(!shareMode || sharedDataOptions?.activityInfo) && (
              <TabsContent value="activity">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Today</h3>
                  {activities
                    .filter((activity) => activity.timestamp.includes("Today"))
                    .map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="mt-0.5">{activity.icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">{activity.user}</p>
                            <p className="text-xs text-gray-500">{activity.timestamp}</p>
                          </div>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                        </div>
                      </div>
                    ))}

                  <h3 className="text-sm font-medium pt-2">Yesterday</h3>
                  {activities
                    .filter((activity) => activity.timestamp.includes("Yesterday"))
                    .map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="mt-0.5">{activity.icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">{activity.user}</p>
                            <p className="text-xs text-gray-500">{activity.timestamp}</p>
                          </div>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            )} */}
          </Tabs>
        </SheetContent>
      </Sheet>

      {!shareMode && (
        <EmployeeDataSelection
          open={showDataSelection}
          onClose={() => setShowDataSelection(false)}
          onConfirm={generateMagicLink}
          defaultOptions={currentDataOptions}
        />
      )}
    </>
  );
};

export default EmployeeProfileDrawer;