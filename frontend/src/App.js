// App.js

import React, { useState } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate
} from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.scss';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AnalysisDashboard from './components/AnalysisDashboard';
import VerbClassificationsPage from './components/VerbClassificationsPage';
import RecommendationsDashboard from './components/RecommendationsDashboard';
import FileUploadPanel from './components/FileUploadPanel';
import ReportsList from './components/ReportsList';
import LandingPage from './components/LandingPage';
import AboutAnalysisPage from './components/AboutAnalysisPage';
import QualityCheckPanel from './components/QualityCheckPanel';
import CertificateView from './components/CertificateView';
import CreditsPage from './components/CreditsPage';
import AdminDashboard from './components/AdminDashboard';
import FeedbackModal from './components/FeedbackModal';
import { AuthProvider, useAuth } from './context/AuthContext';


// Default realistic sample data for demo / instant preview
const SAMPLE_ANALYSIS_DATA = {
    documentInfo: {
        filename: 'Sample_Research_Paper_Exp7.pdf',
        filesize: 518118,
        textLength: 14280,
        analyzedAt: new Date().toISOString()
    },

    totalVerbCount: 168,
    uniqueVerbCount: 52,

    domains: {
        cognitive: {
            count: 104,
            subdomains: {
                remember: 18,
                understand: 26,
                apply: 22,
                analyze: 19,
                evaluate: 11,
                create: 8
            }
        },

        affective: {
            count: 36,
            subdomains: {
                receiving: 8,
                responding: 12,
                valuing: 7,
                organizing: 5,
                characterizing: 4
            }
        },

        psychomotor: {
            count: 24,
            subdomains: {
                perception: 4,
                set: 3,
                guidedResponse: 5,
                mechanism: 6,
                complexResponse: 3,
                adaptation: 2,
                origination: 1
            }
        },

        unclassified: {
            count: 4,
            subdomains: {
                unknown: 4
            }
        }
    },

    verbs: [
        {
            verb: 'analyze',
            frequency: 12,
            classification: {
                domain: 'cognitive',
                subdomain: 'analyze',
                confidence: 0.98,
                matchedWith: 'analyze'
            }
        },
        {
            verb: 'implement',
            frequency: 10,
            classification: {
                domain: 'cognitive',
                subdomain: 'apply',
                confidence: 0.96,
                matchedWith: 'implement'
            }
        },
        {
            verb: 'evaluate',
            frequency: 9,
            classification: {
                domain: 'cognitive',
                subdomain: 'evaluate',
                confidence: 0.97,
                matchedWith: 'evaluate'
            }
        },
        {
            verb: 'design',
            frequency: 8,
            classification: {
                domain: 'cognitive',
                subdomain: 'create',
                confidence: 0.95,
                matchedWith: 'design'
            }
        },
        {
            verb: 'explain',
            frequency: 8,
            classification: {
                domain: 'cognitive',
                subdomain: 'understand',
                confidence: 0.96,
                matchedWith: 'explain'
            }
        },
        {
            verb: 'compare',
            frequency: 7,
            classification: {
                domain: 'cognitive',
                subdomain: 'analyze',
                confidence: 0.94,
                matchedWith: 'compare'
            }
        },
        {
            verb: 'identify',
            frequency: 7,
            classification: {
                domain: 'cognitive',
                subdomain: 'remember',
                confidence: 0.95,
                matchedWith: 'identify'
            }
        },
        {
            verb: 'execute',
            frequency: 6,
            classification: {
                domain: 'psychomotor',
                subdomain: 'mechanism',
                confidence: 0.92,
                matchedWith: 'execute'
            }
        },
        {
            verb: 'participate',
            frequency: 6,
            classification: {
                domain: 'affective',
                subdomain: 'responding',
                confidence: 0.91,
                matchedWith: 'participate'
            }
        },
        {
            verb: 'demonstrate',
            frequency: 6,
            classification: {
                domain: 'cognitive',
                subdomain: 'apply',
                confidence: 0.94,
                matchedWith: 'demonstrate'
            }
        },
        {
            verb: 'appreciate',
            frequency: 5,
            classification: {
                domain: 'affective',
                subdomain: 'valuing',
                confidence: 0.93,
                matchedWith: 'appreciate'
            }
        },
        {
            verb: 'summarize',
            frequency: 5,
            classification: {
                domain: 'cognitive',
                subdomain: 'understand',
                confidence: 0.95,
                matchedWith: 'summarize'
            }
        },
        {
            verb: 'operate',
            frequency: 5,
            classification: {
                domain: 'psychomotor',
                subdomain: 'mechanism',
                confidence: 0.90,
                matchedWith: 'operate'
            }
        },
        {
            verb: 'prioritize',
            frequency: 4,
            classification: {
                domain: 'affective',
                subdomain: 'organizing',
                confidence: 0.92,
                matchedWith: 'prioritize'
            }
        },
        {
            verb: 'calibrate',
            frequency: 4,
            classification: {
                domain: 'psychomotor',
                subdomain: 'complexResponse',
                confidence: 0.89,
                matchedWith: 'calibrate'
            }
        },
        {
            verb: 'recall',
            frequency: 4,
            classification: {
                domain: 'cognitive',
                subdomain: 'remember',
                confidence: 0.97,
                matchedWith: 'recall'
            }
        },
        {
            verb: 'listen',
            frequency: 3,
            classification: {
                domain: 'affective',
                subdomain: 'receiving',
                confidence: 0.94,
                matchedWith: 'listen'
            }
        },
        {
            verb: 'adopt',
            frequency: 3,
            classification: {
                domain: 'affective',
                subdomain: 'characterizing',
                confidence: 0.88,
                matchedWith: 'adopt'
            }
        },
        {
            verb: 'construct',
            frequency: 3,
            classification: {
                domain: 'cognitive',
                subdomain: 'create',
                confidence: 0.93,
                matchedWith: 'construct'
            }
        },
        {
            verb: 'practice',
            frequency: 3,
            classification: {
                domain: 'psychomotor',
                subdomain: 'guidedResponse',
                confidence: 0.91,
                matchedWith: 'practice'
            }
        }
    ],

    verbsByFrequency: [
        {
            verb: 'analyze',
            frequency: 12,
            classification: {
                domain: 'cognitive',
                subdomain: 'analyze',
                confidence: 0.98
            }
        },
        {
            verb: 'implement',
            frequency: 10,
            classification: {
                domain: 'cognitive',
                subdomain: 'apply',
                confidence: 0.96
            }
        },
        {
            verb: 'evaluate',
            frequency: 9,
            classification: {
                domain: 'cognitive',
                subdomain: 'evaluate',
                confidence: 0.97
            }
        },
        {
            verb: 'design',
            frequency: 8,
            classification: {
                domain: 'cognitive',
                subdomain: 'create',
                confidence: 0.95
            }
        },
        {
            verb: 'explain',
            frequency: 8,
            classification: {
                domain: 'cognitive',
                subdomain: 'understand',
                confidence: 0.96
            }
        },
        {
            verb: 'compare',
            frequency: 7,
            classification: {
                domain: 'cognitive',
                subdomain: 'analyze',
                confidence: 0.94
            }
        },
        {
            verb: 'identify',
            frequency: 7,
            classification: {
                domain: 'cognitive',
                subdomain: 'remember',
                confidence: 0.95
            }
        },
        {
            verb: 'execute',
            frequency: 6,
            classification: {
                domain: 'psychomotor',
                subdomain: 'mechanism',
                confidence: 0.92
            }
        }
    ],

    recommendations: {
        main: 'The document demonstrates a strong emphasis on Cognitive higher-order thinking (62% of analyzed verbs), with healthy representation of Application and Analysis. Affective engagement and Psychomotor practice tasks are moderately integrated and could be bolstered for holistic curriculum balance.',

        cognitive: 'Strong emphasis on Analyze, Understand, and Apply. To reach highest mastery, introduce more synthesis and origination tasks (Create domain).',

        affective: 'Moderate affective engagement. Expand value internalization, reflective self-assessment, and student agency.',

        psychomotor: 'Practical and execution tasks are present. Incorporate progressive motor/dexterity ladders and iterative feedback loops.'
    },

    report: {
        filename: 'Sample_Research_Paper_Analysis.xlsx',
        url: '/api/papers/master-report'
    }
};


