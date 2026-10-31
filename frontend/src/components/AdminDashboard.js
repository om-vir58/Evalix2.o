// components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { 
    FiUsers, 
    FiMessageSquare, 
    FiShield, 
    FiTrash2, 
    FiCheck, 
    FiKey, 
    FiRefreshCw, 
    FiStar, 
    FiAlertCircle, 
    FiCheckCircle 
} from 'react-icons/fi';
import { 
    fetchAdminUsersApi, 
    updateUserRoleApi, 
    deleteUserApi, 
    fetchAllFeedbackApi, 
    updateFeedbackStatusApi, 
    deleteFeedbackApi, 
    promoteWithSecretApi 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminDashboard.scss';

const AdminDashboard = () => {
    const { user, login } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Promotion secret key form
    const [secretKeyInput, setSecretKeyInput] = useState('');
    const [isPromoting, setIsPromoting] = useState(false);

    const isSuperadmin = user?.systemRole === 'superadmin';
    const isAdmin = user?.systemRole === 'admin' || isSuperadmin;

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            if (isAdmin) {
                const [usersRes, feedbacksRes] = await Promise.all([
                    fetchAdminUsersApi().catch(() => ({ users: [] })),
                    fetchAllFeedbackApi().catch(() => ({ feedback: [] }))
                ]);
                setUsers(usersRes.users || []);
                setFeedbacks(feedbacksRes.feedback || []);
            }
        } catch (err) {
            console.error('Error loading admin data:', err);
            setError('Failed to load admin dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isAdmin]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            setError('');
            await updateUserRoleApi(userId, newRole);
            setSuccessMessage(`User role successfully updated to ${newRole}.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user role.');
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`Are you sure you want to delete user account: ${userEmail}?`)) return;
        try {
            setError('');
            await deleteUserApi(userId);
            setSuccessMessage('User account deleted.');
            setTimeout(() => setSuccessMessage(''), 3000);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user.');
        }
    };

    const handleFeedbackStatus = async (feedbackId, status) => {
        try {
            await updateFeedbackStatusApi(feedbackId, status);
            loadData();
        } catch (err) {
            setError('Failed to update feedback status.');
        }
    };

    const handleDeleteFeedback = async (feedbackId) => {
        if (!window.confirm('Delete this feedback entry?')) return;
        try {
            await deleteFeedbackApi(feedbackId);
            loadData();
        } catch (err) {
            setError('Failed to delete feedback entry.');
        }
    };

    const handlePromoteWithSecret = async (e) => {
        e.preventDefault();
        if (!secretKeyInput.trim()) return;
        setIsPromoting(true);
        setError('');
        try {
            const res = await promoteWithSecretApi(secretKeyInput.trim());
            setSuccessMessage('Secret seed key verified! Elevated to Superadmin.');
            setSecretKeyInput('');
            // Trigger local auth reload if available
            window.location.reload();
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid secret seed key.');
        } finally {
            setIsPromoting(false);
        }
    };

    return (
        <div className="evalix-dashboard-page admin-dashboard-page">
            {/* Page Header */}
            <div className="page-header-block mb-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <div className="header-badge">
                            <FiShield className="me-1" />
                            <span>System Administration</span>
                        </div>
                        <h1 className="header-title mb-1">
                            Admin & <span className="gradient-text">Governance Control</span>
                        </h1>
                        <p className="header-subtitle">
                            Manage user role authorizations, review user feedbacks, and maintain system security.
                        </p>
                    </div>

                    <button className="btn-evalix-secondary" onClick={loadData} disabled={loading}>
                        <FiRefreshCw className={`me-2 ${loading ? 'spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert-evalix-error mb-4">
                    <FiAlertCircle className="me-2" />
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="alert-evalix-success mb-4">
                    <FiCheckCircle className="me-2" />
                    {successMessage}
                </div>
            )}

            {/* Secret Seed Elevation Card for Non-Superadmins */}
            {!isSuperadmin && (
                <div className="elevation-secret-card glass-panel mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className="secret-icon-box">
                            <FiKey />
                        </div>
                        <div className="flex-1">
                            <h4 className="card-heading m-0">Bootstrap Superadmin Privileges</h4>
                            <p className="card-sub m-0">Enter the system secret seed key to promote your current account to Superadmin.</p>
                        </div>
                        <form onSubmit={handlePromoteWithSecret} className="d-flex gap-2">
                            <input
                                type="password"
                                className="evalix-input secret-input"
                                placeholder="Enter secret seed key..."
                                value={secretKeyInput}
                                onChange={(e) => setSecretKeyInput(e.target.value)}
                            />
                            <button type="submit" className="btn-evalix-primary" disabled={isPromoting}>
                                {isPromoting ? 'Verifying...' : 'Elevate Role'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="admin-tabs-bar glass-panel mb-4">
                <button
                    className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <FiUsers className="me-2" />
                    User Directory ({users.length})
                </button>
                <button
                    className={`admin-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
                    onClick={() => setActiveTab('feedback')}
                >
                    <FiMessageSquare className="me-2" />
                    User Feedback ({feedbacks.length})
                </button>
            </div>

            {/* Tab 1: Users Table */}
            {activeTab === 'users' && (
                <div className="admin-content-card glass-panel">
                    <div className="card-header-bar mb-3">
                        <h3 className="section-title m-0">Registered Accounts & RBAC Roles</h3>
                        <span className="badge-role-info">Current System Role: <strong>{user?.systemRole || 'user'}</strong></span>
                    </div>

                    <div className="table-responsive">
                        <table className="evalix-admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Academic Title</th>
                                    <th>System Role</th>
                                    <th>Joined</th>
                                    {isSuperadmin && <th className="text-end">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? (
                                    users.map((u) => {
                                        const role = u.systemRole || 'user';
                                        return (
                                            <tr key={u.id}>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="user-table-avatar">
                                                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                                                        </div>
                                                        <span className="user-name-text">{u.name}</span>
                                                    </div>
                                                </td>
                                                <td><span className="text-muted">{u.email}</span></td>
                                                <td><span className="text-secondary">{u.role || 'Researcher'}</span></td>
                                                <td>
                                                    <span className={`role-badge role-${role}`}>
                                                        {role === 'superadmin' && '👑 '}
                                                        {role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </td>
                                                {isSuperadmin && (
                                                    <td className="text-end">
                                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                                            <select
                                                                className="role-select"
                                                                value={role}
                                                                disabled={u.id === user.id}
                                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                            >
                                                                <option value="user">User</option>
                                                                <option value="admin">Admin</option>
                                                                <option value="superadmin">Superadmin</option>
                                                            </select>
                                                            {u.id !== user.id && (
                                                                <button
                                                                    className="btn-icon-danger"
                                                                    title="Delete User"
                                                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                                                >
                                                                    <FiTrash2 />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={isSuperadmin ? 6 : 5} className="text-center py-4 text-muted">
                                            No user accounts registered.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Feedbacks Table */}
            {activeTab === 'feedback' && (
                <div className="admin-content-card glass-panel">
                    <div className="card-header-bar mb-3">
                        <h3 className="section-title m-0">User Feedbacks & Suggestions</h3>
                        <span className="badge-role-info">Total Entries: <strong>{feedbacks.length}</strong></span>
                    </div>

                    <div className="feedbacks-list-grid">
                        {feedbacks.length > 0 ? (
                            feedbacks.map((fb) => (
                                <div key={fb.id} className="feedback-card glass-panel">
                                    <div className="feedback-card-top">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rating-stars-badge">
                                                <FiStar className="star-icon" />
                                                <span>{fb.rating} / 5</span>
                                            </div>
                                            <span className="category-pill">{fb.category?.toUpperCase()}</span>
                                            <span className={`status-pill status-${fb.status || 'pending'}`}>
                                                {fb.status || 'pending'}
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            {fb.status !== 'reviewed' && (
                                                <button
                                                    className="btn-mark-reviewed"
                                                    title="Mark Reviewed"
                                                    onClick={() => handleFeedbackStatus(fb.id, 'reviewed')}
                                                >
                                                    <FiCheck className="me-1" /> Mark Reviewed
                                                </button>
                                            )}
                                            <button
                                                className="btn-icon-danger"
                                                title="Delete Feedback"
                                                onClick={() => handleDeleteFeedback(fb.id)}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="feedback-subject">{fb.subject}</h4>
                                    <p className="feedback-comments">{fb.comments}</p>

                                    <div className="feedback-meta-footer">
                                        <span>From: <strong>{fb.userName}</strong> ({fb.userEmail})</span>
                                        {fb.documentName && <span>Doc: <em>{fb.documentName}</em></span>}
                                        <span>Date: {new Date(fb.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-5 text-muted">
                                No user feedback submitted yet.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
