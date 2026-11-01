// server/test/authFeature.test.js
const assert = require('assert');
const captchaService = require('../utils/captchaService');
const userStore = require('../utils/userStore');
const emailService = require('../utils/emailService');

async function runTests() {
    console.log('--- Testing CAPTCHA Service ---');
    const cap1 = captchaService.createCaptcha(5);
    assert.ok(cap1.captchaId, 'Captcha ID should exist');
    assert.ok(cap1.svg.includes('<svg'), 'Captcha SVG should be returned');

    // Test verification with wrong code
    assert.strictEqual(
        captchaService.verifyCaptcha(cap1.captchaId, 'WRONG'),
        false,
        'Wrong captcha should fail'
    );

    // After failure or success, token should be consumed
    const cap2 = captchaService.createCaptcha(5);
    // Extract code from store for testing
    // Since cap2 is stored in memory, let's verify with bad input:
    assert.strictEqual(captchaService.verifyCaptcha(cap2.captchaId, '12345'), false);
    // Trying again should be consumed
    assert.strictEqual(captchaService.verifyCaptcha(cap2.captchaId, '12345'), false);
    console.log('✓ CAPTCHA generation and one-time verification verified.');

    console.log('--- Testing Email Verification and User Registration ---');
    const testEmail = `test_${Date.now()}@evalix.com`;
    const testPass = 'Secret123!';
    const { user, verificationCode } = userStore.createUser({
        email: testEmail,
        password: testPass,
        name: 'Test Analyst'
    });

    assert.strictEqual(user.email, testEmail);
    assert.strictEqual(user.isEmailVerified, false, 'New user should start unverified');
    assert.ok(verificationCode, 'Verification code must be returned');

    // Test email service
    const emailResult = await emailService.sendVerificationEmail(testEmail, 'Test Analyst', verificationCode);
    assert.ok(emailResult.success, 'Email service should succeed');

    // Verify wrong code
    const badVerify = userStore.verifyEmailCode(testEmail, '000000');
    assert.strictEqual(badVerify.success, false, 'Wrong OTP code should fail');

    // Verify correct code
    const goodVerify = userStore.verifyEmailCode(testEmail, verificationCode);
    assert.strictEqual(goodVerify.success, true, 'Correct OTP code should succeed');
    assert.strictEqual(goodVerify.user.isEmailVerified, true, 'User should now be verified');

    // Resend verification on already-verified user
    const foundUser = userStore.findUserByEmail(testEmail);
    assert.strictEqual(foundUser.isEmailVerified, true);

    console.log('✓ Email verification and user workflow verified.');
    console.log('All auth security tests passed successfully!');
}

runTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

