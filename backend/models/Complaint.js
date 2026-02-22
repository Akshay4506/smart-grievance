const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: 'General' },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED'], default: 'PENDING' },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    departmentAssigned: { type: String },
    slaDeadline: { type: Date },
    resolvedAt: { type: Date },
    evidence: [String], // Array of Base64 image data

    // Location details with proper GeoJSON
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        address: { type: String }
    },

    // Phase 5: Advanced Features
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        text: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: String,
        createdAt: { type: Date, default: Date.now }
    }],
    review: {
        rating: { type: Number, min: 1, max: 5 },
        feedback: String,
        createdAt: { type: Date }
    },

    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Index for geospatial queries
complaintSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Complaint', complaintSchema);
