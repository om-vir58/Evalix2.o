// server/utils/userStore.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Active sessions map (token -> { userId, email, expiresAt })
const loadSessions = () => {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
            const arr = JSON.parse(raw);
            return new Map(arr);
        }
    } catch (e) {
        console.error('Error loading sessions:', e);
    }
    return new Map();
};

const saveSessions = (sessionsMap) => {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const arr = Array.from(sessionsMap.entries());
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error saving sessions:', e);
    }
};

const activeSessions = loadSessions();

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

        const superSalt = crypto.randomBytes(16).toString('hex');
        const superHash = hashPassword('SuperAdmin@2026', superSalt);

        const defaultUsers = [
            {
                id: 'user_superadmin_01',
                email: 'admin@evalix.com',
                name: 'System Superadmin',
                role: 'Chief System Administrator',
                systemRole: 'superadmin',
                salt: superSalt,
                passwordHash: superHash,
                createdAt: new Date().toISOString()
            },
            {
                id: 'user_demo_01',
                email: 'demo@evalix.com',
                name: 'Demo Researcher',
                role: 'Senior NLP Researcher',
                systemRole: 'user',
                salt: demoSalt,
                passwordHash: demoHash,
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
 * Read all users from disk
 */
const getAllUsers = () => {
    ensureStore();
    try {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const users = JSON.parse(raw);
        // Ensure legacy user records have a systemRole
        return users.map(u => ({
            ...u,
            systemRole: u.systemRole || (u.email === 'admin@evalix.com' ? 'superadmin' : 'user')
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

const SUPERADMIN_SECRET = process.env.SUPERADMIN_SECRET || 'EVALIX_SUPERADMIN_SECRET_2026';

/**
 * Normalize system role (superadmin, admin, user)
 */
const normalizeSystemRole = (role) => {
    const r = (role || '').toLowerCase().trim();
    if (r === 'superadmin') return 'superadmin';
    if (r === 'admin') return 'admin';
    return 'user';
};

/**
 * Create and register a new user
 */
const createUser = ({ email, password, name, role, systemRole, adminSecret }) => {
    const users = getAllUsers();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        throw new Error('An account with this email already exists.');
    }

    // Determine systemRole
    let assignedSystemRole = 'user';
    if (adminSecret && adminSecret.trim() === SUPERADMIN_SECRET) {
        assignedSystemRole = 'superadmin';
    } else if (systemRole) {
        assignedSystemRole = normalizeSystemRole(systemRole);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const newUser = {
        id: `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        email: cleanEmail,
        name: name ? name.trim() : cleanEmail.split('@')[0],
        role: role ? role.trim() : 'Researcher / Analyst',
        systemRole: assignedSystemRole,
        salt,
        passwordHash,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    return sanitizeUser(newUser);
};

/**
 * Strip sensitive credentials from user object before sending to client
 */
const sanitizeUser = (user) => {
    if (!user) return null;
    const { salt, passwordHash, ...safeUser } = user;
    if (!safeUser.systemRole) {
        // Fallback default
        safeUser.systemRole = 'user';
    }
    return safeUser;
};

/**
 * Promote or update a user's system role
 */
const updateUserRole = (userId, newSystemRole) => {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('User not found.');
    }

    const validRole = normalizeSystemRole(newSystemRole);
    users[userIndex].systemRole = validRole;
    users[userIndex].updatedAt = new Date().toISOString();
    saveUsers(users);

    return sanitizeUser(users[userIndex]);
};

/**
 * Promote user with secret key
 */
const promoteUserWithSecret = (userId, secretKey) => {
    if (!secretKey || secretKey.trim() !== SUPERADMIN_SECRET) {
        throw new Error('Invalid secret seed key.');
    }
    return updateUserRole(userId, 'superadmin');
};

/**
 * Delete a user by ID
 */
const deleteUser = (userId) => {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
        throw new Error('User not found.');
    }
    if (user.systemRole === 'superadmin' && users.filter(u => u.systemRole === 'superadmin').length <= 1) {
        throw new Error('Cannot delete the last remaining superadmin account.');
    }
    const filtered = users.filter(u => u.id !== userId);
    saveUsers(filtered);
    return true;
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
    saveSessions(activeSessions);

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
        saveSessions(activeSessions);
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
        saveSessions(activeSessions);
    }
    return true;
};

module.exports = {
    getAllUsers,
    findUserByEmail,
    findUserById,
    verifyPassword,
    createUser,
    sanitizeUser,
    updateUserRole,
    promoteUserWithSecret,
    deleteUser,
    createSession,
    verifySession,
    destroySession,
    SUPERADMIN_SECRET
};
