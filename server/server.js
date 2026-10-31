const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const paperRoutes = require('./routes/paperRoutes');
const authRoutes = require('./routes/authRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const adminRoutes = require('./routes/adminRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create required directories
const fs = require('fs');

const directories = ['./uploads', './cache', './reports', './data'];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Routes
app.use('/api/papers', paperRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);

    const isValidationError =
        err.message &&
        (
            err.message.includes('Invalid file type') ||
            err.message.includes('file size')
        );

    const statusCode = isValidationError ? 400 : 500;

    res.status(statusCode).json({
        success: false,
        error: err.message || 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});