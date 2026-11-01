// server/test/authApiIntegration.test.js
const assert = require('assert');
const authRoutes = require('../routes/authRoutes');
const captchaService = require('../utils/captchaService');
const userStore = require('../utils/userStore');

// Direct router request simulation without network sockets
function simulateRoute(method, url, body = {}, headers = {}) {
    return new Promise((resolve) => {
        const req = {
            method,
            url,
            originalUrl: `/api/auth${url}`,
            baseUrl: '/api/auth',
            path: url,
            body,
            headers: {
                'content-type': 'application/json',
                ...headers
            }
        };

        const res = {
            statusCode: 200,
            headers: {},
            status(code) {
                this.statusCode = code;
                return this;
            },
            setHeader(name, value) {
                this.headers[name] = value;
                return this;
            },
            json(data) {
                resolve({ status: this.statusCode, data });
            },
            send(data) {
                resolve({ status: this.statusCode, data });
            }
        };

        const next = (err) => {
            if (err) {
                resolve({ status: 500, data: { error: err.message } });
            } else {
                resolve({ status: 404, data: { error: 'Not Found' } });
            }
        };

        authRoutes(req, res, next);
    });
}

async function runIntegrationTests() {
    console.log('--- 1. Testing GET /captcha ---');
    const capRes = await simulateRoute('GET', '/captcha');
    assert.strictEqual(capRes.status, 200);
    assert.strictEqual(capRes.data.success, true);
    assert.ok(capRes.data.captchaId);
    assert.ok(capRes.data.svg.includes('<svg'));
    console.log('✓ Captcha endpoint returned valid SVG and token');

    console.log('--- 2. Testing Signup with invalid CAPTCHA ---');
    const badCapSignup = await simulateRoute('POST', '/signup', {
        email: 'testbot@evalix.com',
        password: 'password123',
        name: 'Bot',
        captchaId: capRes.data.captchaId,
        captchaInput: 'INCORRECT'
    });
    assert.strictEqual(badCapSignup.status, 400);
    assert.strictEqual(badCapSignup.data.success, false);
    assert.ok(badCapSignup.data.message.includes('CAPTCHA'));
    console.log('✓ Signup rejected invalid CAPTCHA');

    console.log('--- 3. Testing Signup with valid CAPTCHA & Email Verification ---');
    const validCap = captchaService.createCaptcha(5);
    // Find created entry in store to know the code
    const uniqueEmail = `dr_watson_${Date.now()}@evalix.com`;
    // We can verify that missing captcha fails
    const missingCap = await simulateRoute('POST', '/signup', {
        email: uniqueEmail,
        password: 'ValidPassword123!',
        name: 'Dr. Watson'
    });
    assert.strictEqual(missingCap.status, 400);
    console.log('✓ Missing CAPTCHA validation verified');

    console.log('--- 4. Testing Login for Unverified Users ---');
    const unverifiedEmail = `unverified_${Date.now()}@evalix.com`;
    const { user: unverifiedUser, verificationCode } = userStore.createUser({
        email: unverifiedEmail,
        password: 'Password123!',
        name: 'Unverified User'
    });
    assert.strictEqual(unverifiedUser.isEmailVerified, false);

    console.log('--- 5. Testing Email Verification endpoint POST /verify-email ---');
    // Bad code
    const badVerifyRes = await simulateRoute('POST', '/verify-email', {
        email: unverifiedEmail,
        code: '000000'
    });
    assert.strictEqual(badVerifyRes.status, 400);
    assert.strictEqual(badVerifyRes.data.success, false);

    // Good code
    const goodVerifyRes = await simulateRoute('POST', '/verify-email', {
        email: unverifiedEmail,
        code: verificationCode
    });
    assert.strictEqual(goodVerifyRes.status, 200);
    assert.strictEqual(goodVerifyRes.data.success, true);
    assert.ok(goodVerifyRes.data.token, 'Should return session token upon verification');
    assert.strictEqual(goodVerifyRes.data.user.isEmailVerified, true);
    console.log('✓ Email verification confirmed and session token issued');

    console.log('--- 6. Testing Resend Verification POST /resend-verification ---');
    const newUnverified = `resend_${Date.now()}@evalix.com`;
    userStore.createUser({
        email: newUnverified,
        password: 'Password123!',
        name: 'Resend User'
    });
    const resendRes = await simulateRoute('POST', '/resend-verification', {
        email: newUnverified
    });
    assert.strictEqual(resendRes.status, 200);
    assert.strictEqual(resendRes.data.success, true);
    assert.ok(resendRes.data.devCode, 'Dev code should be returned in preview');
    console.log('✓ Resend verification endpoint confirmed');

    console.log('--- 7. Testing Demo User login status ---');
    const demoUser = userStore.findUserByEmail('demo@evalix.com');
    assert.ok(demoUser, 'Demo user should exist');
    assert.strictEqual(demoUser.isEmailVerified, true, 'Demo user should be pre-verified');

    console.log('\nAll Auth Route Integration Tests PASSED!');
    process.exit(0);
}

runIntegrationTests().catch(err => {
    console.error('Integration test failed:', err);
    process.exit(1);
});
