// components/Header.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiChevronDown, FiLogOut } from 'react-icons/fi';
import evalixLogo from '../assets/evalix-logo.png';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.scss';

const Header = () => {
    const { user, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const navigate = useNavigate();

    // Determine user details from auth state
    const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest User');
    const userEmail = user?.email || 'guest@evalix.com';
    const userRole = user?.role || 'Researcher / Analyst';

    // Compute initials (e.g. "DR" for Demo Researcher)
    const getInitials = () => {
        if (!user) return 'GU';
        if (user.name) {
            const parts = user.name.trim().split(/\s+/);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return parts[0].substring(0, 2).toUpperCase();
        }
        if (user.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'EX';
    };

    const handleLogout = async () => {
        setUserMenuOpen(false);
        await logout();
        navigate('/landing');
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/classifications?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <header className="evalix-navbar">
            <div className="navbar-container">
                {/* Left: Brand Logo & Title */}
                <div className="navbar-brand-section">
                    <Link to="/upload" className="brand-logo-link">
                        <div className="brand-logo-icon">
                            <img src={evalixLogo} alt="Evalix Logo" className="brand-logo-img" />
                        </div>
                        <div className="brand-title-wrap">
                            <div className="brand-name-row">
                                <span className="brand-name">Evalix</span>
                                <span className="version-badge">2.0</span>
                            </div>
                            <span className="brand-tagline">Analyze • Understand • Improve</span>
                        </div>
                    </Link>
                </div>

                {/* Center: Search Bar */}
                <div className="navbar-search-section">
                    <div className="search-box">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search documents, verbs, or analyses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                            className="search-input"
                        />
                        {searchQuery && (
                            <button
                                className="search-clear-btn"
                                onClick={() => setSearchQuery('')}
                                title="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Actions & Profile */}
                <div className="navbar-actions-section">
                    {/* Notification Icon */}
                    <div className="notification-wrapper">
                        <button
                            className="action-icon-btn notification-btn"
                            onClick={() => setNotificationsOpen(!notificationsOpen)}
                            title="Notifications"
                            aria-label="Notifications"
                        >
                            <FiBell className="action-svg" />
                            <span className="notification-dot"></span>
                        </button>
                        {notificationsOpen && (
                            <div className="navbar-dropdown notifications-dropdown">
                                <div className="dropdown-header">
                                    <span>Notifications</span>
                                    <span className="badge-count">1 New</span>
                                </div>
                                <div className="dropdown-item unread">
                                    <div className="item-title">System Ready</div>
                                    <div className="item-desc">Bloom's Taxonomy NLP pipeline is online.</div>
                                    <div className="item-time">Just now</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <div className="user-profile-wrapper">
                        <button
                            className="user-profile-btn"
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            aria-label="User menu"
                        >
                            <div className="user-avatar">{getInitials()}</div>
                            <span className="user-name">{displayName}</span>
                            <FiChevronDown className={`dropdown-chevron ${userMenuOpen ? 'open' : ''}`} />
                        </button>
                        {userMenuOpen && (
                            <div className="navbar-dropdown user-dropdown">
                                <div className="dropdown-user-info">
                                    <div className="info-name">{displayName}</div>
                                    <div className="info-email">{userEmail}</div>
                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        <div className="info-role">{userRole}</div>
                                        {user?.systemRole && (
                                            <span 
                                                className="badge" 
                                                style={{
                                                    fontSize: '0.65rem',
                                                    background: user.systemRole === 'superadmin' ? 'rgba(245, 158, 11, 0.2)' : user.systemRole === 'admin' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                                    color: user.systemRole === 'superadmin' ? '#F59E0B' : user.systemRole === 'admin' ? '#C084FC' : '#94A3B8',
                                                    border: '1px solid currentColor',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                {user.systemRole === 'superadmin' ? '👑 SUPERADMIN' : user.systemRole.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="dropdown-divider"></div>
                                <Link to="/upload" className="dropdown-link" onClick={() => setUserMenuOpen(false)}>
                                    Dashboard Home
                                </Link>
                                <Link to="/charts" className="dropdown-link" onClick={() => setUserMenuOpen(false)}>
                                    Analytics Overview
                                </Link>
                                <Link to="/about" className="dropdown-link" onClick={() => setUserMenuOpen(false)}>
                                    About Analysis
                                </Link>
                                {(user?.systemRole === 'admin' || user?.systemRole === 'superadmin') && (
                                    <Link to="/admin" className="dropdown-link" onClick={() => setUserMenuOpen(false)} style={{ color: '#F59E0B' }}>
                                        Admin Governance
                                    </Link>
                                )}
                                <div className="dropdown-divider"></div>
                                <button
                                    type="button"
                                    className="dropdown-link signout-btn"
                                    onClick={handleLogout}
                                >
                                    <FiLogOut />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;