// components/Sidebar.js
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
    FiUploadCloud, 
    FiBarChart2, 
    FiList, 
    FiInfo, 
    FiBookOpen,
    FiAward,
    FiUsers,
    FiShield,
    FiMessageSquare,
    FiX
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.scss';

const Sidebar = ({ isMobileOpen, setIsMobileOpen, onOpenFeedback }) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isAdmin = user?.systemRole === 'admin' || user?.systemRole === 'superadmin';

    const handleTaxonomyClick = (domain) => {
        navigate(`/classifications?domain=${domain.toLowerCase()}`);
        if (setIsMobileOpen) setIsMobileOpen(false);
    };

    const isTaxonomyActive = (domain) => {
        if (location.pathname !== '/classifications') return false;
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get('domain')?.toLowerCase() === domain.toLowerCase();
    };

    return (
        <aside className={`evalix-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
            {/* Mobile close toggle */}
            <div className="sidebar-mobile-header">
                <span className="mobile-title">Menu</span>
                <button 
                    className="mobile-close-btn"
                    onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                    aria-label="Close menu"
                >
                    <FiX />
                </button>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="sidebar-nav-scroll-area">
                {/* Section 1: Analysis Tools */}
                <div className="sidebar-section">
                    <div className="sidebar-heading">Analysis Tools</div>
                    <nav className="sidebar-nav">
                        <NavLink 
                            to="/upload" 
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                        >
                            <span className="item-icon-wrap">
                                <FiUploadCloud className="nav-icon" />
                            </span>
                            <span className="item-label">Upload Document</span>
                            {(location.pathname === '/upload' || location.pathname === '/') && <span className="active-pill-glow"></span>}
                        </NavLink>

                        <NavLink 
                            to="/charts" 
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                        >
                            <span className="item-icon-wrap">
                                <FiBarChart2 className="nav-icon" />
                            </span>
                            <span className="item-label">View Charts</span>
                        </NavLink>

                        <NavLink 
                            to="/classifications" 
                            className={({ isActive }) => `sidebar-nav-item ${isActive && !location.search ? 'active' : ''}`}
                            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                        >
                            <span className="item-icon-wrap">
                                <FiList className="nav-icon" />
                            </span>
                            <span className="item-label">Verb Classifications</span>
                        </NavLink>

                        <NavLink 
                            to="/quality-check" 
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                        >
                            <span className="item-icon-wrap">
                                <FiAward className="nav-icon" />
                            </span>
                            <span className="item-label">Quality Check</span>
                        </NavLink>

                        <NavLink 
                            to="/reports" 
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                        >
                            <span className="item-icon-wrap">
                                <FiBookOpen className="nav-icon" />
                            </span>
                            <span className="item-label">Reports & Certs</span>
                        </NavLink>

                        <NavLink 
                            to="/about" 
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                        >
                            <span className="item-icon-wrap">
                                <FiInfo className="nav-icon" />
                            </span>
                            <span className="item-label">About Analysis</span>
                        </NavLink>

                        <NavLink 
                            to="/credits" 
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                        >
                            <span className="item-icon-wrap">
                                <FiUsers className="nav-icon" />
                            </span>
                            <span className="item-label">Credits</span>
                        </NavLink>

                        {isAdmin && (
                            <NavLink 
                                to="/admin" 
                                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                                style={{ borderLeft: '3px solid #F59E0B' }}
                            >
                                <span className="item-icon-wrap">
                                    <FiShield className="nav-icon" style={{ color: '#F59E0B' }} />
                                </span>
                                <span className="item-label" style={{ color: '#F59E0B' }}>Admin Control</span>
                            </NavLink>
                        )}

                        <button 
                            type="button"
                            className="sidebar-nav-item feedback-sidebar-btn"
                            onClick={() => {
                                if (onOpenFeedback) onOpenFeedback();
                                if (setIsMobileOpen) setIsMobileOpen(false);
                            }}
                            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                        >
                            <span className="item-icon-wrap">
                                <FiMessageSquare className="nav-icon" style={{ color: '#38BDF8' }} />
                            </span>
                            <span className="item-label">Feedback</span>
                        </button>
                    </nav>
                </div>

                <div className="sidebar-divider"></div>

                {/* Section 2: Taxonomy Domains */}
                <div className="sidebar-section">
                    <div className="sidebar-heading">Taxonomy Domains</div>
                    <div className="taxonomy-nav">
                        <button
                            type="button"
                            className={`taxonomy-item ${isTaxonomyActive('cognitive') ? 'selected' : ''}`}
                            onClick={() => handleTaxonomyClick('cognitive')}
                            title="Filter Cognitive Domain Verbs"
                        >
                            <span className="domain-dot dot-cognitive"></span>
                            <span className="domain-label">Cognitive</span>
                        </button>

                        <button
                            type="button"
                            className={`taxonomy-item ${isTaxonomyActive('affective') ? 'selected' : ''}`}
                            onClick={() => handleTaxonomyClick('affective')}
                            title="Filter Affective Domain Verbs"
                        >
                            <span className="domain-dot dot-affective"></span>
                            <span className="domain-label">Affective</span>
                        </button>

                        <button
                            type="button"
                            className={`taxonomy-item ${isTaxonomyActive('psychomotor') ? 'selected' : ''}`}
                            onClick={() => handleTaxonomyClick('psychomotor')}
                            title="Filter Psychomotor Domain Verbs"
                        >
                            <span className="domain-dot dot-psychomotor"></span>
                            <span className="domain-label">Psychomotor</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Left Bottom Footer & Promo Card */}
            <div className="sidebar-bottom-section">
                <div className="sidebar-promo-card">
                    <div className="promo-icon-box">
                        <FiBookOpen className="promo-icon" />
                    </div>
                    <div className="promo-title">
                        Transforming<br />
                        Education with AI
                    </div>
                    <div className="promo-desc">
                        From documents to deeper insights.
                    </div>
                </div>

                <footer className="sidebar-copyright">
                    © 2026 Evalix 2.0. All rights reserved.
                </footer>
            </div>
        </aside>
    );
};

export default Sidebar;