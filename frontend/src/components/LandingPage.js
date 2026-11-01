import React, { useState, useEffect } from 'react';

import {
  LuLayers,
  LuSparkles,
  LuArrowRight,
  LuLogIn,
  LuShieldCheck,
  LuCircleCheck,
  LuSun,
  LuMoon,
  LuMenu,
  LuX,
  LuMail,
  LuLock,
  LuUser,
  LuRefreshCw,
  LuKey,
  LuCheck
} from 'react-icons/lu';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  loginUser,
  signupUser,
  fetchCaptchaApi,
  verifyEmailApi,
  resendVerificationApi
} from '../services/api';

import '../styles/LandingPage.scss';

/**
 * LandingPage Component for Evalix 2.0
 *
 * Screen 1 of the app flow:
 * - Professional, modern, and aesthetically polished static landing page
 * - Features sticky glassmorphism navbar, hero copy, live metrics mockup, and minimal footer
 * - Contains connected authentication with CAPTCHA and Email Verification
 */
const LandingPage = () => {

  const navigate = useNavigate();
  const { login: setAuthUser } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Modal state: mode can be 'login' | 'signup' | 'verify'
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // CAPTCHA state
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Email verification state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState(null);

  // Status messages
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll detection for dynamic glassmorphism navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cooldown countdown timer for resending verification code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Theme toggle handler
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Fetch a fresh CAPTCHA challenge
  const loadCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const res = await fetchCaptchaApi();
      if (res.success) {
        setCaptchaData(res);
        setCaptchaInput('');
      }
    } catch (err) {
      console.error('Error fetching captcha:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  // Open authentication modal
  const openAuth = (mode = 'login') => {
    setAuthError('');
    setAuthSuccess('');
    setCaptchaInput('');
    setAuthModal({ isOpen: true, mode });
    if (mode === 'login' || mode === 'signup') {
      loadCaptcha();
    }
  };

  const closeAuth = () => {
    setAuthError('');
    setAuthSuccess('');
    setAuthModal({ ...authModal, isOpen: false });
  };

  // Handle Login & Signup submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!captchaInput.trim()) {
      setAuthError('Please enter the security CAPTCHA characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (authModal.mode === 'login') {
        const data = await loginUser(
          email,
          password,
          captchaData?.captchaId,
          captchaInput.trim()
        );

        if (data.requiresEmailVerification) {
          setVerificationEmail(data.email || email);
          if (data.devCode) setDevOtpHint(data.devCode);
          setAuthModal({ isOpen: true, mode: 'verify' });
          setAuthSuccess(data.message || 'Please verify your email before logging in.');
          setResendCooldown(30);
          return;
        }

        if (data.success) {
          setAuthUser(data.user, data.token);
          setAuthSuccess('Login successful! Entering dashboard...');
          setTimeout(() => {
            closeAuth();
            navigate('/upload');
          }, 400);
        } else {
          setAuthError(data.message || 'Invalid email or password.');
          loadCaptcha();
        }
      } else if (authModal.mode === 'signup') {
        const data = await signupUser(
          email,
          password,
          fullName,
          captchaData?.captchaId,
          captchaInput.trim()
        );

        if (data.requiresEmailVerification) {
          setVerificationEmail(data.email || email);
          if (data.devCode) setDevOtpHint(data.devCode);
          setAuthModal({ isOpen: true, mode: 'verify' });
          setAuthSuccess(data.message || 'Account created! Enter the 6-digit verification code sent to your email.');
          setResendCooldown(30);
          return;
        }

        if (data.success) {
          setAuthUser(data.user, data.token);
          setAuthSuccess('Account created! Entering dashboard...');
          setTimeout(() => {
            closeAuth();
            navigate('/upload');
          }, 400);
        } else {
          setAuthError(data.message || 'Unable to create account.');
          loadCaptcha();
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      const serverMsg = error.response?.data?.message || 'Unable to connect to the server. Please check backend connection.';
      setAuthError(serverMsg);
      loadCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Email Verification Code submission
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      setAuthError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await verifyEmailApi(verificationEmail, cleanCode);
      if (data.success) {
        setAuthUser(data.user, data.token);
        setAuthSuccess('Email verified successfully! Welcome to Evalix 2.0.');
        setTimeout(() => {
          closeAuth();
          navigate('/upload');
        }, 500);
      } else {
        setAuthError(data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      const serverMsg = error.response?.data?.message || 'Failed to verify code. Please check and try again.';
      setAuthError(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend verification email
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setAuthError('');
    setAuthSuccess('');
    try {
      const data = await resendVerificationApi(verificationEmail);
      if (data.success) {
        setAuthSuccess('A new 6-digit verification code has been dispatched.');
        if (data.devCode) setDevOtpHint(data.devCode);
        setResendCooldown(30);
      } else {
        setAuthError(data.message || 'Could not resend code.');
      }
    } catch (error) {
      const serverMsg = error.response?.data?.message || 'Failed to resend verification code.';
      setAuthError(serverMsg);
    }
  };

  return (
    <div
      className={`landing-page-root ${isDarkMode ? 'dark' : ''}`}
      data-bs-theme={isDarkMode ? 'dark' : 'light'}
    >

      <div className="grid-bg-overlay"></div>

      {/* Ambient background glow orbs */}
      <div className="glow-orb-1"></div>
      <div className="glow-orb-2"></div>

      {/* ===================================================================== */}
      {/* 1. NAVBAR (Sticky Top, Dynamic Glassmorphism on Scroll)               */}
      {/* ===================================================================== */}

      <header className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>

        <div className="container-xl px-4 mx-auto">

          <div className="d-flex align-items-center justify-content-between py-3">

            {/* Left: Brand Logo / Wordmark */}

            <div
              className="d-flex align-items-center gap-3 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >

              <div className="logo-icon">
                <LuLayers size={22} />
              </div>

              <div className="d-flex align-items-baseline gap-2">

                <span
                  className="fw-bold fs-4 tracking-tight"
                  style={{ letterSpacing: '-0.03em' }}
                >
                  Evalix
                </span>

                <span
                  className="badge rounded-pill px-2 py-1 text-xs fw-semibold"
                  style={{
                    backgroundColor: isDarkMode ? '#1e1b4b' : '#e0e7ff',
                    color: isDarkMode ? '#a5b4fc' : '#4338ca',
                    border: isDarkMode
                      ? '1px solid #3730a3'
                      : '1px solid #c7d2fe'
                  }}
                >
                  2.0
                </span>

              </div>

            </div>

            {/* Right: Actions (Theme Toggle, Login, Sign Up) */}

            <div className="d-none d-md-flex align-items-center gap-3">

              {/* Dark/Light Mode Toggle */}

              <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-link text-decoration-none p-2 rounded-3 text-secondary"
                aria-label="Toggle color theme"
              >
                {isDarkMode
                  ? <LuSun size={20} color="#f8fafc" />
                  : <LuMoon size={20} color="#334155" />
                }
              </button>

              <button
                type="button"
                onClick={() => openAuth('login')}
                className="btn-secondary-ghost text-sm"
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => openAuth('signup')}
                className="btn-primary-gradient text-sm"
              >
                Sign Up
              </button>

            </div>

            {/* Mobile Menu Button */}

            <div className="d-flex d-md-none align-items-center gap-2">

              <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-link text-secondary p-1"
              >
                {isDarkMode
                  ? <LuSun size={20} color="#f8fafc" />
                  : <LuMoon size={20} color="#334155" />
                }
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn btn-link text-secondary p-1"
              >
                {mobileMenuOpen
                  ? <LuX size={24} />
                  : <LuMenu size={24} />
                }
              </button>

            </div>

          </div>

          {/* Mobile Collapsed Menu */}

          {mobileMenuOpen && (
            <div
              className="d-md-none py-3 border-top"
              style={{
                borderColor: isDarkMode ? '#1e293b' : '#e2e8f0'
              }}
            >

              <div className="d-grid gap-2">

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuth('login');
                  }}
                  className="btn-secondary-ghost w-100"
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuth('signup');
                  }}
                  className="btn-primary-gradient w-100"
                >
                  Sign Up
                </button>

              </div>

            </div>
          )}

        </div>

      </header>

      {/* ===================================================================== */}
      {/* 2. HERO SECTION                                                       */}
      {/* ===================================================================== */}

      <main className="flex-grow-1 d-flex align-items-center justify-content-center py-5 position-relative">

        <div className="container-xl px-4">

          <div className="row align-items-center g-5">

            {/* Left Column */}

            <div className="col-12 col-lg-7 text-center text-lg-start">

              <div
                className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-4"
                style={{
                  backgroundColor: isDarkMode
                    ? 'rgba(30, 27, 75, 0.7)'
                    : '#eef2ff',
                  border: isDarkMode
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid #c7d2fe',
                  color: isDarkMode ? '#a5b4fc' : '#4f46e5',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <span
                  className="spinner-grow spinner-grow-sm"
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#6366f1'
                  }}
                ></span>

                <span>AI-Powered Evaluation Platform</span>

                <LuSparkles size={14} />

              </div>

              <h1
                className="display-4 fw-bolder tracking-tight mb-4"
                style={{ lineHeight: 1.15 }}
              >
                Next-Gen Evaluation.<br />

                <span className="gradient-text">
                  Driven by Precision AI.
                </span>

              </h1>

              <p
                className="lead mb-5"
                style={{
                  maxWidth: '600px',
                  margin: '0 auto 2rem auto',
                  fontSize: '1.15rem',
                  color: isDarkMode ? '#94a3b8' : '#475569'
                }}
              >
                Evalix 2.0 helps you evaluate, analyze, and improve with AI-driven precision — fast, accurate, and effortless.
              </p>

              <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start gap-3 mb-4">

                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="btn-primary-gradient"
                >
                  <span>Get Started</span>
                  <LuArrowRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="btn-secondary-ghost"
                >
                  <LuLogIn size={18} />
                  <span>Login</span>
                </button>

              </div>

              <div
                className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start gap-4 text-xs mt-3"
                style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
              >

                <div className="d-flex align-items-center gap-1.5">
                  <LuCircleCheck size={16} color="#10b981" />
                  <span>Bloom's Taxonomy Framework</span>
                </div>

                <div className="d-flex align-items-center gap-1.5">
                  <LuCircleCheck size={16} color="#10b981" />
                  <span>Semantic Vector Embeddings</span>
                </div>

                <div className="d-flex align-items-center gap-1.5">
                  <LuCircleCheck size={16} color="#10b981" />
                  <span>Instant Excel Audit Reports</span>
                </div>

              </div>

            </div>

            {/* Right Column */}

            <div className="col-12 col-lg-5">

              <div className="mockup-card-wrapper">

                <div className="mockup-card">

                  <div
                    className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom"
                    style={{
                      borderColor: isDarkMode ? '#1e293b' : '#f1f5f9'
                    }}
                  >

                    <div className="d-flex align-items-center gap-1.5">

                      <span
                        className="rounded-circle d-inline-block"
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: '#ef4444'
                        }}
                      ></span>

                      <span
                        className="rounded-circle d-inline-block"
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: '#f59e0b'
                        }}
                      ></span>

                      <span
                        className="rounded-circle d-inline-block"
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: '#10b981'
                        }}
                      ></span>

                      <span
                        className="ms-2 font-monospace text-xs"
                        style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                      >
                        research_paper_analysis.pdf
                      </span>

                    </div>

                    <span
                      className="badge rounded-pill px-2.5 py-1 text-xs"
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                        color: isDarkMode ? '#34d399' : '#059669',
                        border: isDarkMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #a7f3d0'
                      }}
                    >
                      ● Analyzed
                    </span>

                  </div>

                  <div className="row g-2 mb-4">

                    <div className="col-4">
                      <div className="stat-card-item">
                        <span
                          className="d-block"
                          style={{
                            fontSize: '0.7rem',
                            color: isDarkMode ? '#94a3b8' : '#64748b'
                          }}
                        >
                          Total Verbs
                        </span>

                        <span className="fw-bold fs-6">
                          1,428
                        </span>
                      </div>
                    </div>

                    <div className="col-4">
                      <div className="stat-card-item">
                        <span
                          className="d-block"
                          style={{
                            fontSize: '0.7rem',
                            color: isDarkMode ? '#94a3b8' : '#64748b'
                          }}
                        >
                          Top Domain
                        </span>

                        <span
                          className="fw-bold fs-6"
                          style={{ color: isDarkMode ? '#818cf8' : '#4f46e5' }}
                        >
                          Cognitive
                        </span>
                      </div>
                    </div>

                    <div className="col-4">
                      <div className="stat-card-item">
                        <span
                          className="d-block"
                          style={{
                            fontSize: '0.7rem',
                            color: isDarkMode ? '#94a3b8' : '#64748b'
                          }}
                        >
                          Accuracy
                        </span>

                        <span
                          className="fw-bold fs-6"
                          style={{ color: isDarkMode ? '#34d399' : '#059669' }}
                        >
                          96.8%
                        </span>
                      </div>
                    </div>

                  </div>

                  <div className="mb-4">

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span
                        className="text-xs fw-semibold"
                        style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}
                      >
                        Taxonomy Distribution
                      </span>

                      <span
                        className="text-xs"
                        style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                      >
                        Weights
                      </span>
                    </div>

                    <div className="mb-2.5">

                      <div
                        className="d-flex justify-content-between text-xs mb-1"
                        style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}
                      >
                        <span>Cognitive (Analysis & Evaluation)</span>
                        <span className="fw-semibold">68%</span>
                      </div>

                      <div className="progress progress-track">
                        <div
                          className="progress-bar"
                          style={{
                            width: '68%',
                            backgroundColor: '#6366f1'
                          }}
                        ></div>
                      </div>

                    </div>

                    <div className="mb-2.5">

                      <div
                        className="d-flex justify-content-between text-xs mb-1"
                        style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}
                      >
                        <span>Affective (Valuing)</span>
                        <span className="fw-semibold">21%</span>
                      </div>

                      <div className="progress progress-track">
                        <div
                          className="progress-bar"
                          style={{
                            width: '21%',
                            backgroundColor: '#a855f7'
                          }}
                        ></div>
                      </div>

                    </div>

                    <div>

                      <div
                        className="d-flex justify-content-between text-xs mb-1"
                        style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}
                      >
                        <span>Psychomotor (Origination)</span>
                        <span className="fw-semibold">11%</span>
                      </div>

                      <div className="progress progress-track">
                        <div
                          className="progress-bar"
                          style={{
                            width: '11%',
                            backgroundColor: '#06b6d4'
                          }}
                        ></div>
                      </div>

                    </div>

                  </div>

                  <div
                    className="pt-3 border-top"
                    style={{
                      borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                      paddingBottom: '12px'
                    }}
                  >

                    <span
                      className="d-block text-xs mb-2"
                      style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                    >
                      Detected Action Verbs
                    </span>

                    <div className="d-flex flex-wrap gap-1.5 pe-sm-4">

                      <span className="verb-pill primary">
                        synthesize
                      </span>

                      <span className="verb-pill primary">
                        critique
                      </span>

                      <span className="verb-pill primary">
                        formulate
                      </span>

                      <span className="verb-pill secondary">
                        demonstrate
                      </span>

                      <span className="verb-pill secondary">
                        optimize
                      </span>

                    </div>

                  </div>

                </div>

                {/* Micro Badge floating cleanly outside card overflow */}
                <div className="floating-badge">

                  <LuShieldCheck color="#10b981" size={18} />

                  <span className="text-xs fw-semibold">
                    AI Confidence: High
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ===================================================================== */}
      {/* 3. FOOTER                                                            */}
      {/* ===================================================================== */}

      <footer
        className="py-4 border-top"
        style={{
          borderColor: isDarkMode ? '#1e293b' : '#e2e8f0'
        }}
      >

        <div className="container-xl px-4">

          <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 text-secondary text-xs">

            <div>
              <span>© 2026 Evalix 2.0. All rights reserved.</span>
            </div>

            <nav className="d-flex align-items-center gap-4">

              <a
                href="#privacy"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Placeholder: Privacy Policy');
                }}
                className="text-secondary text-decoration-none"
              >
                Privacy
              </a>

              <a
                href="#terms"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Placeholder: Terms of Service');
                }}
                className="text-secondary text-decoration-none"
              >
                Terms
              </a>

              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Placeholder: Contact Support');
                }}
                className="text-secondary text-decoration-none"
              >
                Contact
              </a>

            </nav>

          </div>

        </div>

      </footer>

      {/* ===================================================================== */}
      {/* 4. AUTH MODAL (Login / Signup / Email Verification)                  */}
      {/* ===================================================================== */}

      {authModal.isOpen && (

        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 1050
          }}
          onClick={closeAuth}
        >

          <div
            className="p-4 p-sm-5 rounded-4 position-relative"
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              border: isDarkMode
                ? '1px solid #1e293b'
                : '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
            }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Close Button */}

            <button
              type="button"
              onClick={closeAuth}
              className="btn btn-link position-absolute top-0 end-0 p-3 text-secondary text-decoration-none"
            >
              <LuX size={20} />
            </button>

            {/* Modal Header */}

            <div className="text-center mb-4">

              <h3 className="fw-bold mb-1">
                {authModal.mode === 'verify'
                  ? 'Verify Your Email'
                  : authModal.mode === 'signup'
                    ? 'Create Evalix Account'
                    : 'Welcome to Evalix 2.0'}
              </h3>

              <p className="text-secondary text-sm mb-0">
                {authModal.mode === 'verify'
                  ? `Enter the 6-digit confirmation code sent to ${verificationEmail}`
                  : authModal.mode === 'signup'
                    ? 'Start evaluating documents with precision AI'
                    : 'Sign in to access your evaluations and reports'}
              </p>

            </div>

            {/* Error or Success feedback alert */}
            {authError && (
              <div className="alert alert-danger py-2 px-3 text-xs mb-3 rounded-3" role="alert">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div className="alert alert-success py-2 px-3 text-xs mb-3 rounded-3" role="alert">
                {authSuccess}
              </div>
            )}

            {/* =============================================================== */}
            {/* EMAIL VERIFICATION STEP                                         */}
            {/* =============================================================== */}
            {authModal.mode === 'verify' ? (
              <form onSubmit={handleVerifySubmit}>

                <div className="mb-3 text-center">
                  <label className="form-label text-xs fw-semibold mb-2">
                    6-Digit Verification Code
                  </label>

                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="••••••"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className={`form-control verification-code-input ${isDarkMode ? 'bg-dark text-white' : ''}`}
                    style={{
                      borderColor: isDarkMode ? '#334155' : '#cbd5e1'
                    }}
                  />
                </div>

                {/* Dev Mode OTP auto-fill chip if available */}
                {devOtpHint && (
                  <div className="text-center mb-3">
                    <button
                      type="button"
                      className="dev-code-chip"
                      onClick={() => setVerificationCode(devOtpHint)}
                      title="Click to paste test code"
                    >
                      <LuKey size={13} />
                      <span>Test Code: <strong>{devOtpHint}</strong> (Click to paste)</span>
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || verificationCode.trim().length !== 6}
                  className="btn-primary-gradient w-100 py-2.5 mb-3"
                >
                  <LuCheck size={18} />
                  <span>{isSubmitting ? 'Verifying...' : 'Verify Email & Continue'}</span>
                </button>

                {/* Resend and Return options */}
                <div className="d-flex align-items-center justify-content-between text-xs text-secondary pt-2 border-top" style={{ borderColor: isDarkMode ? '#1e293b' : '#f1f5f9' }}>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={handleResendCode}
                    className="btn btn-link p-0 text-xs text-primary fw-semibold text-decoration-none"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthSuccess('');
                      openAuth('login');
                    }}
                    className="btn btn-link p-0 text-xs text-secondary text-decoration-none"
                  >
                    Back to Login
                  </button>
                </div>

              </form>
            ) : (
              /* =============================================================== */
              /* LOGIN & SIGNUP FORMS WITH CAPTCHA                               */
              /* =============================================================== */
              <form onSubmit={handleAuthSubmit}>

                {authModal.mode === 'signup' && (
                  <div className="mb-3">
                    <label className="form-label text-xs fw-semibold">
                      Full Name
                    </label>
                    <div className="input-group">
                      <span
                        className="input-group-text bg-transparent border-end-0 text-secondary"
                        style={{
                          borderColor: isDarkMode ? '#334155' : '#cbd5e1'
                        }}
                      >
                        <LuUser size={16} />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Jane Smith"
                        className={`form-control border-start-0 ${isDarkMode ? 'bg-dark text-white' : ''}`}
                        style={{
                          borderColor: isDarkMode ? '#334155' : '#cbd5e1'
                        }}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">

                  <label className="form-label text-xs fw-semibold">
                    Email Address
                  </label>

                  <div className="input-group">

                    <span
                      className="input-group-text bg-transparent border-end-0 text-secondary"
                      style={{
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1'
                      }}
                    >
                      <LuMail size={16} />
                    </span>

                    <input
                      type="email"
                      required
                      placeholder="you@institution.edu"
                      className={`form-control border-start-0 ${isDarkMode ? 'bg-dark text-white' : ''}`}
                      style={{
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1'
                      }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                  </div>

                </div>

                <div className="mb-3">

                  <label className="form-label text-xs fw-semibold">
                    Password
                  </label>

                  <div className="input-group">

                    <span
                      className="input-group-text bg-transparent border-end-0 text-secondary"
                      style={{
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1'
                      }}
                    >
                      <LuLock size={16} />
                    </span>

                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      className={`form-control border-start-0 ${isDarkMode ? 'bg-dark text-white' : ''}`}
                      style={{
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1'
                      }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                  </div>

                </div>

                {/* VISUAL CAPTCHA SECTION */}
                <div className="captcha-wrapper">
                  <div className="d-flex align-items-center justify-content-between mb-1.5">
                    <label className="form-label text-xs fw-semibold mb-0 d-flex align-items-center gap-1.5">
                      <LuShieldCheck size={14} color="#6366f1" />
                      <span>Security Verification</span>
                    </label>
                    <span className="text-secondary text-xs" style={{ fontSize: '0.7rem' }}>
                      Case-insensitive
                    </span>
                  </div>

                  <div className="captcha-preview-row">
                    <div className="captcha-svg-container">
                      {captchaData?.svg ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: captchaData.svg }}
                        />
                      ) : (
                        <span className="text-xs text-secondary py-2">
                          {captchaLoading ? 'Generating challenge...' : 'Loading CAPTCHA...'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={loadCaptcha}
                      disabled={captchaLoading}
                      title="Load a new CAPTCHA"
                      className={`btn-captcha-refresh ${captchaLoading ? 'spinning' : ''}`}
                      aria-label="Refresh CAPTCHA"
                    >
                      <LuRefreshCw size={18} />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Enter characters displayed above"
                    className={`form-control text-center font-monospace fw-bold text-uppercase ${isDarkMode ? 'bg-dark text-white' : ''}`}
                    style={{
                      borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                      letterSpacing: '4px',
                      fontSize: '0.95rem'
                    }}
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !captchaInput.trim()}
                  className="btn-primary-gradient w-100 py-2.5"
                >
                  {isSubmitting
                    ? 'Please wait...'
                    : authModal.mode === 'signup'
                      ? 'Create Account'
                      : 'Sign In'
                  }
                </button>

              </form>
            )}

            {/* Mode switch for Login / Signup */}
            {authModal.mode !== 'verify' && (
              <div className="text-center mt-3">
                {authModal.mode === 'login' ? (
                  <p className="text-xs text-secondary mb-0">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError('');
                        setAuthSuccess('');
                        openAuth('signup');
                      }}
                      className="btn btn-link p-0 text-xs text-primary fw-semibold text-decoration-none"
                    >
                      Sign Up
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-secondary mb-0">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError('');
                        setAuthSuccess('');
                        openAuth('login');
                      }}
                      className="btn btn-link p-0 text-xs text-primary fw-semibold text-decoration-none"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            )}

            {authModal.mode === 'login' && (
              <div
                className="mt-4 p-2.5 rounded-3 text-center"
                style={{
                  backgroundColor: isDarkMode
                    ? 'rgba(30, 27, 75, 0.4)'
                    : '#eef2ff',
                  border: isDarkMode
                    ? '1px solid rgba(99, 102, 241, 0.2)'
                    : '1px solid #c7d2fe',
                  fontSize: '0.75rem',
                  color: isDarkMode ? '#a5b4fc' : '#4338ca'
                }}
              >
                💡 <strong>Demo Login:</strong> demo@evalix.com / EvalixDemo123 (or register any new email).
              </div>
            )}

          </div>

        </div>

      )}

    </div>
  );
};

export default LandingPage;
