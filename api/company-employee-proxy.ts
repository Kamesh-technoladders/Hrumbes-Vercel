import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Company/Employee Proxy request:', {
      body: req.body,
      query: req.query,
      headers: req.headers,
    });

    const endpoint = req.query.endpoint || '';
    const validEndpoints = [
      'company-encrypt',
      'company-verify',
      'company-decrypt',
      'employee-encrypt',
      'employee-verify',
      'employee-decrypt',
    ];
    if (!validEndpoints.includes(endpoint as string)) {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    // Map proxy endpoints to backend endpoints
    const endpointMap: { [key: string]: string } = {
      'company-encrypt': 'employee-encrypt-step1',
      'company-verify': 'employee-verify-step1',
      'company-decrypt': 'employee-decrypt-step1',
      'employee-encrypt': 'employee-encrypt-step2',
      'employee-verify': 'employee-verify-step2',
      'employee-decrypt': 'employee-decrypt-step2',
    };

    const backendEndpoint = endpointMap[endpoint as string];
    const backendUrl = `http://62.72.51.159:4001/api/employee/${backendEndpoint}`;
    console.log('Forwarding to backend URL:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    console.log('Backend response:', { status: response.status, statusText: response.statusText });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', { status: response.status, errorText });
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      return res.status(response.status).json({ error: 'Backend error', details: errorDetails });
    }

    const data = await response.json();
    console.log('Backend response data:', data);
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Company/Employee Proxy error:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}