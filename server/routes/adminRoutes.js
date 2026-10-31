// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const userStore = require('../utils/userStore');

const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return req.headers['x-auth-token'] || null;
};

// Middleware: Verify user session
const authenticate = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const user = userStore.verifySession(token);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Session has expired or is invalid.' });
    }
    req.user = user;
    next();
};

// Middleware: Require Admin or Superadmin
const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.systemRole !== 'admin' && req.user.systemRole !== 'superadmin')) {
        return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
    }
    next();
};

// Middleware: Require Superadmin strictly
const requireSuperadmin = (req, res, next) => {
    if (!req.user || req.user.systemRole !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Access denied. Superadmin privileges required.' });
    }
    next();
};

/**
 * GET /api/admin/users - List all registered users (Admin/Superadmin)
 */
router.get('/users', authenticate, requireAdmin, (req, res) => {
    try {
        const users = userStore.getAllUsers().map(userStore.sanitizeUser);
        return res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (err) {
        console.error('List users error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
    }
});

/**
 * PATCH /api/admin/users/:id/role - Update user system role (Superadmin only)
 */
router.patch('/users/:id/role', authenticate, requireSuperadmin, (req, res) => {
    try {
        const { systemRole } = req.body;
        if (!systemRole) {
            return res.status(400).json({ success: false, message: 'systemRole is required.' });
        }

        const updated = userStore.updateUserRole(req.params.id, systemRole);
        return res.status(200).json({
            success: true,
            message: `User role updated to ${updated.systemRole}.`,
            user: updated
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
});

/**
 * DELETE /api/admin/users/:id - Delete a user (Superadmin only)
 */
router.delete('/users/:id', authenticate, requireSuperadmin, (req, res) => {
    try {
        if (req.user.id === req.params.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own active superadmin account.' });
        }

        userStore.deleteUser(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'User account removed successfully.'
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/admin/promote-with-secret - Self-promote current authenticated user using secret seed key
 */
router.post('/promote-with-secret', authenticate, (req, res) => {
    try {
        const { secretKey } = req.body;
        if (!secretKey) {
            return res.status(400).json({ success: false, message: 'Secret seed key is required.' });
        }

        const updated = userStore.promoteUserWithSecret(req.user.id, secretKey);
        return res.status(200).json({
            success: true,
            message: 'Congratulations! You have been elevated to Superadmin status.',
            user: updated
        });
    } catch (err) {
        return res.status(403).json({ success: false, message: err.message });
    }
});

module.exports = router;
