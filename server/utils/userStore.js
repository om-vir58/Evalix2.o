// server/utils/userStore.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// In-memory active session tokens map (token -> { userId, email, expiresAt })
const activeSessions = new Map();

/**
 * Ensure data directory and users.json file exist with demo user seeded
 */
const ensureStore = () => {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(USERS_FILE)) {
        const demoSalt = crypto.randomBytes(16).toString('hex');
        const demoHash = hashPassword('EvalixDemo123', demoSalt);

        const defaultUsers = [
            {
                id: 'user_demo_01',
                email: 'demo@evalix.com',
                name: 'Demo Researcher',
                role: 'Senior NLP Researcher',
                salt: demoSalt,
                passwordHash: demoHash,
                isEmailVerified: true,
                createdAt: new Date().toISOString()
            }
        ];

        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    }
};

/**
 * Hash a password with PBKDF2 and salt
 */
const hashPassword = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

/**
 * Generate a 6-digit verification numeric code
 */
const generateVerificationCode = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Read all users from disk, ensuring legacy users have isEmailVerified default to true
 */
const getAllUsers = () => {
    ensureStore();
    try {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const users = JSON.parse(raw);
        return users.map(user => ({
            ...user,
            isEmailVerified: user.isEmailVerified !== undefined ? user.isEmailVerified : true
        }));
    } catch (err) {
        console.error('Error reading users store:', err);
        return [];
    }
};

/**
 * Write users to disk safely
 */
const saveUsers = (users) => {
    ensureStore();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
};

/**
 * Find user by email (case-insensitive)
 */
const findUserByEmail = (email) => {
    if (!email) return null;
    const users = getAllUsers();
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
};

/**
 * Find user by ID
 */
const findUserById = (id) => {
    if (!id) return null;
    const users = getAllUsers();
    return users.find(u => u.id === id) || null;
};

/**
 * Verify user password
 */
const verifyPassword = (user, password) => {
    if (!user || !user.salt || !user.passwordHash || !password) return false;
    const hash = hashPassword(password, user.salt);
    return hash === user.passwordHash;
};

/**
 * Create and register a new user (unverified by default)
 */
const createUser = ({ email, password, name, role, verificationCode }) => {
    const users = getAllUsers();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        throw new Error('An account with this email already exists.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const code = verificationCode || generateVerificationCode();
    const verificationExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const newUser = {
        id: `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        email: cleanEmail,
        name: name ? name.trim() : cleanEmail.split('@')[0],
        role: role ? role.trim() : 'Researcher / Analyst',
        salt,
        passwordHash,
        isEmailVerified: false,
        verificationCode: code,
        verificationExpiresAt,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    return {
        user: sanitizeUser(newUser),
        verificationCode: code
    };
};

/**
 * Set a new verification code for an existing user (e.g. resend)
 */
const setVerificationCode = (email, customCode = null, expiryMinutes = 15) => {
    const users = getAllUsers();
    const cleanEmail = email.trim().toLowerCase();
    const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (idx === -1) {
        return null;
    }

    const code = customCode || generateVerificationCode();
    const verificationExpiresAt = Date.now() + expiryMinutes * 60 * 1000;

    users[idx].verificationCode = code;
    users[idx].verificationExpiresAt = verificationExpiresAt;

    saveUsers(users);
    return { user: sanitizeUser(users[idx]), code };
};

/**
 * Verify an email code
 */
const verifyEmailCode = (email, inputCode) => {
    const users = getAllUsers();
    const cleanEmail = email.trim().toLowerCase();
    const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (idx === -1) {
        return { success: false, message: 'User not found.' };
    }

    const user = users[idx];

    if (user.isEmailVerified) {
        return {
            success: true,
            message: 'Email is already verified.',
            user: sanitizeUser(user)
        };
    }

    if (!user.verificationCode || !inputCode) {
        return { success: false, message: 'Invalid or missing verification code.' };
    }

    if (Date.now() > (user.verificationExpiresAt || 0)) {
        return { success: false, message: 'Verification code has expired. Please request a new one.' };
    }

    if (user.verificationCode.toString().trim() !== inputCode.toString().trim()) {
        return { success: false, message: 'Incorrect verification code. Please check and try again.' };
    }

    // Mark as verified
    users[idx].isEmailVerified = true;
    users[idx].verificationCode = null;
    users[idx].verificationExpiresAt = null;

    saveUsers(users);

    return {
        success: true,
        message: 'Email successfully verified!',
        user: sanitizeUser(users[idx])
    };
};

/**
 * Strip sensitive credentials from user object before sending to client
 */
const sanitizeUser = (user) => {
    if (!user) return null;
    const { salt, passwordHash, verificationCode, verificationExpiresAt, ...safeUser } = user;
    return safeUser;
};

/**
 * Create a session token for a user
 */
const createSession = (user) => {
    const token = `evalix_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    activeSessions.set(token, {
        userId: user.id,
        email: user.email,
        expiresAt
    });

    return token;
};

/**
 * Verify session token and retrieve user
 */
const verifySession = (token) => {
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
        activeSessions.delete(token);
        return null;
    }

    const user = findUserById(session.userId);
    return sanitizeUser(user);
};

/**
 * End a session
 */
const destroySession = (token) => {
    if (token) {
        activeSessions.delete(token);
    }
    return true;
};

module.exports = {
    getAllUsers,
    findUserByEmail,
    findUserById,
    verifyPassword,
    createUser,
    setVerificationCode,
    verifyEmailCode,
    generateVerificationCode,
    sanitizeUser,
    createSession,
    verifySession,
    destroySession
};
