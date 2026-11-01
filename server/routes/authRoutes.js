// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const userStore = require('../utils/userStore');
const captchaService = require('../utils/captchaService');
const emailService = require('../utils/emailService');

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
// GET /api/auth/captcha - Generate fresh visual CAPTCHA
// ============================================================================
router.get('/captcha', (req, res) => {
    try {
        const captcha = captchaService.createCaptcha(5);
        return res.status(200).json({
            success: true,
            captchaId: captcha.captchaId,
            svg: captcha.svg,
            expiresIn: captcha.expiresIn
        });
    } catch (err) {
        console.error('Captcha generation error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate CAPTCHA challenge.'
        });
    }
});

// ============================================================================
// POST /api/auth/signup - Register new user with CAPTCHA and email verification
// ============================================================================
const handleSignup = async (req, res) => {
    try {
        const { email, password, name, role, captchaId, captchaInput } = req.body;

        // 1. Validate CAPTCHA
        if (!captchaId || !captchaInput) {
            return res.status(400).json({
                success: false,
                message: 'Security CAPTCHA verification is required.'
            });
        }

        const isCaptchaValid = captchaService.verifyCaptcha(captchaId, captchaInput);
        if (!isCaptchaValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired CAPTCHA. Please enter the new characters displayed.'
            });
        }

        // 2. Validate input fields
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

        // 3. Check if user already exists
        const existing = userStore.findUserByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email address already exists.'
            });
        }

        // 4. Create unverified user and send 6-digit verification email
        const { user: newUser, verificationCode } = userStore.createUser({
            email,
            password,
            name,
            role
        });

        const emailResult = await emailService.sendVerificationEmail(
            newUser.email,
            newUser.name,
            verificationCode
        );

        return res.status(201).json({
            success: true,
            requiresEmailVerification: true,
            email: newUser.email,
            message: 'Account created! Please verify your email with the 6-digit code sent to your inbox.',
            user: newUser,
            devCode: emailResult.previewCode || null
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
// POST /api/auth/verify-email - Verify 6-digit email confirmation code
// ============================================================================
router.post('/verify-email', (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email address and 6-digit verification code are required.'
            });
        }

        const verificationResult = userStore.verifyEmailCode(email, code);

        if (!verificationResult.success) {
            return res.status(400).json({
                success: false,
                message: verificationResult.message
            });
        }

        // Generate active session on successful verification
        const token = userStore.createSession(verificationResult.user);

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully! Welcome to Evalix 2.0.',
            user: verificationResult.user,
            token
        });
    } catch (err) {
        console.error('Email verification error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during email verification.'
        });
    }
});

// ============================================================================
// POST /api/auth/resend-verification - Resend 6-digit verification code
// ============================================================================
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required.'
            });
        }

        const user = userStore.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address.'
            });
        }

        if (user.isEmailVerified) {
            return res.status(200).json({
                success: true,
                alreadyVerified: true,
                message: 'This email is already verified. You can sign in immediately.'
            });
        }

        const updated = userStore.setVerificationCode(email);
        const emailResult = await emailService.sendVerificationEmail(
            user.email,
            user.name,
            updated.code
        );

        return res.status(200).json({
            success: true,
            message: 'A new 6-digit verification code has been dispatched to your email.',
            devCode: emailResult.previewCode || null
        });
    } catch (err) {
        console.error('Resend verification error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to resend verification email.'
        });
    }
});

// ============================================================================
// POST /api/auth/login - Authenticate user with CAPTCHA & Email Verification
// ============================================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password, captchaId, captchaInput } = req.body;

        // 1. Validate CAPTCHA
        if (!captchaId || !captchaInput) {
            return res.status(400).json({
                success: false,
                message: 'Security CAPTCHA verification is required.'
            });
        }

        const isCaptchaValid = captchaService.verifyCaptcha(captchaId, captchaInput);
        if (!isCaptchaValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired CAPTCHA. Please enter the new characters displayed.'
            });
        }

        // 2. Validate credentials
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

        // 3. Check if email is verified
        if (user.isEmailVerified === false) {
            // Automatically refresh verification code and dispatch email
            const updated = userStore.setVerificationCode(user.email);
            const emailResult = await emailService.sendVerificationEmail(
                user.email,
                user.name,
                updated.code
            );

            return res.status(403).json({
                success: false,
                requiresEmailVerification: true,
                email: user.email,
                message: 'Your email address is not yet verified. A fresh 6-digit verification code has been sent.',
                devCode: emailResult.previewCode || null
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
