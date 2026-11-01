// server/utils/captchaService.js
const crypto = require('crypto');

// Map of active CAPTCHA challenges: id -> { code, expiresAt }
const captchaStore = new Map();

// Characters that avoid visual ambiguity (no 0/O, 1/I/l)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Palette of readable, high-contrast colors for glyphs
const GLYPH_COLORS = [
    '#4338ca', '#3730a3', '#1e40af', '#0369a1',
    '#047857', '#0f766e', '#b45309', '#c2410c',
    '#6d28d9', '#7e22ce', '#be123c', '#0f172a'
];

const LINE_COLORS = [
    'rgba(99, 102, 241, 0.45)',
    'rgba(16, 185, 129, 0.45)',
    'rgba(245, 158, 11, 0.45)',
    'rgba(239, 68, 68, 0.35)',
    'rgba(168, 85, 247, 0.4)'
];

// Clean expired captchas every 5 minutes
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, data] of captchaStore.entries()) {
        if (data.expiresAt < now) {
            captchaStore.delete(id);
        }
    }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) {
    cleanupTimer.unref();
}

/**
 * Generate a random string from the safe character set
 */
const generateRandomCode = (length = 5) => {
    let result = '';
    for (let i = 0; i < length; i++) {
        const idx = crypto.randomInt(0, CHARS.length);
        result += CHARS[idx];
    }
    return result;
};

/**
 * Generate an SVG string with noise lines, dots, and rotated glyphs
 */
const generateCaptchaSvg = (text, width = 180, height = 52) => {
    // Generate noise lines
    let noiseLines = '';
    const lineCount = 4;
    for (let i = 0; i < lineCount; i++) {
        const x1 = crypto.randomInt(0, Math.floor(width * 0.3));
        const y1 = crypto.randomInt(5, height - 5);
        const x2 = crypto.randomInt(Math.floor(width * 0.7), width);
        const y2 = crypto.randomInt(5, height - 5);
        const cx1 = crypto.randomInt(20, width - 20);
        const cy1 = crypto.randomInt(0, height);
        const color = LINE_COLORS[crypto.randomInt(0, LINE_COLORS.length)];
        const strokeWidth = (Math.random() * 1.5 + 1).toFixed(1);
        noiseLines += `<path d="M${x1},${y1} Q${cx1},${cy1} ${x2},${y2}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>`;
    }

    // Generate noise dots
    let noiseDots = '';
    const dotCount = 28;
    for (let i = 0; i < dotCount; i++) {
        const cx = crypto.randomInt(5, width - 5);
        const cy = crypto.randomInt(5, height - 5);
        const r = (Math.random() * 2 + 0.8).toFixed(1);
        const color = LINE_COLORS[crypto.randomInt(0, LINE_COLORS.length)];
        noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`;
    }

    // Render characters
    const charSpacing = width / (text.length + 1);
    let glyphs = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const x = Math.floor(charSpacing * (i + 0.6) + crypto.randomInt(-3, 3));
        const y = Math.floor(height / 2 + crypto.randomInt(6, 12));
        const rotate = crypto.randomInt(-22, 22);
        const fontSize = crypto.randomInt(24, 28);
        const color = GLYPH_COLORS[crypto.randomInt(0, GLYPH_COLORS.length)];

        glyphs += `
            <text
                x="${x}"
                y="${y}"
                font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                font-size="${fontSize}"
                font-weight="700"
                letter-spacing="2"
                fill="${color}"
                transform="rotate(${rotate}, ${x}, ${y})"
                style="user-select: none;"
            >${char}</text>
        `;
    }

    // Background gradient
    const bgGradientId = `capBg_${crypto.randomBytes(4).toString('hex')}`;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="border-radius: 8px; display: block;">
  <defs>
    <linearGradient id="${bgGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="50%" stop-color="#f1f5f9" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="8" fill="url(#${bgGradientId})" stroke="#cbd5e1" stroke-width="1"/>
  ${noiseLines}
  ${noiseDots}
  ${glyphs}
</svg>`.trim();

    return svg;
};

/**
 * Create a new CAPTCHA challenge
 */
const createCaptcha = (length = 5) => {
    const code = generateRandomCode(length);
    const captchaId = `cap_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    captchaStore.set(captchaId, {
        code: code.toUpperCase(),
        expiresAt
    });

    const svg = generateCaptchaSvg(code);

    return {
        captchaId,
        svg,
        expiresIn: 300 // seconds
    };
};

/**
 * Verify user input against stored CAPTCHA
 * Automatically consumes the captcha token (one-time use)
 */
const verifyCaptcha = (captchaId, userInput) => {
    if (!captchaId || !userInput) {
        return false;
    }

    const entry = captchaStore.get(captchaId);
    if (!entry) {
        return false;
    }

    // Consume the CAPTCHA immediately to prevent replay
    captchaStore.delete(captchaId);

    if (Date.now() > entry.expiresAt) {
        return false;
    }

    return entry.code === userInput.trim().toUpperCase();
};

module.exports = {
    createCaptcha,
    verifyCaptcha
};
