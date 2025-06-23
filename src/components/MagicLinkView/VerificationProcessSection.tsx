
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Candidate, DocumentState } from "@/components/MagicLinkView/types";
import axios from "axios";
import { supabase } from "@/integrations/supabase/client";

interface VerificationProcessSectionProps {
  candidate: Candidate | null;
  organizationId: string | null;
  isUanLoading: boolean;
  uanData: any | null;
  lookupMethod: 'mobile' | 'pan';
  setLookupMethod: (value: 'mobile' | 'pan') => void;
  lookupValue: string;
  setLookupValue: (value: string) => void;
  onUanLookup: () => void;
  documents: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  };
  shareMode: boolean;
  onDocumentChange: (type: keyof typeof documents, value: string) => void;
  onToggleEditing: (type: keyof typeof documents) => void;
  onToggleUANResults: () => void;
  onVerifyDocument: (type: keyof typeof documents, candidateId: string, workHistory: any, candidate: any, organizationId: string) => Promise<void>;
  onSaveDocuments: () => Promise<void>;
  isSavingDocuments: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4001';

interface FullHistoryEmploymentEntry {
  DateOfExitEpf: string;
  Doj: string;
  EstablishmentName: string;
  MemberId: string;
  fatherOrHusbandName: string;
  name: string;
  uan: string;
  Overlapping: string;
}

interface TruthScreenFullHistoryResponse {
  msg: FullHistoryEmploymentEntry[] | string;
  status: number;
  transId: string;
  tsTransId: string;
  error?: string;
}

const encryptUanFullHistory = async (transId: string, uan: string): Promise<string> => {
  try {
    const response = await axios.post<any>(
      `${API_BASE_URL}/encrypt`,
      { transID: transId, docType: '337', uan },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data.error) throw new Error(response.data.error);
    if (!response.data.requestData) throw new Error('Missing requestData in encryption response');
    return response.data.requestData;
  } catch (error: any) {
    console.error('Full History Encryption error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to encrypt full history data');
  }
};