// Dashboard layout
function DashboardLayout({
    analysisData,
    handleAnalysisComplete,
    handleLoadSample,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen
}) {
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    return (
        <div className="evalix-app-root evalix-grid-bg">

            <Header />

            <div className="mobile-subbar d-lg-none">
                <button
                    className="mobile-nav-toggle-btn"
                    onClick={() =>
                        setIsMobileSidebarOpen(!isMobileSidebarOpen)
                    }
                >
                    <span>☰</span> Menu & Tools
                </button>

                <span className="mobile-brand-title">
                    Evalix 2.0
                </span>
            </div>

            <div className="evalix-main-layout">

                <Sidebar
                    isMobileOpen={isMobileSidebarOpen}
                    setIsMobileOpen={setIsMobileSidebarOpen}
                    onOpenFeedback={() => setIsFeedbackOpen(true)}
                />

                {isMobileSidebarOpen && (
                    <div
                        className="sidebar-backdrop"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    ></div>
                )}

                <FeedbackModal 
                    isOpen={isFeedbackOpen} 
                    onClose={() => setIsFeedbackOpen(false)}
                    currentDocument={analysisData?.documentInfo}
                />

                <main className="evalix-content-area">

                    <Routes>

                        {/* Document Upload Page */}
                        <Route
                            path="/upload"
                            element={
                                <FileUploadPanel
                                    onAnalysisComplete={handleAnalysisComplete}
                                />
                            }
                        />

                        <Route
                            path="/document"
                            element={
                                <Navigate
                                    to="/upload"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="/charts"
                            element={
                                <AnalysisDashboard
                                    data={analysisData}
                                    onLoadSample={handleLoadSample}
                                />
                            }
                        />

                        <Route
                            path="/analysis"
                            element={
                                <Navigate
                                    to="/charts"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="/classifications"
                            element={
                                <VerbClassificationsPage
                                    data={analysisData}
                                    onLoadSample={handleLoadSample}
                                />
                            }
                        />

                        <Route
                            path="/recommendations"
                            element={
                                <RecommendationsDashboard
                                    recommendations={
                                        analysisData?.recommendations
                                    }
                                    report={analysisData?.report}
                                    onLoadSample={handleLoadSample}
                                />
                            }
                        />

                        <Route
                            path="/reports"
                            element={
                                <ReportsList
                                    currentReport={analysisData?.report}
                                />
                            }
                        />

                        <Route
                            path="/quality-check"
                            element={
                                <QualityCheckPanel />
                            }
                        />

                        <Route
                            path="/about"
                            element={
                                <AboutAnalysisPage />
                            }
                        />

                        <Route
                            path="/certificate"
                            element={
                                <CertificateView />
                            }
                        />

                        <Route
                            path="/credits"
                            element={
                                <CreditsPage />
                            }
                        />

                        <Route
                            path="/admin"
                            element={
                                <AdminDashboard />
                            }
                        />

                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to="/upload"
                                    replace
                                />
                            }
                        />

                    </Routes>


                </main>

            </div>

        </div>
    );
}


function App() {

    const [analysisData, setAnalysisData] = useState(() => {

        try {
            const saved = sessionStorage.getItem(
                'evalix_analysis_data'
            );

            if (saved) {
                return JSON.parse(saved);
            }

        } catch (e) {
            console.warn(
                'Could not restore cached analysis from sessionStorage'
            );
        }

        return null;
    });


    const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
        useState(false);


    const handleAnalysisComplete = (data) => {

        console.log(
            'Evalix 2.0: Analysis complete with data:',
            data
        );

        setAnalysisData(data);

        try {
            sessionStorage.setItem(
                'evalix_analysis_data',
                JSON.stringify(data)
            );
        } catch (e) {
            console.warn(
                'Could not cache analysis in sessionStorage'
            );
        }
    };


    const handleLoadSample = () => {
        handleAnalysisComplete(SAMPLE_ANALYSIS_DATA);
    };


// Root route: If logged in, go to /upload (document entry). If not, show LandingPage.
function RootRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return null;
    }
    return isAuthenticated ? <Navigate to="/upload" replace /> : <LandingPage />;
}

    return (
        <AuthProvider>
            <Router>

                <Routes>

                    {/* Root route: smart redirect for logged in users */}
                    <Route
                        path="/"
                        element={<RootRoute />}
                    />

                    <Route
                        path="/landing"
                        element={<LandingPage />}
                    />

                    {/* All dashboard pages */}
                    <Route
                        path="/*"
                        element={
                            <DashboardLayout
                                analysisData={analysisData}
                                handleAnalysisComplete={handleAnalysisComplete}
                                handleLoadSample={handleLoadSample}
                                isMobileSidebarOpen={isMobileSidebarOpen}
                                setIsMobileSidebarOpen={
                                    setIsMobileSidebarOpen
                                }
                            />
                        }
                    />

                </Routes>

            </Router>
        </AuthProvider>
    );

}


export default App;