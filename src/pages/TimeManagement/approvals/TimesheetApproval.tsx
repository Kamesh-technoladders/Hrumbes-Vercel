
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, CheckSquare, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TimesheetList from "./components/TimesheetList";
import TimesheetDialog from "./components/TimesheetDialog";
import { useTimesheetApproval } from "./hooks/useTimesheetApproval";
import { toast } from "sonner";

const TimesheetApproval = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    pendingTimesheets,
    clarificationTimesheets,
    approvedTimesheets,
    loading,
    dialogTimesheet,
    dialogOpen,
    setDialogOpen,
    handleApprove,
    handleRequestClarification,
    fetchTimesheets,
    getPendingCount,
    openDialog,
    refreshData
  } = useTimesheetApproval();

  // Initial load and periodic refresh
  useEffect(() => {
    fetchTimesheets();
    
    // Set up interval for periodic refreshes
    const intervalId = setInterval(() => {
      fetchTimesheets();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTimesheets();
    setIsRefreshing(false);
    toast("Timesheet data refreshed");
  };

  console.log("pendingTimesheets", pendingTimesheets);
  return (
    <div className="content-area">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Timesheet Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve employee timesheets
        </p>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="relative">
            Pending Approvals
            {getPendingCount() > 0 && (
              <Badge className="ml-2 bg-primary absolute -top-2 -right-2" variant="default">
                {getPendingCount()}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Approval History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">New Submissions</h2>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search employees..."
                    className="w-[250px] pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <TimesheetList
                  timesheets={pendingTimesheets}
                  loading={loading}
                  searchTerm={searchTerm}
                  badgeColor="pending"
                  badgeText="Pending"
                  emptyMessage="No pending timesheet approvals"
                  openDialog={openDialog}
                />
              </CardContent>
            </Card>

            {clarificationTimesheets.length > 0 && (
              <>
                <h2 className="text-xl font-semibold mt-6">Clarifications Submitted</h2>
                <Card>
                  <CardContent className="p-0">
                    <TimesheetList
                      timesheets={clarificationTimesheets}
                      loading={loading}
                      searchTerm={searchTerm}
                      badgeColor="clarification"
                      badgeText="Clarified"
                      emptyMessage="No clarifications submitted"
                      openDialog={openDialog}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>
                Recently approved timesheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimesheetList
                timesheets={approvedTimesheets}
                loading={loading}
                searchTerm={searchTerm}
                badgeColor="approved"
                badgeText="Approved"
                emptyMessage="No approval history found"
                showActions={false}
                openDialog={openDialog}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for reviewing timesheets */}
      {dialogTimesheet && (
        <TimesheetDialog
          dialogTimesheet={dialogTimesheet}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          handleApprove={handleApprove}
          handleRequestClarification={handleRequestClarification}
          type={dialogTimesheet.clarification_status === 'submitted' ? 'clarification' : 'normal'}
        />
      )}
    </div>
  );
};

export default TimesheetApproval;
