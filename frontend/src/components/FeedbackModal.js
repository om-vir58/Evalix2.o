// components/FeedbackModal.js
import React, { useState } from 'react';
import { FiX, FiStar, FiMessageSquare, FiSend, FiCheckCircle } from 'react-icons/fi';
import { submitFeedbackApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/FeedbackModal.scss';

const CATEGORIES = [
    { id: 'accuracy', label: 'Classification Accuracy' },
    { id: 'ui', label: 'User Interface / UX' },
    { id: 'features', label: 'Feature Request' },
    { id: 'performance', label: 'Performance / Speed' },
    { id: 'general', label: 'General Feedback' }
];

const FeedbackModal = ({ isOpen, onClose, currentDocument }) => {
    const { user } = useAuth();
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [category, setCategory] = useState('accuracy');
    const [subject, setSubject] = useState('');
    const [comments, setComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!comments.trim()) {
            setErrorMessage('Please share your thoughts or observations before submitting.');
            return;
        }

        try {
            setSubmitting(true);
            await submitFeedbackApi({
                rating,
                category,
                subject: subject.trim() || `${category.toUpperCase()} Feedback`,
                comments: comments.trim(),
                documentName: currentDocument?.filename || null,
                userName: user?.name,
                userEmail: user?.email
            });

            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setComments('');
                setSubject('');
                setRating(5);
                onClose();
            }, 1800);
        } catch (err) {
            console.error('Feedback submit failed:', err);
            setErrorMessage(err.response?.data?.message || 'Failed to submit feedback. Please check backend connection.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="evalix-feedback-backdrop" onClick={onClose}>
            <div className="evalix-feedback-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-row">
                    <div className="modal-title-wrap">
                        <div className="modal-icon-badge">
                            <FiMessageSquare />
                        </div>
                        <div>
                            <h3 className="modal-heading">Send Feedback</h3>
                            <p className="modal-sub">Help us refine Evalix 2.0's Bloom's Taxonomy engine</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <FiX />
                    </button>
                </div>

                {submitted ? (
                    <div className="feedback-success-state py-4 text-center">
                        <FiCheckCircle className="success-icon mb-3" />
                        <h4 className="success-title">Feedback Received!</h4>
                        <p className="success-sub">Thank you for helping us elevate the quality of Evalix 2.0.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="feedback-form">
                        {errorMessage && (
                            <div className="alert-feedback-error mb-3">
                                {errorMessage}
                            </div>
                        )}

                        {/* Star Rating */}
                        <div className="form-group mb-3">
                            <label className="form-label">How would you rate your experience?</label>
                            <div className="star-rating-row">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        className={`star-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                    >
                                        <FiStar />
                                    </button>
                                ))}
                                <span className="rating-desc ms-2">
                                    {rating === 5 && 'Outstanding'}
                                    {rating === 4 && 'Very Good'}
                                    {rating === 3 && 'Average'}
                                    {rating === 2 && 'Needs Improvement'}
                                    {rating === 1 && 'Poor'}
                                </span>
                            </div>
                        </div>

                        {/* Category selection */}
                        <div className="form-group mb-3">
                            <label className="form-label">Feedback Category</label>
                            <div className="category-chips-row">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        className={`category-chip ${category === cat.id ? 'selected' : ''}`}
                                        onClick={() => setCategory(cat.id)}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="form-group mb-3">
                            <label className="form-label">Subject (Optional)</label>
                            <input
                                type="text"
                                className="evalix-input"
                                placeholder="Brief summary of your feedback..."
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>

                        {/* Comments */}
                        <div className="form-group mb-3">
                            <label className="form-label">
                                Comments & Suggestions <span className="text-danger">*</span>
                            </label>
                            <textarea
                                rows={4}
                                className="evalix-input evalix-textarea"
                                placeholder="Describe your experience, inaccurate verb matches, or suggestions for improvements..."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                required
                            />
                        </div>

                        {currentDocument?.filename && (
                            <div className="document-context-note mb-3">
                                <span>Referenced Document: <strong>{currentDocument.filename}</strong></span>
                            </div>
                        )}

                        <div className="modal-actions-row">
                            <button
                                type="button"
                                className="btn-evalix-secondary"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-evalix-primary"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <FiSend className="me-2" />
                                        Submit Feedback
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
