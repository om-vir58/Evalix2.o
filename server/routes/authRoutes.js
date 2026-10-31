// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const userStore = require('../utils/userStore');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Extract bearer token from Authorization header or custom headers
 */
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return req.headers['x-auth-token'] || null;
};

// ============================================================================
// POST /api/auth/signup - Register new user
// ============================================================================
const handleSignup = (req, res) => {
    try {
        const { email, password, name, role, adminSecret } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        if (!EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Check if user already exists
        const existing = userStore.findUserByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email address already exists.'
            });
        }

        const newUser = userStore.createUser({
            email,
            password,
            name,
            role,
            adminSecret
        });

        const token = userStore.createSession(newUser);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            user: newUser,
            token
        });
    } catch (err) {
        console.error('Signup error:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message || 'Internal server error during registration.'
        });
    }
};

router.post('/signup', handleSignup);
router.post('/register', handleSignup);

// ============================================================================
// POST /api/auth/login - Authenticate user
// ============================================================================
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const user = userStore.findUserByEmail(email);

        if (!user || !userStore.verifyPassword(user, password)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const safeUser = userStore.sanitizeUser(user);
        const token = userStore.createSession(safeUser);

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            user: safeUser,
            token
        });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during login.'
        });
    }
});

// ============================================================================
// GET /api/auth/me - Retrieve current session profile
// ============================================================================
router.get('/me', (req, res) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided.'
            });
        }

        const user = userStore.verifySession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Session has expired or is invalid.'
            });
        }

        return res.status(200).json({
            success: true,
            user
        });
    } catch (err) {
        console.error('Auth /me error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify session.'
        });
    }
});

// ============================================================================
// POST /api/auth/logout - End active session
// ============================================================================
router.post('/logout', (req, res) => {
    try {
        const token = extractToken(req);
        if (token) {
            userStore.destroySession(token);
        }

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully.'
        });
    } catch (err) {
        console.error('Logout error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to logout.'
        });
    }
});

module.exports = router;