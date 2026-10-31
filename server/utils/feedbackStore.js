// server/utils/feedbackStore.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacks.json');

const ensureFeedbackStore = () => {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(FEEDBACKS_FILE)) {
        const seedFeedback = [
            {
                id: 'fb_seed_01',
                userId: 'user_demo_01',
                userName: 'Demo Researcher',
                userEmail: 'demo@evalix.com',
                rating: 5,
                category: 'accuracy',
                subject: 'Excellent Bloom\'s Taxonomy mapping',
                comments: 'The cosine similarity accurately classified complex research action verbs.',
                documentName: 'Sample_Research_Paper.pdf',
                status: 'reviewed',
                createdAt: new Date().toISOString()
            }
        ];
        fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(seedFeedback, null, 2), 'utf-8');
    }
};

const getAllFeedback = () => {
    ensureFeedbackStore();
    try {
        const raw = fs.readFileSync(FEEDBACKS_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading feedback store:', err);
        return [];
    }
};

const saveFeedbackList = (feedbacks) => {
    ensureFeedbackStore();
    fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8');
};

const addFeedback = ({ userId, userName, userEmail, rating, category, subject, comments, documentName }) => {
    const list = getAllFeedback();

    const newFeedback = {
        id: `fb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        userId: userId || 'anonymous',
        userName: userName || 'Anonymous User',
        userEmail: userEmail || 'unknown@evalix.com',
        rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)),
        category: category || 'general',
        subject: subject ? subject.trim() : 'User Feedback',
        comments: comments ? comments.trim() : '',
        documentName: documentName || null,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    list.unshift(newFeedback);
    saveFeedbackList(list);
    return newFeedback;
};

const updateFeedbackStatus = (id, status) => {
    const list = getAllFeedback();
    const index = list.findIndex(f => f.id === id);
    if (index === -1) {
        throw new Error('Feedback not found');
    }
    list[index].status = status;
    list[index].updatedAt = new Date().toISOString();
    saveFeedbackList(list);
    return list[index];
};

const deleteFeedback = (id) => {
    const list = getAllFeedback();
    const filtered = list.filter(f => f.id !== id);
    saveFeedbackList(filtered);
    return true;
};

module.exports = {
    getAllFeedback,
    addFeedback,
    updateFeedbackStatus,
    deleteFeedback
};
