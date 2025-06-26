import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Candidate } from '@/components/MagicLinkView/types';
import { supabase } from "@/integrations/supabase/client";

const API_PROXY_URL = '/api/uan-proxy';

export const useUanLookup = (
  candidate: Candidate | null,
  organizationId: string | null,
  onSaveResult?: (data: any, method: 'mobile' | 'pan', value: string) => Promise<void>
) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uanData, setUanData] = useState<any | null>(null);
  const [lookupMethod, setLookupMethod] = useState<'mobile' | 'pan'>('mobile');
  const [lookupValue, setLookupValue] = useState('');

  const internalSaveResult = useCallback(
    async (data: any, method: 'mobile' | 'pan', value: string) => {
      if (!candidate?.id || !organizationId) {
        toast({ title: 'Error', description: 'Candidate ID or Organization ID is missing.', variant: 'destructive' });
        return;
      }
      try {
        const { error } = await supabase.from('uanlookups').insert({
          candidate_id: candidate.id,
          organization_id: organizationId,
          lookup_type: method,
          lookup_value: value,
          status: data.status,
          ts_trans_id: data.tsTransId,
          response_data: data,
        });
        if (error) {
          console.error('Error saving UAN lookup result:', error);
          toast({
            title: 'Error',
            description: 'Failed to save UAN lookup result.',
            variant: 'destructive',
          });
          return;
        }
        if (data.status === 1 && data.msg?.uan_details?.[0]?.uan) {
          const uan = data.msg.uan_details[0].uan;
          const { error: updateError } = await supabase
            .from('hr_job_candidates')
            .update({
              metadata: {
                ...candidate.metadata,
                uan,
                uan_full_data: data,
              },
            })
            .eq('id', candidate.id);
          if (updateError) {
            console.error('Error updating candidate metadata with UAN:', updateError);
            toast({
              title: 'Error',
              description: 'Failed to update candidate UAN.',
              variant: 'destructive',
            });
          } else {
            console.log('Candidate metadata updated with UAN:', uan);
            toast({
              title: 'Success',
              description: 'UAN lookup successful and candidate updated.',
              variant: 'success',
            });
          }
        } else {
          console.log('UAN lookup completed but no UAN to save (status not 1 or no UAN details).');
        }
      } catch (err: any) {
        console.error('Unexpected error saving UAN result:', err);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while saving UAN result.',
          variant: 'destructive',
        });
      }
    },
    [candidate, organizationId, toast]
  );

  useEffect(() => {
    const fetchPreviousBasicUanData = async () => {
      if (!candidate?.id) {
        console.log('No candidate ID provided, skipping UAN lookup fetch.');
        setUanData(null);
        setLookupValue('');
        return;
      }
      setIsLoading(true);
      console.log(`Fetching previous BASIC UAN data for candidate ${candidate.id}...`);
      const { data, error } = await supabase
        .from('uanlookups')
        .select('response_data, lookup_value')
        .eq('candidate_id', candidate.id)
        .in('lookup_type', ['mobile', 'pan'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching previous basic UAN data from uanlookups:', error);
        toast({
          title: 'Error',
          description: 'Failed to load previous basic UAN data.',
          variant: 'destructive',
        });
        setUanData(null);
        setLookupValue('');
      } else if (data) {
        setUanData(data.response_data);
        setLookupValue(data.lookup_value || '');
        console.log('Successfully loaded previous basic UAN data from DB:', data.response_data);
      } else {
        console.log('No basic UAN lookup history found in DB for this candidate.');
        setUanData(null);
        setLookupValue('');
      }
      setIsLoading(false);
    };
    fetchPreviousBasicUanData();
  }, [candidate?.id, toast]);

  const handleLookup = useCallback(async () => {
    if (!candidate?.id) {
      toast({ title: 'Error', description: 'Candidate ID is missing.', variant: 'destructive' });
      return;
    }
    if (!organizationId) {
      toast({ title: 'Error', description: 'Organization ID is missing.', variant: 'destructive' });
      return;
    }
    let finalLookupValue = lookupValue;
    if (lookupMethod === 'mobile') {
      let sanitizedMobile = lookupValue.replace(/\D/g, '');
      if (sanitizedMobile.startsWith('91') && sanitizedMobile.length === 12) {
        sanitizedMobile = sanitizedMobile.substring(2);
      }
      if (sanitizedMobile.length !== 10) {
        toast({
          title: 'Invalid Mobile Number',
          description: 'Mobile number must be 10 digits long.',
          variant: 'destructive',
        });
        return;
      }
      finalLookupValue = sanitizedMobile;
    }
    setIsLoading(true);
    try {
      const transId = `lovable-${uuidv4()}`;
      const encryptResponse = await axios.post(`${API_PROXY_URL}?endpoint=encrypt`, {
        transId,
        docType: 526,
        mobile: lookupMethod === 'mobile' ? finalLookupValue : '',
        panNumber: lookupMethod === 'pan' ? finalLookupValue : '',
      });
      const { requestData } = encryptResponse.data;
      let responseData: string | null = null;

      try {
        // Add a timeout to the request to catch 504s earlier
        const getUanResponse = await axios.post(
          `${API_PROXY_URL}?endpoint=get-uan`,
          { requestData },
          { timeout: 20000 } // Increased timeout to 20 seconds (adjust as needed)
        );
        responseData = getUanResponse.data.responseData;
      } catch (getUanError: any) {
        console.error('Error from get-uan proxy during initial fetch:', {
          message: getUanError.message,
          status: getUanError.response?.status,
          data: getUanError.response?.data,
          code: getUanError.code // e.g., 'ECONNABORTED' for timeout
        });

        // Handle specific Axios errors (e.g., network error, timeout)
        if (getUanError.code === 'ECONNABORTED' || getUanError.message === 'Network Error') {
          throw new Error('UAN lookup request timed out or network error. Please try again later.');
        }

        // If the proxy sent a response, even an error one, try to extract data
        if (getUanError.response?.data) {
          // Prioritize structured error messages if available
          if (typeof getUanError.response.data.error === 'string') {
              throw new Error(getUanError.response.data.error);
          }
          if (typeof getUanError.response.data.message === 'string') {
              throw new Error(getUanError.response.data.message);
          }
          // Fallback to stringifying the entire response data if it's an object
          throw new Error(`Proxy error: ${JSON.stringify(getUanError.response.data)}`);
        }

        // If no response data, re-throw the original message
        throw getUanError;
      }

      if (!responseData) {
        throw new Error('No valid response data received for UAN lookup.');
      }

      const decryptResponse = await axios.post(`${API_PROXY_URL}?endpoint=decrypt`, { responseData });
      const finalData = decryptResponse.data;

      // Ensure the structure of finalData for consistent state update
      // It should ideally be { status: number, msg: string | array, error?: string }
      if (finalData.status === undefined && !finalData.msg && !finalData.error) {
          throw new Error('Decryption returned an unexpected data format.');
      }

      setUanData(finalData); // This will be the parsed JSON from decrypt

      if (onSaveResult) {
        await onSaveResult(finalData, lookupMethod, finalLookupValue);
      } else {
        await internalSaveResult(finalData, lookupMethod, finalLookupValue);
      }
    } catch (err: any) {
      console.error("UAN Lookup process failed:", err);

      let errorMessage: string;
      let status: number = 9; // Default status for general errors

      if (err instanceof Error) {
        errorMessage = err.message; // Use the specific error message
      } else if (err.response?.data) {
        // If it's an Axios error with a response body
        const errorData = err.response.data;
        if (typeof errorData.msg === 'string') {
          errorMessage = errorData.msg;
          status = errorData.status || 9;
        } else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
          status = errorData.status || 9;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData; // Raw string error response
        } else {
          errorMessage = 'Unexpected error format from proxy: ' + JSON.stringify(errorData);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        errorMessage = 'An unknown error occurred during UAN lookup.';
      }

      // Always set uanData to a predictable structure for rendering
      setUanData({
        status: status,
        msg: errorMessage, // Ensure msg is always a string for UI display
        error: errorMessage, // Ensure error is always a string for UI display
        tsTransId: 'N/A', // Set a default to avoid undefined issues
      });

      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [lookupValue, lookupMethod, candidate, organizationId, onSaveResult, internalSaveResult, toast]);

  return {
    isLoading,
    uanData,
    lookupMethod,
    setLookupMethod,
    lookupValue,
    setLookupValue,
    handleLookup,
  };
};