import React, { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface RecruiterData {
  recruiter: string;
  total_resumes_analyzed: number;
}

interface ResumeStatsData {
  name: string;
  value: number;
  fill: string;
}

function OrganizationSuperadminDashboard() {
  const [recruiterData, setRecruiterData] = useState<RecruiterData[]>([]);
  const [resumeStatsData, setResumeStatsData] = useState<ResumeStatsData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resumeStatsError, setResumeStatsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First Fetch: Count candidates from hr_job_candidates
        const { data: candidateData, error: candidateError } = await supabase
          .from('hr_job_candidates')
          .select(`
            created_by,
            hr_employees!hr_job_candidates_created_by_fkey (
              first_name
            )
          `);

        if (candidateError) {
          console.error("Supabase query error (hr_job_candidates):", candidateError);
          throw new Error(`Error fetching candidate data: ${candidateError.message}`);
        }

        console.log("Raw candidate data from Supabase:", candidateData);

        if (!candidateData || candidateData.length === 0) {
          console.log("No data returned from hr_job_candidates table.");
        }

        // Group candidates by recruiter
        const candidateCounts: { [key: string]: number } = candidateData?.reduce((acc: any, record: any) => {
          console.log("Processing candidate record:", record);
          if (!record.created_by) {
            console.warn("Skipping record with null created_by in hr_job_candidates");
            return acc;
          }
          if (!record.hr_employees || !record.hr_employees.first_name) {
            console.warn(`No hr_employees data or missing first_name for created_by: ${record.created_by}`);
            return acc;
          }
          const recruiterName = record.hr_employees.first_name;
          acc[recruiterName] = (acc[recruiterName] || 0) + 1;
          return acc;
        }, {}) || {};

        console.log("Candidate counts:", candidateCounts);

        // Second Fetch: Count resume analyses from candidate_resume_analysis
        const { data: analysisData, error: analysisError } = await supabase
          .from('candidate_resume_analysis')
          .select(`
            candidate_id,
            hr_job_candidates!candidate_resume_analysis_candidate_id_fkey (
              created_by,
              hr_employees!hr_job_candidates_created_by_fkey (
                first_name
              )
            )
          `);

        if (analysisError) {
          console.error("Supabase query error (candidate_resume_analysis):", analysisError);
          throw new Error(`Error fetching resume analysis data: ${analysisError.message}`);
        }

        console.log("Raw analysis data from Supabase:", analysisData);

        if (!analysisData || analysisData.length === 0) {
          console.log("No data returned from candidate_resume_analysis table.");
        }

        // Track unique candidate_ids to avoid overcounting analyses
        const seenCandidateIds = new Set<string>();
        const analysisCounts: { [key: string]: number } = analysisData?.reduce((acc: any, record: any) => {
          console.log("Processing analysis record:", record);
          if (!record.hr_job_candidates) {
            console.warn(`No hr_job_candidates data for candidate_id: ${record.candidate_id}`);
            return acc;
          }
          if (!record.hr_job_candidates.created_by) {
            console.warn(`Skipping record with null created_by for candidate_id: ${record.candidate_id}`);
            return acc;
          }
          if (!record.hr_job_candidates.hr_employees || !record.hr_job_candidates.hr_employees.first_name) {
            console.warn(`No hr_employees data or missing first_name for created_by: ${record.hr_job_candidates.created_by}`);
            return acc;
          }
          if (seenCandidateIds.has(record.candidate_id)) {
            console.log(`Skipping duplicate candidate_id: ${record.candidate_id}`);
            return acc;
          }
          seenCandidateIds.add(record.candidate_id);

          const recruiterName = record.hr_job_candidates.hr_employees.first_name;
          acc[recruiterName] = (acc[recruiterName] || 0) + 1;
          return acc;
        }, {}) || {};

        console.log("Analysis counts:", analysisCounts);

        // Combine the counts into a single dataset by summing
        const allRecruiters = new Set([
          ...Object.keys(candidateCounts),
          ...Object.keys(analysisCounts),
        ]);

        const formattedRecruiterData: RecruiterData[] = Array.from(allRecruiters).map(recruiter => ({
          recruiter,
          total_resumes_analyzed: (candidateCounts[recruiter] || 0) + (analysisCounts[recruiter] || 0),
        }));

        console.log("Formatted recruiter data:", formattedRecruiterData);

        if (formattedRecruiterData.length === 0) {
          console.log("No valid recruiter data after processing.");
          setRecruiterData([]);
          setErrorMessage("No valid recruiter data found.");
        } else {
          setRecruiterData(formattedRecruiterData);
          setErrorMessage(null);
        }

        // Fetch data for Total Resumes in Database Pie Chart
        try {
          // Count non-null report_url from candidate_resume_analysis (With Attachment)
          const { data: withAttachmentData, error: withAttachmentError } = await supabase
            .from('candidate_resume_analysis')
            .select('report_url')
            .not('report_url', 'is', null);

          if (withAttachmentError) {
            console.error("Supabase query error (candidate_resume_analysis report_url):", withAttachmentError);
            throw new Error(`Error fetching report_url data: ${withAttachmentError.message}`);
          }

          const withAttachmentCount = withAttachmentData?.length || 0;

          // Count non-null resume_text from resume_analysis (Without Attachment)
          const { data: resumeTextData, error: resumeTextError } = await supabase
            .from('resume_analysis')
            .select('resume_text')
            .not('resume_text', 'is', null);

          if (resumeTextError) {
            console.error("Supabase query error (resume_analysis resume_text):", resumeTextError);
            throw new Error(`Error fetching resume_text data: ${resumeTextError.message}`);
          }

          const resumeTextCount = resumeTextData?.length || 0;

          // Prepare pie chart data
          const pieData: ResumeStatsData[] = [
            { name: 'With Attachment', value: withAttachmentCount, fill: '#4f46e5' },
            { name: 'Without Attachment', value: resumeTextCount, fill: '#a5b4fc' },
          ];

          console.log("Pie chart data:", pieData);

          setResumeStatsData(pieData);
          setResumeStatsError(null);
        } catch (err) {
          console.error("Error fetching pie chart data:", err);
          setResumeStatsData([]);
          setResumeStatsError("Error fetching resume stats data. Check the console for details.");
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
        setRecruiterData([]);
        setErrorMessage("Error fetching data. Check the console for details.");
      }
    };

    fetchData();
  }, []);

  const hasNoResumeStatsData = resumeStatsData.every(item => item.value === 0);

  return (
    <div className="text-center p-10">
      <h1 className="text-4xl font-bold mb-8">Welcome to the Organization SuperAdmin Dashboard!</h1>

      <div className="w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bar Chart: Resumes Analyzed by Recruiter */}
          <Card className="shadow-lg border-none bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-gray-800">
                Resumes Analyzed by Recruiter
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errorMessage ? (
                <p className="text-red-500">{errorMessage}</p>
              ) : recruiterData.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-gray-500">
                  <p>No recruiter data available.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={recruiterData}
                    margin={{ top: 20, right: 0, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="recruiter"
                      angle={0}
                      textAnchor="middle"
                      interval={0}
                      height={50}
                      label={{ value: "Recruiters", position: "insideBottom", offset: -20 }}
                    />
                    <YAxis
                      label={{ value: "Resumes Analyzed", angle: -90, position: "insideLeft", offset: -10 }}
                    />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="total_resumes_analyzed" fill="#4f46e5" name="Resumes Analyzed" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart: Total Resumes in Database */}
          <Card className="shadow-lg border-none bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-gray-800">
                Total Resumes in Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resumeStatsError ? (
                <p className="text-red-500">{resumeStatsError}</p>
              ) : hasNoResumeStatsData ? (
                <div className="flex items-center justify-center h-[400px] text-gray-500">
                  <p>No data to display</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={resumeStatsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {resumeStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} (${((value as number / resumeStatsData.reduce((sum, entry) => sum + entry.value, 0)) * 100).toFixed(1)}%)`,
                        name,
                      ]}
                    />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default OrganizationSuperadminDashboard;