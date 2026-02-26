const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Nodemailer transporter - Optimized for Cloud Deployment (Render)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    },
    // Force IPv4 to avoid common cloud networking "ENETUNREACH" or timeout issues
    family: 4,
    connectionTimeout: 15000, // Increase timeout to 15s
    greetingTimeout: 15000,
    socketTimeout: 20000,
    debug: true, // Enable debug output in Render logs
    logger: true  // Log information to console
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('Nodemailer verification failed:', error.message);
    } else {
        console.log('Nodemailer is ready to send emails');
    }
});

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret_key', {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, department, phone } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            department,
            phone
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, phone, password, role } = req.body;

        // Build query: search by email or phone
        const query = email ? { email } : { phone };
        const loginType = email ? 'email' : 'mobile';
        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({ message: `Invalid ${loginType} or password` });
        }

        if (role && user.role !== role) {
            return res.status(403).json({ message: `Access denied. Please login via the ${user.role} portal.` });
        }

        if (await user.matchPassword(password)) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(401).json({ message: `Invalid ${loginType} or password` });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;

            if (req.body.currentPassword && req.body.newPassword) {
                const isMatch = await user.matchPassword(req.body.currentPassword);
                if (!isMatch) {
                    return res.status(401).json({ message: 'Current password is incorrect' });
                }
                user.password = req.body.newPassword;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                department: updatedUser.department,
                token: generateToken(updatedUser._id, updatedUser.role),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Send OTP for password reset (mobile)
// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number is required' });

        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: 'No account found with this mobile number' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        // For dev/testing, return OTP in response (in production, send via SMS)
        res.json({ message: 'OTP sent successfully', otp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Send OTP for password reset (email) - Rewritten for reliability
router.post('/forgot-password-email', async (req, res) => {
    const { email } = req.body;
    console.log(`Password reset request for email: ${email}`);

    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`User not found for email: ${email}`);
            return res.status(404).json({ message: 'No account found with this email' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        await user.save();

        console.log(`Generated OTP for ${email}: ${otp}`);

        // Prepare Email
        const mailOptions = {
            from: `"SG Track" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: 'Password Reset OTP - SG Track',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 2rem; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h1 style="color: #4f46e5; margin: 0;">SG Track</h1>
                        <p style="color: #64748b; font-size: 0.9rem;">Smart Grievance Tracking System</p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 2rem; border-radius: 8px; text-align: center;">
                        <p style="margin-top: 0; color: #1e293b;">Use the following OTP to reset your password:</p>
                        <h2 style="font-size: 2.5rem; letter-spacing: 0.5rem; color: #4f46e5; margin: 1rem 0;">${otp}</h2>
                        <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0;">This OTP is valid for 5 minutes.</p>
                    </div>
                    <p style="color: #64748b; font-size: 0.85rem; margin-top: 2rem; text-align: center;">
                        If you didn't request a password reset, please ignore this email or contact support.
                    </p>
                    <div style="border-top: 1px solid #eee; margin-top: 2rem; padding-top: 1.5rem; text-align: center; color: #94a3b8; font-size: 0.8rem;">
                        &copy; 2026 SG Track. All rights reserved.
                    </div>
                </div>
            `
        };

        // Send Email
        await transporter.sendMail(mailOptions);
        console.log(`Successfully sent OTP email to: ${email}`);

        res.json({ message: 'OTP sent to your email successfully' });
    } catch (error) {
        console.error('Error in forgot-password-email:', error);
        res.status(500).json({ message: 'Error sending email. Please try again later.' });
    }
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, email, otp } = req.body;
        if ((!phone && !email) || !otp) return res.status(400).json({ message: 'Phone/Email and OTP are required' });

        const query = email ? { email } : { phone };
        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.resetOtp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        if (user.resetOtpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Generate a short-lived reset token (10 min)
        const resetToken = jwt.sign(
            { id: user._id, purpose: 'reset' },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '10m' }
        );

        // Clear OTP
        user.resetOtp = undefined;
        user.resetOtpExpiry = undefined;
        await user.save();

        res.json({ message: 'OTP verified', resetToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        if (decoded.purpose !== 'reset') {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.password = password;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Reset link has expired. Please try again.' });
        }
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
