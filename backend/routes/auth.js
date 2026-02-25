const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
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

// @desc    Send OTP for password reset (email)
// @route   POST /api/auth/forgot-password-email
router.post('/forgot-password-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'No account found with this email' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        // Send OTP via email
        await transporter.sendMail({
            from: `"SG Track" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: 'Password Reset OTP - SG Track',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; text-align: center;">SG Track</h2>
                    <p>You requested a password reset. Use the OTP below to verify your identity:</p>
                    <div style="text-align: center; margin: 1.5rem 0;">
                        <span style="font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; color: #4f46e5; background: #f0f0ff; padding: 0.75rem 1.5rem; border-radius: 8px;">${otp}</span>
                    </div>
                    <p style="color: #666; font-size: 0.9rem;">This OTP is valid for <strong>5 minutes</strong>. If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 1.5rem 0;">
                    <p style="color: #999; font-size: 0.8rem; text-align: center;">© 2026 Smart Issue Tracker</p>
                </div>
            `
        });

        res.json({ message: 'OTP sent to your email successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