const verifyUanFullHistory = async (requestData: string): Promise<string> => {
  try {
    const response = await axios.post<any>(
      `${API_BASE_URL}/verify`,
      { requestData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data.error) throw new Error(response.data.error);
    if (!response.data.responseData) throw new Error('Missing responseData in verification response');
    return response.data.responseData;
  } catch (error: any) {
    console.error('Full History Verification error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to verify full history data');
  }
};

const decryptUanFullHistory = async (responseData: string): Promise<TruthScreenFullHistoryResponse> => {
  try {
    const response = await axios.post<any>(
      `${API_BASE_URL}/decrypt`,
      { responseData },
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log("🔓 Decrypted Response:", response.data);

    if (response.data.error) {
      console.error('API Error in decryptUanFullHistory:', response.data.error);
      throw new Error(response.data.error);
    }

    // Log and handle TruthScreen-specific error message
    if (response.data.msg && response.data.status !== 1) {
      console.error('TruthScreen Error in decryptUanFullHistory:', response.data.msg);
      throw new Error(response.data.msg);
    }

    // Validate response structure
    if (response.data.status === undefined || !response.data.tsTransId || response.data.msg === undefined) {
      const errorMsg = typeof response.data.msg === 'string'
        ? response.data.msg
        : 'Incomplete data or unexpected status in decryption response.';
      console.error('Validation Error in decryptUanFullHistory:', errorMsg);
      throw new Error(errorMsg);
    }

    const normalizedMsg = Array.isArray(response.data.msg)
      ? response.data.msg.map((entry: any) => ({
          DateOfExitEpf: entry.DateOfExitEpf,
          Doj: entry.Doj,
          EstablishmentName: entry['Establishment Name'] || entry.EstablishmentName,
          MemberId: entry.MemberId,
          fatherOrHusbandName: entry['father or Husband Name'] || entry.fatherOrHusbandName,
          name: entry.name,
          uan: entry.uan,
          Overlapping: entry.Overlapping,
        }))
      : response.data.msg;

    return {
      ...response.data,
      msg: normalizedMsg,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to decrypt full history data';
    console.error('Full History Decryption Error:', {
      message: errorMessage,
      responseData: error.response?.data,
      originalError: error.message,
    });
    throw new Error(errorMessage);
  }
};

export const VerificationProcessSection: React.FC<VerificationProcessSectionProps> = ({
  candidate,
  organizationId,
  isUanLoading,
  uanData,
  lookupMethod,
  setLookupMethod,
  lookupValue,
  setLookupValue,
  onUanLookup,
  documents,
  shareMode,
  onDocumentChange,
  onToggleEditing,
  onToggleUANResults,
  onVerifyDocument,
  onSaveDocuments,
  isSavingDocuments,
}) => {
  const { toast } = useToast();
  const [activeUanTab, setActiveUanTab] = useState<string>('basic');
  const [fullHistoryData, setFullHistoryData] = useState<TruthScreenFullHistoryResponse | null>(null);
  const [isFullHistoryLoading, setIsFullHistoryLoading] = useState(false);
  const [fullHistoryError, setFullHistoryError] = useState<string | null>(null);
  const [isUanVerified, setIsUanVerified] = useState<boolean>(false);

  const candidateUanFromMetadata = candidate?.metadata?.uan;
  const hasUanInMetadata = !!candidateUanFromMetadata;
  const isUanBasicVerifiedAndDataAvailable = !!uanData && uanData.status === 1 && !!uanData.msg?.uan_details?.length;

  console.log("candidateUanFromMetadata", candidateUanFromMetadata);
  console.log("hasUanInMetadata", hasUanInMetadata);
  console.log("isUanBasicVerifiedAndDataAvailable", isUanBasicVerifiedAndDataAvailable);

  useEffect(() => {
    const fetchPreviousFullHistoryData = async () => {
      if (!candidate?.id || !candidateUanFromMetadata || isFullHistoryLoading) {
        setFullHistoryData(null);
        setIsUanVerified(false);
        return;
      }
      setIsFullHistoryLoading(true);
      console.log(`Fetching previous full UAN history for candidate ${candidate.id}...`);
      const { data, error } = await supabase
        .from('uanlookups')
        .select('response_data')
        .eq('candidate_id', candidate.id)
        .eq('lookup_type', 'uan_full_history')
        .eq('status', 1)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching previous full UAN history from uanlookups:', error);
        toast({
          title: 'Error',
          description: 'Failed to load previous full UAN history.',
          variant: 'destructive',
        });
        setFullHistoryData(null);
        setIsUanVerified(false);
      } else if (data) {
        setFullHistoryData(data.response_data);
        setIsUanVerified(true);
        console.log('Successfully loaded previous full UAN history from DB.');
      } else {
        console.log('No successful full UAN history found in DB for this candidate.');
        setFullHistoryData(null);
        setIsUanVerified(false);
      }
      setIsFullHistoryLoading(false);
    };
    fetchPreviousFullHistoryData();
  }, [candidate?.id, candidateUanFromMetadata, toast]);

  const fetchAndSaveFullEmployeeHistory = useCallback(async () => {
    if (!candidate?.id || !organizationId || !candidateUanFromMetadata) {
      toast({ title: 'Error', description: 'Missing candidate ID, organization ID, or UAN for full history check.', variant: 'destructive' });
      return;
    }
    setIsFullHistoryLoading(true);
    setFullHistoryError(null);
    setFullHistoryData(null);
    try {
      const transId = `${candidate.id}-${Date.now()}`;
      const requestData = await encryptUanFullHistory(transId, candidateUanFromMetadata);
      const responseData = await verifyUanFullHistory(requestData);
      const decryptedResponse = await decryptUanFullHistory(responseData);
      if (decryptedResponse.status === 1 && Array.isArray(decryptedResponse.msg) && decryptedResponse.msg.length > 0) {
        setFullHistoryData(decryptedResponse);
        setIsUanVerified(true);
        const { error: saveError } = await supabase
          .from('uanlookups')
          .insert({
            candidate_id: candidate.id,
            organization_id: organizationId,
            lookup_type: 'uan_full_history',
            lookup_value: candidateUanFromMetadata,
            status: decryptedResponse.status,
            ts_trans_id: decryptedResponse.tsTransId,
            response_data: decryptedResponse,
          });
        if (saveError) {
          console.error('Error saving full UAN history to uanlookups:', saveError);
          toast({ title: 'Error', description: 'Failed to save full UAN history.', variant: 'destructive' });
        } else {
          toast({ title: 'Success', description: 'Full employee history retrieved and saved.', variant: 'success' });
        }
      } else {
        const errorMessage = typeof decryptedResponse.msg === 'string'
          ? decryptedResponse.msg
          : 'No specific details or an unexpected status was returned for full history.';
        setFullHistoryError(errorMessage);
        toast({ title: 'Verification Failed', description: `Full history: ${errorMessage}`, variant: 'destructive' });
        setFullHistoryData(decryptedResponse);
        setIsUanVerified(false);
      }
    } catch (error: any) {
      console.error('Full Employee History Lookup Error:', error);
      setFullHistoryError(error.message || 'Failed to retrieve full employee history.');
      toast({ title: 'Error', description: `Failed to get full history: ${error.message}`, variant: 'destructive' });
      setIsUanVerified(false);
    } finally {
      setIsFullHistoryLoading(false);
    }
  }, [candidate?.id, organizationId, candidateUanFromMetadata, toast]);

  const renderVerificationStatus = (doc: DocumentState) => {
    if (shareMode) return null;
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

  const renderDocumentRow = (type: keyof typeof documents, label: string) => {
    const doc = documents[type];
    return (
      <div className="border rounded-lg mb-4 bg-white shadow-sm hover:shadow-md transition-shadow w-full">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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
                  onChange={(e) => onDocumentChange(type, e.target.value)}
                  className="mt-1 h-8 text-sm w-full sm:w-1/2"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {doc.value || "Not Provided"}
                </p>
              )}
              {renderVerificationStatus(doc)}
            </div>
            {!shareMode && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => onToggleEditing(type)}
                  variant="outline"
                  size="sm"
                  disabled={doc.isVerifying || doc.isVerified}
                  className={cn(
                    doc.isEditing && "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                  )}
                >
                  {doc.isEditing ? "Cancel" : "Edit"}
                </Button>
                <Button
                  onClick={() => onVerifyDocument(type, candidate?.id || '', null, candidate, organizationId || '')}
                  variant="secondary"
                  size="sm"
                  disabled={doc.isVerifying}
                  className={cn(
                    doc.isVerified && "bg-green-100 text-green-800 hover:bg-green-200"
                  )}
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

  if (!candidate) {
    return <div className="text-sm text-gray-500">Loading candidate data...</div>;
  }

  return (
    <Card className="bg-white w-full p-4">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg font-semibold">Verification Process</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">UAN Verification</h3>
          <Card className="border border-gray-200 bg-white shadow-sm p-4">
            {!hasUanInMetadata && (
              <div className="flex flex-col sm:flex-row gap-2 items-end mb-4">
                <div className="w-full sm:w-1/4">
                  <label className="text-xs font-medium text-gray-600">Method</label>
                  <Select value={lookupMethod} onValueChange={(val: 'mobile' | 'pan') => setLookupMethod(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="pan">PAN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-grow">
                  <label className="text-xs font-medium text-gray-600">
                    {lookupMethod === 'mobile' ? 'Mobile Number' : 'PAN Number'}
                  </label>
                  <Input
                    type="text"
                    placeholder={`Enter ${lookupMethod === 'mobile' ? 'Mobile Number' : 'PAN Number'}`}
                    value={lookupValue}
                    onChange={(e) => setLookupValue(e.target.value)}
                    disabled={isUanLoading}
                  />
                </div>
                <Button onClick={onUanLookup} disabled={isUanLoading || !lookupValue}>
                  {isUanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get UAN'}
                </Button>
              </div>
            )}
            {isUanLoading && <p className="text-sm text-gray-500 mt-4">Verifying...</p>}
            {uanData && uanData.status === 9 && (
              <div className="mt-4 text-red-600 text-sm">
                {lookupMethod === 'mobile' ? (
                  <>Mobile no. {lookupValue} has no UAN record. Try another number or method.</>
                ) : (
                  <>PAN no. {lookupValue} has no UAN record. Try another number or method.</>
                )}
              </div>
            )}
            {uanData && uanData.status !== 1 && uanData.status !== 9 && (
              <div className="mt-4 text-red-600 text-sm">
                Error: {uanData.msg || uanData.error || 'UAN lookup failed.'}
              </div>
            )}
            {(isUanBasicVerifiedAndDataAvailable || hasUanInMetadata) && (
              <div>
                {hasUanInMetadata && (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">UAN: <span className="font-bold text-indigo-600">{candidateUanFromMetadata}</span></p>
                    <Badge className={cn(
                      isUanVerified ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                    )}>
                      {isUanVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" /> Unverified
                        </>
                      )}
                    </Badge>
                  </div>
                )}
                <Tabs value={activeUanTab} onValueChange={setActiveUanTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    {isUanBasicVerifiedAndDataAvailable && (
                      <TabsTrigger value="basic">Basic Employee Info</TabsTrigger>
                    )}
                    <TabsTrigger value="full-history">Full Employee History</TabsTrigger>
                  </TabsList>
                  {isUanBasicVerifiedAndDataAvailable && (
                 <TabsContent value="basic">
  {/* Basic Info Header */}
  <div>
    <h4 className="font-semibold text-lg mb-2">Basic Information</h4>
  </div>

  {uanData?.msg?.uan_details?.[0] ? (
    <>
      {/* Basic Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-2 text-sm text-green-600">
        <p><strong>Name:</strong> {uanData.msg.uan_details[0].name}</p>
        <p><strong>Gender:</strong> {uanData.msg.uan_details[0].gender}</p>
        <p><strong>Date of Birth:</strong> {uanData.msg.uan_details[0].date_of_birth}</p>
      </div>

      {/* Employment Info Header */}
      <div className="mt-4">
        <h4 className="font-semibold text-lg mb-2">Current Employment Information</h4>
      </div>

      {/* Employment Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-2 text-sm text-green-600">
        <p><strong>Company:</strong> {uanData.msg.employment_details[0].establishment_name}</p>
        <p><strong>Date of Joining:</strong> {uanData.msg.employment_details[0].date_of_joining}</p>
        <p><strong>Establishment ID:</strong> {uanData.msg.employment_details[0].establishment_id}</p>
        <p><strong>Member ID:</strong> {uanData.msg.employment_details[0].member_id}</p>
      </div>
    </>
  ) : (
    <p className="text-sm text-purple-300">
      No basic UAN details available from previous lookup.
    </p>
  )}
</TabsContent>


                  )}
                  <TabsContent value="full-history">
                    <div className="flex justify-end mb-4">
                      <Button
                        onClick={fetchAndSaveFullEmployeeHistory}
                        disabled={isFullHistoryLoading}
                        size="sm"
                      >
                        {isFullHistoryLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Verify Full History'}
                      </Button>
                    </div>
                    {isFullHistoryLoading && <p className="text-sm text-gray-500">Fetching full history...</p>}
                    {fullHistoryError && <p className="text-sm text-red-600">Error: {fullHistoryError}</p>}
                    {fullHistoryData && Array.isArray(fullHistoryData.msg) && fullHistoryData.msg.length > 0 ? (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-md mb-2">Employment Details</h4>
                        {fullHistoryData.msg.map((entry: FullHistoryEmploymentEntry, index: number) => (
                          <div key={index} className="pb-2 border-b last:border-b-0 text-green-700">
                            <p className="text-sm font-medium">{entry.EstablishmentName}</p>
                            <p className="text-xs text-green-600">Join Date: {entry.Doj}</p>
                            <p className="text-xs text-green-600">Exit Date: {entry.DateOfExitEpf || "Currently Employed"}</p>
                            <p className="text-xs text-green-600">Member ID: {entry.MemberId}</p>
                            <p className="text-xs text-green-600">UAN: {entry.uan}</p>
                            {entry.Overlapping && <p className="text-xs text-green-600 font-semibold">Overlapping: {entry.Overlapping}</p>}
                          </div>
                        ))}
                      </div>
                    ) : fullHistoryData && !isFullHistoryLoading && typeof fullHistoryData.msg === 'string' ? (
                      <p className="text-sm text-gray-600">{fullHistoryData.msg}</p>
                    ) : (
                      <p className="text-sm text-gray-600">Click "Verify Full History" to retrieve detailed employment records.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-medium">Other Verification Documents</h3>
            {!shareMode && (
              <Button
                onClick={onSaveDocuments}
                variant="secondary"
                size="sm"
                disabled={isSavingDocuments || !Object.values(documents).some((doc) => doc.isEditing)}
              >
                {isSavingDocuments ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </div>
          {renderDocumentRow("pan", "PAN Number")}
          {renderDocumentRow("pf", "PF Number")}
          {renderDocumentRow("esic", "ESIC Number")}
        </div>
      </CardContent>
    </Card>
  );
};
