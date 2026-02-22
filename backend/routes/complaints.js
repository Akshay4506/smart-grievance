const express = require('express');
const Complaint = require('../models/Complaint');
const { protect, officialOnly } = require('../middleware/auth');
const router = express.Router();

// Lightweight Heuristic "ML" for MVP Category & Severity Detection
const CATEGORY_KEYWORDS = {
    Electricity: ['power', 'dark', 'light', 'wire', 'shock', 'pole', 'transformer', 'blackout'],
    Water: ['leak', 'pipe', 'water', 'flood', 'drain', 'sewer', 'smell', 'blockage'],
    Roads: ['pothole', 'crack', 'road', 'sidewalk', 'pavement', 'asphalt', 'traffic'],
    Waste: ['garbage', 'trash', 'dump', 'bin', 'litter', 'waste']
};

const SEVERITY_KEYWORDS = {
    CRITICAL: ['immediate', 'danger', 'fire', 'burst', 'accident', 'spark', 'huge'],
    HIGH: ['blocked', 'broken', 'no water', 'outage', 'deep'],
    MEDIUM: ['smell', 'slow', 'dirty', 'crack'],
    LOW: ['litter', 'small', 'paint']
};

function analyzeText(text) {
    const normalized = text.toLowerCase();

    let detectedCategory = 'General';
    let categoryScore = 0;

    for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
        const score = words.filter(w => normalized.includes(w)).length;
        if (score > categoryScore) {
            categoryScore = score;
            detectedCategory = cat;
        }
    }

    let detectedSeverity = 'LOW';
    for (const [sev, words] of Object.entries(SEVERITY_KEYWORDS)) {
        if (words.some(w => normalized.includes(w))) {
            detectedSeverity = sev;
            break;
        }
    }

    return {
        category: detectedCategory,
        severity: detectedSeverity,
        departmentAssigned: detectedCategory
    };
}

// @desc    Create a new complaint
// @route   POST /api/complaints
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, lng, lat, address, category, severity, evidence } = req.body;

        const analysis = analyzeText(`${title} ${description}`);
        const finalSeverity = severity || analysis.severity;

        let slaHours = 72;
        if (finalSeverity === 'CRITICAL') slaHours = 4;
        else if (finalSeverity === 'HIGH') slaHours = 24;
        else if (finalSeverity === 'MEDIUM') slaHours = 48;

        const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

        const complaint = await Complaint.create({
            title,
            description,
            category: category || analysis.category,
            severity: finalSeverity,
            departmentAssigned: category || analysis.departmentAssigned,
            slaDeadline,
            evidence,
            citizenId: req.user.id,
            location: {
                type: 'Point',
                coordinates: [lng || 77.2090, lat || 28.6139], // Default to Delhi if missing
                address: address || 'Location not provided'
            }
        });

        res.status(201).json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all public complaints (for map)
// @route   GET /api/complaints/public
router.get('/public', async (req, res) => {
    try {
        // Only return non-sensitive fields
        const complaints = await Complaint.find({}).select('title category status severity location departmentAssigned createdAt upvotes');
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get current user's complaints
// @route   GET /api/complaints/me
router.get('/me', protect, async (req, res) => {
    try {
        const complaints = await Complaint.find({ citizenId: req.user.id }).sort('-createdAt');
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get complaints for department (Officials only)
// @route   GET /api/complaints/department
router.get('/department', protect, officialOnly, async (req, res) => {
    try {
        const user = await require('../models/User').findById(req.user.id);
        let query = {};

        // If the official has a specific department, filter by it, otherwise show all
        if (user.department && user.department !== 'All') {
            query.departmentAssigned = user.department;
        }

        const complaints = await Complaint.find(query).populate('citizenId', 'name email phone').sort('status slaDeadline');
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update complaint status
// @route   PATCH /api/complaints/:id
router.patch('/:id', protect, officialOnly, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (complaint) {
            if (req.body.status) {
                complaint.status = req.body.status;
                if (req.body.status === 'RESOLVED') {
                    if (!complaint.resolvedAt) complaint.resolvedAt = new Date();
                } else {
                    complaint.resolvedAt = null;
                }
            }
            const updatedComplaint = await complaint.save();
            res.json(updatedComplaint);
        } else {
            res.status(404).json({ message: 'Complaint not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add a comment to a complaint
// @route   POST /api/complaints/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
    try {
        const { text } = req.body;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        const author = await require('../models/User').findById(req.user.id);

        const comment = {
            text,
            user: req.user.id,
            name: author ? author.name : 'Unknown',
            role: req.user.role
        };

        complaint.comments.push(comment);
        await complaint.save();
        res.status(201).json(complaint.comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Toggle upvote on a complaint
// @route   POST /api/complaints/:id/upvote
router.post('/:id/upvote', protect, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        const index = complaint.upvotes.indexOf(req.user.id);
        if (index === -1) {
            complaint.upvotes.push(req.user.id);
        } else {
            complaint.upvotes.splice(index, 1);
        }

        await complaint.save();
        res.json({ upvotes: complaint.upvotes.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add a citizen review for a resolved complaint
// @route   POST /api/complaints/:id/review
router.post('/:id/review', protect, async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        if (complaint.citizenId.toString() !== req.user.id.toString()) {
            return res.status(401).json({ message: 'Not authorized to review this complaint' });
        }

        if (complaint.status !== 'RESOLVED') {
            return res.status(400).json({ message: 'Complaint must be resolved before reviewing' });
        }

        complaint.review = {
            rating: Number(rating),
            feedback,
            createdAt: new Date()
        };

        await complaint.save();
        res.json(complaint.review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get dashboard analytics (Categories & Status)
// @route   GET /api/complaints/analytics
router.get('/analytics', protect, officialOnly, async (req, res) => {
    try {
        const user = await require('../models/User').findById(req.user.id);
        let matchStage = {};

        if (user.department && user.department !== 'All') {
            matchStage = { departmentAssigned: user.department };
        }

        // Aggregate by Category
        const categories = await Complaint.aggregate([
            { $match: matchStage },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        // Aggregate by Status
        const statuses = await Complaint.aggregate([
            { $match: matchStage },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // Format for Chart.js
        const catLabels = categories.map(c => c._id);
        const catData = categories.map(c => c.count);

        const statLabels = statuses.map(s => s._id);
        const statData = statuses.map(s => s.count);

        res.json({
            categories: { labels: catLabels, data: catData },
            statuses: { labels: statLabels, data: statData }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
