// components/VerbClassificationsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    FiSearch, 
    FiArrowUp, 
    FiArrowDown, 
    FiDownload, 
    FiUpload, 
    FiList
} from 'react-icons/fi';
import { exportAnalysisToExcel } from '../services/api';
import '../styles/VerbClassifications.scss';

const DOMAIN_COLORS = {
    cognitive: '#7C3AED',
    affective: '#EC4899',
    psychomotor: '#22D3EE',
    unclassified: '#64748B'
};

const VerbClassificationsPage = ({ data, onLoadSample }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const initialDomain = searchParams.get('domain') || 'all';
    const initialSearch = searchParams.get('search') || '';

    const [activeDomain, setActiveDomain] = useState(initialDomain);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [sortField, setSortField] = useState('frequency');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const itemsPerPage = 12;

    const handleExportExcel = async () => {
        if (!data) return;
        try {
            setIsExporting(true);
            await exportAnalysisToExcel(data, data.report?.filename || 'verb_classifications.xlsx');
        } catch (err) {
            console.error('Export error in VerbClassificationsPage:', err);
            alert('Failed to export Excel report. Please make sure backend server is running.');
        } finally {
            setIsExporting(false);
        }
    };

    // Sync state with URL params
    useEffect(() => {
        const domainParam = searchParams.get('domain');
        const searchParam = searchParams.get('search');
        if (domainParam) setActiveDomain(domainParam.toLowerCase());
        if (searchParam !== null && searchParam !== undefined) setSearchTerm(searchParam);
    }, [searchParams]);

    const handleDomainChange = (domain) => {
        setActiveDomain(domain);
        setCurrentPage(1);
        const newParams = new URLSearchParams(searchParams);
        if (domain === 'all') {
            newParams.delete('domain');
        } else {
            newParams.set('domain', domain);
        }
        setSearchParams(newParams);
    };

    const handleSearchChange = (val) => {
        setSearchTerm(val);
        setCurrentPage(1);
        const newParams = new URLSearchParams(searchParams);
        if (!val) {
            newParams.delete('search');
        } else {
            newParams.set('search', val);
        }
        setSearchParams(newParams);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'frequency' || field === 'confidence' ? 'desc' : 'asc');
        }
    };

    const verbs = useMemo(() => data?.verbs || [], [data]);

    // Filtering
    const filteredVerbs = useMemo(() => {
        return verbs.filter(item => {
            const matchesDomain = activeDomain === 'all' || 
                item.classification?.domain?.toLowerCase() === activeDomain.toLowerCase();

            const query = searchTerm.toLowerCase().trim();
            const matchesSearch = !query || 
                item.verb?.toLowerCase().includes(query) ||
                item.classification?.subdomain?.toLowerCase().includes(query) ||
                item.classification?.matchedWith?.toLowerCase().includes(query);

            return matchesDomain && matchesSearch;
        });
    }, [verbs, activeDomain, searchTerm]);

    // Sorting
    const sortedVerbs = useMemo(() => {
        return [...filteredVerbs].sort((a, b) => {
            let valA, valB;
            if (sortField === 'verb') {
                valA = a.verb?.toLowerCase() || '';
                valB = b.verb?.toLowerCase() || '';
            } else if (sortField === 'frequency') {
                valA = a.frequency || 0;
                valB = b.frequency || 0;
            } else if (sortField === 'domain') {
                valA = a.classification?.domain?.toLowerCase() || '';
                valB = b.classification?.domain?.toLowerCase() || '';
            } else if (sortField === 'subdomain') {
                valA = a.classification?.subdomain?.toLowerCase() || '';
                valB = b.classification?.subdomain?.toLowerCase() || '';
            } else if (sortField === 'confidence') {
                valA = a.classification?.confidence || 0;
                valB = b.classification?.confidence || 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredVerbs, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(sortedVerbs.length / itemsPerPage);
    const paginatedVerbs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedVerbs.slice(start, start + itemsPerPage);
    }, [sortedVerbs, currentPage, itemsPerPage]);

    // Confidence badge color helper
    const getConfidenceColor = (conf) => {
        if (conf >= 0.9) return '#34D399'; // Green
        if (conf >= 0.75) return '#38BDF8'; // Blue
        if (conf >= 0.6) return '#FBBF24'; // Yellow
        return '#F87171'; // Red
    };

    if (!data || !data.verbs || data.verbs.length === 0) {
        return (
            <div className="evalix-dashboard-page">
                <div className="empty-analysis-card glass-panel text-center py-5 px-4">
                    <div className="empty-icon-wrap">
                        <FiList className="empty-icon" />
                    </div>
                    <h2 className="empty-title">No Verb Classifications Available</h2>
                    <p className="empty-desc">
                        Upload and analyze an educational document to classify action verbs into Cognitive, Affective, and Psychomotor domains with semantic similarity scoring.
                    </p>
                    <div className="empty-actions-row">
                        <button className="btn-evalix-primary" onClick={() => navigate('/upload')}>
                            <FiUpload className="me-2" />
                            Upload Document
                        </button>
                        {onLoadSample && (
                            <button className="btn-evalix-secondary" onClick={onLoadSample}>
                                Load Sample Analysis
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="evalix-dashboard-page verb-classifications-page">
            {/* Header Title Section */}
            <div className="page-header-block mb-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <div className="header-badge">
                            <span className="badge-sparkle">✦</span>
                            <span>Bloom's Taxonomy NLP Classifier</span>
                        </div>
                        <h1 className="header-title mb-1">
                            Verb <span className="gradient-text">Classifications</span>
                        </h1>
                        <p className="header-subtitle">
                            Detailed breakdown of action verbs extracted from {data.documentInfo?.filename || 'the document'}.
                        </p>
                    </div>

                    <button 
                        className="btn-evalix-secondary"
                        onClick={handleExportExcel}
                        disabled={isExporting}
                        title="Download detailed Excel classification spreadsheet"
                    >
                        {isExporting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FiDownload className="me-2" />
                                Export Excel
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="table-controls-bar glass-panel mb-4">
                {/* Domain Filter Pills */}
                <div className="domain-filter-pills">
                    <button
                        type="button"
                        className={`filter-pill ${activeDomain === 'all' ? 'active' : ''}`}
                        onClick={() => handleDomainChange('all')}
                    >
                        All Domains ({verbs.length})
                    </button>
                    <button
                        type="button"
                        className={`filter-pill pill-cognitive ${activeDomain === 'cognitive' ? 'active' : ''}`}
                        onClick={() => handleDomainChange('cognitive')}
                    >
                        <span className="dot dot-cognitive"></span>
                        Cognitive ({data.domains?.cognitive?.count || 0})
                    </button>
                    <button
                        type="button"
                        className={`filter-pill pill-affective ${activeDomain === 'affective' ? 'active' : ''}`}
                        onClick={() => handleDomainChange('affective')}
                    >
                        <span className="dot dot-affective"></span>
                        Affective ({data.domains?.affective?.count || 0})
                    </button>
                    <button
                        type="button"
                        className={`filter-pill pill-psychomotor ${activeDomain === 'psychomotor' ? 'active' : ''}`}
                        onClick={() => handleDomainChange('psychomotor')}
                    >
                        <span className="dot dot-psychomotor"></span>
                        Psychomotor ({data.domains?.psychomotor?.count || 0})
                    </button>
                    <button
                        type="button"
                        className={`filter-pill pill-unclassified ${activeDomain === 'unclassified' ? 'active' : ''}`}
                        onClick={() => handleDomainChange('unclassified')}
                    >
                        <span className="dot" style={{ background: '#94A3B8' }}></span>
                        Unknown / Unclassified ({data.domains?.unclassified?.count || 0})
                    </button>
                </div>

                {/* Search Input */}
                <div className="table-search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Filter by verb or subdomain..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && (
                        <button 
                            type="button" 
                            className="clear-search-btn"
                            onClick={() => handleSearchChange('')}
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Main Glass Table Card */}
            <div className="verb-table-card glass-panel">
                <div className="table-responsive">
                    <table className="evalix-data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('verb')} className="sortable-th">
                                    <div className="th-content">
                                        <span>Action Verb</span>
                                        {sortField === 'verb' && (
                                            <span className="sort-arrow">
                                                {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('frequency')} className="sortable-th text-center">
                                    <div className="th-content justify-content-center">
                                        <span>Frequency</span>
                                        {sortField === 'frequency' && (
                                            <span className="sort-arrow">
                                                {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('domain')} className="sortable-th">
                                    <div className="th-content">
                                        <span>Domain</span>
                                        {sortField === 'domain' && (
                                            <span className="sort-arrow">
                                                {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('subdomain')} className="sortable-th">
                                    <div className="th-content">
                                        <span>Subdomain (Level)</span>
                                        {sortField === 'subdomain' && (
                                            <span className="sort-arrow">
                                                {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('confidence')} className="sortable-th">
                                    <div className="th-content">
                                        <span>Semantic Match</span>
                                        {sortField === 'confidence' && (
                                            <span className="sort-arrow">
                                                {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedVerbs.length > 0 ? (
                                paginatedVerbs.map((item, idx) => {
                                    const domain = item.classification?.domain?.toLowerCase() || 'unclassified';
                                    const domainColor = DOMAIN_COLORS[domain] || '#64748B';
                                    const confidenceVal = item.classification?.confidence || 0;
                                    const confidencePercent = item.classification?.similarityPercentage ?? Math.round(confidenceVal * 100);
                                    const isUnknown = domain === 'unclassified' || domain === 'unknown';
                                    const suggestedDomain = item.classification?.suggestedDomain || item.suggestedDomain;
                                    const suggestedSubdomain = item.classification?.suggestedSubdomain || item.suggestedSubdomain;
                                    const domainPcts = item.classification?.domainPercentages || item.domainPercentages;

                                    return (
                                        <tr key={idx} className="table-data-row">
                                            <td className="verb-name-cell">
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <span className="verb-main-text">{item.verb}</span>
                                                    {isUnknown && (
                                                        <span 
                                                            className="badge"
                                                            title="Below strict classification threshold - nearest match computed via vector cosine similarity"
                                                            style={{
                                                                fontSize: '0.65rem',
                                                                background: 'rgba(148, 163, 184, 0.15)',
                                                                border: '1px solid rgba(148, 163, 184, 0.4)',
                                                                color: '#94A3B8',
                                                                padding: '0.15rem 0.45rem'
                                                            }}
                                                        >
                                                            Unknown ({confidencePercent}%)
                                                        </span>
                                                    )}
                                                    {(item.verified === false || item.classification?.verified === false) && (
                                                        <span 
                                                            className="unverified-inferred-badge"
                                                            title="Extracted as unverified candidate and classified via cosine similarity (>= 0.75)"
                                                            style={{
                                                                fontSize: '0.65rem',
                                                                fontWeight: '600',
                                                                background: 'rgba(245, 158, 11, 0.15)',
                                                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                                                color: '#F59E0B',
                                                                padding: '0.15rem 0.45rem',
                                                                borderRadius: '4px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem'
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '0.5rem' }}>●</span> Inferred (Cosine)
                                                        </span>
                                                    )}
                                                </div>
                                                {item.classification?.matchedWith && (
                                                    <span className="matched-with-sub">
                                                        {isUnknown ? 'closest benchmark:' : 'matched with:'} <em>{item.classification.matchedWith}</em>
                                                    </span>
                                                )}
                                            </td>

                                            <td className="text-center">
                                                <span className="table-freq-badge">
                                                    {item.frequency || 1}
                                                </span>
                                            </td>

                                            <td>
                                                {isUnknown ? (
                                                    <div>
                                                        <span 
                                                            className="domain-table-badge"
                                                            style={{
                                                                backgroundColor: 'rgba(100, 116, 139, 0.15)',
                                                                borderColor: 'rgba(100, 116, 139, 0.35)',
                                                                color: '#94A3B8'
                                                            }}
                                                        >
                                                            <span className="badge-dot" style={{ backgroundColor: '#94A3B8' }}></span>
                                                            Unclassified
                                                        </span>
                                                        {suggestedDomain && suggestedDomain !== 'unclassified' && (
                                                            <div className="mt-1" style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>
                                                                Closest: <strong style={{ color: DOMAIN_COLORS[suggestedDomain.toLowerCase()] || '#C084FC' }}>
                                                                    {suggestedDomain.charAt(0).toUpperCase() + suggestedDomain.slice(1)} ({confidencePercent}%)
                                                                </strong>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span 
                                                        className="domain-table-badge"
                                                        style={{
                                                            backgroundColor: `${domainColor}1A`,
                                                            borderColor: `${domainColor}4D`,
                                                            color: domainColor
                                                        }}
                                                    >
                                                        <span 
                                                            className="badge-dot" 
                                                            style={{ backgroundColor: domainColor }}
                                                        ></span>
                                                        {domain.charAt(0).toUpperCase() + domain.slice(1)}
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                <span className="subdomain-text">
                                                    {isUnknown && suggestedSubdomain && suggestedSubdomain !== 'unknown' ? (
                                                        <span title="Suggested nearest subdomain based on embedding similarity">
                                                            ~ {suggestedSubdomain.charAt(0).toUpperCase() + suggestedSubdomain.slice(1)} <small style={{ color: '#64748B' }}>(suggested)</small>
                                                        </span>
                                                    ) : (
                                                        (item.classification?.subdomain || 'Unknown').charAt(0).toUpperCase() + 
                                                        (item.classification?.subdomain || 'unknown').slice(1)
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="confidence-meter-wrap">
                                                    <div className="confidence-bar-track">
                                                        <div 
                                                            className="confidence-bar-fill"
                                                            style={{ 
                                                                width: `${confidencePercent}%`,
                                                                backgroundColor: getConfidenceColor(confidenceVal)
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span 
                                                        className="confidence-pct-label"
                                                        style={{ color: getConfidenceColor(confidenceVal) }}
                                                    >
                                                        {confidencePercent}%
                                                    </span>
                                                </div>
                                                {domainPcts && isUnknown && (
                                                    <div className="d-flex gap-2 mt-1" style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                                                        <span>Cog: <span style={{ color: DOMAIN_COLORS.cognitive }}>{domainPcts.cognitive}%</span></span>
                                                        <span>Aff: <span style={{ color: DOMAIN_COLORS.affective }}>{domainPcts.affective}%</span></span>
                                                        <span>Psy: <span style={{ color: DOMAIN_COLORS.psychomotor }}>{domainPcts.psychomotor}%</span></span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-table-cell text-center py-5">
                                        <div className="text-muted">No action verbs match your current filters.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer & Pagination */}
                {totalPages > 1 && (
                    <div className="table-footer-pagination">
                        <div className="pagination-info">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredVerbs.length)} of {filteredVerbs.length} entries
                        </div>
                        <div className="pagination-buttons">
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <span className="page-current-indicator">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerbClassificationsPage;
