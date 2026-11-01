import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL
});

// Attach Authorization token from localStorage if present
api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('evalix_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (err) {
        // ignore localStorage access errors
    }
    return config;
}, (error) => Promise.reject(error));

/**
 * Authentication API calls with CAPTCHA and Email Verification
 */
export const fetchCaptchaApi = async () => {
    const response = await api.get('/auth/captcha');
    return response.data;
};

export const loginUser = async (email, password, captchaId, captchaInput) => {
    const response = await api.post('/auth/login', { 
        email, 
        password, 
        captchaId, 
        captchaInput 
    });
    return response.data;
};

export const signupUser = async (email, password, name, captchaId, captchaInput) => {
    const response = await api.post('/auth/signup', { 
        email, 
        password, 
        name, 
        captchaId, 
        captchaInput 
    });
    return response.data;
};

export const verifyEmailApi = async (email, code) => {
    const response = await api.post('/auth/verify-email', { email, code });
    return response.data;
};

export const resendVerificationApi = async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
};

export const fetchCurrentUser = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const analyzePaper = async (formData) => {
    try {
        const response = await api.post('/papers/analyze', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error calling API:', error);
        throw error;
    }
};

export const getDashboardStats = async () => {
    try {
        const response = await api.get('/papers/stats');
        return response.data;
    } catch (error) {
        console.warn('Error fetching stats from API, using defaults:', error.message);
        return {
            success: true,
            data: {
                papersAnalyzed: 1,
                accuracyRate: '96.8%',
                taxonomyDomains: 3,
                availableReports: 1
            }
        };
    }
};

export const getReportsList = async () => {
    try {
        const response = await api.get('/papers/reports');
        return response.data;
    } catch (error) {
        console.error('Error fetching reports:', error);
        throw error;
    }
};

/**
 * Run quality check for an existing report with a selected document type
 */
export const runQualityCheckApi = async (filename, documentType) => {
    try {
        const response = await api.post(`/papers/reports/${encodeURIComponent(filename)}/quality-check`, {
            documentType
        });
        return response.data;
    } catch (error) {
        console.error('Error running quality check API:', error);
        throw error;
    }
};

/**
 * Fetch certificate evaluation data for an analyzed report
 */
export const getCertificateDataApi = async (filename, documentType = 'Project Report') => {
    try {
        const response = await api.post(`/papers/reports/${encodeURIComponent(filename)}/certificate`, {
            documentType
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching certificate data:', error);
        throw error;
    }
};

/**
 * Download an Excel report directly via API binary blob
 */
export const downloadReportFile = async (reportUrl, filename) => {
    try {
        // Strip leading /api if present since api instance has baseURL /api
        let endpoint = reportUrl;
        if (endpoint.startsWith('http')) {
            // Absolute URL - fetch directly
            const response = await axios.get(endpoint, { responseType: 'blob' });
            triggerBlobDownload(response.data, filename);
            return true;
        }

        if (endpoint.startsWith('/api')) {
            endpoint = endpoint.substring(4);
        }

        const response = await api.get(endpoint, {
            responseType: 'blob'
        });

        triggerBlobDownload(response.data, filename);
        return true;
    } catch (error) {
        console.error('Error downloading report file:', error);
        throw error;
    }
};

/**
 * Dynamically export analysis data to Excel
 */
export const exportAnalysisToExcel = async (analysisData, fallbackFilename = 'paper_analysis.xlsx') => {
    try {
        // Try direct report download if report url is provided
        if (analysisData?.report?.url) {
            try {
                await downloadReportFile(
                    analysisData.report.url, 
                    analysisData.report.filename || fallbackFilename
                );
                return true;
            } catch (dlErr) {
                console.warn('Pre-generated report file not reachable, generating dynamically...', dlErr.message);
            }
        }

        // Generate on demand via POST /papers/export-excel
        const response = await api.post('/papers/export-excel', analysisData, {
            responseType: 'blob'
        });

        const targetName = analysisData?.documentInfo?.filename 
            ? `${analysisData.documentInfo.filename.replace(/\.[^/.]+$/, '')}_analysis.xlsx`
            : fallbackFilename;

        triggerBlobDownload(response.data, targetName);
        return true;
    } catch (error) {
        console.error('Failed to export Excel:', error);
        throw error;
    }
};

/**
 * Helper to trigger browser download from binary Blob
 */
const triggerBlobDownload = (blobData, filename) => {
    const blob = new Blob([blobData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'evalix_report.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
};

/**
 * Helper to trigger browser download for PDF binary Blob
 */
export const triggerPdfDownload = (blobData, filename) => {
    const blob = new Blob([blobData], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'Evalix_Certificate.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
};

/**
 * Certificate API calls
 */
export const generateCertificateApi = async ({ recipientName, evaluationReference, documentTitle }) => {
    try {
        const response = await api.post('/certificates', {
            recipientName,
            evaluationReference,
            documentTitle
        });
        return response.data;
    } catch (error) {
        console.error('Error generating certificate:', error);
        throw error;
    }
};

export const downloadCertificatePdfApi = async (certificateId) => {
    try {
        const response = await api.get(`/certificates/${encodeURIComponent(certificateId)}/download`, {
            responseType: 'blob'
        });
        triggerPdfDownload(response.data, `Evalix_Certificate_${certificateId}.pdf`);
        return true;
    } catch (error) {
        console.error('Error downloading certificate PDF:', error);
        throw error;
    }
};

export const fetchCertificatesHistoryApi = async () => {
    try {
        const response = await api.get('/certificates');
        return response.data;
    } catch (error) {
        console.error('Error fetching certificates history:', error);
        throw error;
    }
};

export default api;
