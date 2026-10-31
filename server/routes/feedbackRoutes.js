// server/routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const feedbackStore = require('../utils/feedbackStore');
const userStore = require('../utils/userStore');

const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return req.headers['x-auth-token'] || null;
};

// Middleware: Authenticate user (optional or required)
const authenticate = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const user = userStore.verifySession(token);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    }
    req.user = user;
    next();
};

// Middleware: Require admin or superadmin
const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.systemRole !== 'admin' && req.user.systemRole !== 'superadmin')) {
        return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
    }
    next();
};

/**
 * POST /api/feedback - Submit new feedback
 */
router.post('/', (req, res) => {
    try {
        const token = extractToken(req);
        const user = token ? userStore.verifySession(token) : null;

        const { rating, category, subject, comments, documentName } = req.body;

        if (!rating && !comments) {
            return res.status(400).json({
                success: false,
                message: 'Rating or feedback comments are required.'
            });
        }

        const newFeedback = feedbackStore.addFeedback({
            userId: user ? user.id : 'anonymous',
            userName: user ? user.name : (req.body.userName || 'Anonymous User'),
            userEmail: user ? user.email : (req.body.userEmail || 'anonymous@evalix.com'),
            rating,
            category,
            subject,
            comments,
            documentName
        });

        return res.status(201).json({
            success: true,
            message: 'Thank you! Your feedback has been submitted successfully.',
            feedback: newFeedback
        });
    } catch (err) {
        console.error('Submit feedback error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
    }
});

/**
 * GET /api/feedback - Retrieve all feedback (Admin/Superadmin only)
 */
router.get('/', authenticate, requireAdmin, (req, res) => {
    try {
        const list = feedbackStore.getAllFeedback();
        return res.status(200).json({
            success: true,
            count: list.length,
            feedback: list
        });
    } catch (err) {
        console.error('Get feedback error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to retrieve feedback.' });
    }
});

/**
 * PATCH /api/feedback/:id/status - Update feedback review status (Admin/Superadmin only)
 */
router.patch('/:id/status', authenticate, requireAdmin, (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required.' });
        }
        const updated = feedbackStore.updateFeedbackStatus(req.params.id, status);
        return res.status(200).json({ success: true, feedback: updated });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
});

/**
 * DELETE /api/feedback/:id - Delete feedback entry (Admin/Superadmin only)
 */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
    try {
        feedbackStore.deleteFeedback(req.params.id);
        return res.status(200).json({ success: true, message: 'Feedback entry deleted.' });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
