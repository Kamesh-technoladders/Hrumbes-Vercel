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
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Candidate } from "@/lib/types";

interface EmployeeProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  candidate: Candidate | null;
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
  open, onClose, candidate
}) => {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [showDataSelection, setShowDataSelection] = useState(false);
  const [currentDataOptions, setCurrentDataOptions] = useState<DataSharingOptions>({
    personalInfo: true,
    contactInfo: true,
    documentsInfo: true,
    workInfo: false,
    activityInfo: false,
    assignedInfo: false
  });
  
  const [activeTab, setActiveTab] = useState("documents");
  
  // Normalize skills to an array of strings
  const normalizeSkills = (skills: any[] | undefined): string[] => {
    if (!skills || !skills.length) return ["None"];
    return skills.map(skill => {
      if (typeof skill === "string") return skill;
      if (typeof skill === "object" && skill !== null && "name" in skill) {
        return skill.name;
      }
      return "Unknown";
    });
  };

  // Use candidate data if available, fallback to defaults for unavailable fields
  const employee = candidate
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
        location: candidate.location || "N/A",
        skills: normalizeSkills(candidate.skills || candidate.skill_ratings),
        experience: candidate.experience || "N/A"
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
        skills: ["None"],
        experience: "N/A"
      };
  
  // Document verification states
  const [documents, setDocuments] = useState({
    aadhar: {
      value: candidate?.metadata?.aadhar || "1234-5678-9012",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false
    },
    pan: {
      value: candidate?.metadata?.pan || "ABCDE1234F",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false
    },
    uan: {
      value: candidate?.metadata?.uan || "100123456789",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false
    },
    esic: {
      value: candidate?.metadata?.esic || "3214567890",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false
    }
  });
  
  // Mock activity data
  const activities = [
    {
      id: 1,
      user: "System",
      action: "Created employee profile",
      timestamp: "Today, 10:30 AM",
      icon: <Users className="text-blue-500" size={16} />
    },
    {
      id: 2,
      user: "HR Manager",
      action: "Approved employment contract",
      timestamp: "Today, 09:45 AM",
      icon: <FileCheck className="text-green-500" size={16} />
    },
    {
      id: 3,
      user: candidate?.name || "Unknown Candidate",
      action: "Uploaded Aadhar card document",
      timestamp: "Yesterday, 03:15 PM",
      icon: <FileCheck className="text-indigo-500" size={16} />
    }
  ];
  
  // Mock work data
  const workItems = [
    {
      id: 1,
      title: "Homepage Redesign",
      dueDate: "October 15, 2023",
      priority: "High",
      status: "In Progress"
    },
    {
      id: 2,
      title: "User Flow Documentation",
      dueDate: "October 20, 2023",
      priority: "Medium",
      status: "Not Started"
    }
  ];
  
  // Mock assigned data
  const assigned = {
    manager: candidate?.metadata?.manager || "Sarah Johnson",
    hr: candidate?.metadata?.hr || "Michael Brown",
    team: candidate?.metadata?.team || "N/A",
    office: candidate?.location || "N/A"
  };
  
  // Handle document value change
  const handleDocumentChange = (type: keyof typeof documents, value: string) => {
    setDocuments(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        value
      }
    }));
  };
  
  // Toggle editing state
  const toggleEditing = (type: keyof typeof documents) => {
    if (documents[type].isVerified) {
      toast({
        title: "Cannot edit verified document",
        description: "Please contact HR to update verified documents.",
        variant: "destructive"
      });
      return;
    }
    
    setDocuments(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        isEditing: !prev[type].isEditing
      }
    }));
  };
  
  // Handle document verification
  const verifyDocument = (type: keyof typeof documents) => {
    if (!documents[type].value.trim()) {
      toast({
        title: "Validation Error",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} number cannot be empty.`,
        variant: "destructive"
      });
      return;
    }
    
    setDocuments(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        isVerifying: true,
        error: null
      }
    }));
    
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      
      if (isSuccess) {
        setDocuments(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            isVerifying: false,
            isVerified: true,
            verificationDate: new Date().toLocaleString(),
            error: null,
            isEditing: false
          }
        }));
        
        toast({
          title: "Verification Successful",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} number has been verified successfully.`,
        });
      } else {
        setDocuments(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            isVerifying: false,
            isVerified: false,
            error: "Verification failed. Please check the document number.",
          }
        }));
        
        toast({
          title: "Verification Failed",
          description: "Unable to verify document. Please check the number and try again.",
          variant: "destructive"
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
      const shareId = `${employee.id}-${Date.now()}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 2);
      
      const encodedOptions = encodeURIComponent(JSON.stringify(dataOptions));
      const link = `${window.location.origin}/share/${shareId}?expires=${expiryDate.getTime()}&options=${encodedOptions}`;
      
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
                {doc.isVerified && (
                  <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              {doc.isEditing ? (
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
                className={cn(
                  doc.isVerified && "bg-green-100 text-green-800 hover:bg-green-200"
                )}
              >
                {doc.isVerifying ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : doc.isVerified ? (
                  <>Verified <CheckCircle2 className="ml-1 h-3 w-3" /></>
                ) : (
                  <>Verify 🔍</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render employee skills section
  const renderSkills = () => {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {employee.skills.map((skill, index) => (
            <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto bg-gray-50">
          <SheetHeader className="mb-5">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-2xl text-gray-900">{employee.name}</SheetTitle>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Applied: {employee.joinDate}</span>
                </div>
              </div>
              <Badge className={cn(
                "text-sm px-3 py-1",
                employee.status === "Hired" ? "bg-green-100 text-green-800 hover:bg-green-100" :
                employee.status === "Applied" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                employee.status === "Rejected" ? "bg-red-100 text-red-800 hover:bg-red-100" :
                "bg-gray-100 text-gray-800 hover:bg-gray-100"
              )}>
                {employee.status}
              </Badge>
            </div>
            
            <div className="mt-6">
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center text-sm">
                      <Briefcase className="w-4 h-4 mr-2 text-indigo-500" />
                      <span className="font-medium text-gray-700">{employee.role}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-gray-600">{employee.department}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 mr-2 text-indigo-500" />
                      <span className="text-gray-600">{employee.email}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 mr-2 text-indigo-500" />
                      <span className="text-gray-600">{employee.phone}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                      <span className="text-gray-600">{employee.location}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Award className="w-4 h-4 mr-2 text-indigo-500" />
                      <span className="text-gray-600">{employee.experience} of experience</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex mt-4 flex-wrap gap-2">
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
              </div>
              
              {renderSkills()}
            </div>
          </SheetHeader>
          
          <div className="mb-6">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200" 
              onClick={handleShareClick}
              disabled={isSharing}
            >
              {isSharing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Link...</>
              ) : (
                <><Share2 className="mr-2 h-4 w-4" /> Create Shareable Magic Link</>
              )}
            </Button>
            
            {magicLink && (
              <div className="mt-2 p-3 bg-indigo-50 rounded-md border border-indigo-100 relative">
                <p className="text-xs text-indigo-700 mb-1 font-medium">Magic Link (expires in 2 days):</p>
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
          
          <Separator className="my-6" />
          
          <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="my-work">My Work</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents">
              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-4">Verification Documents</h3>
                {renderDocumentRow("aadhar", "Aadhar Number")}
                {renderDocumentRow("pan", "PAN Number")}
                {renderDocumentRow("uan", "UAN Number")}
                {renderDocumentRow("esic", "ESIC Number")}
              </div>
            </TabsContent>
            
            <TabsContent value="assigned">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-indigo-500 mr-2" />
                      <p className="text-sm font-medium">Reporting Manager</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{assigned.manager}</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-indigo-500 mr-2" />
                      <p className="text-sm font-medium">HR Contact</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{assigned.hr}</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-indigo-500 mr-2" />
                      <p className="text-sm font-medium">Team</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{assigned.team}</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <Building className="w-5 h-5 text-indigo-500 mr-2" />
                      <p className="text-sm font-medium">Office Location</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{assigned.office}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="my-work">
              <div className="space-y-4">
                {workItems.map(item => (
                  <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge 
                        className={cn(
                          "text-xs",
                          item.status === "In Progress" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                          item.status === "Not Started" ? "bg-gray-100 text-gray-800 hover:bg-gray-100" :
                          "bg-green-100 text-green-800 hover:bg-green-100"
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
            
            <TabsContent value="activity">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Today</h3>
                {activities
                  .filter(activity => activity.timestamp.includes("Today"))
                  .map(activity => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
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
                  .filter(activity => activity.timestamp.includes("Yesterday"))
                  .map(activity => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
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
          </Tabs>
        </SheetContent>
      </Sheet>
      
      <EmployeeDataSelection
        open={showDataSelection}
        onClose={() => setShowDataSelection(false)}
        onConfirm={generateMagicLink}
        defaultOptions={currentDataOptions}
      />
    </>
  );
};

export default EmployeeProfileDrawer;